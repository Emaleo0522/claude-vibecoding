import { watch } from "chokidar";
import { statSync, readdirSync, openSync, readSync, closeSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";
import { EventEmitter } from "events";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");
const ACTIVE_THRESHOLD_MS = 600_000; // 10 minutes — Claude can think for 5+ min without writing
const POLL_INTERVAL_MS = 1000;

export interface WatchedFile {
  path: string;
  sessionId: string;
  projectName: string;
  offset: number;
  lineBuffer: string;
  /** True if this file is inside a /subagents/ directory */
  isSubagent: boolean;
  /** The agentId from the subagent filename (e.g. "adc44bdc302a4b882" from "agent-adc44bdc302a4b882.jsonl") */
  agentId: string | null;
  /** The parent session UUID (directory name containing the subagents/ folder) */
  parentSessionId: string | null;
}

export class JsonlWatcher extends EventEmitter {
  private files = new Map<string, WatchedFile>();
  private watcher: ReturnType<typeof watch> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.scanForActiveFiles();

    this.watcher = watch(CLAUDE_PROJECTS_DIR, {
      ignoreInitial: true,
      depth: 5, // Increased: projects/{project}/{session}/subagents/agent-*.jsonl
      usePolling: true,
      interval: 1000,
    });

    this.watcher.on("add", (filePath: string) => {
      if (filePath.endsWith(".jsonl")) {
        this.addFile(filePath);
      }
    });

    // When a file is deleted, remove it from tracking so a subsequent
    // "add" (recreate) is handled cleanly with offset reset to 0.
    this.watcher.on("unlink", (filePath: string) => {
      const file = this.files.get(filePath);
      if (file) {
        this.files.delete(filePath);
        this.emit("fileRemoved", file);
      }
    });

    this.pollInterval = setInterval(() => this.pollFiles(), POLL_INTERVAL_MS);
  }

  stop(): void {
    this.watcher?.close();
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private scanForActiveFiles(): void {
    try {
      const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
      for (const projectDir of projectDirs) {
        if (!projectDir.isDirectory()) continue;
        const projectPath = join(CLAUDE_PROJECTS_DIR, projectDir.name);
        this.scanDirectory(projectPath);
      }
    } catch {
      /* projects dir may not exist */
    }
  }

  /** Recursively scan for active JSONL files (main sessions + subagents) */
  private scanDirectory(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          try {
            const stat = statSync(fullPath);
            if (Date.now() - stat.mtimeMs < ACTIVE_THRESHOLD_MS) {
              this.addFile(fullPath);
            }
          } catch { /* skip */ }
        } else if (entry.isDirectory()) {
          // Recurse into session directories and subagents/
          this.scanDirectory(fullPath);
        }
      }
    } catch {
      /* skip unreadable dirs */
    }
  }

  private addFile(filePath: string): void {
    if (this.files.has(filePath)) return;

    const fileName = basename(filePath, ".jsonl");
    const parentDirName = basename(dirname(filePath));
    const grandparentDirName = basename(dirname(dirname(filePath)));

    // Detect subagent files: .../sessions/{uuid}/subagents/agent-{id}.jsonl
    const isSubagent = parentDirName === "subagents";
    let agentId: string | null = null;
    let parentSessionId: string | null = null;
    let sessionId: string;
    let projectName: string;

    if (isSubagent && fileName.startsWith("agent-")) {
      // Subagent file
      agentId = fileName.replace("agent-", "");
      parentSessionId = grandparentDirName; // The UUID session directory
      sessionId = `subagent-${agentId}`;
      // projectName will be resolved by the server via subagent_type mapping
      projectName = `subagent-${agentId.slice(0, 8)}`;
    } else {
      // Main session file: .../projects/{project-dir}/{uuid}.jsonl
      sessionId = fileName;
      // Extract short project name from the project directory
      // e.g. "-home-pc004" → "pc004", "-Users-alice-myproject" → "myproject"
      const projectDirName = isSubagent ? basename(dirname(dirname(dirname(filePath)))) : parentDirName;
      const parts = projectDirName.split("-").filter(Boolean);
      projectName = sessionId.slice(0, 8);
      for (let i = parts.length - 1; i >= 0; i--) {
        if (!/^\d+$/.test(parts[i])) {
          projectName = parts[i];
          break;
        }
      }
    }

    const file: WatchedFile = {
      path: filePath,
      sessionId,
      projectName,
      offset: 0,
      lineBuffer: "",
      isSubagent,
      agentId,
      parentSessionId,
    };

    this.files.set(filePath, file);
    this.emit("fileAdded", file);

    // Read existing content to catch up
    this.readNewLines(file);
  }

  private pollFiles(): void {
    for (const [path, file] of this.files) {
      try {
        const stat = statSync(path);
        if (stat.size > file.offset) {
          this.readNewLines(file);
        }
        // Remove stale files
        if (Date.now() - stat.mtimeMs > ACTIVE_THRESHOLD_MS) {
          this.files.delete(path);
          this.emit("fileRemoved", file);
        }
      } catch {
        this.files.delete(path);
        this.emit("fileRemoved", file);
      }
    }
  }

  private readNewLines(file: WatchedFile): void {
    try {
      const stat = statSync(file.path);
      if (stat.size <= file.offset) return;

      const buf = Buffer.alloc(stat.size - file.offset);
      const fd = openSync(file.path, "r");
      readSync(fd, buf, 0, buf.length, file.offset);
      closeSync(fd);

      file.offset = stat.size;
      const text = file.lineBuffer + buf.toString("utf-8");
      const lines = text.split("\n");

      // Last element is incomplete line (buffer it)
      file.lineBuffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          this.emit("line", file, line);
        }
      }
    } catch {
      /* file may have been deleted */
    }
  }

  getActiveFiles(): WatchedFile[] {
    return Array.from(this.files.values());
  }
}
