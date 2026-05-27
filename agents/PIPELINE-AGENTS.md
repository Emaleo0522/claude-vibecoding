# Los 25 agentes — qué hace cada uno / What each agent does

> **Español primero · English below**
>
> Este archivo es **referencia para humanos**. No se carga al boot del orquestador — solo lo consulta quien quiere entender qué hace cada agente. Organizado por fase del pipeline. Click en el nombre del agente para ver su `.md` completo (instrucciones, tools, protocolo).
>
> *This file is **human reference**. Not loaded at orchestrator boot — only consulted to understand what each agent does. Organized by pipeline phase. Click the agent name for its full `.md` (instructions, tools, protocol).*

---

## ESPAÑOL

### Meta (transversales — no son fase del pipeline)

| Agente | Para qué |
|---|---|
| [`orquestador`](orquestador.md) | Coordinador central. Activarlo para **cualquier proyecto nuevo** (web, app, juego, API). Gestiona el pipeline completo delegando a los otros agentes. **Nunca hace trabajo real**, solo coordina |
| [`self-auditor`](self-auditor.md) | Valida que el propio sistema vibecoding funciona correctamente (agentes, hooks, Engram, CLAUDE.md, T9 Architecture Drift Check). Ejecutar bajo demanda — `node ~/.claude/hooks/audit-system.js` |

### Fase 1 — Planificación

| Agente | Para qué |
|---|---|
| [`project-manager-senior`](project-manager-senior.md) | Convierte la spec de un proyecto en una lista de tareas granulares con criterios de aceptación exactos. Guarda en Engram y devuelve resumen corto |

### Fase 2 — Arquitectura (paralelo)

| Agente | Para qué |
|---|---|
| [`ux-architect`](ux-architect.md) | Crea la fundación técnica CSS antes de que empiece cualquier código. Tokens de diseño, layout, tema claro/oscuro, breakpoints |
| [`ui-designer`](ui-designer.md) | Crea el design system visual (componentes, paleta, tipografía, estados). Trabaja sobre la fundación CSS del ux-architect. Incluye SaaS Teal Default Detector T1-T7 (anti-genérico) |
| [`security-engineer`](security-engineer.md) | Analiza amenazas con STRIDE, define headers de seguridad, checklist OWASP Top 10 y validaciones críticas |

### Fase 2B — Assets visuales (condicional según `intent.project_type`)

| Agente | Para qué |
|---|---|
| [`brand-agent`](brand-agent.md) | Genera identidad visual completa (colores, tipografía, tono, specs de assets). **Siempre primero** — produce `brand.json` que el resto de agentes creativos leen. Free siempre (texto puro, sin API externa) |
| [`image-agent`](image-agent.md) | Genera imágenes para web (hero, fondos, thumbnails). Free-first verificado 2026: HuggingFace FLUX.1-schnell → Cloudflare Workers AI → Pollinations. Gemini opt-in si hay billing |
| [`logo-agent`](logo-agent.md) | Genera logos vectoriales SVG (4 variantes). Pipeline free: HF + vtracer/Inkscape. Recraft V4 Vector opt-in con Vercel AI Gateway. Ejecuta en paralelo con image-agent |
| [`video-agent`](video-agent.md) | Genera videos cortos en loop (3-5s) o CSS fallback animado para fondos hero. Sin `REPLICATE_API_TOKEN` entrega CSS fallback como output **válido** (no bloquea pipeline). Replicate LTX-Video 2.3 opt-in con billing |

### Fase 3 — Dev (paralelo según tipo de tarea)

| Agente | Para qué |
|---|---|
| [`frontend-developer`](frontend-developer.md) | Implementa UI web con React/Vue/TS, Tailwind, shadcn/ui. También maneja game loops con Phaser.js/PixiJS/Canvas. Incluye AUTO_AUDIT pre-return + design decision tree |
| [`backend-architect`](backend-architect.md) | Implementa APIs, esquemas de DB, lógica de servidor y seguridad backend. PostgreSQL, Prisma, Express, Supabase |
| [`rapid-prototyper`](rapid-prototyper.md) | Crea MVPs funcionales en menos de 3 días. Next.js + Prisma + Supabase + shadcn/ui. Cuando el proyecto necesita validación rápida |
| [`mobile-developer`](mobile-developer.md) | Desarrolla apps móviles iOS y Android con React Native y Expo. Navegación, estado, forms, auth y build |
| [`xr-immersive-developer`](xr-immersive-developer.md) | Implementa juegos de navegador con Canvas API, Phaser.js, PixiJS o WebGL. Game loops, rendering, input, física, audio |
| [`game-designer`](game-designer.md) | Crea el Game Design Document (GDD) completo — mecánicas, loops, economía, balance, subsistemas, scene graph, audio, level design, onboarding. Antes del código de juego |
| [`codepen-explorer`](codepen-explorer.md) | Busca, extrae e interpreta efectos de CodePen vía Playwright MCP. Gestiona la bóveda de efectos probados (`~/.claude/codepen-vault/`) |
| [`build-resolver`](build-resolver.md) | Resuelve errores de build automáticamente. Diagnostica, aplica fix, re-ejecuta build. Activado cuando `npm run build` falla |

### Fase 3 — QA loop (correrá después de cada tarea de dev)

| Agente | Para qué |
|---|---|
| [`evidence-collector`](evidence-collector.md) | QA tarea por tarea con screenshots reales vía Playwright MCP. 9 capas anti-falso-positivo (visual fidelity LLM-as-judge, network inspection, E2E flows, TDD trail, cache hash). Devuelve PASS/FAIL con evidencia visual. Máximo 3 reintentos |

### Fase 4 — Certificación pre-deploy

| Agente | Para qué |
|---|---|
| [`seo-discovery`](seo-discovery.md) | Optimiza SEO técnico y visibilidad para motores de búsqueda **e IAs** (Google, Bing, ChatGPT, Perplexity, Claude). Incluye Crawl Budget & Non-JS Scrapers doctrine |
| [`api-tester`](api-tester.md) | Valida endpoints de API contra spec. Cobertura, seguridad OWASP API Top 10, performance P95 |
| [`performance-benchmarker`](performance-benchmarker.md) | Mide Core Web Vitals, tiempos de carga, bottlenecks y load testing. Si hay `deploy_url`, testea contra URL pública (no localhost) |
| [`reality-checker`](reality-checker.md) | **Gate final pre-producción**. Default `NEEDS WORK` — sube a OK solo con evidencia completa. Incluye No-JS Render Audit (Paso 4.5), Mixed Content dinámico, False Positive Guardrail (re-corre 2-3 PASS aleatorios) |

### Fase 5 — Publicación (solo con confirmación del usuario)

| Agente | Para qué |
|---|---|
| [`git`](git.md) | Hace commit y push a GitHub. Usa HTTPS + token (`gh auth token`). Solo actúa cuando el orquestador lo indica tras confirmación del usuario |
| [`deployer`](deployer.md) | Despliega a Vercel (web) o EAS Build (mobile) usando CLI. Solo actúa con confirmación |

---

## ENGLISH

### Meta (cross-cutting — not a pipeline phase)

| Agent | What for |
|---|---|
| [`orquestador`](orquestador.md) | Central coordinator. Activate for **any new project** (web, app, game, API). Manages the full pipeline by delegating to other agents. **Never does real work**, only coordinates |
| [`self-auditor`](self-auditor.md) | Validates that the vibecoding system itself works (agents, hooks, Engram, CLAUDE.md, T9 Architecture Drift Check). Run on demand — `node ~/.claude/hooks/audit-system.js` |

### Phase 1 — Planning

| Agent | What for |
|---|---|
| [`project-manager-senior`](project-manager-senior.md) | Turns a project spec into a list of granular tasks with exact acceptance criteria. Saves to Engram and returns a short summary |

### Phase 2 — Architecture (parallel)

| Agent | What for |
|---|---|
| [`ux-architect`](ux-architect.md) | Builds the CSS technical foundation before any code starts. Design tokens, layout, light/dark theme, breakpoints |
| [`ui-designer`](ui-designer.md) | Builds the visual design system (components, palette, typography, states). Works on top of ux-architect's CSS foundation. Includes SaaS Teal Default Detector T1-T7 (anti-generic) |
| [`security-engineer`](security-engineer.md) | Threat modeling with STRIDE, security headers, OWASP Top 10 checklist, critical validations |

### Phase 2B — Visual assets (conditional on `intent.project_type`)

| Agent | What for |
|---|---|
| [`brand-agent`](brand-agent.md) | Generates complete visual identity (colors, typography, tone, asset specs). **Always first** — produces `brand.json` that the rest of creative agents read. Free always (plain text, no external API) |
| [`image-agent`](image-agent.md) | Generates web images (hero, backgrounds, thumbnails). Free-first verified 2026: HuggingFace FLUX.1-schnell → Cloudflare Workers AI → Pollinations. Gemini opt-in if you have billing |
| [`logo-agent`](logo-agent.md) | Generates vector SVG logos (4 variants). Free pipeline: HF + vtracer/Inkscape. Recraft V4 Vector opt-in with Vercel AI Gateway. Runs in parallel with image-agent |
| [`video-agent`](video-agent.md) | Generates short loop videos (3-5s) or animated CSS fallback for hero backgrounds. Without `REPLICATE_API_TOKEN`, returns CSS fallback as **valid** output (doesn't block pipeline). Replicate LTX-Video 2.3 opt-in with billing |

### Phase 3 — Dev (parallel by task type)

| Agent | What for |
|---|---|
| [`frontend-developer`](frontend-developer.md) | Implements web UI with React/Vue/TS, Tailwind, shadcn/ui. Also handles game loops with Phaser.js/PixiJS/Canvas. Includes AUTO_AUDIT pre-return + design decision tree |
| [`backend-architect`](backend-architect.md) | Implements APIs, DB schemas, server logic, backend security. PostgreSQL, Prisma, Express, Supabase |
| [`rapid-prototyper`](rapid-prototyper.md) | Builds functional MVPs in under 3 days. Next.js + Prisma + Supabase + shadcn/ui. When the project needs fast validation |
| [`mobile-developer`](mobile-developer.md) | Develops iOS and Android mobile apps with React Native and Expo. Navigation, state, forms, auth, build |
| [`xr-immersive-developer`](xr-immersive-developer.md) | Implements browser games with Canvas API, Phaser.js, PixiJS or WebGL. Game loops, rendering, input, physics, audio |
| [`game-designer`](game-designer.md) | Creates the full Game Design Document (GDD) — mechanics, loops, economy, balance, subsystems, scene graph, audio, level design, onboarding. Before game code |
| [`codepen-explorer`](codepen-explorer.md) | Finds, extracts and interprets CodePen effects via Playwright MCP. Manages the approved effects vault (`~/.claude/codepen-vault/`) |
| [`build-resolver`](build-resolver.md) | Resolves build errors automatically. Diagnoses, applies fix, re-runs build. Triggered when `npm run build` fails |

### Phase 3 — QA loop (runs after each dev task)

| Agent | What for |
|---|---|
| [`evidence-collector`](evidence-collector.md) | Task-by-task QA with real screenshots via Playwright MCP. 9 anti-false-positive layers (LLM-as-judge visual fidelity, network inspection, E2E flows, TDD trail, file cache hash). Returns PASS/FAIL with visual evidence. Max 3 retries |

### Phase 4 — Pre-deploy certification

| Agent | What for |
|---|---|
| [`seo-discovery`](seo-discovery.md) | Optimizes technical SEO and visibility for search engines **and AIs** (Google, Bing, ChatGPT, Perplexity, Claude). Includes Crawl Budget & Non-JS Scrapers doctrine |
| [`api-tester`](api-tester.md) | Validates API endpoints against spec. Coverage, OWASP API Top 10 security, P95 performance |
| [`performance-benchmarker`](performance-benchmarker.md) | Measures Core Web Vitals, load times, bottlenecks, load testing. If `deploy_url` exists, tests against public URL (not localhost) |
| [`reality-checker`](reality-checker.md) | **Final pre-production gate**. Default `NEEDS WORK` — only flips to OK with complete evidence. Includes No-JS Render Audit (Step 4.5), dynamic Mixed Content, False Positive Guardrail (re-runs 2-3 random PASS) |

### Phase 5 — Publishing (only with user confirmation)

| Agent | What for |
|---|---|
| [`git`](git.md) | Commits and pushes to GitHub. Uses HTTPS + token (`gh auth token`). Only acts when the orchestrator instructs after user confirmation |
| [`deployer`](deployer.md) | Deploys to Vercel (web) or EAS Build (mobile) using CLI. Only acts with confirmation |

---

## Total

**25 agents** organized across 5 phases + Phase 2B conditional + 2 cross-cutting meta agents.

Routing by model:
- **Opus** (5): orquestador, project-manager-senior, security-engineer, game-designer, reality-checker — complex architectural decisions, planning, threat modeling, final certification
- **Sonnet** (20): all other agents — defined task execution, QA, utilities, creative

For per-phase coordination details (DAG state, retries, fallbacks), see [`orquestador.md`](orquestador.md). For shared protocol (Engram 2-pasos, Return Envelope, VISUAL_IMPACT, Delegation Stop Rules), see [`agent-protocol.md`](agent-protocol.md).
