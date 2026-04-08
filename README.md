# Claude Vibecoding System

**An autonomous multi-agent system for building complete software projects from idea to deployment.**

A central orchestrator coordinates 24 specialized AI sub-agents (25 entities total) through a 5-phase pipeline: planning, architecture, development with visual QA, certification, and deployment. 13 reactive hooks enforce security, quality gates, and cost tracking in real time. Persistent memory via Engram MCP enables session continuity and cross-agent coordination.

Compatible with **Linux (Claude Code)** and **Windows (Claude Desktop)**.

---

## Key Features

- **25 specialized agents** -- 1 orchestrator + 24 sub-agents, each with defined tools and responsibilities
- **5-phase pipeline** -- Planning, Architecture, Dev+QA loop, Certification, Deployment
- **13 reactive hooks** -- Security blocks, quality gates, cost tracking, context management
- **Persistent memory** -- Engram MCP for cross-session state, DAG-based progress tracking
- **Visual agent office** -- Pixel Bridge (optional pixel art visualization of agent activity)
- **Adaptive stack** -- Next.js, React Native, Phaser.js, Hono, Drizzle, and more, chosen per project
- **Creative pipeline** -- AI-generated brand identity, logos, images, and video with fallback chains

---

## Pipeline

```
Phase 1: Planning        -> project-manager-senior
Phase 2: Architecture    -> ux-architect -> ui-designer + security-engineer
Phase 2B: Visual Assets  -> brand-agent -> (user approval) -> logo + image -> video
Phase 3: Dev <-> QA Loop -> dev-agents <-> evidence-collector (max 3 retries)
Phase 4: Certification   -> seo + api-tester + performance + reality-checker
Phase 5: Deployment      -> git -> deployer (with user confirmation)
```

---

## Agent Catalog

| Phase | Agent | Role |
|:-----:|-------|------|
| * | `orquestador` | Central coordinator, manages all 5 phases, never does real work |
| 1 | `project-manager-senior` | Converts ideas into granular tasks with acceptance criteria |
| 2 | `ux-architect` | CSS foundation: tokens, layout, themes, breakpoints |
| 2 | `ui-designer` | Visual design system, components, WCAG AA accessibility |
| 2 | `security-engineer` | STRIDE threat model, OWASP Top 10, security headers |
| 2B | `brand-agent` | Brand identity: palette, typography, tone, personality |
| 2B | `image-agent` | Hero images via Gemini/HuggingFace FLUX.1 |
| 2B | `logo-agent` | SVG logos (FLUX.1 + vtracer vectorization) |
| 2B | `video-agent` | Background videos (Replicate LTXVideo / CSS fallback) |
| 3 | `frontend-developer` | React/Vue/TS, Tailwind, shadcn/ui, Zustand, TanStack Query |
| 3 | `backend-architect` | Hono/Express, Drizzle/Prisma, tRPC, PostgreSQL, Better Auth |
| 3 | `rapid-prototyper` | Multi-stack MVPs for fast validation |
| 3 | `mobile-developer` | React Native + Expo SDK 52+, NativeWind 4, Expo Router |
| 3 | `game-designer` | Game Design Document: mechanics, loops, economy, balance |
| 3 | `xr-immersive-developer` | Phaser.js, PixiJS, Canvas API, WebGL standalone games |
| 3 | `codepen-explorer` | Searches and extracts visual effects from CodePen via Playwright |
| 3 | `build-resolver` | Diagnoses and fixes build failures automatically |
| 3 | `evidence-collector` | Visual QA with Playwright MCP, screenshots across 3 viewports |
| 4 | `seo-discovery` | SEO audit, meta tags, JSON-LD, sitemap, llms.txt, AI discovery |
| 4 | `api-tester` | Endpoint coverage, OWASP API Top 10, P95 latency |
| 4 | `performance-benchmarker` | Core Web Vitals, Lighthouse, bundle analysis |
| 4 | `reality-checker` | Final pre-production gate with visual evidence |
| 5 | `git` | Commit + push to GitHub, branch management |
| 5 | `deployer` | Deploy to Vercel + Git Integration for auto-deploy |
| -- | `self-auditor` | Validates system health: agents, hooks, settings, protocols |

### Technical References (8 files)

| File | Content |
|------|---------|
| `agent-protocol` | Shared protocol: Engram 2-step reads, Return Envelope, universal rules |
| `better-auth-reference` | Better Auth 1.5 + Supabase + Vercel integration |
| `better-gsap-reference` | GSAP Tier 3: useGSAP, ScrollTrigger, SplitText, Next.js gotchas |
| `react-patterns-reference` | React 19, Next.js 15/16, Tailwind 4, Zustand 5 |
| `redis-patterns-reference` | Cache-aside, Pub/Sub, HyperLogLog, cursor pagination |
| `pocketbase-reference` | PocketBase boolean gotchas, rules, auth, Docker, HTTPS |
| `devops-vps-reference` | Mixed Content HTTPS, Oracle Cloud, nginx, Let's Encrypt |
| `nothing-design-reference` | Nothing Design System v3.0.0 -- tokens, components, platform mapping |

---

## Hook System

13 reactive hooks intercept tool calls in real time. Configured in `~/.claude/settings.json`, scripts live in `~/.claude/hooks/`.

| Hook | Type | Matcher | Action |
|------|------|---------|--------|
| `block-no-verify` | PreToolUse | Bash | **BLOCKS** git --no-verify, rm -rf, git reset --hard, DROP TABLE, chmod 777, curl\|sh |
| `config-protection` | PreToolUse | Write/Edit | **BLOCKS** edits to .env, .pem, .key, credentials. **WARNS** on linting config changes |
| `quality-gate` | PostToolUse | Write/Edit | **WARNS** on debugger, .only(), @ts-ignore, hardcoded secrets |
| `console-log-warning` | PostToolUse | Write/Edit | **WARNS** on console.log/warn/error in production code (ignores tests) |
| `suggest-compact` | PostToolUse | global | **WARNS** every ~50 tool calls with pipeline phase context (async) |
| `pre-compact-engram` | PreCompact | lifecycle | **SAVES** snapshot to disk + resets counter before compaction |
| `cost-tracker` | PostToolUse | global | **LOGS** each tool call with category, sub-agent, model (async) |
| `session-summary` | Stop | lifecycle | **LOGS** session activity in JSONL for recovery (async) |
| `engram-sync` | Stop | lifecycle | **SYNCS** Engram memories to GitHub automatically (async, 60s timeout) |
| `session-start-context` | Notification | lifecycle | **LOADS** previous session context + hook health check at startup |
| `audit-system` | Manual | -- | Validates system integrity: agents, hooks, settings, protocols |
| `cost-report` | Manual | -- | Tool usage breakdown by category, sub-agent, frequency |
| `learning-index` | Manual | -- | Local discovery index with auto-tagging by technology |

---

## Installation

### Prerequisites

| Platform | Requirements |
|----------|-------------|
| Linux | Ubuntu/Debian, Claude Code CLI, git, Node.js (auto-installed if missing) |
| Windows | Git for Windows (Git Bash), Claude Desktop, Node.js |

### Linux (Claude Code)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

The script installs agents, hooks, CLAUDE.md, settings, and configures git/GitHub/Vercel authentication. Restart Claude Code when done.

### Windows (Claude Desktop)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```

Follow the step-by-step guide in [`install/windows.md`](install/windows.md).

### Post-Install Verification

```bash
# Agents installed (should be 33: 25 agents + 8 references)
ls ~/.claude/agents/*.md | wc -l

# Hooks installed (should be 13)
ls ~/.claude/hooks/*.js | wc -l

# CLAUDE.md present
head -3 ~/CLAUDE.md

# Tools available
git --version && node --version && gh --version && vercel --version
```

---

## Configuration

### Engram MCP (required)

Engram provides persistent memory across sessions. It is configured automatically during installation via `settings.json`. On Windows, it requires downloading the binary separately (see `install/windows.md`).

### Creative Pipeline Environment Variables (optional)

Required only if your project uses AI-generated visual assets (Phase 2B).

| Variable | Service | Cost | Used By |
|----------|---------|------|---------|
| `GEMINI_API_KEY` | Google AI Studio | ~$0.02-0.04/image (billing required) | image-agent, logo-agent |
| `HF_TOKEN` | HuggingFace | Free | image-agent, logo-agent |
| `REPLICATE_API_TOKEN` | Replicate | ~$0.05/video | video-agent |

At least one image key (`GEMINI_API_KEY` or `HF_TOKEN`) is needed for the creative pipeline. If both are set, Gemini is primary with HuggingFace as fallback.

### Pixel Bridge (optional)

A pixel art office where agents walk to their desks when assigned tasks, report back to the orchestrator, and idle when inactive. Purely visual, does not affect pipeline operation.

Install during `linux.sh` (prompted) or manually in Claude Desktop.

---

## Usage

The system operates in two modes:

| Mode | When to Use | How to Activate |
|------|------------|----------------|
| **Normal** | Questions, fixes, reviews, technical chat | Default -- just talk |
| **Orchestrator** | Complete software projects end-to-end | Say: "modo orquestador", "activa el pipeline", or "nuevo proyecto completo: X" |

### Starting a Project

```
modo orquestador -- quiero crear [your idea]
```

The system handles everything: plans tasks, designs architecture, implements with visual QA (max 3 retries per task), certifies (SEO, API, performance, final gate), and deploys to Vercel -- with your confirmation before git push and deploy.

### Resuming a Project

```
retomar [project-name]
```

The orchestrator reads the DAG State from Engram and resumes exactly where it left off, without re-executing completed phases or re-asking decided questions.

---

## Architecture

```
~/.claude/
|-- agents/            # 25 agents + 8 references = 33 files
|-- hooks/             # 13 reactive hooks
|-- settings.json      # hook config + Engram MCP
|-- settings.local.json # agent permissions
|-- codepen-vault/     # approved CodePen effects
|-- pixel-bridge/      # optional visual system
~/CLAUDE.md             # system instructions (auto-read by Claude)
```

### Model Routing

| Model | Agents | Criteria |
|-------|--------|----------|
| **Opus** | orchestrator, project-manager-senior, security-engineer, game-designer | Complex architectural decisions, planning, threat modeling |
| **Sonnet** | All others (21 agents) | Defined task execution, QA, utilities, creative |

### Key Rules

- The orchestrator **never** does real work -- only coordinates
- Sub-agents return **only short summaries** (status + files + issues)
- Only `evidence-collector` and `reality-checker` perform visual QA
- Only `git` makes commits/pushes -- never a dev agent
- Only `deployer` deploys to Vercel
- `git` and `deployer` act **only with user confirmation**
- Each dev task passes through `evidence-collector` before advancing (max 3 retries)
- The orchestrator does not activate `git` until `evidence-collector` returns PASS

---

## Adaptive Stack

The orchestrator selects the stack in Phase 1 based on project requirements. There is no fixed stack.

| Layer | Options | Default Preference |
|-------|---------|--------------------|
| Frontend | Next.js, SvelteKit, Nuxt, Astro, Vite+React | Next.js (apps), Vite+React (landing) |
| Backend | Hono, Express, Fastify | Hono (edge-ready) |
| Database | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle (type-safe, edge) |
| Auth | Better Auth | Always (unless project has existing auth) |
| Mobile | React Native + Expo SDK 52+ | Expo (iOS + Android from one repo) |
| Games 2D | Phaser.js 3, PixiJS, Canvas API | Phaser.js |
| Games 3D | Three.js, Babylon.js | Three.js |
| Animation | CSS (Tier 1), Framer Motion (Tier 2), GSAP (Tier 3) | Escalate by complexity |

---

## Pipeline Resilience

| Mechanism | What It Solves |
|-----------|---------------|
| **Phase Gates** | Verifies outputs from the previous phase exist before advancing. Re-delegates if missing. |
| **Error Recovery** | If an agent crashes without returning a result, the orchestrator checks Engram, recovers what it can, and re-delegates. |
| **Graceful Degradation** | If Engram is down, uses local disk as fallback. If Playwright is unavailable, performs code-only QA. |
| **Rejection Workflows** | Up to 3 retries for rejected creative assets with escalating strategy changes. |
| **NEEDS WORK Flow** | If reality-checker does not certify, the orchestrator returns to Phase 3 only for affected tasks. |

---

## Credits

- [Engram](https://github.com/Gentleman-Programming/engram) by Gentleman Programming -- persistent memory MCP
- [pixel-agents](https://github.com/pablodelucca/pixel-agents) by @pablodelucca -- pixel art office (Pixel Bridge adapted from this)
- [Agency Agents](https://github.com/msitarzewski/agency-agents) -- specialized agents with metrics (inspiration)
- [Agent Teams Lite](https://github.com/Gentleman-Programming/agent-teams-lite) -- DAG State, minimal handoffs, Engram (inspiration)

---

## License

See [LICENSE](LICENSE) for details.
