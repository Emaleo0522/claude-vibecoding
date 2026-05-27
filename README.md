# Claude Vibecoding

> *Hay personas con ideas brillantes que nunca llegan a hacerse — no por falta de talento, sino porque la distancia entre imaginar algo y tenerlo online es demasiado grande.*
>
> *Si alguna vez dejaste morir una idea porque no sabías cómo empezar, este sistema es para vos. El conocimiento técnico ya estaba en el mundo — solo faltaba un puente para llegar a él.*

---

Un sistema multiagente para construir software de principio a fin con Claude. Desde una landing simple hasta una app con auth + base de datos. **Te acompaña en cada decisión clave, sin pedirte permiso para cada coma.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-stable-success)
![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20Windows-lightgrey)

> Read this in English: [README.en.md](README.en.md)

---

## ¿Esto es para mí?

Hay dos perfiles típicos que sacan provecho del sistema. Si te identificás con alguno, seguí leyendo.

**Si nunca programaste** y tenés una idea que querés ver hecha (la landing de tu emprendimiento, una app para tu equipo, un juego para regalar a tu sobrina), este sistema te lleva de la idea al deploy. Vos describís qué querés en español natural; el sistema te pregunta lo que necesita saber con opciones múltiples, y al final tenés un proyecto online. No tenés que aprender a programar para empezar a usarlo.

**Si sos developer** y estás cansado de hacer las mismas tareas repetitivas (setup, scaffolding, QA visual, headers de seguridad, SEO, deploy), este sistema te las quita de encima. Vos te quedás con las decisiones que importan; el resto lo hacen 25 agentes especializados que se coordinan entre sí.

En ambos casos, **el sistema te pregunta cuando hay decisiones interpretables** (visual, multi-opción, irreversible) y **decide solo cuando la respuesta es única**. No te quema con un "¿estás seguro?" por cada commit, pero tampoco te deja por fuera de lo importante.

---

## Qué podés construir

| Tipo de proyecto | Ejemplo concreto | Stack que el sistema usa |
|---|---|---|
| **Landing / sitio público** | Página de un restaurante, portfolio, lanzamiento de producto | **Astro** (content-heavy, 0 JS por default) o Vite + React + Tailwind |
| **Web app con auth** | Dashboard, CRM, SaaS MVP, panel de admin | Next.js + Better Auth + Drizzle + PostgreSQL |
| **App móvil iOS + Android** | Delivery, fitness tracker, app de tu negocio | React Native + Expo SDK 52+ |
| **Juego de navegador** | Plataformero 2D, puzzle, arcade | Phaser.js o PixiJS |
| **API / backend** | Endpoints REST/tRPC, webhooks, jobs | Hono + Drizzle + PostgreSQL |
| **Full-stack completo** | Producto entero con frontend + backend + auth + DB | Combinación según necesidad |

El stack no está fijo: el orquestador decide en la primera fase según lo que pidas. Para una landing simple no monta una arquitectura de microservicios; para una app multi-tenant no te entrega una página HTML.

---

## Instalación

### Requisitos previos

| Plataforma | Lo que necesitás antes | Dónde bajarlo |
|---|---|---|
| **Linux + Claude Code** | Claude Code CLI, git, Node.js | [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) |
| **Windows + Claude Desktop** | Claude Desktop, Git for Windows (trae Git Bash), Node.js | [Claude Desktop](https://claude.ai/download) · [Git](https://git-scm.com/download/win) · [Node.js](https://nodejs.org) |

> **Importante:** este sistema *extiende* a Claude — no lo reemplaza. Si no tenés Claude Code (Linux) o Claude Desktop (Windows) instalado, los agentes y hooks no se ejecutan en ningún lado.

### Linux (Claude Code) — 30 segundos

Abrí una terminal y corré:
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

El script instala los 25 agentes + 21 referencias técnicas (incluida `external-skills-reference` para el ecosistema `npx skills add`) + 1 índice central (`AGENTS.md`), los 13 hooks + 3 utilities manuales, el `CLAUDE.md` global, y configura git/GitHub/Vercel. Te va preguntando los datos que necesita (tu nombre, email, usuario de GitHub). **Reiniciá Claude Code** cuando termine y ya estás listo.

### Windows (Claude Desktop) — 20-30 minutos guiados

Abrí **Git Bash** (se instala con Git for Windows) y corré:
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```

Después seguí la guía paso a paso en [`install/windows.md`](install/windows.md). Te lleva desde cero hasta tener todo funcionando, incluyendo descargar el binario de Engram (la memoria persistente del sistema) que en Windows requiere un paso extra.

### Otros entornos (Cursor, Aider, Codex CLI, Claude API directa, otros LLMs)

El sistema **está formalmente soportado en Claude Code (Linux) y Claude Desktop (Windows)**. Si querés usarlo con otro runtime o IDE (Cursor, Aider, Codex CLI, llamadas directas a la Claude API, otros modelos), tenés que adaptarlo:

- Los **hooks** (interceptores de tool calls) son específicos del runtime de Claude Code/Desktop. En otros entornos vas a necesitar otro mecanismo equivalente (extensión de IDE, wrapper de CLI, etc.) o desactivar la parte reactiva.
- **Engram** (la memoria persistente) corre como MCP, lo que requiere que tu runtime soporte MCPs. Si no, podés sustituirlo por archivos JSON en disco con menor robustez.
- Los **agentes** son archivos `.md` con frontmatter YAML. La sintaxis de subagentes es específica de Claude Code. Para usarlos como prompts en otro runtime, vas a necesitar adaptar el formato.

Si te animás a portarlo, abrí un issue o PR contando qué runtime estás usando — la idea es ir armando una guía colaborativa de portabilidad. **No prometemos soporte oficial fuera de Claude Code/Desktop**, pero la arquitectura es lo bastante modular como para que sea viable.

### Verificación post-instalación

```bash
# Agentes (debería ser 48: 25 agentes + 21 referencias técnicas + agent-protocol.md + AGENTS.md índice)
ls ~/.claude/agents/*.md | wc -l

# Hooks (debería ser 16)
ls ~/.claude/hooks/ | wc -l

# CLAUDE.md presente en ~
head -3 ~/CLAUDE.md

# Health check completo (recomendado)
node ~/.claude/hooks/audit-system.js
```

---

## Tu primer proyecto en 5 minutos

Abrí Claude Code y escribí:

```
modo orquestador — quiero crear una landing para mi cafetería de especialidad
```

Lo que pasa a continuación:

1. **El sistema te hace 6 preguntas con opciones múltiples** (tipo de proyecto, industria, estilo visual, referencia opcional, originalidad, audiencia). Tarda 1-2 minutos. **No podés saltarlas con "decidí vos"** — la pregunta 3 (estilo visual) y 5 (originalidad) son obligatorias. Esto evita que el output salga genérico.
2. **Genera el plan**: lista de tareas con criterios de aceptación, en español.
3. **Diseña la arquitectura** (CSS tokens, paleta, tipografía, layout) y te muestra un **checkpoint visual** con 8 decisiones interpretables (hero, navegación, mood, animaciones, efectos). Vos elegís o aceptás las recomendaciones.
4. **Genera assets visuales** (paleta de marca, logo SVG, imagen del hero, video opcional de fondo) — con tu aprobación antes de gastar créditos en APIs de IA.
5. **Implementa cada tarea** con un loop dev → QA visual (Playwright a 3 viewports) → reintento si falla. Hasta 3 intentos por tarea.
6. **Certifica** SEO, performance (Core Web Vitals), accesibilidad, security headers, antes de declarar "listo".
7. **Te muestra el resultado**, y si das OK, hace commit + push + deploy a Vercel.

Al final tenés un repo en GitHub, una URL pública en Vercel, y un proyecto que ya pasó por 4 capas de QA. El proceso completo dura entre 20 minutos (landing simple) y 4-6 horas (web app full-stack con auth).

### Otros prompts útiles

```
retomar mi-cafeteria — agrega un blog con markdown
retomar mi-cafeteria — cambia la paleta a tonos más oscuros
modo orquestador — app mobile de delivery con React Native
modo orquestador — juego 2D tipo plataformas en el navegador
```

---

## Cómo funciona (resumen)

El sistema tiene **un orquestador central** que coordina **24 subagentes especializados**, cada uno con una responsabilidad acotada. El orquestador nunca hace trabajo real — solo delega y junta resultados.

### Pipeline de 5 fases

```
Fase 1  Planificación  →  Intent Clarifier (6 preguntas) + project-manager-senior
Fase 2  Arquitectura   →  ux-architect (CSS tokens) + ui-designer + security-engineer
                          ↳ Visual Direction Checkpoint (decidís estilo)
Fase 2B Assets visuales →  brand-agent + logo-agent + image-agent + video-agent
Fase 3  Dev ↔ QA       →  frontend-developer, backend-architect, etc. ↔ evidence-collector
Fase 4  Certificación  →  seo-discovery + api-tester + performance-benchmarker + reality-checker
                          ↳ Paso 4.5 No-JS Render Audit: valida que el HTML inicial sin JS sirva a Bing, scrapers de LLMs y previews sociales
Fase 5  Publicación    →  git (con tu confirmación) + deployer (con tu confirmación)
```

Para **modificar un proyecto que ya está hecho**, el sistema entra en modo modificación: corre un *Paso 0 de auditoría* sobre el código heredado (detecta defaults problemáticos antes de tocar nada), después solo ejecuta los agentes afectados por el cambio.

### Lo que te protege en el camino

- **13 hooks** bloquean cosas peligrosas en tiempo real: `git --no-verify`, `git push --force`, `rm -rf`, `DROP TABLE`, `chmod 777`, edición de archivos secretos (`.env`, claves privadas), uso de `--no-gpg-sign`. Otros avisan: `debugger` o `console.log` en código de producción, `@ts-ignore`, animaciones excesivas, container CSS con cap "SaaS feel", fuentes declaradas sin cargar, navegación móvil sin hamburger. Otros corren en background: cost tracking, session logging, sync de Engram local→GitHub y local→cloud al cerrar sesión, snapshot pre-compact. Más **3 utilities manuales** (`audit-system.js` health check, `cost-report.js`, `learning-index.js`) que ejecutás con `node` cuando los necesitás.
- **AUTO_AUDIT pre-return**: antes de devolver código, el `frontend-developer` corre 5 reglas grep ejecutables (no paleta teal por default, no Inter como heading en moods bold, hero con media coherente, motion según dial, shadow según mood). Si falla → regenera. Si pasa → marca cambio como `VISUAL_IMPACT: high|medium|low`.
- **Checkpoint humano automático**: cuando el cambio tiene `VISUAL_IMPACT: high`, el orquestador te muestra el resultado antes de marcar la tarea como completa. La doctrina: el agente decide solo cuando hay UNA respuesta correcta; en todo lo demás (visual, multi-opción, irreversible, iterado 2+ veces) te pregunta con su recomendación incluida.
- **12 capas de defensa anti-falso-positivo** en QA: visual fidelity LLM-as-judge (5 dimensiones contra referencia), network inspection (Mixed Content, status 0, leaks de localhost), E2E flows obligatorios en auth/CRUD, reality-checker re-corre 2-3 PASS al azar, **TDD evidence trail opt-in** (RED→GREEN→TRIANGULATE→REFACTOR cuando hay `test_commands`), **cache hash de archivos en reintentos** (skip QA si todos los archivos tocados tienen hash idéntico al último PASS, ahorra ~80% de tokens en reintentos sin cambio real), **No-JS Render Audit en Fase 4** (Playwright con JS apagado mide qué contenido sobrevive — bloquea landings/blogs/ecommerce que serían invisibles a Bing/LLM scrapers/previews sociales).
- **Delegation Stop Rules cuantificados**: umbrales explícitos para escalar (5+ archivos leídos consecutivos → delegar a `Explore`, 20+ tool calls sin spawn → pausar, 2+ archivos no-triviales en una tarea → fresh review). Adaptado de [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai).
- **Simplicity First en outputs** (2026-05-26): toda respuesta arranca con TL;DR de 1-3 oraciones que resuelve la pregunta directa; si la respuesta natural se acaba ahí, termina ahí. Sube a estructura (tablas, secciones) solo si pediste análisis/comparación/plan o hay ≥3 ítems comparables. Baja a prosa simple si pediste "resumen", "corto", "rápido", "en palabras sencillas". Anti-patterns: headers `##` para parecer estructurado en respuestas chicas, tablas con 2 filas, iniciar con análisis antes de la conclusión directa. Detalle: [`agents/simplicity-first-reference.md`](agents/simplicity-first-reference.md).
- **Architecture Decision Records (ADR) en Engram** (2026-05-24): cada vez que se analiza un patrón/paradigma externo (paper, librería, sistema ajeno) vs el sistema vibecoding, la decisión queda persistida en Engram con prefix `claude-vibecoding/architecture-review/{YYYY-MM-DD}-{slug}`. Estados: ADOPTADO / DIFERIDO / RECHAZADO / MITIGACIÓN PARCIAL. El `self-auditor` T9 lee estas observations y reporta drift (decisión adoptada cuyo cambio desapareció), overdue (re-evaluación vencida) o reconsidered (patrón rechazado que reaparece). Evita re-analizar lo mismo + detecta cuando algo adoptado se deshizo silenciosamente.

---

## Configuración

### Engram MCP (memoria persistente) — obligatorio

Engram es lo que hace que el sistema *recuerde* entre sesiones. Sin él, cada conversación arranca de cero. Se instala automáticamente con el script de Linux y con la guía de Windows.

### Engram Cloud (memoria cross-machine) — recomendado

Si trabajás desde varias computadoras y querés que las memorias se crucen entre PCs en tiempo real (no al final de sesión), Engram tiene un modo **cloud** self-hosted. La instancia oficial corre en un VPS Oracle Cloud propio del autor con allowlist por proyecto.

El hook `engram-cloud-sync-on-stop` (incluido) empuja al cloud al cerrar sesión, y el cliente Engram local pull-ea automáticamente al iniciar la siguiente sesión. El servidor mantiene la fuente de verdad.

**Para auto-hospedar tu propio cloud** (recomendado para uso real):

1. Aprovisioná un VPS (Oracle Always Free Tier alcanza).
2. Cloná [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) y levantá `docker compose up -d cloud`.
3. En `/opt/engram-cloud/.env` configurá `ENGRAM_CLOUD_ALLOWED_PROJECTS=mi-proyecto,personal,…` (allowlist explícita para evitar bucket explosion).
4. Apuntá el client local a tu URL: `engram cloud configure --url https://TU-VPS:PUERTO`.
5. Para cada proyecto que quieras sincronizar: `engram cloud enroll <project-name>`.

**Reglas clave** (validadas en producción 2026-05-15):
- Todos los `mem_save` cross-PC deben usar `scope="personal"` + `project=` explícito. El auto-detect del MCP routea a buckets distintos según el cwd del cliente y rompe el cruce. Ver el protocolo "guarda en engram" completo en [`CLAUDE.md`](CLAUDE.md).
- Para agregar un bucket nuevo al cloud: SSH al server, editar `.env`, `docker compose up -d cloud`. Sin allowlist explícita el server retorna 403.

### Cross-Claude Mailbox Protocol — opt-in para uso multi-PC

Si trabajás en 2+ PCs con instancias separadas de Claude (típicamente Linux + Windows), podés activar un canal asíncrono entre ellas vía un bucket dedicado de Engram cloud (`cross-claude-mailbox`). Una instancia deja un mensaje (`mailbox/from-{origen}/to-{destino}/{ts}-{slug}`), la otra lo lee la próxima vez que la despertás.

**Es opt-in**: no se chequea por default en cada turn (ahorra ~3-5k tokens/día en sesiones que no coordinan cross-PC). Para activarlo en una sesión, decile a Claude *"chequeá el mailbox"* o *"¿hay mensajes de pc004?"*. Diseño completo (schemas query/reply, flujo checks vs edits con confirmación, anti-patrones): ver sección **Cross-Claude Mailbox Protocol** en [`CLAUDE.md`](CLAUDE.md).

**Reglas clave**:
- Lecturas/greps/doctor → el Claude destinatario auto-procesa y responde.
- Edits/Bash mutating/SSH → NO auto-aplicar, escalar al usuario primero.
- SSH al server productivo requiere autorización LITERAL EXPLÍCITA del usuario ("sí hacé el SSH"), no un "OK dale" genérico.

### Engram Sync (legacy, git) — opcional

Antes de Engram Cloud, el sync cross-PC se hacía empujando `~/.engram/` a un repo privado de GitHub. Sigue funcionando si preferís un setup más simple sin VPS, pero es **eventually consistent** (solo cruza al cerrar sesión) y requiere resolver conflictos a mano si dos PCs escriben en paralelo.

```bash
# 1. Creá un repo privado en GitHub (ej: mi-engram-sync)
# 2. Inicializalo en ~/.engram/:
cd ~/.engram && git init && git remote add origin https://github.com/TU_USUARIO/mi-engram-sync.git
# El hook engram-sync (ya instalado) hace el resto
```

### Variables de entorno para assets generativos — política free-first

> 🆕 **Actualizado 2026-05-18** — política free-first verificada con curl real contra fuentes primarias, NO con blogs de marketing que reciclan fechas. Con solo `HF_TOKEN` ya podés generar imágenes y logos sin tarjeta de crédito.

El sistema prioriza paths **FREE top-tier que no requieren tarjeta**. Las opciones pagas son opt-in.

Hay un archivo [`.env.example`](.env.example) en la raíz del repo con todos los campos comentados y links de signup.

#### Stack free real (ningún provider requiere tarjeta)

| Variable | Servicio | Quota free | Cómo obtenerla |
|---|---|---|---|
| **`HF_TOKEN`** ⭐ primario | HuggingFace Inference | $0.10/mes (~150 imgs FLUX-schnell), reset mensual | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → token role `Read` |
| **`CLOUDFLARE_ACCOUNT_ID`** + **`CLOUDFLARE_AI_TOKEN`** secundario | Cloudflare Workers AI | **10,000 neurons/día** sin tarjeta (cientos de imgs/día) | Setup en 3 pasos abajo ⬇️ |
| _sin variable_ | Pollinations.ai | **FLUX unlimited free** (FAQ oficial) | No requiere key — fallback automático |

Con solo `HF_TOKEN` el sistema funciona. Si agregás Cloudflare, multiplicás la quota gratis. Pollinations es el safety net automático cuando todo lo demás se agota.

#### Setup Cloudflare Workers AI (3 minutos, sin tarjeta)

1. **Signup**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — el plan Free Workers **NO pide tarjeta** ([fuente oficial](https://developers.cloudflare.com/workers-ai/platform/pricing/))
2. **Account ID**: en el dashboard, scrolleá el sidebar derecho hasta la sección "API" — copialo (32 chars hex)
3. **API Token**: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → "Create Custom Token" → permiso `Account → Workers AI → Read` → "Continue to summary" → "Create Token" (copialo, se muestra una sola vez)

#### Opt-in paga (solo si tenés billing habilitado)

| Variable | Servicio | Costo | Cuándo usarlo |
|---|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | $0.02-0.04/img + billing | Mejor comprensión LLM-nativa de prompts. Requiere [billing habilitado](https://aistudio.google.com/apikey) en Google Cloud |
| `REPLICATE_API_TOKEN` | Replicate | $0.03-0.10/video | Solo para video real (LTX-Video 2.3). Sin esta variable, `video-agent` retorna CSS fallback animado como output válido ([replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)) |
| `RECRAFT_API_KEY` | Recraft V4 Vector | $0.08/img + $5 free/mes via Vercel AI Gateway | Logos SVG **nativos** (sin pérdida raster→vector). Solo si querés logos vectoriales premium |

#### Dónde poner las variables

- **Linux/macOS**: agregalas a `~/.bashrc` o `~/.zshrc` con `export VAR=valor`, o crealas en `~/.claude/.env` (una por línea: `VAR=valor`)
- **Windows**: `setx VAR "valor"` en PowerShell (persiste user-level), o panel de control → Variables de entorno del sistema. **Cerrá y reabrí Claude Desktop** para que las tome.

### Pixel Bridge — opcional, decorativo

Una oficina pixel art donde los agentes caminan a sus escritorios cuando se les asigna una tarea, reportan al orquestador, y descansan cuando no hay trabajo. **Puramente visual**, no afecta el pipeline. Te lo ofrece el instalador.

---

## Los 4 modos de trabajo

| Modo | Cuándo usarlo | Cómo activarlo |
|---|---|---|
| **Claude normal** | Preguntas, fixes puntuales, revisar código, chat técnico | Default — solo hablar |
| **Orquestador** | Proyecto completo de principio a fin | Decí: *"modo orquestador — [tu idea]"* o *"activa el pipeline"* |
| **Modificación** | Cambios sobre un proyecto ya completado por el pipeline | Detectado automáticamente cuando decís *"retomar [proyecto] — [cambio]"* |
| **Diagnóstico** | Auditar código existente sin tocarlo (due diligence, audits de proyectos ajenos) | Decí: *"modo diagnóstico"*, *"audita este código"*, *"evalúa sin tocar"* |

En **modo normal**, Claude responde como siempre pero tiene acceso a los hooks, AUTO_AUDIT y memoria. En **modo orquestador**, adopta el rol de coordinador y delega a los 24 subagentes. En **modo modificación**, corre un mini-pipeline (Paso 0 de auditoría → planificación ligera → dev+QA solo de los agentes afectados). En **modo diagnóstico** es read-only por doctrina: solo lee y devuelve un reporte estructurado con hallazgos por severidad — útil para auditar proyectos que no fueron generados por este sistema (due diligence, code review de repos ajenos).

---

## Documentación técnica completa

Para developers que quieran ir más allá:

| Archivo | Para qué |
|---|---|
| [`agents/AGENTS.md`](agents/AGENTS.md) | Índice central de las 21 referencias técnicas con triggers de carga y skip conditions. El orquestador lo consulta en Fase 1 Paso 0b para decidir qué refs aplicar por proyecto (evita carga indiscriminada) |
| [`agents/orquestador.md`](agents/orquestador.md) | Comportamiento completo del orquestador: detección de modos, pipeline detallado, DAG State, fallbacks |
| [`agents/agent-protocol.md`](agents/agent-protocol.md) | Protocolo compartido entre subagentes: Engram (2 pasos), Return Envelope, VISUAL_IMPACT, Delegation Stop Rules, reglas universales |
| [`agents/pipeline-reference.md`](agents/pipeline-reference.md) | Detalles de cada fase, tools por agente, stack adaptable, Design Intelligence Engine |
| [`agents/external-skills-reference.md`](agents/external-skills-reference.md) | Skills externas via `npx skills add` — whitelist curada, opt-in en Fase 3, no contamina boot |
| [`CLAUDE.md`](CLAUDE.md) | El `CLAUDE.md` que se instala — toda la doctrina del sistema (Checkpoint humano, Engram, hooks, mod mode) |
| [`agents/ux-architect.md`](agents/ux-architect.md) | Tokens de diseño, container strategy, anchor scroll con sticky |
| [`agents/ui-designer.md`](agents/ui-designer.md) | Design system, SaaS Teal Default Detector (T1-T7), accesibilidad |
| [`agents/frontend-developer.md`](agents/frontend-developer.md) | Implementación frontend, AUTO_AUDIT pre-return, design decision tree |
| [`agents/evidence-collector.md`](agents/evidence-collector.md) | QA visual con Playwright, 9 capas anti-falso-positivo |
| [`hooks/`](hooks/) | Los 13 hooks + 3 utilities manuales: bloqueos, advertencias, auditorías, tracking, sync Engram (local+cloud) |
| [`design-data/`](design-data/) | Design Intelligence Engine: 8 CSVs con 161 industrias indexadas via BM25 |
| [`.gitattributes`](.gitattributes) | Fuerza LF en archivos de texto cross-PC (Windows ↔ Linux). Previene drift CRLF/LF en commits — añadido 2026-05-20 tras audit que detectó diffs falsos de ~900 líneas por line endings |

---

## Arquitectura en disco

```
~/.claude/
├── agents/            # 25 agentes + 21 referencias técnicas + AGENTS.md (índice) + agent-protocol.md = 48 archivos .md
├── design-data/       # Design Intelligence Engine (search.js + 8 CSVs)
├── hooks/             # 13 hooks + 3 utilities (bloqueos, warnings, sync background, health check)
├── settings.json      # config de hooks + Engram MCP
├── settings.local.json # permisos para agentes
├── codepen-vault/     # efectos CodePen aprobados (decorativo)
└── pixel-bridge/      # sistema visual opcional

~/CLAUDE.md            # instrucciones globales del sistema (auto-leído por Claude)
```

### Model routing

| Modelo | Agentes | Por qué |
|---|---|---|
| **Opus** | orquestador, project-manager-senior, security-engineer, game-designer, reality-checker | Decisiones arquitectónicas complejas, planificación, threat modeling, certificación final |
| **Sonnet** | Los otros 20 agentes | Ejecución de tareas definidas, QA, utilidades, creativos |

---

## Stack adaptable

El orquestador elige el stack en Fase 1 según el proyecto. **No hay stack fijo.** Estos son los defaults preferidos:

| Capa | Opciones | Default |
|---|---|---|
| Frontend | Next.js, SvelteKit, Astro, Vite+React | Next.js (apps), **Astro** (landings content-heavy) o Vite+React (landings app-like). El orquestador pregunta antes si hay >1 alternativa válida |
| Backend | Hono, Express, Fastify | Hono (edge-ready) |
| Database | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle |
| Auth | Better Auth | Siempre (salvo proyecto con auth pre-existente) |
| Mobile | React Native + Expo SDK 52+ | Expo |
| Juegos 2D | Phaser.js, PixiJS, Canvas | Phaser.js |
| Juegos 3D | Three.js, Babylon.js | Three.js |
| Animación | CSS (T1), Framer Motion (T2), GSAP (T3) | Escala según `motion_intensity` |
| Audio reactivo | Tone.js, Web Audio API | Tone.js |

---

## Troubleshooting

**El comando `bash install/linux.sh` falla.** Verificá que tenés `git`, `curl`, `node` y `gh` instalados. El script intenta detectar el gestor de paquetes (apt, dnf, pacman, brew) pero a veces falla en distros menos comunes. Instalá manualmente lo que falte y volvé a correrlo.

**Claude no encuentra los agentes después de instalar.** Reiniciá Claude Code (Linux) o Claude Desktop (Windows). Los agentes se cargan al iniciar el cliente.

**Engram no responde / "MCP not found".** Verificá que `~/.claude/settings.json` tenga la sección `enabledPlugins.engram@engram: true` y que reiniciaste Claude. En Windows, además, necesitás haber instalado el binario de Engram (ver `install/windows.md`).

**El orquestador no me deja decir "decidí vos" en el Intent Clarifier.** Es intencional. Las preguntas 3 (estilo visual) y 5 (originalidad) bloquean el bypass para evitar outputs genéricos. Si realmente no tenés preferencia, elegí "balanced" en originalidad y "minimalist" en estilo — son los defaults seguros.

**El AUTO_AUDIT del hook `pre-return-audit` me bloquea cambios legítimos.** El hook es **fail-open** (advierte pero no bloquea). Si te avisa de un falso positivo recurrente, podés ajustar las reglas en `~/.claude/hooks/pre-return-audit.sh` o desactivar la entrada en `~/.claude/settings.json`.

**Quiero usar el sistema con otro runtime (Cursor, Aider, etc.).** Ver sección [Otros entornos](#otros-entornos-cursor-aider-codex-cli-claude-api-directa-otros-llms) arriba. No hay soporte oficial — la arquitectura es portable pero requiere adaptación de hooks y MCP.

---

## FAQ rápida

**¿Es seguro para producción?** Los proyectos generados pasan por 4 capas de certificación (SEO + API testing + performance + reality check) antes del deploy. Headers de seguridad, validaciones OWASP Top 10 y cache configurado vienen de fábrica.

**¿Cuánto cuesta usar el sistema?** El sistema en sí es gratis y open source. Los costos son: 1) tu suscripción a Claude (Pro/Max o API), 2) opcionalmente APIs de IA para imágenes (Gemini ~$0.04/img, HuggingFace gratis) y videos (Replicate ~$0.05/video), 3) hosting si no usás el free tier de Vercel.

**¿Funciona con la API directa de Anthropic, sin Claude Code?** No directamente. El sistema depende de los subagentes de Claude Code y los hooks. Para portarlo a la API directa necesitarías reimplementar la coordinación tú mismo (es viable pero no trivial).

**¿Puedo modificar los agentes para personalizarlos?** Sí. Los agentes son archivos `.md` en `~/.claude/agents/`. Podés editar el comportamiento de cualquiera. Si querés conservar tus cambios al actualizar el sistema, hacé fork del repo y aplicale tus modificaciones a tu fork.

**¿Cómo actualizo el sistema cuando salga una nueva versión?** Hacé `git pull` en el repo clonado y volvé a correr `bash install/linux.sh` (o seguí los pasos de Windows). El instalador hace backup de tus archivos antes de sobrescribir (`*.bak` files).

**¿El sistema escribe en español o en inglés?** Los agentes se comunican entre sí en español, te hablan en español, pero **el código que generan está en el idioma estándar de programación (inglés)** — nombres de variables, comentarios, commits, etc. Esto es importante para que tu proyecto sea legible internacionalmente.

---

## Contribuir

Pull requests bienvenidos. Antes de mandar uno:

1. Si es un cambio en agentes, hooks o reglas de la arquitectura, corré `node ~/.claude/hooks/audit-system.js` para validar que no rompiste nada.
2. Si agregás un hook nuevo, sumalo a la tabla en `CLAUDE.md` (root del repo, fuente de verdad única desde 2026-05-26) y al script `install/linux.sh`.
3. Si modificás el README o la documentación, mantenete en el tono accesible — el sistema lo usan también personas no programadoras.

Para reportar bugs o discutir features, [abrí un issue](https://github.com/Emaleo0522/claude-vibecoding/issues).

---

## Créditos

- **Engram MCP** — [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) (memoria persistente)
- **Design Intelligence Engine** — basado en [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), portado a Node.js
- **Pixel Bridge** — basado en [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (visualización opcional)
- **Nothing Design System** — referencia tomada de [dominikmartn/nothing-design-skill](https://github.com/dominikmartn/nothing-design-skill) v3.0.0

---

## Licencia

MIT — ver [LICENSE](LICENSE).

---

*Construido para acompañarte, no para reemplazar tu criterio. El sistema decide lo que tiene UNA respuesta correcta y te pregunta lo que tiene varias. Esa es la línea.*
