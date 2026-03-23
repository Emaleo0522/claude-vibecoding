import { watch } from "chokidar";
import { statSync, readdirSync, openSync, readSync, closeSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";
import { EventEmitter } from "events";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");
const ACTIVE_THRESHOLD_MS = 600_000; // 10 minutes — Claude can think for 5+ min without writing
const POLL_INTERVAL_MS = 1000;
const OFFSETS_PATH = join(homedir(), ".pixel-agents", "file-offsets.json");

export interface WatchedFile {
  path: string;
  sessionId: string;
  projectName: string;
  offset: number;
  lineBuffer: string;
}

export class JsonlWatcher extends EventEmitter {
  private files = new Map<string, WatchedFile>();
  private watcher: ReturnType<typeof watch> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private persistedOffsets: Record<string, number> = {};

  constructor() {
    super();
    // Load persisted offsets so we don't re-read entire JSONL files on restart
    try {
      if (existsSync(OFFSETS_PATH)) {
        const buf = Buffer.alloc(statSync(OFFSETS_PATH).size);
        const fd = openSync(OFFSETS_PATH, "r");
        readSync(fd, buf, 0, buf.length, 0);
        closeSync(fd);
        this.persistedOffsets = JSON.parse(buf.toString("utf-8")) || {};
      }
    } catch {
      this.persistedOffsets = {};
    }
  }

  private saveOffsets(): void {
    try {
      const offsets: Record<string, number> = {};
      for (const [path, file] of this.files) {
        offsets[path] = file.offset;
      }
      mkdirSync(dirname(OFFSETS_PATH), { recursive: true });
      writeFileSync(OFFSETS_PATH, JSON.stringify(offsets));
    } catch { /* best effort */ }
  }

  start(): void {
    this.scanForActiveFiles();

    this.watcher = watch(CLAUDE_PROJECTS_DIR, {
      ignoreInitial: true,
      depth: 3,
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

  /** Re-scan for active JSONL files. Called at startup and on client reconnect. */
  rescan(): void {
    this.scanForActiveFiles();
  }

  private scanForActiveFiles(): void {
    try {
      const dirs = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const dirPath = join(CLAUDE_PROJECTS_DIR, dir.name);
        try {
          const files = readdirSync(dirPath);
          for (const f of files) {
            if (!f.endsWith(".jsonl")) continue;
            const filePath = join(dirPath, f);
            const stat = statSync(filePath);
            if (Date.now() - stat.mtimeMs < ACTIVE_THRESHOLD_MS) {
              this.addFile(filePath);
            }
          }
        } catch {
          /* skip unreadable dirs */
        }
      }
    } catch {
      /* projects dir may not exist */
    }
  }

  private addFile(filePath: string): void {
    if (this.files.has(filePath)) return;

    const sessionId = basename(filePath, ".jsonl");
    const projectDirName = basename(dirname(filePath));
    // Extract short project name: "-Users-alice-Documents-myproject-657" -> "myproject"
    // Walk backwards, skipping purely numeric trailing segments (e.g. version/port numbers).
    const parts = projectDirName.split("-").filter(Boolean);
    let projectName = sessionId.slice(0, 8);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!/^\d+$/.test(parts[i])) {
        projectName = parts[i];
        break;
      }
    }

    // Use persisted offset if available — avoids re-reading entire JSONL on restart
    const savedOffset = this.persistedOffsets[filePath] || 0;
    const file: WatchedFile = {
      path: filePath,
      sessionId,
      projectName,
      offset: savedOffset,
      lineBuffer: "",
    };

    this.files.set(filePath, file);
    this.emit("fileAdded", file);

    // Read new content since last known offset
    this.readNewLines(file);
  }

  private pollFiles(): void {
    let changed = false;
    for (const [path, file] of this.files) {
      try {
        const stat = statSync(path);
        if (stat.size > file.offset) {
          this.readNewLines(file);
          changed = true;
        }
        // Remove stale files
        if (Date.now() - stat.mtimeMs > ACTIVE_THRESHOLD_MS) {
          this.files.delete(path);
          this.emit("fileRemoved", file);
          changed = true;
        }
      } catch {
        this.files.delete(path);
        this.emit("fileRemoved", file);
        changed = true;
      }
    }
    // Persist offsets to disk so restarts don't re-read entire files
    if (changed) this.saveOffsets();
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
