#!/usr/bin/env bash
# engram-cloud-sync-on-stop.sh
#
# Hook Stop. Sube a Engram cloud TODOS los projects que tienen observaciones,
# al terminar cada turno.
#
# Diseno:
#   - Async + fail-open (jamas bloquea el flujo del usuario)
#   - Idempotente: enroll y sync se pueden re-ejecutar sin efecto destructivo
#   - Sin filtro por actividad: recorre todos los projects con al menos 1 observacion
#     (enroll + doctor + sync por cada uno; engram sync no sube nada si no hay cambios).
#     Lo que acota el costo son el throttle de 30 s, el candado y los topes de abajo.
#   - Log ~/.claude/sessions/engram-cloud-sync.jsonl, rotado por encima de ~2 MB (paso 3c)
#   - scope=personal NO requiere este hook (ya auto-syncea), pero sync --cloud
#     lo cubre tambien por idempotencia
#
# Why exists: Engram cloud no auto-syncea scope=project. Sin este hook, los
# saves de cada sesion quedan locked a la PC que los origino y no se pueden
# retomar cross-PC. Documentado en CLAUDE.md § "Protocolos de guardado" y hooks/README.md.
#
# Trigger: Stop event en ~/.claude/settings.json
# Exit codes: siempre 0 (fail-open). Errores van al log.

set +e

# v2+: sin update-check por invocacion. Cada Stop hace ~130 llamadas a engram y
# cada una consultaba la API de GitHub -> rate limit 403 (2026-09-29).
export ENGRAM_NO_UPDATE_CHECK=1

LOG_FILE="$HOME/.claude/sessions/engram-cloud-sync.jsonl"
STATE_FILE="$HOME/.claude/sessions/engram-cloud-sync.state"
LOCK_DIR="$HOME/.claude/sessions/engram-cloud-sync.lock"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

# Topes (2026-11-03). Los hooks async no tienen timeout de Claude Code, y el log mostraba
# corridas de hasta 35 min, 1264 de 4274 sin "done" y corridas superpuestas. Mediana normal
# ~2 min, p90 ~9 min: el presupuesto total queda por encima; lo que no entra se hace en el
# proximo Stop (el sync es idempotente).
CALL_TIMEOUT="${ENGRAM_SYNC_CALL_TIMEOUT:-60}"
BUDGET="${ENGRAM_SYNC_BUDGET:-900}"
START_TS=$(date +%s)

# Cada llamada a engram con su propio tope; engram es hijo directo de timeout, asi que
# muere aunque sea un .exe nativo (verificado en Git Bash 2026-11-03).
eng() {
  if command -v timeout > /dev/null 2>&1; then
    timeout -k 5 "$CALL_TIMEOUT" engram "$@"
  else
    engram "$@"
  fi
}

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
command -v timeout > /dev/null 2>&1 || log warn "timeout not found; engram calls run without per-call limit"

# 2. cloud configurado?
CLOUD_STATUS=$(eng cloud status 2>&1)
CLOUD_RC=$?
if [ "$CLOUD_RC" = "124" ] || [ "$CLOUD_RC" = "137" ]; then
  log warn "engram cloud status timed out after ${CALL_TIMEOUT}s; skipping"
  exit 0
fi
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

# 3b. Una sola corrida a la vez. mkdir es atomico: si ya existe, hay otra corriendo.
#     Abandonado = mas viejo que la corrida mas larga posible: el presupuesto se mira al
#     empezar cada proyecto, y un proyecto puede sumar 4 llamadas (enroll, doctor, repair, sync).
STALE_AFTER=$(( BUDGET + 4 * (CALL_TIMEOUT + 5) + 120 ))
if ! mkdir "$LOCK_DIR" 2> /dev/null; then
  LOCK_TS=$(cat "$LOCK_DIR/ts" 2> /dev/null)
  # Sin ts todavia (la otra corrida acaba de crear el candado) o ts vacio: edad por la fecha de la carpeta.
  case "$LOCK_TS" in ''|*[!0-9]*) LOCK_TS=$(stat -c %Y "$LOCK_DIR" 2> /dev/null || echo "$NOW") ;; esac
  LOCK_AGE=$(( NOW - LOCK_TS ))
  if [ "$LOCK_AGE" -lt "$STALE_AFTER" ]; then
    # Lo guardado en esta sesion puede ser posterior a la pasada en curso: pedirle una mas.
    touch "$LOCK_DIR/again" 2> /dev/null
    log info "another sync running (${LOCK_AGE}s); skipping, rerun requested"
    exit 0
  fi
  log warn "stale lock (${LOCK_AGE}s); taking over"
  rm -f "$LOCK_DIR/ts" "$LOCK_DIR/again"; rmdir "$LOCK_DIR" 2> /dev/null
  mkdir "$LOCK_DIR" 2> /dev/null || exit 0
fi
echo "$NOW" > "$LOCK_DIR/ts"
# Solo libera el candado si sigue siendo el suyo: una corrida declarada abandonada no borra el de quien la reemplazo.
release_lock() {
  if [ "$(cat "$LOCK_DIR/ts" 2> /dev/null)" = "$NOW" ]; then
    rm -f "$LOCK_DIR/ts" "$LOCK_DIR/again"; rmdir "$LOCK_DIR" 2> /dev/null
  fi
}
trap release_lock EXIT

# 3c. Rotar el log (2026-11-03): llego a 5,2 MB y 29 mil lineas sin tope. Por encima de
#     LOG_MAX_BYTES (~2 MB) se queda con las ultimas LOG_KEEP lineas. Atomico: se escribe un
#     temporal y se mueve encima. Solo la corrida con el candado rota, asi dos rotaciones no
#     se pisan; una linea que otro Stop agregue entre el tail y el mv se puede perder (son
#     lineas de "throttled" o "another sync running", no de resultados).
LOG_MAX_BYTES="${ENGRAM_SYNC_LOG_MAX_BYTES:-2097152}"
LOG_KEEP="${ENGRAM_SYNC_LOG_KEEP:-5000}"
LOG_SIZE=$(wc -c < "$LOG_FILE" 2> /dev/null | tr -dc '0-9')
if [ -n "$LOG_SIZE" ] && [ "$LOG_SIZE" -gt "$LOG_MAX_BYTES" ]; then
  LOG_TMP="$LOG_FILE.tmp.$$"
  if tail -n "$LOG_KEEP" "$LOG_FILE" > "$LOG_TMP" 2> /dev/null && mv -f "$LOG_TMP" "$LOG_FILE" 2> /dev/null; then
    log info "log rotated (${LOG_SIZE} bytes > ${LOG_MAX_BYTES}); kept last ${LOG_KEEP} lines"
  else
    rm -f "$LOG_TMP" 2> /dev/null
  fi
fi

log info "starting cloud sync on session stop"

# 4. Listar projects. No hay filtro por actividad reciente: se recorren TODOS los
#    projects con al menos 1 observacion y engram sync no sube nada en los que no
#    tienen cambios (idempotente). Cada project cuesta igual sus 3 llamadas a engram.
# awk $2>0 y no grep -v "0 obs": ese grep descartaba tambien 10/20/120 obs (fix 2026-09-29)
SYNCED=0
FAILED=0
SKIPPED_EMPTY=0
DEFERRED=0
PASSES=0

# Pasadas: una normal, y otra si un Stop salteado lo pidio mientras corria (tope 3, dentro del presupuesto).
while :; do
PASSES=$((PASSES+1))
rm -f "$LOCK_DIR/again"

PROJECT_LINES=$(eng projects list 2>/dev/null | grep -E "^\s+\S+\s+[0-9]+\s+obs" | awk '$2 > 0')

if [ -z "$PROJECT_LINES" ]; then
  log warn "no projects with observations (or projects list timed out)"
  break
fi

while IFS= read -r line; do
  if [ $(( $(date +%s) - START_TS )) -ge "$BUDGET" ]; then
    DEFERRED=$((DEFERRED+1))
    continue
  fi
  PROJECT=$(echo "$line" | awk '{print $1}')
  OBS_COUNT=$(echo "$line" | awk '{print $2}')

  # Skip empties
  [ -z "$PROJECT" ] && continue
  [ "$OBS_COUNT" = "0" ] && { SKIPPED_EMPTY=$((SKIPPED_EMPTY+1)); continue; }

  # Skip system32 (default project for scope=personal, ya auto-syncea)
  # Pero sync --cloud lo cubre por idempotencia si tiene scope=project tambien
  # Lo intentamos igual; si el comando falla silenciosamente, no pasa nada.

  P_START=$(date +%s)

  # Enroll (idempotente, positional arg). engram cloud enroll <project>
  ENROLL_OUT=$(eng cloud enroll "$PROJECT" 2>&1)

  # Pre-flight doctor: detecta obs con title/content vacios ANTES de intentar push
  # Si esta blocked/repairable, aplicar repair automatico antes del sync.
  # Validado 2026-05-18: el cloud rechaza con HTTP 500 si una obs no tiene title.
  DOCTOR_OUT=$(eng cloud upgrade doctor --project "$PROJECT" 2>&1)
  if echo "$DOCTOR_OUT" | grep -q "class: repairable"; then
    log warn "repairable issues detected on $PROJECT; applying auto-repair"
    eng cloud upgrade repair --project "$PROJECT" --apply > /dev/null 2>&1
  elif echo "$DOCTOR_OUT" | grep -q "class: blocked"; then
    REASON=$(echo "$DOCTOR_OUT" | grep -E "^message:" | head -1)
    # Filtro defensivo (2026-05-18 tarde): si el bloqueo es por mutation relation/upsert,
    # es bug upstream del engram cloud. La observation principal ya sincronizo. Continuar
    # con el sync normal (que tambien filtra este caso post-call).
    if echo "$DOCTOR_OUT" | grep -qE '"relation"/"upsert"|relation/upsert'; then
      log warn "$PROJECT: relation/upsert mutation blocked (upstream bug, not repairable from client). Proceeding with sync attempt."
    else
      log error "MANUAL ACTION REQUIRED on $PROJECT: $REASON (skip sync; observations missing title/content need mem_update)"
      FAILED=$((FAILED+1))
      continue
    fi
  fi

  # Sync to cloud (--project con SPACE, no =). engram sync --cloud --project X
  # El aviso "Could not check for updates: ... 403 Forbidden" (binarios <2.0 sin
  # ENGRAM_NO_UPDATE_CHECK) matcheaba el regex de error -> falsos failed (2026-09-29).
  SYNC_OUT=$(eng sync --cloud --project "$PROJECT" 2>&1)
  SYNC_RC=$?
  SYNC_OUT=$(echo "$SYNC_OUT" | grep -v "Could not check for updates")
  # 124 = timeout corto la llamada (137 si hizo falta el kill): sin salida no es un sync OK.
  if [ "$SYNC_RC" = "124" ] || [ "$SYNC_RC" = "137" ]; then
    log error "sync timed out for $PROJECT after ${CALL_TIMEOUT}s; retried on next stop"
    FAILED=$((FAILED+1))
    continue
  fi

  # Detectar error real. Extendido 2026-05-18: incluye status 500, title required, content required, transport_failed
  if echo "$SYNC_OUT" | grep -qiE "^engram:|^error|^failed|panic:|fatal:|status 403|status 500|forbidden|transport_failed|title is required|content is required|upgrade_blocked|upgrade_repairable"; then
    # Filtro defensivo (2026-05-18 tarde): si el unico bloqueo es la mutation relation/upsert,
    # es bug upstream del engram cloud (no soporta esa mutation aun). La observation principal
    # ya sincronizo OK, solo queda metadata local. Loguear WARN, NO ERROR. Contar como OK.
    # Cuando upstream arregle el cloud server, este filtro se vuelve no-op.
    if echo "$SYNC_OUT" | grep -qE '"relation"/"upsert"|relation/upsert'; then
      log warn "$PROJECT: relation/upsert mutation not supported by cloud (upstream bug). Observation synced OK, relation metadata stays local."
      SYNCED=$((SYNCED+1))
    else
      log error "sync failed for $PROJECT: $(echo "$SYNC_OUT" | grep -iE "^engram:|^error|^failed|status|forbidden|transport_failed|required" | head -1)"
      FAILED=$((FAILED+1))
    fi
  else
    SYNCED=$((SYNCED+1))
  fi
  P_SECS=$(( $(date +%s) - P_START ))
  [ "$P_SECS" -gt 20 ] && log warn "slow project $PROJECT: ${P_SECS}s"
done <<< "$PROJECT_LINES"

[ -f "$LOCK_DIR/again" ] && [ "$PASSES" -lt 3 ] && [ $(( $(date +%s) - START_TS )) -lt "$BUDGET" ] || break
log info "rerun requested by a skipped stop; one more pass"
done

[ "$DEFERRED" -gt 0 ] && log warn "budget ${BUDGET}s exhausted; $DEFERRED projects deferred to next stop"
log info "done synced=$SYNCED failed=$FAILED skipped_empty=$SKIPPED_EMPTY deferred=$DEFERRED passes=$PASSES elapsed=$(( $(date +%s) - START_TS ))s"
exit 0
