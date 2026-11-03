#!/usr/bin/env bash
# Prueba aislada de engram-cloud-sync-on-stop.sh con un engram falso. HOME temporal: no toca el real.
SCRIPT="${1:-$(cd "$(dirname "$0")/.." && pwd)/hooks/engram-cloud-sync-on-stop.sh}"
PASS=0; FAIL=0
ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

TMPS=()
trap 'rm -rf "${TMPS[@]}"' EXIT
ORIG_PATH="$PATH"

# $1 = segundos que tarda el sync de p2 ; $2 = segundos que tarda cada sync normal
# STUB_MODE: status-cuelga | pisa-candado (el sync de p1 cambia el ts del candado) | pide-otra (el sync de p1 pide una pasada más, una vez)
setup() {
  T=$(mktemp -d); TMPS+=("$T"); export HOME="$T/home"; mkdir -p "$HOME/.claude/sessions" "$T/bin"
  cat > "$T/bin/engram" <<EOF
#!/usr/bin/env bash
L="\$HOME/.claude/sessions/engram-cloud-sync.lock"
case "\$1 \$2" in
  "cloud status") [ "$STUB_MODE" = "status-cuelga" ] && sleep 100; echo "cloud: ready" ;;
  "projects list") printf '  p1  5 obs\n  p2  3 obs\n  p3  2 obs\n' ;;
  "cloud enroll") echo enrolled ;;
  "cloud upgrade") echo "class: ready" ;;
  "sync --cloud")
    if [ "\$4" = "p1" ] && [ "$STUB_MODE" = "pisa-candado" ]; then echo 1 > "\$L/ts"; fi
    if [ "\$4" = "p1" ] && [ "$STUB_MODE" = "pide-otra" ] && [ ! -f "$T/ya-pedida" ]; then touch "$T/ya-pedida" "\$L/again"; fi
    if [ "\$4" = "p2" ]; then sleep $1; else sleep $2; fi; echo "synced \$4" ;;
esac
EOF
  chmod +x "$T/bin/engram"; export PATH="$T/bin:$ORIG_PATH"
  LOG="$HOME/.claude/sessions/engram-cloud-sync.jsonl"; LOCK="$HOME/.claude/sessions/engram-cloud-sync.lock"
}

echo "1. llamada colgada"
setup 100 0
s=$(date +%s); ENGRAM_SYNC_CALL_TIMEOUT=2 ENGRAM_SYNC_BUDGET=60 bash "$SCRIPT" </dev/null; e=$(( $(date +%s) - s ))
[ "$e" -le 10 ] && ok "termina en ${e}s pese a un sync colgado" || bad "tardó ${e}s"
grep -q "sync timed out for p2" "$LOG" && ok "registra el timeout de p2" || bad "no registra timeout"
grep -q "synced=2 failed=1" "$LOG" && ok "p1 y p3 sincronizan, p2 cuenta como fallo" || bad "conteo: $(grep done "$LOG")"
[ ! -d "$LOCK" ] && ok "libera el candado al terminar" || bad "candado quedó tomado"
ps -ef | grep -q "[s]leep 100" && bad "quedó un proceso colgado vivo" || ok "no queda el proceso colgado"

echo "2. presupuesto agotado"
setup 3 3
ENGRAM_SYNC_CALL_TIMEOUT=10 ENGRAM_SYNC_BUDGET=4 bash "$SCRIPT" </dev/null
# El tiempo exacto depende de la máquina: se exige que sincronice al menos uno, difiera al menos uno, y no pierda ninguno.
D=$(grep -o 'synced=[0-9]* failed=[0-9]* skipped_empty=[0-9]* deferred=[0-9]*' "$LOG" | tr -dc '0-9 =' | tr '=' ' ')
set -- $(grep -o 'synced=[0-9]*\|deferred=[0-9]*' "$LOG" | cut -d= -f2)
[ "$1" -ge 1 ] && [ "$2" -ge 1 ] && [ $(( $1 + $2 )) -eq 3 ] && ok "sincroniza $1 y difiere $2, sin perder ninguno" || bad "deferred: $(grep done "$LOG")"
set -- "$SCRIPT"
grep -q "deferred to next stop" "$LOG" && ok "avisa en el log" || bad "sin aviso de presupuesto"

echo "3. candado ocupado"
setup 0 0
mkdir -p "$LOCK"; date +%s > "$LOCK/ts"
ENGRAM_SYNC_BUDGET=900 bash "$SCRIPT" </dev/null
grep -q "another sync running" "$LOG" && ok "no arranca una segunda corrida" || bad "corrió igual"
grep -q "starting cloud sync" "$LOG" && bad "llegó a sincronizar" || ok "no sincroniza"
[ -d "$LOCK" ] && ok "respeta el candado ajeno" || bad "borró el candado de otro"

echo "4. candado abandonado"
setup 0 0
mkdir -p "$LOCK"; echo $(( $(date +%s) - 2000 )) > "$LOCK/ts"
ENGRAM_SYNC_BUDGET=900 bash "$SCRIPT" </dev/null
grep -q "stale lock" "$LOG" && ok "detecta el candado viejo" || bad "no lo detecta"
grep -q "synced=3 failed=0" "$LOG" && ok "toma el control y sincroniza" || bad "conteo: $(grep done "$LOG")"
[ ! -d "$LOCK" ] && ok "y lo libera al final" || bad "candado quedó"

echo "5. caso normal"
setup 0 0
bash "$SCRIPT" </dev/null
grep -q "synced=3 failed=0 skipped_empty=0 deferred=0 passes=1" "$LOG" && ok "todo OK, una sola pasada" || bad "conteo: $(grep done "$LOG")"

echo "6. candado recién creado, todavía sin ts"
setup 0 0
mkdir -p "$LOCK"
bash "$SCRIPT" </dev/null
grep -q "another sync running" "$LOG" && ok "lo toma como ocupado, no como abandonado" || bad "$(tail -2 "$LOG")"
grep -q "stale lock" "$LOG" && bad "lo declaró abandonado" || ok "no lo pisa"
[ -f "$LOCK/again" ] && ok "deja pedida otra pasada" || bad "no pidió otra pasada"

echo "7. una corrida no borra el candado de quien la reemplazó"
STUB_MODE=pisa-candado setup 0 0
STUB_MODE=pisa-candado bash "$SCRIPT" </dev/null
[ -d "$LOCK" ] && [ "$(cat "$LOCK/ts")" = "1" ] && ok "el candado ajeno sigue intacto" || bad "borró el candado ajeno"

echo "8. un Stop salteado pide otra pasada"
STUB_MODE=pide-otra setup 0 0
STUB_MODE=pide-otra bash "$SCRIPT" </dev/null
grep -q "passes=2" "$LOG" && ok "hace una pasada más" || bad "pasadas: $(grep done "$LOG")"
grep -q "synced=6" "$LOG" && ok "sincroniza todo de nuevo en la segunda" || bad "conteo: $(grep done "$LOG")"
[ ! -d "$LOCK" ] && ok "libera el candado al final" || bad "candado quedó"

echo "9. cloud status colgado"
STUB_MODE=status-cuelga setup 0 0
s=$(date +%s); STUB_MODE=status-cuelga ENGRAM_SYNC_CALL_TIMEOUT=2 bash "$SCRIPT" </dev/null; e=$(( $(date +%s) - s ))
[ "$e" -le 10 ] && ok "corta en ${e}s" || bad "tardó ${e}s"
grep -q "cloud status timed out" "$LOG" && ok "lo dice en el log (no 'not configured')" || bad "$(tail -1 "$LOG")"
unset STUB_MODE

# Log previo de N lineas de ~400 bytes, numeradas old-000001...
prefill() { awk -v n="$1" 'BEGIN{for(i=1;i<=n;i++) printf "{\"ts\":\"x\",\"level\":\"info\",\"msg\":\"old-%06d %380s\"}\n", i, ""}' > "$LOG"; }

echo "10. log por encima del tope: rota y se queda con las ultimas lineas"
setup 0 0
prefill 100
ENGRAM_SYNC_LOG_MAX_BYTES=2000 ENGRAM_SYNC_LOG_KEEP=20 bash "$SCRIPT" </dev/null
N=$(wc -l < "$LOG")
[ "$N" -le 30 ] && ok "quedaron $N lineas (20 + las de esta corrida)" || bad "quedaron $N lineas"
grep -q "old-000001" "$LOG" && bad "no descarto las viejas" || ok "descarta las mas viejas"
grep -q "old-000100" "$LOG" && grep -q "old-000081" "$LOG" && ok "conserva las ultimas 20 previas" || bad "perdio lineas recientes"
grep -q "old-000080" "$LOG" && bad "se quedo con mas de 20 previas" || ok "corta justo en 20"
grep -q "synced=3 failed=0" "$LOG" && ok "la corrida sigue logueando despues de rotar" || bad "sin linea done"
ls "$HOME/.claude/sessions/" | grep -q "tmp" && bad "quedo un temporal" || ok "no deja temporales"

echo "11. log por debajo del tope: no se toca"
setup 0 0
prefill 10
ENGRAM_SYNC_LOG_MAX_BYTES=100000 ENGRAM_SYNC_LOG_KEEP=5 bash "$SCRIPT" </dev/null
grep -q "old-000001" "$LOG" && grep -q "old-000010" "$LOG" && ok "conserva todo" || bad "roto sin pasar el tope"

echo "12. valores por defecto: mas de ~2 MB, se queda con 5000"
setup 0 0
prefill 6000
[ "$(wc -c < "$LOG")" -gt 2097152 ] || bad "fixture chico: $(wc -c < "$LOG") bytes"
bash "$SCRIPT" </dev/null
N=$(wc -l < "$LOG")
[ "$N" -ge 5000 ] && [ "$N" -le 5010 ] && ok "quedaron $N lineas" || bad "quedaron $N lineas"
grep -q "old-001000\b" "$LOG" && bad "no descarto las viejas" || ok "descarta las 1000 mas viejas"
grep -q "old-001001" "$LOG" && grep -q "old-006000" "$LOG" && ok "conserva desde la 1001" || bad "corte mal ubicado"

echo "13. con el candado ocupado no rota (lo hace solo la corrida que tiene el candado)"
setup 0 0
prefill 100
mkdir -p "$LOCK"; date +%s > "$LOCK/ts"
ENGRAM_SYNC_LOG_MAX_BYTES=2000 ENGRAM_SYNC_LOG_KEEP=20 bash "$SCRIPT" </dev/null
grep -q "old-000001" "$LOG" && ok "no toca el log" || bad "roto sin el candado"

echo; echo "$PASS passed, $FAIL failed"; [ "$FAIL" = 0 ]
