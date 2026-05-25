# Sistema Vibecoding Híbrido

## Modos de trabajo

Claude opera en 4 modos distintos. El usuario elige explícitamente cuál usar:

| Modo | Cuándo usarlo | Cómo activarlo |
|------|--------------|----------------|
| **Claude normal** | Preguntas, fixes puntuales, revisiones, chat técnico | Por defecto — simplemente habla |
| **Orquestador** | Proyectos completos de software de principio a fin | Di explícitamente: *"activa el pipeline"*, *"modo orquestador"*, o *"nuevo proyecto completo: X"* |
| **Modo Modificación** | Cambios sobre proyecto ya completado (mini-pipeline) | Detectado automáticamente por el orquestador (ver `orquestador.md` § Modo Modificación) |
| **Modo Diagnóstico** | Auditar código existente sin tocarlo (due diligence, audits de proyectos ajenos) | Di explícitamente: *"modo diagnóstico"*, *"audita"*, *"diagnostica"*, *"evalúa sin tocar"*, *"audita este código"* |

Cuando se activa el modo orquestador, Claude adopta el comportamiento definido en `~/.claude/agents/orquestador.md` — pipeline de 5 fases, delegación a subagentes, sin hacer trabajo real inline.

### Modo Diagnóstico — reglas operativas

Este modo es **READ-ONLY POR DOCTRINA**. No es enforceable técnicamente (la harness permite Edit), pero el agente se auto-restringe.

**Triggers explícitos** (frases que activan el modo):
- "modo diagnóstico" / "modo diagnostico"
- "audita {esto/este código/este repo}"
- "diagnostica {X}"
- "evalúa sin tocar"
- "review only" / "solo revisar"

**Reglas inviolables del modo**:
- ❌ **NO** `Edit`, `Write`, `NotebookEdit` (cambios a archivos)
- ❌ **NO** `Bash` con state-mutating commands: `rm`, `mv`, `>` redirects, `sed -i`, `git commit`, `git push`, `npm install`, migrations, etc.
- ✅ `Read`, `Grep`, `Glob` (lectura)
- ✅ `Bash` con read-only: `cat`, `ls`, `git log`, `git diff`, `npm ls`, `node --check`, etc.
- ✅ `mem_search`, `mem_get_observation` (lectura Engram)
- ⚠️ `mem_save` SOLO con `scope=personal` para guardar hallazgos del audit, NUNCA `scope=project`
- ✅ Spawnear `Plan` o `Explore` subagents (también read-only)

**Output OBLIGATORIO — Reporte estructurado Markdown**:
```
# Diagnóstico — {nombre proyecto/path}

## TL;DR
{1-2 líneas con conclusión principal}

## Tabla resumen
| Severidad | Count |
| Crítico   | N     |
| Alto      | N     |
| Medio     | N     |
| Bajo      | N     |

## Hallazgos
### Críticos
- C1: ... (cita literal de la regla/anti-pattern violada)
- C2: ...
### Altos
- ...
### Medios / Bajos
- ...

## Lo que NO toqué
- (lista explícita de archivos leídos pero NO modificados — read-only confirma)

## Recomendaciones priorizadas
1. {fix más crítico} — esfuerzo: {bajo/medio/alto}
2. ...

## Pregunta cierre
¿Querés salir de Modo Diagnóstico y aplicar algunos fixes? Entrá a Modo Modificación pasándome la lista priorizada.
```

**Distinciones importantes**:
- **Modo Diagnóstico ≠ `reality-checker` agent**: reality-checker es la certificación final de un proyecto generado por el pipeline. Modo Diagnóstico es para auditar proyectos AJENOS o pre-existentes del usuario.
- **Modo Diagnóstico ≠ `Plan` subagent**: Plan diseña implementación FUTURA. Diagnóstico evalúa código EXISTENTE.

**Salida del modo**:
- Trigger explícito: "salí de modo diagnóstico", "aplicá los fixes", "ahora modificá"
- Si el usuario pide modificación dentro del modo SIN salir explícitamente, el agente pregunta: *"Estamos en Modo Diagnóstico (read-only). ¿Confirmás salir y aplicar el fix?"*

**Casos de uso reales** (validados 2026-05-14):
- Auditoría WebCodexAtlas (Lucas Rojo) → reporte 24 hallazgos + PR
- Auditoría Claude-Atlas (Lucas Rojo) → reporte 25 hallazgos + 3 propuestas para sumar a vibecoding

## Delegation Stop Rules — cuándo escalar al pipeline

En modo Claude normal, si detectás cualquiera de estos triggers, sugerí al usuario activar el pipeline (no asumir, preguntar):

| Trigger | Umbral | Acción |
|---|---|---|
| Lecturas exploratorias consecutivas | 5+ archivos distintos | Spawn `Explore` o pausar |
| Archivos leídos para entender un flow | 4+ en la misma tarea | Spawn `Explore` subagent |
| Archivos no-triviales escritos | 2+ con cambios sustantivos | Fresh review con subagente |
| Tool calls totales sin spawn | 20+ en una sesión | Pausar, re-planificar o sugerir orquestador |
| Ediciones no-mecánicas consecutivas | 2+ con complejidad creciente | Pausar, justificar o delegar |
| Después de incidente (`cd` mal, accidente git, recovery merge) | siempre | Fresh audit antes de seguir |
| Antes de commit/push/PR no-trivial | siempre | Fresh review (salvo docs triviales) |

Umbrales deterministas; "no-trivial" y "complejidad creciente" los evalúa Claude. No hay enforcement — es policy advisory. Adaptado de gentle-ai (Gentleman-Programming) — 2026-05-18.

## Skill & Reference Index

`~/.claude/agents/AGENTS.md` mapea las 15 referencias (`*-reference.md`) con triggers y skip conditions. Consultar antes de cargar refs pesadas — evita tokens innecesarios. No es un agente ejecutable, es un índice. Adaptado de gentle-ai/guardian-angel — 2026-05-18.

## Arquitectura

Este sistema usa un **orquestador central** (1 coordinador + 24 subagentes = 25 entidades). Los subagentes solo responden al orquestador, nunca entre sí.

### Pipeline (5 fases)
```
Fase 1  Planificación      → Paso 0: Intent Clarifier (obligatorio en proyectos nuevos)
                          → project-manager-senior
Fase 2  Arquitectura       → ux-architect (parametric CSS) → ui-designer (behavioral specs) + security-engineer (paralelo)
  └─ Paso 1.5: Visual Direction Checkpoint — pausa para consultar al usuario sobre decisiones visuales clave
Fase 2B Assets visuales    → brand-agent → (pausa aprobación) → logo-agent + image-agent (paralelo) → video-agent
Fase 3  Dev ↔ QA Loop     → dev-agents (aplican design decision tree) ↔ evidence-collector (3 reintentos)
Fase 4  Certificación      → seo-discovery + api-tester + performance-benchmarker + reality-checker
Fase 5  Publicación        → git (confirmación) → deployer (confirmación)

Modo Modificación → análisis → planificación ligera → mini Fase 3+QA (para proyectos ya completados)
```

### Intent Clarifier (Fase 1, Paso 0 — NUEVO)
Obligatorio en proyectos nuevos. El orquestador evalúa si el brief del usuario es claro o vago (heurística de word count + vocabulario de diseño + referencias). Si es vago, presenta 6 preguntas con opciones múltiples (tipo proyecto, industria, mood preset, referencia visual opcional, nivel originalidad, audiencia) para capturar intent antes de planificar. Q3 (mood preset) y Q5 (originalidad) son SIEMPRE obligatorias — bloquean "decidí vos" para evitar outputs genéricos. Resultado en `{proyecto}/intent`. Detalles completos en `~/.claude/agents/intent-clarifier-reference.md` (extraído de `orquestador.md` el 2026-05-15, cargado condicionalmente por el orquestador solo cuando hace falta).

### Visual Direction Checkpoint (Fase 2, Paso 1.5)
Pausa entre ux-architect y ui-designer donde el usuario elige estilo visual, hero, navegación, galería, nivel de animación, mood y efectos especiales. Pre-filleable con `{proyecto}/intent` capturado en Fase 1. Detalles en `pipeline-reference.md`.

### Model routing (Opus / Sonnet)

| Modelo | Agentes | Criterio |
|--------|---------|----------|
| **Opus** | orquestador, project-manager-senior, security-engineer, game-designer, reality-checker | Decisiones arquitectonicas complejas, planificacion, threat modeling, certificacion final |
| **Sonnet** | Todos los demas (20 agentes) | Ejecucion de tareas definidas, QA, utilidades, creativos |

Cada agente tiene `model:` en su frontmatter YAML. El orquestador lo respeta al hacer spawn.

### Regla de oro
El orquestador **NUNCA** hace trabajo real (no lee código, no escribe código, no analiza arquitectura). Solo coordina. Cada token inline es contexto perdido.

## Gestión de contexto

### Reglas de protección de contexto
- **Handoffs mínimos**: subagentes devuelven solo STATUS + archivos + issues. Nunca código completo.
- **Screenshots a disco**: QA guarda en `/tmp/qa/` y pasa solo rutas, nunca imágenes inline.
- **No duplicar en contexto**: si la info está en Engram, pasar solo el topic_key, no el contenido.

### Engram (memoria persistente)
- **Lectura siempre en 2 pasos**: `mem_search` → `mem_get_observation` (nunca usar preview truncada)
- **Escritura siempre con topic_key**: evita duplicados en reintentos
- **Actualizar, no duplicar**: usar `mem_update(observation_id, nuevo)` si el cajón ya existe
- **Dual-write critico**: `{proyecto}/estado` y `{proyecto}/tareas` se guardan SIEMPRE en Engram + disco (`{project_dir}/.pipeline/`)
- **Proactive saves**: subagentes guardan descubrimientos no obvios con topic key `{proyecto}/discovery-{desc}`

### Protocolo "guarda en engram" — cross-PC garantizado (modo Claude normal)

Cuando el usuario diga "guarda en engram", "guardalo", "guardá esto", "remember this" o similar, ejecutar en orden:

1. **Determinar tema** desde contexto reciente de la conversación (qué se estuvo discutiendo)
2. **Decidir el `project=` ANTES de buscar** (constraint cloud whitelist):
   - Si el tema es específico de un proyecto existente → `project="saldoar"`, `project="claude-vibecoding"`, etc. (debe ser uno YA enrolled en cloud — ver `engram projects list`)
   - Si es info **truly personal cross-PC** (preferencias, tareas multi-proyecto, decisiones globales) → `project="personal"` (bucket limpio, agregado al cloud whitelist el 2026-05-15)
   - Si es **info de ideas/inbox** → `project="ideas-vault"`
   - Si es **info de efectos/reels/codepen** → `project="reel-vault"` o `codepen-vault`
   - Si es **info de tooling/scripts/utilities** → `project="tooling-vault"`
   - Si es **descubrimiento cross-proyecto** → `project="discoveries"`
   - **Para nombres nuevos no en la lista actual**: agregar a `ENGRAM_CLOUD_ALLOWED_PROJECTS` en el server Oracle vía SSH. Sin eso, el cloud retorna 403 forbidden. La lista actual incluye los proyectos existentes + 6 buckets clean nuevos (personal, cross-pc, ideas-vault, reel-vault, tooling-vault, discoveries). Ver `/opt/engram-cloud/.env` en server.
3. **Buscar similares** antes de escribir:
   ```
   results = mem_search(tema, project="<el-decidido-en-paso-2>", scope="personal")
   ```
4. **Decidir acción**:
   - **Si hay match relevante (similitud alta + mismo dominio)**:
     - `mem_update(observation_id, ...)` si es refinamiento o corrección
     - `mem_save(topic_key="{family}/{nuevo-slug}", ...)` si es nuevo subtema de la misma familia
     - `mem_judge` si el nuevo contradice un existente
   - **Si NO hay match**: `mem_save` con `topic_key` nuevo y namespace lógico (ej `saldoar/proveedores/reunion-15hs`, `vibecoding/refero-integration`)
5. **SIEMPRE `scope="personal"`** — los saves scope=project NO auto-syncan al cloud (validado 2026-05-15). El cloud sync funciona scope-agnostic pero el filtro por defecto del MCP usa scope.
6. **`project=` EXPLÍCITO en mem_save Y mem_search** — el MCP auto-detecta project del cwd del server (en casa=`system32`, en pc004 varía según donde abriste Claude Desktop). Sin project explícito, cada PC routea a un bucket distinto y los saves no se cruzan aunque el cloud los tenga. **Esto es crítico para cross-PC retomable**.
7. **Confirmar al usuario** qué topic_key + project se usaron y por qué (linking vs nuevo).

**Razón**: validado empíricamente 2026-05-15 — obs #3111 guardado en casa con auto-detect `project=system32` → invisible desde pc004 con auto-detect `project=dashboard-pm`. Solo después de `mem_search("...", project="system32")` explícito desde pc004, la obs aparece.

**Cloud allowlist** (resuelto self-hosted 2026-05-15): el server Oracle Cloud (`161.153.203.83`) tiene `ENGRAM_CLOUD_ALLOWED_PROJECTS` en `/opt/engram-cloud/.env`. Para agregar un bucket nuevo: SSH al server, editar `.env`, `docker compose up -d cloud`. Backup automático por convención `.env.bak.YYYYMMDD-pre-{razon}`. Issue upstream para auto-allow opt-in: github.com/Gentleman-Programming/engram

**Anti-patrón a evitar**: dejar que el MCP auto-detecte project del cwd. SIEMPRE pasar `project=` explícito en ambos `mem_save` y `mem_search` cross-PC. Si necesitás un bucket personal global, usar `project="system32"` (de-facto convention) hasta que upstream permita nombres custom.

**Bootstrap de proyecto NUEVO (path limpio cuando no existe en DB todavía)**:

Si el MCP plugin retorna `ambiguous_project` y el proyecto NO aparece en `engram projects list` (es decir, **no existe todavía en el DB local**), el camino correcto NO es recovery_token sino CLI bootstrap:

1. **CLI bootstrap (una vez)**:
   ```bash
   engram save "first save title" "first content" \
     --project NUEVO_NOMBRE --scope personal --type discovery
   ```
   El CLI crea el proyecto al vuelo. El MCP plugin no puede (validación estricta de proyecto existente).

2. **Después del bootstrap**, el MCP plugin acepta `project="NUEVO_NOMBRE"` explícito en `mem_save` y `mem_search` aunque `available_projects` no lo liste (esa lista es cwd-scoped, no el full project list).

3. **Para cross-PC sync**: agregar el proyecto al cloud whitelist también (`/opt/engram-cloud/.env` via SSH — ver § "Cloud allowlist" arriba).

**Distinción crítica entre los dos paths**:
- `recovery_token` path (existing) → proyecto EXISTE en DB, hay ambigüedad de cwd con múltiples git repos
- `CLI bootstrap` path (NEW) → proyecto NO EXISTE todavía en DB, crearlo

**`available_projects` del MCP es cwd-scoped, NO el listado completo del DB**. El CLI (`engram projects list`) ve ~68 proyectos, el MCP scan solo muestra los que están como sub-repos del cwd donde corre el MCP server (típicamente 2-5). Esta es la diferencia que confunde: proyectos como `discoveries` / `personal` pueden estar en el DB y aceptarse con `project=` explícito en MCP, pero no aparecen en `available_projects`.

Validado 2026-05-16 con vibefx (no en cloud whitelist, no detectado por MCP cwd-scan): SSH agregando vibefx a `ENGRAM_CLOUD_ALLOWED_PROJECTS` + `engram save --project vibefx` via CLI = full operability en una sesión (obs #3128, #3129, #3130).

### Protocolo de save robusto — anti silent-fail cloud (2026-05-18)

Validado empíricamente: `mem_save` puede retornar OK al cliente y aun así NUNCA llegar al cloud si la observation viola constraints del cloud server (HTTP 500 silencioso). Las obs quedan local-only e invisibles cross-PC hasta que se reparen manualmente.

**Capa 1 — Pre-save (obligatorio antes de TODO `mem_save`)**:
1. `title` **NUNCA es opcional**. Si dudo, formato: `{tema-corto} — {fecha YYYY-MM-DD}`. Mínimo 8 chars, máximo 80.
2. `content` mínimo 20 chars con info real. NO guardar placeholders ("WIP", "TBD", "(empty)").
3. `topic_key` con namespace `{proyecto}/{slug}` o `{family}/{slug}`.
4. `project=` explícito (whitelist del cloud) — NUNCA dejar auto-detect del cwd.
5. `scope="personal"` para cross-PC (regla validada 2026-05-15).

**Capa 1b — Whitelist gate (solo si el project es desconocido)**:

Lista sintética de buckets más usados (verificar con `engram projects list` si tu proyecto no está acá):
- `claude-vibecoding` (sistema)
- `saldoar`, `saldoar-outreach`
- `vetconnect`, `kahntus`, `kahntus-portfolio`
- `dashboard-pm`
- `personal`, `ideas-vault`, `discoveries`
- `system32`
- `cross-claude-mailbox` (canal asíncrono entre instancias — ver § "Cross-Claude Mailbox Protocol")

Si tu proyecto NO está en esta lista → correr `engram projects list | grep -w "{nombre}"` antes del primer save. Si no aparece, es proyecto nuevo (Path B bootstrap CLI).

- Si confirma 403/desconocido: **NO inventar** un bucket. Preguntar al usuario: (a) usar uno existente que aplique, o (b) autorizar agregar el nuevo a la whitelist (requiere SSH al server + edit `/opt/engram-cloud/.env` + `docker compose up -d cloud` + backup `.env.bak.YYYYMMDD-pre-{razon}`).
- **NUNCA hacer SSH + restart sin confirmación EXPLÍCITA del usuario** — toca infra del server productivo. "Explícita" significa: el usuario dijo literalmente *"sí, hacé el SSH"* / *"autorizá SSH al server"* / *"dale, modificá la whitelist en Oracle"* — referencia inequívoca a la acción concreta. Un *"OK dale"*, *"sí adelante"* o *"hacelo"* en respuesta a una pregunta más genérica (ej: *"¿activamos el bucket?"*) **NO es autorización SSH**. Si la respuesta del usuario fue ambigua, preguntar explícitamente: *"¿Confirmás que vas a hacer SSH al server Oracle + editar /opt/engram-cloud/.env + docker compose up -d cloud? Esto toca infra productiva."* — esperar respuesta literal afirmativa antes de proceder. Validado 2026-05-18 tarde: pc004 hizo SSH sobre un "OK" genérico al activar el bucket cross-claude-mailbox; el usuario después aclaró que no entendía el alcance. Regla endurecida para prevenir recurrencia.

**Capa 2 — Post-save verify (1 search barato, obligatorio)**:
Después de cada `mem_save` exitoso:
```
verify = mem_search(topic_key_exacto, project=mismo_project, limit=1)
if verify retorna empty → loguear y avisar al usuario
```
Confirmar al usuario: *"Guardado #ID title='X' project=Y topic_key=Z"*. Sin la confirmación, no asumir que se guardó.

**Capa 3 — Cloud sync gate (antes de cerrar sesión / cada N saves)**:
Si guardaste memoria en esta sesión, antes de "dar por terminado":
```bash
engram cloud upgrade doctor --project <proyecto>
```
- `status=ready` → OK
- `status=blocked, class=repairable` → `engram cloud upgrade repair --project X --apply` + `engram sync --cloud --project X`
- `status=blocked, class=blocked` → identificar la obs problemática (`title required` o `content required`), `mem_update` con título/content válido, repetir doctor
  - **Excepción `relation/upsert`** (2026-05-18): si el `message` contiene `"relation"/"upsert"` (mutation legacy no soportada por el cloud actual), NO es reparable desde el cliente. Loguear WARN, cerrar sesión OK. Bug upstream engram cloud — el hook `engram-cloud-sync-on-stop.sh` ya filtra este caso defensivamente.

**Anti-patrones detectados (no repetir)**:
- ❌ `mem_save(content=..., type="decision")` sin `title=` → cloud rechaza 500
- ❌ `mem_save(title="", ...)` con title vacío string → cloud rechaza 500
- ❌ Pensar que `mem_save` exitoso = "está en el cloud". Solo significa "está en SQLite local".

**Hook `engram-cloud-sync-on-stop.sh` (patched 2026-05-18)**: ahora corre `engram cloud upgrade doctor` pre-flight y aplica `repair --apply` automáticamente si hay observations reparables antes del push. Regex de detección de errores extendido para incluir `status 500`, `title is required`, `content is required`, `transport_failed`, `upgrade_blocked`, `upgrade_repairable` (antes solo capturaba 403/forbidden). Filtro defensivo añadido tarde 2026-05-18 para `relation/upsert` (bug upstream cloud).

### Cross-Claude Mailbox Protocol (2026-05-18)

Convención asíncrona para que dos instancias de Claude (ej. `pc004` Linux + `casa` Windows) se comuniquen vía engram cloud **sin requerir relay manual del usuario**. Reusa la infraestructura existente — no es un canal nuevo, solo convención sobre engram.

**Bucket dedicado**: `cross-claude-mailbox` (en cloud whitelist).

**Convención de topic keys**:
- `mailbox/from-{pc-origen}/to-{pc-destino}/{YYYYMMDD-HHMMSS}-{slug}` → query
- `mailbox/from-{pc-origen}/to-{pc-destino}/{YYYYMMDD-HHMMSS}-{slug}-reply` → respuesta
- Notación de pc: `pc004` (Linux), `casa` (Windows). Ajustar si hay más instancias.

**Flujo (OPT-IN — NO ejecutar por default cada turn)**:

1. **Cuando el usuario lo activa explícitamente** con frases como *"chequeá el mailbox"*, *"¿hay mensajes de pc004?"*, *"revisá comunicaciones cross-PC"*, o cuando inicia un workflow conocido cross-PC (sync de cambios, ronda M2/M3, coordinación de pushes), ejecutar 1 search barato:
   ```
   pending = mem_search(query="to-{mi-pc}", project="cross-claude-mailbox", scope="personal", limit=5)
   ```
   **NO ejecutar este search por default en cada turn**: costaría ~50-100 tokens × ~50 turns/día = ~3-5k tokens diarios solo en checks de mailbox vacíos. El opt-in elimina ese overhead cuando no se está coordinando cross-PC. Cuando hay un workflow cross-PC activo, el usuario lo señaliza y ahí sí se chequea.
2. Si hay queries pendientes sin `*-reply` asociado → procesar antes de responder al usuario.
3. **Para CHECKS** (lecturas, greps, `engram doctor`, `mem_search`, `git status`, etc.) → ejecutar y guardar `*-reply` directamente.
4. **Para EDITS** (`Edit`, `Write`, `Bash` mutating, `SSH`, push, deploy) → **NO auto-aplicar**. Guardar `*-reply` con `requires_user_approval: true` y avisar al usuario en el turn actual.

**Schema de query**:
```yaml
title: "[mailbox] {pregunta corta}"
type: question
scope: personal
project: cross-claude-mailbox
topic_key: mailbox/from-{pc-origen}/to-{pc-destino}/{ts}-{slug}
content:
  from: {pc-origen}
  to: {pc-destino}
  query: "{pregunta concreta}"
  requires_edit: false  # true si la respuesta involucra edits
  requires_user_approval: false  # auto-true si requires_edit=true
```

**Schema de reply**:
```yaml
title: "[mailbox-reply] {tema}"
type: discovery
scope: personal
project: cross-claude-mailbox
topic_key: mailbox/from-{pc-respondiendo}/to-{pc-original}/{ts}-{slug}-reply
content:
  in_reply_to_topic_key: {topic_key de la query}
  result: "{respuesta concreta + outputs}"
  edits_required: []  # lista de archivos si aplica
  requires_user_approval: true|false
```

**Anti-patrones**:
- ❌ Auto-aplicar edits sugeridos por el otro Claude sin confirmación del usuario.
- ❌ Spammear el mailbox con queries triviales (cada mensaje cuesta engram storage).
- ❌ No identificarse en `from:` (ambigüedad cross-PC).
- ❌ Asumir que el reply va a llegar inmediato — el otro Claude solo responde cuando el usuario lo despierta en su PC.

**Limitación honesta**: NO es realtime. El Claude destinatario solo "responde" cuando vos le escribís en su PC y dispara su mailbox check. Los mensajes persisten, no se pierden. Si necesitás realtime, escalar a MCP bridge custom (deferred).

### Lectura Engram — bloque canonico (referencia para todos los agentes)
```
# Leer de Engram (2 pasos OBLIGATORIOS — nunca usar preview truncada)
result = mem_search("{proyecto}/{cajon}")
if result.observation_id:
    full = mem_get_observation(result.observation_id)
    # usar full.content — NUNCA result.preview
else:
    # cajon no existe — informar al orquestador
```

### Perfil personal del usuario
El **orquestador** ejecuta `mem_context(scope="personal")` como **paso 0 del Boot Sequence**. Los hooks NO pueden llamar MCPs. En modo Claude normal, llamar `mem_context(scope="personal")` manualmente al inicio.

### Resiliencia Engram
- **Disk fallback**: si Engram falla → `{project_dir}/.pipeline/{cajon}.md`. Orquestador busca Engram primero, luego disco.
- **Cajones críticos** (estado, tareas, css-foundation, design-system, security-spec, gdd): si no están en Engram ni disco → STATUS fallido con BLOQUEADORES.
- **Retry counter**: el orquestador posee `intento_actual` (no el subagente), persistido en DAG State.

> **Detalles completos** (Boot Sequence, carga progresiva del DAG State, continuidad entre sesiones, topic keys completa, pre-compact snapshot): ver `orquestador.md`

## Hook System (15 hooks, ultimo 2026-05-15: engram-cloud-sync-on-stop)

Hooks interceptan tool calls en tiempo real. Configurados en `~/.claude/settings.json`. Scripts en `~/.claude/hooks/`.

| Hook | Accion |
|------|--------|
| `block-no-verify` | **BLOQUEA** git --no-verify, git push --force, rm -rf, git reset --hard, DROP TABLE, chmod 777, curl\|sh |
| `config-protection` | **BLOQUEA** secrets (.env, .pem, .key). **ADVIERTE** configs de linting |
| `quality-gate` | **ADVIERTE** debugger, .only(), @ts-ignore, secrets hardcodeados |
| `console-log-warning` | **ADVIERTE** console.log/warn/error en produccion (ignora tests) |
| `suggest-compact` | **ADVIERTE** cada ~50 tool calls (async) |
| `pre-compact-engram` | **GUARDA** snapshot a disco antes de compactar (v2.2) |
| `cost-tracker` | **REGISTRA** tool calls por categoria (async) |
| `session-summary` | **LOGUEA** actividad en JSONL (async) |
| `engram-sync` | **SINCRONIZA** Engram con GitHub al parar sesion (async, 60s) |
| `session-start-context` | **CARGA** contexto de sesion anterior al iniciar |

**Comportamiento**: Exit 2 = BLOCK | Exit 0 + stderr = WARN | Fail-open (nunca rompe el flujo)

**Utilidades manuales**: `node ~/.claude/hooks/audit-system.js` (health check) | `cost-report.js` (uso de tools) | `learning-index.js` (discoveries)

## Herramientas, referencias y protocolo de subagentes
> Tabla completa de tools por agente, referencias tecnicas (12 archivos), MCPs externos, protocolo compartido y coordinacion cross-agent: ver `pipeline-reference.md`

- **Protocolo compartido**: `~/.claude/agents/agent-protocol.md` (Engram 2-pasos, topic_key obligatorio, Return Envelope estandar)
- **Design Intelligence Engine**: `~/.claude/design-data/` (search.js + 8 CSVs, 161 industrias). El motor informa, no decide. Anti-patterns HIGH son obligatorios.

## Anti-generic + QA hardening (fix 2026-04-19)

El pipeline tiene capas de defensa ejecutables contra outputs genéricos y falsos positivos de QA. Introducido tras auditoría que reveló que un proyecto (VetConnect) fue aprobado con landing plano + auth roto.

### Guardrails anti-generic
- **brand.json schema v2** (brand-agent): `mood_vector` 8-dim, `reference_ids`, `anti_patterns_HIGH` ejecutables, `typography_pair`, `extraction_metadata`. Ver `brand-agent.md` § "Estructura de brand.json (schema v2)".
- **ui-designer Paso 0e — SaaS Teal Default Detector**: 7 reglas T1-T7 que bloquean paleta teal+Inter+cards-genéricas+shadow-sm+envelope-contenido-en-moods-bold para moods editorial/luxury/brutalist/immersive/playful/y2k/industrial. Self-audit pre-return con `AUTO_AUDIT` en Return Envelope.
- **frontend-developer Pre-return Audit**: 5 grep commands sobre código generado (teal hardcoded, Inter heading, shadow uniforme, hero media, motion coherente con dials). `AUTO_AUDIT` en tarea-{N}.
- **Taste-skill dials obligatorios**: frontend-developer consulta `intent.dials_suggested` antes de elegir Tier de animación (CSS/Framer/GSAP) y layout (simétrico/asimétrico).

### QA hardening — defensa anti-falso-positivo
- **evidence-collector Paso 4b**: verifica AUTO_AUDIT upstream (ui-designer + frontend-developer) PASS antes de screenshots.
- **evidence-collector Paso 4c**: Visual Fidelity LLM-as-judge — compara screenshot vs `visual-direction.reference_for_qa` en 5 dimensiones (palette, typography, composition, mood, density). Threshold ≥7/10. Mood Vector divergencia ≤10. Guardrail anti-derivative.
- **evidence-collector Paso 4d**: E2E flows obligatorios en tareas auth/CRUD/forms (signup→login→dashboard→logout, error states).
- **evidence-collector Paso 4e**: Network inspection OBLIGATORIA — Mixed Content, local leak, status 0/4xx/5xx.
- **evidence-collector Paso 4f**: testea contra `deploy_url` si existe (no localhost).
- **reality-checker Paso 2B — False Positive Guardrail**: re-ejecuta 2-3 qa-{N} PASS aleatorios, si falla → blocker crítico.
- **reality-checker Paso 4B — Mixed Content dinámico**: browser_navigate + network inspection runtime (no solo grep estático).
- **reality-checker Paso 8 — Design Tools Usage Audit**: verifica intent + visual-direction + brand.json schema v2 + AUTO_AUDITs presentes.
- **reality-checker Paso 9 — Evidence Trail Mandatory**: cada PASS cita path de screenshot/log/URL.
- **api-tester ESCALATE**: si `api-spec` missing y proyecto tiene backend → NO fallback silencioso, BLOQUEADOR al orquestador.
- **performance-benchmarker deploy_url obligatorio**: PageSpeed Insights contra URL pública cuando existe.

### Nuevos topic keys en Engram (añadidos al pipeline)
- `{proyecto}/intent` — Fase 1 Paso 0 (Intent Clarifier): mood_preset, dials_suggested, reference_source, anti_patterns_HIGH
- `{proyecto}/visual-direction` (schema extendido) — Fase 2 Paso 1.5: extraction_status, extracted_palette, extracted_typography, reference_for_qa, awesome_design_md_refs
- `{proyecto}/branding` (schema v2) — Fase 2B: mood_vector, reference_ids, anti_patterns_HIGH ejecutables
- `{proyecto}/design-system` (extendido con AUTO_AUDIT) — Fase 2: 7 reglas T1-T7 PASS
- `{proyecto}/qa-{N}` (extendido con AUTO_AUDIT_VERIFIED, VISUAL_FIDELITY, NETWORK_AUDIT, E2E_FLOWS) — Fase 3
- `{proyecto}/certificacion` (extendido con DESIGN_TOOLS_AUDIT, FALSE_POSITIVE_GUARDRAIL, MIXED_CONTENT_DYNAMIC, EVIDENCE_TRAIL) — Fase 4

## Reglas clave
- Solo el **orquestador** guarda DAG State en Engram
- Los subagentes guardan sus propios resultados en Engram con topic keys del proyecto
- **Excepción modo Claude normal**: si el usuario pide explícitamente guardar algo ("guarda esto", "guardalo en engram", "remember this"), Claude normal SÍ puede llamar `mem_save` directamente. La regla "solo orquestador guarda" aplica a flujos automáticos. **Ver § "Protocolo 'guarda en engram' — cross-PC garantizado"** para el flujo completo (siempre scope=personal, search-before-save, namespace en topic_key).
- Solo **evidence-collector** y **reality-checker** hacen QA visual
- Solo **git** hace commits/push — nunca un agente dev
- Solo **deployer** despliega (Vercel para web, EAS Build para mobile)
- git y deployer actúan **solo con confirmación del usuario** — pero si el mensaje original ya incluía "sube", "git", "deploy", "push", "publica" o similar, eso **ya es la confirmación**. No volver a preguntar.
- Si el orquestador devuelve una pregunta de confirmación sobre una acción que el usuario ya autorizó en su mensaje, main Claude debe continuar el agente con `SendMessage` respondiendo la respuesta implícita — no dejar el agente suspendido.
- Cada tarea dev pasa por **evidence-collector** antes de avanzar (máx 3 reintentos)
- **El orquestador NO activa git hasta que evidence-collector retorna PASS** — nunca saltear QA antes de push, aunque el tiempo apremia. Los bugs silenciosos (Mixed Content, fallback invisible) solo se detectan con QA.
- **codepen-explorer solo busca y extrae** — nunca adapta ni construye. Guarda código temporal en `{project_dir}/.codepen-temp/{slug}/`. frontend-developer lee de ahí y adapta al proyecto/brand.
- **Bóveda CodePen** (`~/.claude/codepen-vault/`) — solo guarda efectos aprobados por el usuario. Engram tiene metadata buscable (`codepen-vault/{slug}`), disco tiene el código.
- **Checkpoint post-efectos en Fase 3** — si se usaron efectos de CodePen, mostrar página completa al usuario antes de pasar a Fase 4 para que pueda pedir cambios.

## Stack, Design Systems y Componentes
> Tabla completa del stack adaptable, Nothing Design System, y 21st.dev: ver `pipeline-reference.md`

- **Stack**: el orquestador decide en Fase 1. Defaults: Next.js (apps), Vite+React (landing), Hono (backend), Drizzle (ORM), Zustand (state)
- **Nothing Design**: opcional, solo si el usuario lo pide. Referencia en `nothing-design-reference.md`
- **21st.dev**: componentes community via Context7 MCP. Inspiracion + base, no copy-paste. Adaptar siempre al brand

## Autenticación estándar — Better Auth
- **Better Auth** es el sistema de auth por defecto para todos los proyectos nuevos
- Referencia completa: `~/.claude/agents/better-auth-reference.md`
- Agentes que lo usan: backend-architect (server), frontend-developer (client), rapid-prototyper (full-stack)
- Solo usar Clerk/Supabase Auth/JWT custom si el proyecto ya los tiene implementados

### Reglas críticas (validadas en producción)
- **Migración NO es automática**: siempre agregar `"migrate": "npx @better-auth/cli migrate"` al `package.json` y ejecutarlo antes del primer `npm run dev`
- **Next.js 16+**: usar `proxy.ts` con `export async function proxy()` — el archivo `middleware.ts` está deprecado

### Better Auth + Supabase + Vercel + Next.js 16
- **Referencia completa con código y checklist**: `~/.claude/agents/better-auth-reference.md` § "Better Auth + Supabase + Vercel"
- **Reglas clave**: postgres.js (no pg), Transaction Pooler (puerto 6543), `prepare: false`, dynamic imports en route handler, `toCleanRequest()` para Request limpio, `getSessionCookie` con `cookiePrefix`

## Agentes creativos — Assets visuales
> Detalles completos (orden, gates, env vars, cost tracking): ver `pipeline-reference.md` § "Agentes creativos"

- **Orden**: brand-agent -> (aprobacion) -> logo-agent + image-agent (paralelo) -> video-agent
- **brand-agent SIEMPRE primero** — sin `brand.json` ningun agente creativo funciona
- **NO auto-generar assets sin confirmacion del usuario**

### Politica free-first (default 2026-05-18 — verificada con curl real, NO con marketing reciclado)

Los agentes priorizan paths FREE top-tier que **NO requieren tarjeta de credito**. Opciones paga quedan como opt-in.

| Agente | Free primario | Free secundario | Free fallback | Opt-in (paga) |
|--------|---------------|------------------|----------------|----------------|
| image-agent | HF FLUX.1-schnell (`HF_TOKEN`) — $0.10/mes free, reset mensual | Cloudflare Workers AI FLUX-schnell (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_AI_TOKEN`) — **10K neurons/dia sin tarjeta** | Pollinations.ai (sin key) — **FLUX unlimited free** | Gemini (`GEMINI_API_KEY` + billing) |
| logo-agent | HF + vtracer/Inkscape | Cloudflare Workers AI + vtracer | Pollinations + vtracer | Recraft V4 Vector SVG nativo (`RECRAFT_API_KEY`, $5 free/mes via Vercel AI Gateway) o Gemini |
| video-agent | **CSS fallback animado** (output VALIDO sin token, NO bloquea pipeline) | — | — | Replicate LTX-Video 2.3 (`REPLICATE_API_TOKEN`) |
| brand-agent | Free siempre (texto puro) | + dembrandt MCP opcional para extraer tokens de URLs | — | — |

**Backend descartado del stack default** (verificado contra fuentes primarias 2026-05-18):
- ~~Together AI~~ — el endpoint promocional "FLUX.1-schnell-Free" de blogs 2024-2025 ya **NO existe** en su catalogo actual. Free tier exige $5 fondeo con tarjeta. Marketing reciclado con fechas "2026" engana.

**Setup Cloudflare Workers AI** (secundario, sin tarjeta):
1. Signup en `dash.cloudflare.com/sign-up` (Free Workers plan NO pide tarjeta — confirmado en `developers.cloudflare.com`)
2. Obtener Account ID en el dashboard (32 chars hex)
3. Crear API token en `dash.cloudflare.com/profile/api-tokens` con permiso `Account -> Workers AI -> Read`
4. `setx CLOUDFLARE_ACCOUNT_ID "..."` y `setx CLOUDFLARE_AI_TOKEN "..."`
5. Endpoint: `api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`

**Comportamiento sin `REPLICATE_API_TOKEN`**: video-agent retorna `STATUS=completado` con solo `fallback.css`. Para video real, opciones manuales free: Seedance (web, 100 free/dia sin tarjeta), HF Spaces (Wan 2.1, cold start), LTX-2 self-host.

**Para revertir a modo paga** (cuando recuperes tarjeta): pasar `backend: "gemini"` o `backend: "recraft"` al agente, o asegurar `REPLICATE_API_TOKEN` presente para video.

## Best Practices Cross-Cutting (validadas en producción)

> Las best practices de SEO, performance web, accesibilidad, WebGL safety y Mixed Content ya están integradas en los agentes que las aplican (frontend-developer.md, seo-discovery.md, evidence-collector.md, xr-immersive-developer.md). Esta sección solo contiene patterns que NO están en ningún agente.

### Vercel — Sitios Estáticos
- **`Cache-Control: max-age=0` es el default de Vercel**. Para browser caching, crear `vercel.json` con headers: `max-age=604800` para `/assets/**`, `max-age=3600` para `/js/**` y `/css/**`
- **Security headers via `vercel.json`**: agregar X-Content-Type-Options (nosniff), X-Frame-Options (SAMEORIGIN), Referrer-Policy, Permissions-Policy bajo `"source": "/(.*)"`. Vercel no los agrega por defecto.
- **Admin panel en sitio estático**: `X-Robots-Tag: noindex, nofollow` + `Cache-Control: no-store` para `/admin.html`

### CSS Patterns (validados en producción)
- **`::after` para background images**: pseudo-elemento con `position: absolute; inset: 0; z-index: 0; pointer-events: none`. Hijos con `position: relative; z-index: 1`.
- **`max()` para secciones full-width centradas**: `padding: Xpx max(24px, calc((100vw - 1200px) / 2))` — reemplaza `max-width + margin: auto`.
- **`translateX` en `position: fixed` puede fijar scroll horizontal**: usar `translateY` para animar toasts/modales fuera del viewport.
- **Clases genéricas colisionan entre admin y sitio público**: usar IDs específicos o clases prefijadas para paneles admin.

### Bundle Size Gates
- **bundlewatch** en `package.json`: main < 250KB gzip, vendor < 150KB gzip, páginas < 50KB gzip. Gate en Fase 4.

### QA & Certificación (reglas que NO están en agentes)
- Testear contra **build de producción** (`npm run build && npm start`), no dev server
- SEO Score mínimo 85/100 para certificación
- **Playwright solo corre Chromium** — issues Safari/Webkit NO detectados. Para WebGL, aplicar safety patterns ANTES de Fase 4.

### Referencias externas
- **PocketBase**: `pocketbase-reference.md` | **DevOps VPS**: `devops-vps-reference.md`

## Overrides Windows — Diferencias con Linux/Claude Code

> **SOLO APLICA en Windows/Claude Desktop.** En Linux/Claude Code CLI, ignorar esta seccion completa.

### Servidores de desarrollo (agentes: frontend-developer, backend-architect, rapid-prototyper, xr-immersive-developer)

**NUNCA** arrancar servidores con `npm run dev` via Bash directamente.
**SIEMPRE** usar `preview_start` del Claude Preview MCP.

Pasos obligatorios:
1. Crear o verificar `.claude/launch.json` en el directorio de trabajo con la configuracion del proyecto
2. Llamar `preview_start` con el nombre definido en `launch.json`
3. Usar `preview_logs` para verificar que arranco sin errores
4. Pasar la URL (`http://localhost:{puerto}`) al agente de QA

Formato de `.claude/launch.json` en Windows:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "nombre-proyecto",
      "runtimeExecutable": "cmd",
      "runtimeArgs": ["/c", "cd nombre-proyecto && npm run dev"],
      "port": 3000
    }
  ]
}
```

> **Motivo**: En Claude Desktop/Windows, `npm` no esta disponible directamente en el PATH del entorno de herramientas. `cmd /c` resuelve el PATH correctamente.

### Comandos de una sola vez (instalar deps, migrar DB, build)
Estos si se ejecutan via Bash normal:
```bash
cd nombre-proyecto && npm install
cd nombre-proyecto && npm run migrate
cd nombre-proyecto && npm run build
```

### Puertos en Windows
- Matar procesos: `netstat -ano | findstr :PORT` + `taskkill /PID <pid> /F`
- Linux equivalente: `lsof -ti:PORT | xargs kill -9`

### Next.js — Versiones
- Usar **Next.js 15 o 16** (no 14)
- Next.js 16+: `proxy.ts` en raiz del proyecto (no `middleware.ts`)

### Preview verification — proporcionalidad

El hook `stop` dispara `verification_workflow` cuando se edita código con un preview server activo. Aplicar con criterio según el tipo de cambio:

| Tipo de cambio | Verificación requerida |
|----------------|----------------------|
| Layout, UI, estilos, lógica nueva | Workflow completo: snapshot → navigate → screenshot |
| Texto/copy en estado visible (hero, nav, botones) | `preview_eval` único para confirmar el texto nuevo existe |
| Typo en empty state / texto condicional | `preview_eval` único: `document.body.innerText.includes("texto_correcto")` — si retorna `true`, PASS sin navegación ni snapshot |
| Cambio en archivo no-UI (config, tipos, API routes) | Saltar verificación completamente |

**Regla clave**: un typo fix en un string estático NO requiere navegar, hacer snapshot ni tomar screenshot. Un solo `preview_eval` de búsqueda de texto es suficiente y correcto.

## Herramientas de diseno
- **Figma/FigJam**: Solo usar cuando el usuario comparte una URL de Figma o lo pide explicitamente
