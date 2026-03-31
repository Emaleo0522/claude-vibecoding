#!/bin/bash
# Pixel Bridge — auto-start on Claude Code session
# Launched by Claude Code SessionStart hook
PIXEL_DIR="$HOME/.claude/pixel-bridge"
PIDFILE="$PIXEL_DIR/.pixel-bridge.pid"
LOG="$PIXEL_DIR/pixel-bridge.log"

# Check if already running
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  exit 0
fi

# Check if built
if [ ! -f "$PIXEL_DIR/dist/server.js" ]; then
  exit 0
fi

# Start in background
cd "$PIXEL_DIR" || exit 1
nohup node dist/server.js >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"
