#!/usr/bin/env bash
# engram-cloud-sync-on-stop.sh
#
# Hook Stop. Garantiza que TODOS los projects con observaciones recientes
# se suban a Engram cloud antes de que termine la sesion.
#
# Diseno:
#   - Async + fail-open (jamas bloquea el flujo del usuario)
#   - Idempotente: enroll y sync se pueden re-ejecutar sin efecto destructivo
#   - Filtro de eficiencia: solo procesa projects con activity reciente (TTL=6h)
#   - scope=personal NO requiere este hook (ya auto-syncea), pero sync --cloud
#     lo cubre tambien por idempotencia
#
# Why exists: Engram cloud no auto-syncea scope=project. Sin este hook, los
# saves de cada sesion quedan locked a la PC que los origino y no se pueden
# retomar cross-PC. Documentado en CLAUDE.md "Protocolo guarda en engram".
#
# Trigger: Stop event en ~/.claude/settings.json
# Exit codes: siempre 0 (fail-open). Errores van al log.

set +e

LOG_FILE="$HOME/.claude/sessions/engram-cloud-sync.jsonl"
STATE_FILE="$HOME/.claude/sessions/engram-cloud-sync.state"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

log() {
  local level="$1"; shift
  local msg="$*"
  printf '{"ts":"%s","level":"%s","msg":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$level" \
    "$(printf '%s' "$msg" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"$msg\"")" \
    >> "$LOG_FILE" 2>/dev/null
}

# 1. engram CLI disponible?
if ! command -v engram > /dev/null 2>&1; then
  log warn "engram CLI not in PATH; skipping"
  exit 0
fi

# 2. cloud configurado?
CLOUD_STATUS=$(engram cloud status 2>&1)
if ! echo "$CLOUD_STATUS" | grep -q "ready\|configured"; then
  log warn "engram cloud not configured; skipping"
  exit 0
fi

# 3. Throttle: si la ultima ejecucion fue hace menos de 30s, skip
NOW=$(date +%s)
if [ -f "$STATE_FILE" ]; then
  LAST=$(cat "$STATE_FILE" 2>/dev/null | head -1)
  if [ -n "$LAST" ] && [ "$((NOW - LAST))" -lt 30 ]; then
    log info "throttled (last run <30s ago); skipping"
    exit 0
  fi
fi
echo "$NOW" > "$STATE_FILE"

log info "starting cloud sync on session stop"

# 4. Listar projects. Filtrar por activity reciente via timestamps de DB
#    Fallback simple: enumerar TODOS los projects, dejar que engram sync
#    skippee los que no tienen delta (idempotente)
PROJECT_LINES=$(engram projects list 2>/dev/null | grep -E "^\s+\S+\s+[0-9]+\s+obs" | grep -v "0 obs")

if [ -z "$PROJECT_LINES" ]; then
  log warn "no projects with observations"
  exit 0
fi

SYNCED=0
FAILED=0
SKIPPED_EMPTY=0

while IFS= read -r line; do
  PROJECT=$(echo "$line" | awk '{print $1}')
  OBS_COUNT=$(echo "$line" | awk '{print $2}')

  # Skip empties
  [ -z "$PROJECT" ] && continue
  [ "$OBS_COUNT" = "0" ] && { SKIPPED_EMPTY=$((SKIPPED_EMPTY+1)); continue; }

  # Skip system32 (default project for scope=personal, ya auto-syncea)
  # Pero sync --cloud lo cubre por idempotencia si tiene scope=project tambien
  # Lo intentamos igual; si el comando falla silenciosamente, no pasa nada.

  # Enroll (idempotente: si ya enrolled, no hace nada)
  ENROLL_OUT=$(engram cloud enroll --project="$PROJECT" 2>&1)

  # Sync to cloud
  SYNC_OUT=$(engram sync --cloud --project="$PROJECT" 2>&1)

  # Detectar error real (no warnings)
  if echo "$SYNC_OUT" | grep -qiE "^error|^failed|panic:|fatal:"; then
    log error "sync failed for $PROJECT: $(echo "$SYNC_OUT" | head -1)"
    FAILED=$((FAILED+1))
  else
    SYNCED=$((SYNCED+1))
  fi
done <<< "$PROJECT_LINES"

log info "done synced=$SYNCED failed=$FAILED skipped_empty=$SKIPPED_EMPTY"
exit 0
