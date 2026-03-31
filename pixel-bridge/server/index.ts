import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { JsonlWatcher, type WatchedFile } from "./watcher.js";
import { processTranscriptLine } from "./parser.js";
import {
  loadCharacterSprites,
  loadWallTiles,
  loadFloorTiles,
  loadFurnitureAssets,
  loadDefaultLayout,
} from "./assetLoader.js";
import type { TrackedAgent, ServerMessage } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3456", 10);
const IDLE_SHUTDOWN_MS = 600_000; // 10 minutes

// ── Permanent agents — always present in the office ─────────────────────────
// These characters always wander; they activate when a real JSONL session
// is detected for their name, and go back to wandering when it ends.
const PERMANENT_AGENTS: Array<{ name: string; id: number }> = [
  { name: "orquestador",             id: 1001 },
  { name: "project_manager_senior",  id: 1002 },
  { name: "ux_architect",            id: 1003 },
  { name: "ui_designer",             id: 1004 },
  { name: "security_engineer",       id: 1005 },
  { name: "frontend_developer",      id: 1006 },
  { name: "backend_architect",       id: 1007 },
  { name: "rapid_prototyper",        id: 1008 },
  { name: "mobile_developer",        id: 1009 },
  { name: "game_designer",           id: 1010 },
  { name: "xr_immersive_developer",  id: 1011 },
  { name: "evidence_collector",      id: 1012 },
  { name: "reality_checker",         id: 1013 },
  { name: "seo_discovery",           id: 1014 },
  { name: "api_tester",              id: 1015 },
  { name: "performance_benchmarker", id: 1016 },
  { name: "brand_agent",             id: 1017 },
  { name: "image_agent",             id: 1018 },
  { name: "logo_agent",              id: 1019 },
  { name: "video_agent",             id: 1020 },
  { name: "git",                     id: 1021 },
  { name: "deployer",                id: 1022 },
]

// Normalize agent name for matching: hyphens, underscores, and spaces are equivalent
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-\s]/g, "_")
}

// Map subagent_type values to permanent agent names
// Claude Code uses these types in the Agent tool: subagent_type → normalized name
const SUBAGENT_TYPE_MAP: Record<string, string> = {
  "orquestador": "orquestador",
  "project-manager-senior": "project_manager_senior",
  "ux-architect": "ux_architect",
  "ui-designer": "ui_designer",
  "security-engineer": "security_engineer",
  "frontend-developer": "frontend_developer",
  "backend-architect": "backend_architect",
  "rapid-prototyper": "rapid_prototyper",
  "mobile-developer": "mobile_developer",
  "game-designer": "game_designer",
  "xr-immersive-developer": "xr_immersive_developer",
  "evidence-collector": "evidence_collector",
  "reality-checker": "reality_checker",
  "seo-discovery": "seo_discovery",
  "api-tester": "api_tester",
  "performance-benchmarker": "performance_benchmarker",
  "brand-agent": "brand_agent",
  "image-agent": "image_agent",
  "logo-agent": "logo_agent",
  "video-agent": "video_agent",
  "git": "git",
  "deployer": "deployer",
  // Built-in Claude Code agent types (not in our system)
  "Explore": "",
  "Plan": "",
  "general-purpose": "",
}

// Project directory names that are infrastructure — skip them
const BLOCKED_PROJECT_NAMES = new Set(["subagents", "agents", "tasks", "temp", "tmp", "cache"])

function makePermanentAgent(pa: { name: string; id: number }): TrackedAgent {
  return {
    id: pa.id,
    sessionId: `permanent-${pa.name}`,
    projectDir: "",
    projectName: pa.name,
    jsonlFile: "",
    fileOffset: 0,
    lineBuffer: "",
    activity: "idle",
    activeTools: new Map(),
    activeToolNames: new Map(),
    activeSubagentToolIds: new Map(),
    activeSubagentToolNames: new Map(),
    isWaiting: false,
    permissionSent: false,
    hadToolsInTurn: false,
    lastActivityTime: 0,
  }
}

// State
const agents = new Map<string, TrackedAgent>() // sessionId -> agent
const permanentAgentByName = new Map<string, TrackedAgent>() // normalized name -> agent

// Initialize all permanent agents before the watcher starts
for (const pa of PERMANENT_AGENTS) {
  const agent = makePermanentAgent(pa)
  agents.set(`permanent-${pa.name}`, agent)
  permanentAgentByName.set(normalizeName(pa.name), agent)
}

// Temporary agents (real sessions not matching a permanent agent) use IDs 1–999
let nextAgentId = 1
const clients = new Set<WebSocket>()
let lastActivityTime = Date.now()

// ── Claude Code agent mapping ───────────────────────────────────────────────
// Maps agentId (from subagent JSONL filename) → permanent agent name
// Populated when we parse Agent tool calls with subagent_type in the parent session
const agentIdToName = new Map<string, string>()
// Maps parentToolUseID → subagent_type (from Agent tool calls in parent session)
const toolUseIdToSubagentType = new Map<string, string>()

// Load assets at startup
const devAssetsRoot = join(__dirname, "..", "webview-ui", "public", "assets")
const prodAssetsRoot = join(__dirname, "public", "assets")
const assetsRoot = existsSync(devAssetsRoot) ? devAssetsRoot : prodAssetsRoot

console.log(`[Server] Loading assets from: ${assetsRoot}`)

const characterSprites = loadCharacterSprites(assetsRoot)
const wallTiles = loadWallTiles(assetsRoot)
const floorTiles = loadFloorTiles(assetsRoot)
const furnitureAssets = loadFurnitureAssets(assetsRoot)

// Persistence directory
const persistDir = join(homedir(), ".pixel-agents")
const persistedLayoutPath = join(persistDir, "layout.json")
const persistedSeatsPath = join(persistDir, "agent-seats.json")

function loadLayout(): Record<string, unknown> | null {
  if (existsSync(persistedLayoutPath)) {
    try {
      const content = readFileSync(persistedLayoutPath, "utf-8")
      const layout = JSON.parse(content) as Record<string, unknown>
      console.log(`[Server] Loaded persisted layout from ${persistedLayoutPath}`)
      return layout
    } catch (err) {
      console.warn(`[Server] Failed to load persisted layout: ${err instanceof Error ? err.message : err}`)
    }
  }
  return loadDefaultLayout(assetsRoot)
}

function loadPersistedSeats(): Record<number, { palette: number; hueShift: number; seatId: string | null }> | null {
  if (existsSync(persistedSeatsPath)) {
    try {
      const content = readFileSync(persistedSeatsPath, "utf-8")
      return JSON.parse(content)
    } catch {
      return null
    }
  }
  return null
}

let currentLayout = loadLayout()
const persistedSeats = loadPersistedSeats()

// Express + WebSocket
const app = express()
app.use(express.static(join(__dirname, "public")))
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Ping/pong heartbeat — keeps clients Set accurate for shutdown guard
setInterval(() => {
  for (const ws of clients) {
    if ((ws as unknown as Record<string, boolean>).__isAlive === false) {
      clients.delete(ws)
      ws.terminate()
      continue
    }
    (ws as unknown as Record<string, boolean>).__isAlive = false
    ws.ping()
  }
}, 30_000)

function broadcast(msg: ServerMessage): void {
  const data = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

function sendInitialData(ws: WebSocket): void {
  ws.send(JSON.stringify({ type: "settingsLoaded", soundEnabled: false }))

  if (characterSprites) {
    ws.send(JSON.stringify({ type: "characterSpritesLoaded", characters: characterSprites.characters }))
  }
  if (wallTiles) {
    ws.send(JSON.stringify({ type: "wallTilesLoaded", sprites: wallTiles.sprites }))
  }
  if (floorTiles) {
    ws.send(JSON.stringify({ type: "floorTilesLoaded", sprites: floorTiles.sprites }))
  }
  if (furnitureAssets) {
    ws.send(JSON.stringify({
      type: "furnitureAssetsLoaded",
      catalog: furnitureAssets.catalog,
      sprites: furnitureAssets.sprites,
    }))
  }

  // All agents: permanent (always) + any active temporary sessions
  const agentList = Array.from(agents.values())
  const agentIds = agentList.map((a) => a.id)
  const folderNames: Record<number, string> = {}
  const agentMeta: Record<number, { palette?: number; hueShift?: number; seatId?: string }> = {}
  for (const a of agentList) {
    folderNames[a.id] = a.projectName
    if (persistedSeats?.[a.id]) {
      const s = persistedSeats[a.id]
      agentMeta[a.id] = { palette: s.palette, hueShift: s.hueShift, seatId: s.seatId ?? undefined }
    }
  }
  ws.send(JSON.stringify({ type: "existingAgents", agents: agentIds, folderNames, agentMeta }))

  // Layout must come AFTER existingAgents — the hook buffers agents until layout arrives
  if (currentLayout) {
    ws.send(JSON.stringify({ type: "layoutLoaded", layout: currentLayout, version: 1 }))
  } else {
    ws.send(JSON.stringify({ type: "layoutLoaded", layout: null, version: 0 }))
  }

  // ── STATE SNAPSHOT — send current activity of all agents ──
  // This is critical for reconnection: without it, all agents appear idle
  // even if they're actively working. Send tool state for every active agent.
  for (const agent of agentList) {
    // Send active tools
    for (const [toolId, tool] of agent.activeTools) {
      ws.send(JSON.stringify({
        type: "agentToolStart",
        id: agent.id,
        toolId,
        status: tool.status,
      }))
    }
    // Send active subagent tools
    for (const [parentToolId, toolIds] of agent.activeSubagentToolIds) {
      const toolNames = agent.activeSubagentToolNames.get(parentToolId)
      for (const toolId of toolIds) {
        const status = toolNames?.get(toolId) || toolId
        ws.send(JSON.stringify({
          type: "subagentToolStart",
          id: agent.id,
          parentToolId,
          toolId,
          status,
        }))
      }
    }
    // Send permission state
    if (agent.permissionSent) {
      ws.send(JSON.stringify({ type: "agentToolPermission", id: agent.id }))
    }
    // Send activity status if not idle
    if (agent.activity !== "idle") {
      ws.send(JSON.stringify({
        type: "agentStatus",
        id: agent.id,
        status: agent.activity === "typing" ? "working" : agent.activity,
      }))
    }
  }
}

wss.on("connection", (ws) => {
  (ws as unknown as Record<string, boolean>).__isAlive = true
  ws.on("pong", () => { (ws as unknown as Record<string, boolean>).__isAlive = true })
  clients.add(ws)

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === "webviewReady" || msg.type === "ready") {
        // Re-scan for active JSONL files that may have appeared while client was disconnected
        watcher.rescan()
        sendInitialData(ws)
      } else if (msg.type === "saveLayout") {
        try {
          mkdirSync(persistDir, { recursive: true })
          writeFileSync(persistedLayoutPath, JSON.stringify(msg.layout, null, 2))
          currentLayout = msg.layout as Record<string, unknown>
          const data = JSON.stringify({ type: "layoutLoaded", layout: msg.layout, version: 1 })
          for (const client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data)
            }
          }
        } catch (err) {
          console.error(`[Server] Failed to save layout: ${err instanceof Error ? err.message : err}`)
        }
      } else if (msg.type === "saveAgentSeats") {
        try {
          mkdirSync(persistDir, { recursive: true })
          writeFileSync(persistedSeatsPath, JSON.stringify(msg.seats, null, 2))
        } catch (err) {
          console.error(`[Server] Failed to save agent seats: ${err instanceof Error ? err.message : err}`)
        }
      }
    } catch {
      /* ignore invalid messages */
    }
  })

  ws.on("close", () => clients.delete(ws))
})

// ── Helper: try to activate a permanent agent for a subagent file ───────────
function tryActivateSubagent(file: WatchedFile): TrackedAgent | null {
  if (!file.agentId) return null

  // Check if we already have a mapping for this agentId
  const mappedName = agentIdToName.get(file.agentId)
  if (mappedName) {
    const permanent = permanentAgentByName.get(normalizeName(mappedName))
    if (permanent) return permanent
  }

  return null
}

// ── Helper: parse a JSONL line from the PARENT session to extract Agent tool calls ─
function extractAgentMapping(line: string): void {
  try {
    const record = JSON.parse(line) as Record<string, unknown>

    // 1. Extract subagent_type from Agent tool_use calls
    if (record.type === "assistant") {
      const message = record.message as Record<string, unknown> | undefined
      const content = message?.content as Array<Record<string, unknown>> | undefined
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use" && block.name === "Agent") {
            const input = block.input as Record<string, unknown> | undefined
            const toolId = block.id as string
            const subagentType = input?.subagent_type as string | undefined
            if (toolId && subagentType) {
              toolUseIdToSubagentType.set(toolId, subagentType)
            }
          }
        }
      }
    }

    // 2. Extract agentId from progress messages to complete the mapping
    if (record.type === "progress") {
      const parentToolUseID = record.parentToolUseID as string | undefined
      const data = record.data as Record<string, unknown> | undefined
      if (data?.type === "agent_progress" && parentToolUseID) {
        const agentId = data.agentId as string | undefined
        if (agentId && toolUseIdToSubagentType.has(parentToolUseID)) {
          const subagentType = toolUseIdToSubagentType.get(parentToolUseID)!
          const normalizedName = SUBAGENT_TYPE_MAP[subagentType]
          if (normalizedName) {
            agentIdToName.set(agentId, normalizedName)
            console.log(`[Mapping] agentId ${agentId.slice(0, 8)} → ${normalizedName} (via ${subagentType})`)

            // If a subagent file was already added but couldn't be mapped, try now
            const subagentSessionId = `subagent-${agentId}`
            const existingAgent = agents.get(subagentSessionId)
            if (existingAgent && existingAgent.id < 1001) {
              // This was registered as a temporary agent — try to upgrade to permanent
              const permanent = permanentAgentByName.get(normalizeName(normalizedName))
              if (permanent && permanent.sessionId.startsWith("permanent-")) {
                // Remove the temporary agent
                agents.delete(subagentSessionId)
                broadcast({ type: "agentClosed", id: existingAgent.id })

                // Activate the permanent agent
                agents.delete(permanent.sessionId)
                permanent.sessionId = subagentSessionId
                permanent.jsonlFile = existingAgent.jsonlFile
                permanent.projectDir = dirname(existingAgent.jsonlFile)
                permanent.fileOffset = 0
                permanent.lineBuffer = ""
                permanent.lastActivityTime = Date.now()
                agents.set(subagentSessionId, permanent)
                broadcast({ type: "agentStatus", id: permanent.id, status: "active" })
                console.log(`[Upgrade] Agent ${permanent.id} activated: ${permanent.projectName} (late mapping)`)
              }
            }
          }
        }
      }
    }
  } catch {
    /* ignore parse errors */
  }
}

// ── File watcher ─────────────────────────────────────────────────────────────
const watcher = new JsonlWatcher()

watcher.on("fileAdded", (file: WatchedFile) => {
  if (agents.has(file.sessionId)) return

  lastActivityTime = Date.now()

  // ── Subagent file: try to map to a permanent agent ──
  if (file.isSubagent) {
    const permanent = tryActivateSubagent(file)
    if (permanent && permanent.sessionId.startsWith("permanent-")) {
      // Activate the permanent agent
      agents.delete(permanent.sessionId)
      permanent.sessionId = file.sessionId
      permanent.jsonlFile = file.path
      permanent.projectDir = dirname(file.path)
      permanent.fileOffset = 0
      permanent.lineBuffer = ""
      permanent.lastActivityTime = Date.now()
      agents.set(file.sessionId, permanent)
      broadcast({ type: "agentStatus", id: permanent.id, status: "active" })
      console.log(`[Subagent] Agent ${permanent.id} activated: ${permanent.projectName} (${file.agentId?.slice(0, 8)})`)
      return
    }

    // No mapping yet — register as temporary, will be upgraded when mapping arrives
    const tempAgent: TrackedAgent = {
      id: nextAgentId++,
      sessionId: file.sessionId,
      projectDir: dirname(file.path),
      projectName: file.projectName,
      jsonlFile: file.path,
      fileOffset: 0,
      lineBuffer: "",
      activity: "idle",
      activeTools: new Map(),
      activeToolNames: new Map(),
      activeSubagentToolIds: new Map(),
      activeSubagentToolNames: new Map(),
      isWaiting: false,
      permissionSent: false,
      hadToolsInTurn: false,
      lastActivityTime: Date.now(),
    }
    agents.set(file.sessionId, tempAgent)
    broadcast({ type: "agentCreated", id: tempAgent.id, folderName: tempAgent.projectName })
    console.log(`[Subagent] Temporary agent ${tempAgent.id}: ${file.agentId?.slice(0, 8)} (awaiting type mapping)`)
    return
  }

  // ── Main session file: activate the orquestador ──
  // Skip infrastructure directories
  if (BLOCKED_PROJECT_NAMES.has(normalizeName(file.projectName))) return

  // Main Claude Code sessions are the "orquestador" (the user's primary session)
  const orq = permanentAgentByName.get("orquestador")
  if (orq && orq.sessionId.startsWith("permanent-")) {
    agents.delete(orq.sessionId)
    orq.sessionId = file.sessionId
    orq.jsonlFile = file.path
    orq.projectDir = dirname(file.path)
    orq.fileOffset = 0
    orq.lineBuffer = ""
    orq.lastActivityTime = Date.now()
    agents.set(file.sessionId, orq)
    broadcast({ type: "agentStatus", id: orq.id, status: "active" })
    console.log(`[Main] Orquestador activated: session ${file.sessionId.slice(0, 8)}`)
    return
  }

  // Orquestador already active — check other permanent agents by project name
  const normalized = normalizeName(file.projectName)
  const permanent = permanentAgentByName.get(normalized)

  if (permanent && permanent.sessionId.startsWith("permanent-")) {
    agents.delete(permanent.sessionId)
    permanent.sessionId = file.sessionId
    permanent.jsonlFile = file.path
    permanent.projectDir = dirname(file.path)
    permanent.fileOffset = 0
    permanent.lineBuffer = ""
    permanent.lastActivityTime = Date.now()
    agents.set(file.sessionId, permanent)
    console.log(`Agent ${permanent.id} activated: ${permanent.projectName} (${file.sessionId.slice(0, 8)})`)
    return
  }

  // Unknown session — create a temporary character
  const agent: TrackedAgent = {
    id: nextAgentId++,
    sessionId: file.sessionId,
    projectDir: dirname(file.path),
    projectName: file.projectName,
    jsonlFile: file.path,
    fileOffset: 0,
    lineBuffer: "",
    activity: "idle",
    activeTools: new Map(),
    activeToolNames: new Map(),
    activeSubagentToolIds: new Map(),
    activeSubagentToolNames: new Map(),
    isWaiting: false,
    permissionSent: false,
    hadToolsInTurn: false,
    lastActivityTime: Date.now(),
  }
  agents.set(file.sessionId, agent)
  broadcast({ type: "agentCreated", id: agent.id, folderName: agent.projectName })
  console.log(`Agent ${agent.id} joined: ${agent.projectName} (${file.sessionId.slice(0, 8)})`)
})

watcher.on("fileRemoved", (file: WatchedFile) => {
  const agent = agents.get(file.sessionId)
  if (!agent) return

  const isPermanent = PERMANENT_AGENTS.some((pa) => pa.id === agent.id)

  if (isPermanent) {
    // Keep agent in office — reset state and re-register under permanent key so it wanders
    agents.delete(file.sessionId)
    agent.sessionId = `permanent-${agent.projectName}`
    agent.jsonlFile = ""
    agent.fileOffset = 0
    agent.lineBuffer = ""
    agent.activity = "idle"
    agent.activeTools.clear()
    agent.activeToolNames.clear()
    agent.activeSubagentToolIds.clear()
    agent.activeSubagentToolNames.clear()
    agent.isWaiting = false
    agent.permissionSent = false
    agent.hadToolsInTurn = false
    agents.set(agent.sessionId, agent)

    // Tell client: clear tools and go idle so the character stands up and wanders
    broadcast({ type: "agentToolsClear", id: agent.id })
    broadcast({ type: "agentStatus", id: agent.id, status: "idle" })
    console.log(`Agent ${agent.id} deactivated: ${agent.projectName}`)
    return
  }

  agents.delete(file.sessionId)
  broadcast({ type: "agentClosed", id: agent.id })
  console.log(`Agent ${agent.id} left: ${agent.projectName}`)
})

watcher.on("line", (file: WatchedFile, line: string) => {
  const agent = agents.get(file.sessionId)
  if (!agent) return
  lastActivityTime = Date.now()

  // For main sessions (non-subagent), also extract Agent tool mappings
  if (!file.isSubagent) {
    extractAgentMapping(line)
  }

  processTranscriptLine(line, agent, broadcast)
})

// Start watcher (synchronous scan) then open HTTP server
watcher.start()
server.listen(PORT, () => {
  console.log(`Pixel Agents server running at http://localhost:${PORT}`)
  console.log(`Watching ~/.claude/projects/ for active sessions...`)
  console.log(`Claude Code mode: main session → orquestador, subagents mapped via Agent tool calls`)
})

// Idle shutdown — only if no real sessions are active
setInterval(() => {
  const hasActiveSessions = Array.from(agents.values()).some(
    (a) => !a.sessionId.startsWith("permanent-")
  )
  if (!hasActiveSessions && clients.size === 0 && Date.now() - lastActivityTime > IDLE_SHUTDOWN_MS) {
    console.log("No active sessions or clients for 10 minutes, shutting down...")
    watcher.stop()
    server.close()
    process.exit(0)
  }
}, 30_000)

process.on("SIGINT", () => {
  watcher.stop()
  server.close()
  process.exit(0)
})
