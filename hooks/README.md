# ~/.claude/hooks

Documentación de los hooks y scripts del sistema vibecoding. Movida desde el CLAUDE.md global (§ "Hook System" y § "Delegación Zen") en la auditoría 2026-11; el CLAUDE.md deja solo lo que bloquea y un puntero a este archivo. Este archivo no se escanea como agente.

**Fuente de verdad del cableado: `~/.claude/settings.json`.** Si esta tabla y settings.json difieren, manda settings.json y hay que corregir acá. El chequeo `node audit-system.js` valida que cada hook cableado exista y corra (T2, T5, T7); no compara esta tabla.

## Hooks automáticos (cableados en settings.json, revisado 2026-11-03)

Cómo llega cada uno, según la doc oficial de hooks: **bloquea** = exit 2, el stderr vuelve a Claude como motivo; **avisa** = JSON por stdout con `hookSpecificOutput.additionalContext` y exit 0, que Claude ve junto al resultado de la tool (en los async, en el turno siguiente); **registra** = escribe un archivo y no le habla a nadie. Un hook que sale 0 y escribe a stderr no le llega a Claude ("Claude never sees stderr from a hook that exits 0"); por eso no queda ninguno avisando así.

| Hook | Evento (matcher) | Cómo | Qué |
|---|---|---|---|
| `block-no-verify` | PreToolUse (`Bash\|PowerShell`) | **BLOQUEA** | Saltos de hooks de git leídos con un parser que respeta comillas y heredocs: `--no-verify` en commit/push/merge/pull/rebase/am, `git commit -n` (también `-anm`), `-c core.hooksPath=...`, `--config-env=core.hooksPath=...`, `git config core.hooksPath <valor>`, y por entorno `HUSKY=0`, `HUSKY_SKIP_HOOKS`, `LEFTHOOK=0`, `GIT_CONFIG_KEY_n=core.hooksPath` o `GIT_CONFIG_PARAMETERS` (delante de git, o con `export` / `$env:` / `set`). El lector entiende barra invertida y backtick de PowerShell, comentarios `#`, here-strings `@'...'@` y sustituciones `$(...)`/`` `...` ``, y vuelve a analizar `bash -c`, `sh -c`, `pwsh`/`powershell -Command` (o `-EncodedCommand`), `cmd /c` y `eval`. Si no puede cerrar una comilla y el texto parece un salto de hooks, bloquea. Por texto: `--no-gpg-sign`, `push --force`, `rm -rf` sobre raíz/home/`.`/`..`/`*`, `reset --hard`, `clean -f`, `DROP TABLE/DATABASE/SCHEMA`, `chmod 777`, `chown -R`, `curl\|sh`, y en PowerShell borrado recursivo de raíz/home e `irm\|iex`. Tests: `tests/block-no-verify.test.js` |
| `config-protection` | PreToolUse (`Write\|Edit\|MultiEdit\|NotebookEdit`) | **BLOQUEA** secretos; **avisa** configs | Sin distinguir mayúsculas (`.ENV` es `.env` en Windows). Bloquea la familia `.env` por nombre: `.env*`, `<nombre>.env` y `<nombre>.env.<algo>` (salvo `.example`, `.sample`, `.template`, y salvo código como `app.env.ts` o `vite.env.d.ts`), `.dev.vars`, `.npmrc`, `service-account*.json`, `.netrc`/`_netrc`, `.git-credentials`, `.pgpass`, `.pem`, `.key`, `credentials*`, `secret(s).*`, `secret_key`, `id_rsa`, `id_ed25519`, `.pfx`, `.p12`. Avisa al tocar configs de lint/formato/tsconfig (eslint, prettier, stylelint, biome, editorconfig). Mira `file_path` o `notebook_path`. Tests: `tests/config-protection.test.js` |
| `quality-gate` | PostToolUse (`Write\|Edit\|MultiEdit`) | **avisa** | En JS/TS, sobre el texto nuevo: `debugger`, `.only()`, `@ts-ignore`, `@ts-nocheck`, `any` repetido (3 o más), TODO/FIXME, secretos y passwords hardcodeados, y `console.log/warn/error/info/debug` en código de producción (ignora tests, `__tests__`, `scripts/`, `hooks/`, `.claude/`, `node_modules/`, config). Tests: `tests/quality-gate.test.js` |
| `pre-return-audit` | PostToolUse (`Write\|Edit\|MultiEdit`), async | **avisa** (turno siguiente) | Reglas universales CSS/HTML/JSX: R1 container global 1000-1299px, sin contar líneas `@media`/`@container` (regla canónica de envelope por mood: `ux-architect.md` § "Container strategy"), R2 fuente declarada sin `<link>` ni `@font-face`, R3 sticky sin `scroll-padding-top`, R4 nav sin hamburguesa en landings, R5 más de 5 animaciones sin `prefers-reduced-motion`. Desde 2026-11-03 es `pre-return-audit.js` (sin python3); `pre-return-audit.sh` quedó como envoltorio para el uso por CLI (`--files="a.css b.html"`). No repite el mismo aviso (regla + archivo) en una sesión: estado por `session_id` en `<tmp>/claude-pre-return-audit/` (`PRA_STATE_DIR`), fail-open. Tests con fixtures y paridad contra el .sh viejo: `tests/pre-return-audit.test.js` |
| `risk-line` | PreToolUse (`Agent`), PostToolUse (Edit/Write/MultiEdit/NotebookEdit/Bash/PowerShell), Stop | **registra** | Si cada trabajo con cambios cierra con su línea `Riesgo:` del Método con red y si los ítems llevaron revisor. Log `~/.claude/logs/riesgo-line.jsonl`; resumen `node ~/.claude/hooks/risk-line.js --report`. Ema decide si pasa a bloquear. Spec: `claude-vibecoding/docs/specs/linea-riesgo-hook.md` |
| `engram-cloud-sync-on-stop` | Stop, async | **registra** (y sincroniza) | Sube a Engram cloud todos los projects con observaciones (sin filtro por actividad; `engram sync` no sube nada donde no hay cambios). Throttle 30 s, candado de una sola corrida, tope 60 s por llamada y 900 s de presupuesto; settings.json no declara `timeout` (Claude Code no lo aplica a hooks async). Pre-flight `engram cloud upgrade doctor` + `repair --apply`. Log `~/.claude/sessions/engram-cloud-sync.jsonl`, rotado a las últimas 5.000 líneas cuando pasa de ~2 MB. Tests: `tests/engram-cloud-sync.test.sh` |
| `pre-compact-engram` | PreCompact | **registra** | Guarda `snapshots/pre-compact-latest.json` y el trigger `snapshots/compaction-pending.json`, que consume el Boot Sequence del orquestador (paso 0b). Solo con una entrada real de PreCompact: con `{}` o stdin vacío (audit-system, corridas a mano) no escribe nada. No bloquea la compactación y no le habla al modelo. Tests: `tests/pre-compact-engram.test.js` |
| `engram-session-fallback` | SessionStart (`startup\|resume\|clear\|fork`) | **registra** | Solo pc004: registra la sesión en el daemon local de Engram (puerto 7437) cuando el plugin no pudo. En casa no se cablea: no hay daemon y sumaría ~3 s por arranque |

**Comportamiento común**: fail-open (si el script falla o recibe algo que no entiende, deja pasar).

**Historia**: el hook legacy `engram-sync.js` (push del repo por Git) se quitó el 2026-07-22 por doble sync; el cloud lo cubre y desde entonces el repo `claude-vibecoding` se commitea y pushea a mano. `pixel-bridge` (bridge.js en Pre/PostToolUse/Stop y `start.cmd` en Notification) se desconectó en la auditoría 2026-11: no escribió nunca un archivo y corría 2 procesos por tool call.

## Archivados (`hooks/_archivo/`, 2026-11-03)

| Script | Por qué |
|---|---|
| `console-log-warning.js` | Avisaba por stderr con exit 0, nunca le llegó al modelo; su regla quedó dentro de `quality-gate` (que sí llega), con el filtro de rutas arreglado para Windows |
| `suggest-compact.js` | Avisaba por stderr en un hook async (no se entrega); contador único para todas las sesiones y por cantidad de llamadas, no por tamaño de contexto. Claude Code ya compacta solo |
| `cost-tracker.js` | Su tope de 500 líneas era ~1 hora de actividad y perdía líneas con tools en paralelo (leer-modificar-escribir). Los transcripts de `projects/*.jsonl` ya tienen todo |
| `cost-report.js` | Solo leía el log de `cost-tracker` |
| `session-summary.js` | El recorte nunca corría (log de 4.489 líneas), no guardaba `session_id` y nadie leía el contenido |
| `session-start-context.js` | Presentaba un snapshot global, pisado por cualquier sesión, como "la sesión anterior" ("0 tool calls" salía de un contador borrado al compactar) |
| `jev-review-check.js` | Prueba jev-review cerrada el 2026-11-02 (24% de acuerdo contra el 80% exigido) |

## Ejecutables manuales (no son hooks automáticos)

| Script | Uso |
|---|---|
| `frontend-audit.sh` | Lo invoca `frontend-developer` con `--mood/--hero/--motion` para el AUTO_AUDIT pre-return (T1-T5). Complementa `pre-return-audit` con reglas que necesitan el mood |
| `jev-route-check.js` | Fase 1 paso 5b del orquestador: segunda opinión de routing de agente + flag `security_review` por tarea con Jev (TypeSafe AI). Lee `.pipeline/tareas.md`, escribe `.pipeline/jev-route-check.json`. Fail-open sin `TYPESAFE_API_KEY` |
| `zen-delegate.js` | Delegación Zen (abajo) |
| `audit-system.js` | Health check del sistema (T1-T11). T2 valida que exista cada hook cableado (`node x.js` y `bash x.sh`; los `.sh` no se ejecutan) y T7 que los avisos salgan por `additionalContext` |
| `healthcheck.js` | Health check único del sistema |
| `learning-index.js` | Índice de discoveries (`--search=keyword`) |
| `drift-check.js` | Compara el sistema vivo contra el repo `claude-vibecoding` |
| `mcp-registry.js` | Inventario de MCPs configurados |

## Delegación Zen: modelos opencode Go para tareas mecánicas

Disparador en el CLAUDE.md global § "Punteros por dominio". Adoptado 2026-06-10. **Uso registrado en casa: ninguno** (`~/.claude/logs/zen-delegate.jsonl` no existe al 2026-11-03).

Plan Go de opencode (USD 10/mes). Los límites hoy son un monto mensual por modelo, con tope de 20% en 5 h y 50% semanal (opencode.ai/docs/go, revisado 2026-11-03); el esquema "$12/5h · $60/mes" de junio quedó viejo. Script único: `node ~/.claude/hooks/zen-delegate.js` (requiere `OPENCODE_API_KEY`). Log: `~/.claude/logs/zen-delegate.jsonl` (`--report` para resumen). Flag `--model <id>` para cualquier modelo del catálogo sin tocar el script.

| `--task` | Modelo en el script | Usar para |
|---|---|---|
| `structured` | deepseek-v4.1-flash | Clasificación en lote, JSON y datos de prueba, resúmenes de docs, etiquetado masivo |
| `copy` | qwen3.7-plus | Borradores de contenido en castellano (descripciones de producto, copy de secciones) |
| `glm` | glm-5.3-flash | Análisis o razonamiento pesado, drafts largos, lectura de docs extensos: la vía para descargar trabajo de Claude cuando el margen semanal está bajo (alta 2026-08-07) |

**Estado del eval (corregido 2026-11-03).** El eval del 2026-06-10 (`Desktop/claude/zen-eval/results.json`, 3 tareas representativas) aprobó `deepseek-v4-flash` y `qwen3.7-plus`, y rechazó `deepseek-v4-pro`, `kimi-k2.6` y `minimax-m3` por reasoning leakage o respuestas vacías. `deepseek-v4.1-flash` y `glm-5.3-flash` (antes `glm-5.2`) entraron al script el 2026-10-19, cuando v4-flash salió del catálogo, **sin eval registrado**; además la tabla `PRICE` del script no conoce `glm-5.3-flash` y registra costo 0. Pendiente de decisión de Ema: correr el eval sobre los 3 actuales o volver a los aprobados.

**Keys.** `OPENCODE_API_KEY` (primaria, de empresa) + `OPENCODE_API_KEY_FALLBACK` (segunda); `zen-delegate.js` rota sola a la segunda ante 401/402/403/429 o "insufficient/quota" y registra `key_slot` en el log. La key personal vieja quedó como `OPENCODE_API_KEY_PERSONAL`. En pc004 están en `~/.bashrc`. **En casa** solo existe `OPENCODE_API_KEY` como variable de usuario de Windows (no hay `~/.bashrc`): la rotación no funciona acá.

**Sesión completa fuera de Claude (pc004; en casa no hay binario `opencode`, ni alias `oc`/`ocr`, ni provider en `~/.config/opencode/opencode.json`).** `opencode` CLI con provider custom `opencode-go` (baseURL `https://opencode.ai/zen/go/v1`; la key del plan Go NO sirve en el `/zen/v1` por defecto, da "Insufficient balance"). Default `opencode-go/glm-5.3-flash`, small model `opencode-go/qwen3.7-plus`. Uso: `oc` (interactivo) u `ocr "prompt"` (one-shot). Para refactor o exploración mecánica larga, correr ahí en vez de en Claude. Nota: el endpoint documentado hoy es `https://opencode.ai/inference/go/`; el viejo `zen/go/v1` sigue respondiendo.

**Reglas de calidad (inviolables):**
- Output delegado NUNCA va a producción directo: Claude valida SIEMPRE (muestreo ≥10% en lotes, revisión completa en piezas únicas).
- Copy delegado se audita contra `brand.json` + anti-patterns HIGH antes de usar.
- En reportes a Ema, marcar contenido delegado como `[delegado: {modelo}]`.
- NUNCA delegar: decisiones visuales o de marca, veredictos QA (evidence-collector, reality-checker), arquitectura, respuestas directas a Ema, código que toca seguridad o auth.
- Si el output delegado falla validación 2 veces, hacerlo Claude directamente; no insistir (el ahorro no justifica el loop).
- Modelos nuevos del catálogo Go requieren pasar el eval (`zen-eval/run-eval.py`) antes de adoptarse.

**Cuándo delegar (heurística):** la tarea es mecánica + el prompt cabe en pocas líneas + validar por muestreo es más barato que generarlo. Si voy a tener que leer TODO el output en detalle, no hay ahorro: hacerlo directo.
