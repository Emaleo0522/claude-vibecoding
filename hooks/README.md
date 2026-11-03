# ~/.claude/hooks

Documentación de los hooks y scripts del sistema vibecoding. Movida desde el CLAUDE.md global (§ "Hook System" y § "Delegación Zen") en la auditoría 2026-11; el CLAUDE.md deja solo lo que bloquea y un puntero a este archivo. Este archivo no se escanea como agente.

**Fuente de verdad del cableado: `~/.claude/settings.json`.** Si esta tabla y settings.json difieren, manda settings.json y hay que corregir acá. El chequeo `node audit-system.js` valida que cada hook cableado exista y corra (T1-T9); no compara esta tabla.

## Hooks automáticos (cableados en settings.json, revisado 2026-11-03)

| Hook | Evento (matcher) | Acción |
|---|---|---|
| `block-no-verify` | PreToolUse (`Bash\|PowerShell`, desde 2026-09-27) | **BLOQUEA** `git --no-verify`, `git push --force`, `rm -rf`, `git reset --hard`, `DROP TABLE`, `chmod 777`, `curl\|sh` |
| `config-protection` | PreToolUse (`Write\|Edit`) | **BLOQUEA** secretos (`.env`, `.pem`, `.key`, credentials, `id_rsa`). **ADVIERTE** configs de linting |
| `risk-line` | PreToolUse (`Agent`), PostToolUse (Edit/Write/MultiEdit/NotebookEdit/Bash/PowerShell), Stop | **REGISTRA** (solo registro, desde 2026-11-03) si cada trabajo con cambios cierra con su línea `Riesgo:` del Método con red y si los ítems llevaron revisor. Log `~/.claude/logs/riesgo-line.jsonl`; resumen `node ~/.claude/hooks/risk-line.js --report`. A los ~3 días Ema decide si pasa a bloquear. Spec: `claude-vibecoding/docs/specs/linea-riesgo-hook.md` |
| `quality-gate` | PostToolUse (`Write\|Edit`) | **ADVIERTE** debugger, `.only()`, `@ts-ignore`, secretos hardcodeados |
| `console-log-warning` | PostToolUse (`Write\|Edit`) | **ADVIERTE** console.log/warn/error en producción (ignora tests) |
| `pre-return-audit` | PostToolUse (`Write\|Edit`), async | **ADVIERTE** reglas universales CSS/HTML/JSX: container global angosto 1000-1299px (regla canónica de envelope por mood: `ux-architect.md` § "Container strategy"), fuentes declaradas sin link, anchor scroll sin scroll-padding-top, navbar mobile sin hamburger, prefers-reduced-motion ausente con >5 animaciones. Fail-open |
| `suggest-compact` | PostToolUse, async | **ADVIERTE** cada ~50 tool calls |
| `cost-tracker` | PostToolUse, async | **REGISTRA** tool calls por categoría |
| `pixel-bridge/bridge.js` | PreToolUse, PostToolUse y Stop, async | **ESCRIBE** JSONL sintético para Pixel Agents (un personaje animado por agente). Corre en cada tool call aunque el visor esté apagado |
| `pixel-bridge/standalone/start.cmd` | Notification, async | **ARRANCA** el visor standalone de Pixel Agents (Windows) |
| `session-summary` | Stop, async | **LOGUEA** actividad en JSONL |
| `engram-cloud-sync-on-stop` | Stop, async | **SINCRONIZA** Engram con el cloud Oracle al parar. Tope 60 s por llamada (`CALL_TIMEOUT`) y 900 s de presupuesto total (`BUDGET`), candado de una sola corrida; settings.json no declara `timeout` (Claude Code no lo aplica a hooks async). Pre-flight `engram cloud upgrade doctor` + `repair --apply` automático. Filtro defensivo para `relation/upsert` (bug upstream, sin confirmar si se cerró) |
| `pre-compact-engram` | PreCompact | **GUARDA** snapshot a disco antes de compactar (v2.2) |
| `session-start-context` | SessionStart (`resume`) | **CARGA** el snapshot pre-compact más reciente como contexto, **solo al retomar** una sesión; en sesiones nuevas no corre |

**Comportamiento**: exit 2 = BLOCK · exit 0 + stderr = WARN · fail-open (nunca rompe el flujo).

**Historia**: el hook legacy `engram-sync.js` (push del repo por Git) se quitó el 2026-07-22 por doble sync; el cloud lo cubre y desde entonces el repo `claude-vibecoding` se commitea y pushea a mano.

## Ejecutables manuales (no son hooks automáticos)

| Script | Uso |
|---|---|
| `frontend-audit.sh` | Lo invoca `frontend-developer` con `--mood/--hero/--motion` para el AUTO_AUDIT pre-return (T1-T5). Complementa `pre-return-audit` con reglas que necesitan el mood |
| `jev-route-check.js` | Fase 1 paso 5b del orquestador: segunda opinión de routing de agente + flag `security_review` por tarea con Jev (TypeSafe AI). Lee `.pipeline/tareas.md`, escribe `.pipeline/jev-route-check.json`. Fail-open sin `TYPESAFE_API_KEY` |
| `zen-delegate.js` | Delegación Zen (abajo) |
| `audit-system.js` | Health check del sistema (T1-T9) |
| `healthcheck.js` | Health check único del sistema |
| `cost-report.js` | Uso de tools |
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
