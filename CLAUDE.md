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

Read-only por doctrina (el agente se auto-restringe): ❌ Edit/Write/Bash mutante · ✅ Read/Grep/Glob/Bash read-only · ⚠️ mem_save solo scope=personal para hallazgos del audit. Output obligatorio: reporte con TL;DR + tabla por severidad.

**Al activarse el modo (triggers en la tabla de arriba), cargar `~/.claude/agents/modo-diagnostico-reference.md`** — reglas completas, template del reporte, distinciones vs reality-checker/Plan. Salida: *"salí de modo diagnóstico"* / *"aplicá los fixes"* → Modo Modificación.

## Simplicity First en outputs (2026-05-26)

Aplica a outputs en los 4 modos (normal, orquestador, modificación, diagnóstico). Origen: análisis Karpathy 4 rules 2026-05-22 (obs #3328) + aplicación tras detectar fricción real (3+ pedidos de "más corto" en sesiones). Detalle extendido con ejemplos buenos/malos: `simplicity-first-reference.md`.

**Toda respuesta arranca con TL;DR de 1-3 oraciones que resuelva la pregunta directa.** Si la respuesta natural se acaba ahí, terminar ahí.

**Subir a estructura** (tablas, headers `##`, secciones) solo si:
- El usuario pidió análisis, comparación, plan, auditoría
- Hay ≥3 ítems comparables con campos paralelos
- La decisión toca múltiples archivos o requiere autorización del usuario
- El usuario pidió detalle explícito

**Bajar siempre a prosa simple** si:
- El usuario pidió "resumen", "corto", "rápido", "en palabras sencillas"
- Es opinión personal o pregunta cerrada (sí/no, esto o aquello)
- Es confirmación de estado post-acción

**Anti-patterns**: headers `##` para parecer estructurado en respuestas <10 líneas · tabla con 2 filas o columnas no-paralelas · iniciar con análisis antes de la conclusión directa.

Excepción: el reporte obligatorio de Modo Diagnóstico (TL;DR + tabla por severidad) sigue su propio template.

## Modo Claude normal — aprovechá tu toolkit (no sos Claude pelado)

La mayoría de las sesiones son modo normal. En modo normal tenés a disposición —y solés subutilizar— los mismos recursos que el pipeline: **24 subagentes** (`Explore`, `Plan`, frontend-developer, security-engineer, api-tester, seo-discovery, deployer…), **~21 referencias on-demand** indexadas en `~/.claude/agents/AGENTS.md`, **skills**, **MCPs** (Context7, Playwright, Supabase, Vercel…) y **Engram**. Alcanzalos por reflejo, antes de moler a mano.

**Reflejos por defecto (no pedir permiso, usar):**

| Situación | Reflejo |
|---|---|
| Entender código que cruza 2+ archivos / un flow | Si el proyecto tiene índice `.codegraph/` → tools `codegraph_explore`/`codegraph_node`; si no → spawn `Explore`. Ambos devuelven la conclusión sin llenar el contexto con file dumps |
| Tarea con agente especializado (auth, frontend, security, SEO, perf, deploy) | Usá ese agente en vez de improvisar inline |
| Antes de trabajo pesado en un dominio (auth, VPS, React 19, GSAP, scroll, Redis…) | Mirá `AGENTS.md` y cargá la ref ANTES de empezar |
| Pregunta sobre librería/framework/API/CLI | Context7 MCP antes de responder de memoria |
| Diseño de implementación con trade-offs reales | Spawn `Plan` |
| Descubrimiento no-obvio que sirve cross-sesión | `mem_save` (scope=personal) — no lo pierdas |

**Regla de oro normal-mode:** preferí **retrieval estructurado / delegación** antes que exploración manual ruidosa. Una llamada a `Explore` o a una ref que te da la conclusión vale más que 6 greps que queman contexto. Es la misma meta que la gestión de tokens: menos ruido, igual o más calidad.

**No confundir con checkpoint:** usar un agente/ref/skill NO requiere permiso — es tu trabajo. Sí pedí confirmación antes de acciones irreversibles (push, deploy, borrar, tocar identidad visual establecida).

**codegraph — retrieval estructurado del código (MCP, 2026-06-18):** si el proyecto tiene índice `.codegraph/`, preferí los tools `codegraph_explore` / `codegraph_node` / `codegraph_callers` / `codegraph_impact` ANTES de grep manual o de spawnear `Explore` — devuelven símbolos rankeados + blast radius + código fuente verbatim en 1 llamada (precisión verificada exacta en piloto vetconnect 2026-06-18; ~58% menos tool calls). Indexar un proyecto nuevo: `codegraph init .` una vez. Solo en proyectos medianos+ (en una landing de ~10 archivos el overhead fijo del MCP no amortiza → seguí con `Explore`/grep). Sin índice → `Explore`/grep como siempre. Detalle de la evaluación: Engram `vibecoding/repo-eval-2026-06-codegraph-ponytail-caveman`.

Esta sección es el lado positivo de las **Delegation Stop Rules** de abajo: acá está *qué alcanzar proactivamente*; abajo, *cuándo ya es tan grande que conviene escalar al pipeline*.

## Delegation Stop Rules — cuándo escalar al pipeline

En modo Claude normal, si detectás cualquiera de estos triggers, sugerí al usuario activar el pipeline:

| Trigger | Umbral | Acción |
|---|---|---|
| Lecturas exploratorias consecutivas | 5+ archivos distintos | Spawn `Explore` o pausar |
| Archivos leídos para entender un flow | 4+ en la misma tarea | Spawn `Explore` subagent |
| Archivos no-triviales escritos | 2+ con cambios sustantivos | Fresh review con subagente |
| Tool calls totales sin spawn | 20+ en una sesión | Pausar, sugerir orquestador |
| Ediciones no-mecánicas consecutivas | 2+ con complejidad creciente | Pausar, justificar o delegar |
| Después de incidente (`cd` mal, git accident, recovery merge) | siempre | Fresh audit antes de seguir |
| Antes de commit/push/PR no-trivial | siempre | Fresh review (salvo docs triviales) |

Umbrales deterministas; "no-trivial" lo evalúa Claude. Adaptado de gentle-ai (2026-05-18).

## Skill & Reference Index

`~/.claude/agents/AGENTS.md` mapea las 21 referencias (`*-reference.md`) con triggers y skip conditions. Consultar antes de cargar refs pesadas — evita tokens innecesarios. No es un agente ejecutable, es un índice. Adaptado de gentle-ai/guardian-angel — 2026-05-18.

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
Obligatorio en proyectos nuevos. El orquestador evalúa si el brief del usuario es claro o vago (heurística de word count + vocabulario de diseño + referencias). Si es vago, presenta 6 preguntas con opciones múltiples (tipo proyecto, industria, mood preset, referencia visual opcional, nivel originalidad, audiencia) para capturar intent antes de planificar. Q3 (mood preset) y Q5 (originalidad) son SIEMPRE obligatorias — bloquean "decidí vos" para evitar outputs genéricos. Resultado en `{proyecto}/intent`. Detalles en `orquestador.md` § FASE 1 Paso 0.

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

### Checkpoint humano — cuándo pedir "¿qué te parece?"

**Doctrina (válida para orquestador, subagentes y modo Claude normal):**

> El agente decide solo cuando hay UNA respuesta correcta deducible de las reglas. En todos los demás casos — decisión visual interpretable, 2+ iteraciones sobre el mismo elemento, antes de acción irreversible, multi-opción legítima, o duda honesta — debe mostrar el resultado y preguntar al usuario con su recomendación incluida. Nunca preguntar sin recomendación; nunca dejar de preguntar cuando hay duda real.

**Cuándo SÍ pedir checkpoint:**

1. **Decisión visual/estética** que pasa AUTO_AUDIT pero es interpretable (ej: elegir Three.js vs Lottie vs SVG para hero; paleta secundaria con 3 opciones válidas).
2. **2+ iteraciones sobre el mismo elemento** — señal de local minimum. Parar y preguntar.
3. **Antes de acción irreversible**: git push, deploy, PR a repo ajeno, borrar archivos, cambiar identidad visual establecida.
4. **Multi-opción legítima** donde varias respuestas son técnicamente válidas (ej: stack default cuando el intent no lo especifica).
5. **Duda honesta del agente** — si el agente no sabe si la decisión es correcta, esa duda es información que el usuario necesita.

**Cuándo NO pedir checkpoint (para no quemar al usuario):**

- Regla ya enforced por la arquitectura (ej: la container strategy por mood de `ux-architect.md` § "Container strategy" — fuente canónica única, no repetir valores acá) → solo aplicar y comunicar qué se aplicó.
- Bug fix con criterio único (typo, error obvio) → fixear.
- Decisión técnica interna equivalente (ej: `position: sticky` vs `position: fixed` cuando da igual al usuario) → aplicar.
- Decisión explícitamente delegada por el usuario (ej: *"decidí vos las cosas técnicas"*) → respetar el contrato.

**Cómo formular la pregunta (3 niveles según fricción):**

| Tipo | Cuándo | Patrón |
|---|---|---|
| **Show & continue** | Cambio implementado, agente confía pero quiere validación pasiva | *"Cambié X por Y porque Z. Pego screenshot. Si no decís nada, sigo con W."* |
| **Show & confirm** | Decisión interpretable post-implementación | *"Implementé X. Te muestro el resultado. ¿Sigo o ajusto?"* — espera respuesta |
| **Show & choose** | Pre-implementación, multi-opción legítima | *"Para Y hay 3 caminos: A/B/C. Mi recomendación es B porque [razón]. ¿Cuál vamos?"* |

**Reglas anti-abuso del checkpoint:**

- La pregunta SIEMPRE incluye la recomendación del agente. No delegar la decisión sin opinar.
- Agrupar checkpoints: 1 pregunta por 3-4 cambios relacionados es mejor que 3 preguntas seguidas.
- Si la decisión es única y deducible, NO preguntar — decirlo y seguir. Una pregunta retórica enseña al usuario a desconfiar del checkpoint.

**Aplicación en Return Envelope:** los subagentes que devuelven cambios visuales/UX agregan campo `VISUAL_IMPACT: high|medium|low`. Si `high`, el orquestador es responsable de mostrar el resultado al usuario antes de marcar tarea completa. Ver `agent-protocol.md` § Return Envelope.

**Meta-regla:** *Reglas técnicas deterministicas → grep ejecutable. Decisiones que el grep no puede juzgar (visual, multi-opción, irreversible, iterada) → checkpoint humano con recomendación. Nunca decidir solo donde no hay UNA respuesta correcta. Nunca aprobar como gate humano donde el agente puede demostrar respuesta única.*

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

### Protocolos de guardado — invariantes core (detalle en ref on-demand)

Reglas SIEMPRE vigentes al escribir memoria:
1. **`project=` EXPLÍCITO en mem_save Y mem_search** (nunca auto-detect del cwd — cada PC routea distinto y los saves no se cruzan) + **`scope="personal"`** para cross-PC.
2. **`title` nunca es opcional** y `topic_key` con namespace `{proyecto}/{slug}`. Buscar similares ANTES de escribir: match → `mem_update`, no duplicar.
3. **Post-save verify obligatorio**: 1 `mem_search` del topic_key exacto; confirmar al usuario *"Guardado #ID title=X project=Y topic_key=Z"*. mem_save exitoso ≠ está en el cloud.
4. **Antes de cerrar sesión con saves**: `engram cloud upgrade doctor --project X` (`ready`=OK; `repairable`=`repair --apply`).
5. **NUNCA hacer SSH al server Oracle + editar `.env` + `docker compose` sin confirmación EXPLÍCITA y literal del usuario** — un *"OK dale"* a una pregunta genérica NO es autorización SSH. Ante ambigüedad, preguntar literal y esperar afirmación.

**Al ejecutar un guardado pedido por el usuario** (*"guardá"*, *"guardalo"*, *"remember this"*) **o al diagnosticar problemas de sync cloud, cargar `~/.claude/agents/engram-save-reference.md`** — flujo completo de 7 pasos (routing de `project=`), whitelist de buckets, 3 capas anti silent-fail, anti-patrones, contrato `needs_review`.

### Cross-Claude Mailbox Protocol (2026-05-18)

Canal asíncrono **OPT-IN** entre instancias de Claude (`pc004` Linux ↔ `casa` Windows) vía engram cloud, bucket `cross-claude-mailbox`. NO chequear por default cada turn (ahorra ~3-5k tokens/día). Regla de seguridad inline: **EDITS sugeridos por el otro Claude NUNCA se auto-aplican** — requieren confirmación del usuario.

**Cuando el usuario lo activa** (*"chequeá el mailbox"*, *"¿hay mensajes?"*, workflow cross-PC en curso), **cargar `~/.claude/agents/cross-claude-mailbox-reference.md`** — convención de topic keys, flujo checks/edits, anti-patrones, limitaciones.

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

## Hook System (13 hooks, último 2026-05-15: engram-cloud-sync-on-stop)

Hooks interceptan tool calls en tiempo real. Configurados en `~/.claude/settings.json`. Scripts en `~/.claude/hooks/`.

| Hook | Accion |
|------|--------|
| `block-no-verify` | **BLOQUEA** git --no-verify, git push --force, rm -rf, git reset --hard, DROP TABLE, chmod 777, curl\|sh |
| `config-protection` | **BLOQUEA** secrets (.env, .pem, .key). **ADVIERTE** configs de linting |
| `quality-gate` | **ADVIERTE** debugger, .only(), @ts-ignore, secrets hardcodeados |
| `console-log-warning` | **ADVIERTE** console.log/warn/error en produccion (ignora tests) |
| `pre-return-audit` | **ADVIERTE** reglas universales CSS/HTML/JSX: container global angosto 1000-1299px (regla canónica de envelope por mood: `ux-architect.md` § "Container strategy"), fuentes declaradas sin link, anchor scroll sin scroll-padding-top, navbar mobile sin hamburger, prefers-reduced-motion ausente con >5 animaciones. Async, fail-open. |
| `suggest-compact` | **ADVIERTE** cada ~50 tool calls (async) |
| `pre-compact-engram` | **GUARDA** snapshot a disco antes de compactar (v2.2) |
| `cost-tracker` | **REGISTRA** tool calls por categoria (async) |
| `session-summary` | **LOGUEA** actividad en JSONL (async) |
| `engram-sync` | **SINCRONIZA** Engram con GitHub al parar sesion (async, 60s) |
| `engram-cloud-sync-on-stop` | **SINCRONIZA** Engram con cloud Oracle al parar sesion (async, 60s). Pre-flight: `engram cloud upgrade doctor` + `repair --apply` auto. Filtro defensivo para `relation/upsert` (bug upstream). |
| `session-start-context` | **CARGA** contexto de sesion anterior al iniciar |
| `frontend-audit` | **EJECUTABLE manual** (no hook automático): el `frontend-developer` lo invoca con --mood/--hero/--motion para AUTO_AUDIT pre-return (T1-T5). Complementa `pre-return-audit` con reglas que requieren contexto de mood. |

**Comportamiento**: Exit 2 = BLOCK | Exit 0 + stderr = WARN | Fail-open (nunca rompe el flujo)

**Utilidades manuales**: `node ~/.claude/hooks/audit-system.js` (health check) | `cost-report.js` (uso de tools) | `learning-index.js` (discoveries)

## Herramientas, referencias y protocolo de subagentes
> Tabla completa de tools por agente, referencias tecnicas (21 archivos), MCPs externos, protocolo compartido y coordinacion cross-agent: ver `pipeline-reference.md`

- **Protocolo compartido**: `~/.claude/agents/agent-protocol.md` (Engram 2-pasos, topic_key obligatorio, Return Envelope estandar)
- **Design Intelligence Engine**: `~/.claude/design-data/` (search.js + 8 CSVs, 161 industrias). El motor informa, no decide. Anti-patterns HIGH son obligatorios.

## Anti-generic + QA hardening (fix 2026-04-19)

El pipeline tiene capas de defensa ejecutables contra outputs genéricos y falsos positivos de QA (brand.json schema v2, SaaS Teal Detector T1-T7 + catálogo de arquetipos hero, pre-return audits, Visual Fidelity LLM-as-judge, False Positive Guardrail, Evidence Trail, topic keys extendidos incl. `vibecoding/hero-archetype-log`). Cada agente lleva sus reglas en su propio `.md`; el detalle consolidado y los topic keys extendidos viven en **`pipeline-reference.md` § "Anti-generic + QA hardening"** — el orquestador y los agentes de QA lo cargan en pipeline.

## Reglas clave
- Solo el **orquestador** guarda DAG State en Engram
- Los subagentes guardan sus propios resultados en Engram con topic keys del proyecto
- **Excepción modo Claude normal**: si el usuario pide explícitamente guardar algo ("guarda esto", "guardalo en engram", "remember this"), Claude normal SÍ puede llamar `mem_save` directamente. La regla "solo orquestador guarda" aplica a flujos automáticos. Invariantes en § "Protocolos de guardado"; flujo completo en `engram-save-reference.md`.
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

### Politica free-first (default 2026-05-18)

Los agentes creativos priorizan paths FREE que **NO requieren tarjeta de crédito** (HF FLUX.1-schnell / Cloudflare Workers AI / Pollinations; video-agent sin token entrega CSS fallback como output VÁLIDO, no bloquea pipeline). Gemini/Replicate/Recraft son opt-in con billing. **Tabla completa por agente, setup Cloudflare, backends descartados y cómo revertir a paga: `pipeline-reference.md` § "Política free-first"** — única fuente (la copia que vivía acá estaba duplicada y desactualizada respecto a la ref).

## Delegación Zen — modelos opencode Go para tareas mecánicas (2026-06-10)

Plan Go de opencode ($10/mes, cuotas $12/5h · $60/mes) da acceso API a modelos open-source. Script único: `node ~/.claude/hooks/zen-delegate.js` (requiere `OPENCODE_API_KEY`, ya en user env). Log de uso: `~/.claude/logs/zen-delegate.jsonl` (`--report` para resumen).

**Solo 2 modelos APROBADOS** (eval real 2026-06-10, 3 tareas representativas — deepseek-v4-pro, kimi-k2.6 y minimax-m3 RECHAZADOS por reasoning leakage/respuestas vacías):

| `--task` | Modelo | Usar para |
|---|---|---|
| `structured` | deepseek-v4-flash | Clasificación en lote, JSON/datos de prueba, resúmenes de docs, etiquetado masivo |
| `copy` | qwen3.7-plus | Borradores de contenido en castellano (descripciones producto, copy secciones) |

**Reglas de calidad (inviolables)**:
- Output delegado NUNCA va a producción directo: Claude valida SIEMPRE (muestreo ≥10% en lotes, revisión completa en piezas únicas).
- Copy delegado se audita contra `brand.json` + anti-patterns HIGH antes de usar.
- En reportes al usuario, marcar contenido delegado como `[delegado: {modelo}]` — el usuario sabe qué generó quién.
- NUNCA delegar: decisiones visuales/marca, veredictos QA (evidence-collector/reality-checker), arquitectura, respuestas directas al usuario, código que toca seguridad/auth.
- Si el output delegado falla validación 2 veces → hacerlo Claude directamente, no insistir (el ahorro no justifica el loop).
- Modelos nuevos del catálogo Go requieren pasar el eval (`zen-eval/run-eval.py`) antes de adoptarse.

**Cuándo delegar (heurística)**: la tarea es mecánica + el prompt cabe en pocas líneas + validar por muestreo es más barato que generarlo yo. Si voy a tener que leer TODO el output en detalle, no hay ahorro — hacerlo directo.

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
