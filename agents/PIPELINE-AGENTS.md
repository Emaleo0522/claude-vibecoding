# Los 25 agentes — qué hace cada uno / What each agent does

> **Español primero · English below · Glosario al final**
>
> Este archivo es **referencia para humanos**. No se carga al boot del orquestador — solo lo consulta quien quiere entender qué hace cada agente. Click en el nombre del agente para ver su `.md` completo.
>
> *This file is **human reference**. Not loaded at orchestrator boot. Click the agent name for its full `.md`.*

---

## ¿Qué es esto? (introducción para todos / introduction for everyone)

**ES:** Tu proyecto (sitio web, app móvil, juego) es como construir una casa: no la hace una sola persona. Hay un equipo de especialistas — arquitecto, decorador, albañiles, electricistas, inspector, mudanza. Este sistema funciona igual: **25 agentes especializados**, cada uno sabe hacer **una cosa muy bien**. El **orquestador** (jefe de obra) decide a quién llamar y cuándo, según lo que pediste. Vos das la idea; el orquestador coordina al equipo en el orden correcto.

Los agentes se agrupan en **5 fases** (planificación → arquitectura → construcción → certificación → publicación), con una fase opcional **2B** (assets creativos: logos, imágenes, video) cuando el proyecto los necesita.

**EN:** Your project (website, mobile app, game) is like building a house: it's not done by one person. There's a team of specialists — architect, decorator, builders, electricians, inspector, movers. This system works the same way: **25 specialized agents**, each one knows how to do **one thing very well**. The **orchestrator** (foreman) decides who to call and when, based on what you asked for. You give the idea; the orchestrator coordinates the team in the right order.

Agents are grouped into **5 phases** (planning → architecture → construction → certification → publishing), with an optional phase **2B** (creative assets: logos, images, video) when the project needs them.

---

## Cómo leer las tablas / How to read the tables

Cada agente tiene **2 líneas**:
- **🔧 Técnico** — para devs que conocen el stack (React, OWASP, etc.)
- **🏠 En simple** — en palabras de todos los días, sin jerga técnica

*Each agent has **2 lines**: **🔧 Technical** (for devs who know the stack) and **🏠 In plain words** (everyday language, no jargon).*

---

## ESPAÑOL

### Meta (transversales — no son fase del pipeline)

| Agente | Para qué |
|---|---|
| [`orquestador`](orquestador.md) | **🔧 Técnico:** Coordinador central. Gestiona el pipeline completo delegando a los otros agentes. Nunca hace trabajo real, solo coordina. |
| | **🏠 En simple:** Es el **jefe de obra**. Vos le decís "quiero un sitio para mi cafetería" y él va llamando a cada especialista en orden. Nunca pinta paredes ni clava clavos — solo dirige al equipo. |
| [`self-auditor`](self-auditor.md) | **🔧 Técnico:** Valida que el propio sistema vibecoding está bien configurado (agentes, hooks, Engram, CLAUDE.md, T9 Architecture Drift Check). Bajo demanda con `node ~/.claude/hooks/audit-system.js`. |
| | **🏠 En simple:** Es el **mecánico que revisa las herramientas del equipo**, no las casas que construyen. Se asegura que el sistema mismo esté sano, no los proyectos. |

### Fase 1 — Planificación

| Agente | Para qué |
|---|---|
| [`project-manager-senior`](project-manager-senior.md) | **🔧 Técnico:** Convierte la spec de un proyecto en una lista de tareas granulares con criterios de aceptación exactos. Guarda en Engram y devuelve resumen corto. |
| | **🏠 En simple:** Es el **PM** que toma tu idea ("quiero X") y la convierte en una lista de tareas concretas con "esto está terminado cuando...". |

### Fase 2 — Arquitectura (los 3 corren en paralelo)

| Agente | Para qué |
|---|---|
| [`ux-architect`](ux-architect.md) | **🔧 Técnico:** Crea la fundación técnica CSS antes de cualquier código. Tokens de diseño, layout, tema claro/oscuro, breakpoints. |
| | **🏠 En simple:** Es el **arquitecto estructural**: define los cimientos invisibles (medidas, espaciado, cómo se adapta a móvil vs desktop) sobre los que después se construye lo visible. |
| [`ui-designer`](ui-designer.md) | **🔧 Técnico:** Crea el design system visual (componentes, paleta, tipografía, estados). Trabaja sobre la fundación CSS del ux-architect. Incluye SaaS Teal Default Detector T1-T7 (anti-genérico). |
| | **🏠 En simple:** Es el **decorador de interiores**: define cómo se ven los botones, las cards, los formularios. Tiene reglas para evitar el "look genérico de SaaS" que se ve igual en todos lados. |
| [`security-engineer`](security-engineer.md) | **🔧 Técnico:** Threat modeling con STRIDE, headers de seguridad, checklist OWASP Top 10, validaciones críticas. |
| | **🏠 En simple:** Es el **inspector de seguridad eléctrica y anti-incendio**: revisa antes de publicar y dice qué riesgos hay (cómo alguien podría romper, atacar o robar datos) y cómo prevenirlos. |

### Fase 2B — Assets visuales (opcional — solo si el proyecto los necesita)

| Agente | Para qué |
|---|---|
| [`brand-agent`](brand-agent.md) | **🔧 Técnico:** Genera identidad visual completa (colores, tipografía, tono, specs de assets). **SIEMPRE primero** — produce `brand.json` que image-agent, logo-agent y video-agent leen después. Free siempre (texto puro, sin API externa). |
| | **🏠 En simple:** Es el **director creativo** que define la "personalidad" de la marca: qué colores, qué tipografía, qué estilo (elegante, divertido, profesional, etc.). Tiene que terminar antes de que los otros agentes creativos arranquen. |
| [`image-agent`](image-agent.md) | **🔧 Técnico:** Genera imágenes para web (hero, fondos, thumbnails). Free-first verificado 2026: HuggingFace FLUX.1-schnell → Cloudflare Workers AI → Pollinations. Gemini opt-in si hay billing. |
| | **🏠 En simple:** Es el **fotógrafo/ilustrador con IA**: genera las imágenes de fondo, banners y miniaturas que necesita el sitio. Por defecto usa servicios gratuitos (no requiere tarjeta de crédito). |
| [`logo-agent`](logo-agent.md) | **🔧 Técnico:** Genera logos vectoriales SVG (4 variantes). Pipeline free: HF + vtracer/Inkscape. Recraft V4 Vector opt-in con Vercel AI Gateway. Ejecuta en paralelo con image-agent. |
| | **🏠 En simple:** Es el **diseñador de logo**: genera 4 versiones del logo (completo, ícono, modo oscuro, etc.) en formato vectorial (escalable sin perder calidad). |
| [`video-agent`](video-agent.md) | **🔧 Técnico:** Genera videos cortos en loop (3-5s) o CSS fallback animado para fondos hero. Sin `REPLICATE_API_TOKEN` entrega CSS fallback como output **válido** (no bloquea pipeline). Replicate LTX-Video 2.3 opt-in con billing. |
| | **🏠 En simple:** Es el **videógrafo**: genera videos cortos para fondos hero. Si no tenés billing para el servicio de IA, devuelve una animación CSS como alternativa (no bloquea el proyecto). |

### Fase 3 — Implementación con QA continuo

> El equipo de programadores trabaja en paralelo según el tipo de tarea (web, móvil, juego, etc.). **Después de cada tarea**, el QA (evidence-collector) valida lo hecho con screenshots reales antes de avanzar a la siguiente. Máximo 3 reintentos por tarea.

| Agente | Para qué |
|---|---|
| [`frontend-developer`](frontend-developer.md) | **🔧 Técnico:** Implementa UI web con React/Vue/TS, Tailwind, shadcn/ui. También maneja game loops con Phaser.js/PixiJS/Canvas. Incluye AUTO_AUDIT pre-return + design decision tree. |
| | **🏠 En simple:** Es el **programador de la parte visible** (lo que ve el visitante del sitio). Antes de entregar, corre un auto-chequeo para evitar errores comunes (colores genéricos, fuentes mal cargadas, etc.). |
| [`backend-architect`](backend-architect.md) | **🔧 Técnico:** Implementa APIs, esquemas de DB, lógica de servidor y seguridad backend. PostgreSQL, Prisma, Express, Supabase. |
| | **🏠 En simple:** Es el **programador del motor invisible** (lo que pasa en el servidor cuando el visitante hace click): base de datos, login, validaciones, envío de emails, etc. |
| [`rapid-prototyper`](rapid-prototyper.md) | **🔧 Técnico:** Crea MVPs funcionales en menos de 3 días. Next.js + Prisma + Supabase + shadcn/ui. Cuando el proyecto necesita validación rápida. |
| | **🏠 En simple:** Es el **prototipador rápido**: cuando querés validar una idea antes de construir todo en serio, arma una versión funcional básica en pocos días. |
| [`mobile-developer`](mobile-developer.md) | **🔧 Técnico:** Desarrolla apps móviles iOS y Android con React Native y Expo. Navegación, estado, forms, auth y build. |
| | **🏠 En simple:** Es el **programador de apps de celular** (las que se descargan de App Store / Google Play). |
| [`xr-immersive-developer`](xr-immersive-developer.md) | **🔧 Técnico:** Implementa juegos de navegador con Canvas API, Phaser.js, PixiJS o WebGL. Game loops, rendering, input, física, audio. |
| | **🏠 En simple:** Es el **programador de juegos web** (los que se juegan en el navegador, sin descargar nada). |
| [`game-designer`](game-designer.md) | **🔧 Técnico:** Crea el Game Design Document (GDD) completo — mecánicas, loops, economía, balance, subsistemas, scene graph, audio, level design, onboarding. Antes del código de juego. |
| | **🏠 En simple:** Es el **diseñador de las reglas del juego** (cómo se juega, cómo se gana, qué premios hay, cómo aumenta la dificultad). Trabaja antes que se programe el juego. |
| [`codepen-explorer`](codepen-explorer.md) | **🔧 Técnico:** Busca, extrae e interpreta efectos de CodePen vía Playwright MCP. NO construye ni adapta — eso lo hace frontend-developer. Gestiona la bóveda de efectos probados (`~/.claude/codepen-vault/`). |
| | **🏠 En simple:** Es el **scout de efectos visuales**: busca en CodePen (una web pública de demos) efectos ya hechos por la comunidad (animaciones, transiciones, etc.) y los trae al proyecto. NO los adapta — eso lo hace el programador frontend después. |
| [`build-resolver`](build-resolver.md) | **🔧 Técnico:** Resuelve errores de build automáticamente. Diagnostica, aplica fix, re-ejecuta build. Activado cuando `npm run build` falla. |
| | **🏠 En simple:** Es el **técnico de guardia**: cuando el código tira un error al compilar, este agente trata de diagnosticar la causa y arreglarlo solo, sin intervención humana. |
| [`evidence-collector`](evidence-collector.md) | **🔧 Técnico:** QA tarea por tarea con screenshots reales vía Playwright MCP. 9 capas anti-falso-positivo (LLM-as-judge visual fidelity, network inspection, E2E flows obligatorios, TDD trail, file cache hash). Devuelve PASS/FAIL con evidencia visual. Máximo 3 reintentos. |
| | **🏠 En simple:** Es el **tester con cámara**: después de cada tarea, abre el navegador, prueba lo que se hizo, saca capturas de pantalla como evidencia, y dice "pasó" o "falló" con detalle de qué encontró. Tiene 9 técnicas para evitar dar "OK" a algo que en realidad está roto. |

### Fase 4 — Certificación pre-deploy

| Agente | Para qué |
|---|---|
| [`seo-discovery`](seo-discovery.md) | **🔧 Técnico:** Optimiza SEO técnico y visibilidad para motores de búsqueda **e IAs** (Google, Bing, ChatGPT, Perplexity, Claude). Incluye Crawl Budget & Non-JS Scrapers doctrine. |
| | **🏠 En simple:** Es el **especialista en visibilidad**: se asegura que Google encuentre tu sitio, y también que los chatbots de IA (ChatGPT, Claude, Perplexity) lo puedan leer y citar. |
| [`api-tester`](api-tester.md) | **🔧 Técnico:** Valida endpoints de API contra spec. Cobertura, seguridad OWASP API Top 10, performance P95. |
| | **🏠 En simple:** Es el **tester de la parte del servidor**: prueba que las URLs internas (las APIs) respondan rápido, no tengan vulnerabilidades de seguridad y devuelvan lo que prometen. |
| [`performance-benchmarker`](performance-benchmarker.md) | **🔧 Técnico:** Mide Core Web Vitals, tiempos de carga, bottlenecks y load testing. Si hay `deploy_url`, testea contra URL pública (no localhost). |
| | **🏠 En simple:** Es el **cronometrador**: mide qué tan rápido carga el sitio (las métricas que Google también mira) e identifica qué está demorando más de la cuenta. |
| [`reality-checker`](reality-checker.md) | **🔧 Técnico:** **Gate final pre-producción**. Default `NEEDS WORK` — sube a OK solo con evidencia completa. Incluye No-JS Render Audit (Paso 4.5), Mixed Content dinámico, False Positive Guardrail (re-corre 2-3 PASS aleatorios). |
| | **🏠 En simple:** Es el **inspector final de obra**: por defecto dice "FALTA TRABAJO". Solo aprueba cuando hay evidencia completa de que todo funciona. Re-prueba al azar algunos checks anteriores para asegurarse que no eran falsos positivos. |

### Fase 5 — Publicación (solo con confirmación del usuario)

| Agente | Para qué |
|---|---|
| [`git`](git.md) | **🔧 Técnico:** Hace commit y push a GitHub. Usa HTTPS + token (`gh auth token`). Solo actúa cuando el orquestador lo indica tras confirmación del usuario. |
| | **🏠 En simple:** Es el que **guarda los cambios en el repositorio** (la "memoria" online del código). Solo lo hace cuando vos das OK explícito. |
| [`deployer`](deployer.md) | **🔧 Técnico:** Despliega a Vercel (web) o EAS Build (mobile) usando CLI. Solo actúa con confirmación. |
| | **🏠 En simple:** Es el **mudancero**: agarra el proyecto terminado y lo publica en internet (Vercel para web, App Store/Google Play para móvil). Solo lo hace cuando vos das OK. |

---

## ENGLISH

### Meta (cross-cutting — not a pipeline phase)

| Agent | What for |
|---|---|
| [`orquestador`](orquestador.md) | **🔧 Technical:** Central coordinator. Manages the full pipeline by delegating to other agents. Never does real work, only coordinates. |
| | **🏠 In plain words:** It's the **foreman**. You say "I want a site for my coffee shop" and it calls each specialist in order. It never paints walls or hammers nails — it just directs the team. |
| [`self-auditor`](self-auditor.md) | **🔧 Technical:** Validates that the vibecoding system itself is properly configured (agents, hooks, Engram, CLAUDE.md, T9 Architecture Drift Check). On demand with `node ~/.claude/hooks/audit-system.js`. |
| | **🏠 In plain words:** It's the **mechanic that checks the team's tools**, not the houses they build. Makes sure the system itself is healthy, not individual projects. |

### Phase 1 — Planning

| Agent | What for |
|---|---|
| [`project-manager-senior`](project-manager-senior.md) | **🔧 Technical:** Turns a project spec into a list of granular tasks with exact acceptance criteria. Saves to Engram and returns a short summary. |
| | **🏠 In plain words:** It's the **PM** that takes your idea ("I want X") and turns it into a concrete task list with "this is done when…". |

### Phase 2 — Architecture (the 3 run in parallel)

| Agent | What for |
|---|---|
| [`ux-architect`](ux-architect.md) | **🔧 Technical:** Builds the CSS technical foundation before any code. Design tokens, layout, light/dark theme, breakpoints. |
| | **🏠 In plain words:** It's the **structural architect**: defines the invisible foundations (measurements, spacing, how it adapts to mobile vs desktop) on top of which the visible parts are built. |
| [`ui-designer`](ui-designer.md) | **🔧 Technical:** Builds the visual design system (components, palette, typography, states). Works on top of ux-architect's CSS foundation. Includes SaaS Teal Default Detector T1-T7 (anti-generic). |
| | **🏠 In plain words:** It's the **interior designer**: defines how buttons, cards, forms look. Has rules to avoid the "generic SaaS look" that all sites look the same. |
| [`security-engineer`](security-engineer.md) | **🔧 Technical:** Threat modeling with STRIDE, security headers, OWASP Top 10 checklist, critical validations. |
| | **🏠 In plain words:** It's the **electrical and fire safety inspector**: reviews before publishing and identifies risks (how someone could break in, attack, or steal data) and how to prevent them. |

### Phase 2B — Visual assets (optional — only if the project needs them)

| Agent | What for |
|---|---|
| [`brand-agent`](brand-agent.md) | **🔧 Technical:** Generates complete visual identity (colors, typography, tone, asset specs). **ALWAYS first** — produces `brand.json` that image-agent, logo-agent, video-agent read afterward. Free always (plain text, no external API). |
| | **🏠 In plain words:** It's the **creative director** that defines the brand's "personality": what colors, what typography, what style (elegant, fun, professional, etc.). Has to finish before the other creative agents start. |
| [`image-agent`](image-agent.md) | **🔧 Technical:** Generates web images (hero, backgrounds, thumbnails). Free-first verified 2026: HuggingFace FLUX.1-schnell → Cloudflare Workers AI → Pollinations. Gemini opt-in if you have billing. |
| | **🏠 In plain words:** It's the **AI photographer/illustrator**: generates the background images, banners, and thumbnails the site needs. By default uses free services (no credit card needed). |
| [`logo-agent`](logo-agent.md) | **🔧 Technical:** Generates vector SVG logos (4 variants). Free pipeline: HF + vtracer/Inkscape. Recraft V4 Vector opt-in with Vercel AI Gateway. Runs in parallel with image-agent. |
| | **🏠 In plain words:** It's the **logo designer**: generates 4 versions of the logo (full, icon, dark mode, etc.) in vector format (scales without losing quality). |
| [`video-agent`](video-agent.md) | **🔧 Technical:** Generates short loop videos (3-5s) or animated CSS fallback for hero backgrounds. Without `REPLICATE_API_TOKEN`, returns CSS fallback as **valid** output (doesn't block pipeline). Replicate LTX-Video 2.3 opt-in with billing. |
| | **🏠 In plain words:** It's the **videographer**: generates short videos for hero backgrounds. If you don't have billing for the AI service, returns a CSS animation as alternative (doesn't block the project). |

### Phase 3 — Implementation with continuous QA

> The team of developers works in parallel by task type (web, mobile, game, etc.). **After each task**, QA (evidence-collector) validates the work with real screenshots before advancing to the next. Max 3 retries per task.

| Agent | What for |
|---|---|
| [`frontend-developer`](frontend-developer.md) | **🔧 Technical:** Implements web UI with React/Vue/TS, Tailwind, shadcn/ui. Also handles game loops with Phaser.js/PixiJS/Canvas. Includes AUTO_AUDIT pre-return + design decision tree. |
| | **🏠 In plain words:** It's the **programmer of the visible part** (what the site visitor sees). Before delivering, runs a self-check to avoid common errors (generic colors, fonts not loaded properly, etc.). |
| [`backend-architect`](backend-architect.md) | **🔧 Technical:** Implements APIs, DB schemas, server logic, backend security. PostgreSQL, Prisma, Express, Supabase. |
| | **🏠 In plain words:** It's the **programmer of the invisible engine** (what happens on the server when the visitor clicks): database, login, validations, sending emails, etc. |
| [`rapid-prototyper`](rapid-prototyper.md) | **🔧 Technical:** Builds functional MVPs in under 3 days. Next.js + Prisma + Supabase + shadcn/ui. When the project needs fast validation. |
| | **🏠 In plain words:** It's the **rapid prototyper**: when you want to validate an idea before building everything properly, it builds a basic functional version in a few days. |
| [`mobile-developer`](mobile-developer.md) | **🔧 Technical:** Develops iOS and Android mobile apps with React Native and Expo. Navigation, state, forms, auth, build. |
| | **🏠 In plain words:** It's the **phone app programmer** (the ones you download from App Store / Google Play). |
| [`xr-immersive-developer`](xr-immersive-developer.md) | **🔧 Technical:** Implements browser games with Canvas API, Phaser.js, PixiJS or WebGL. Game loops, rendering, input, physics, audio. |
| | **🏠 In plain words:** It's the **web game programmer** (games played in the browser without downloading anything). |
| [`game-designer`](game-designer.md) | **🔧 Technical:** Creates the full Game Design Document (GDD) — mechanics, loops, economy, balance, subsystems, scene graph, audio, level design, onboarding. Before game code. |
| | **🏠 In plain words:** It's the **game rules designer** (how to play, how to win, what rewards exist, how difficulty scales). Works before the game is coded. |
| [`codepen-explorer`](codepen-explorer.md) | **🔧 Technical:** Finds, extracts and interprets CodePen effects via Playwright MCP. Does NOT build or adapt — that's frontend-developer's job. Manages the approved effects vault (`~/.claude/codepen-vault/`). |
| | **🏠 In plain words:** It's the **visual effects scout**: searches CodePen (a public demos site) for effects already made by the community (animations, transitions, etc.) and brings them to the project. Does NOT adapt them — the frontend programmer does that afterward. |
| [`build-resolver`](build-resolver.md) | **🔧 Technical:** Resolves build errors automatically. Diagnoses, applies fix, re-runs build. Triggered when `npm run build` fails. |
| | **🏠 In plain words:** It's the **on-call technician**: when the code throws an error while compiling, this agent tries to diagnose the cause and fix it alone, without human intervention. |
| [`evidence-collector`](evidence-collector.md) | **🔧 Technical:** Task-by-task QA with real screenshots via Playwright MCP. 9 anti-false-positive layers (LLM-as-judge visual fidelity, network inspection, mandatory E2E flows, TDD trail, file cache hash). Returns PASS/FAIL with visual evidence. Max 3 retries. |
| | **🏠 In plain words:** It's the **tester with a camera**: after each task, opens the browser, tests what was done, takes screenshots as evidence, and says "pass" or "fail" with detail of what was found. Has 9 techniques to avoid giving "OK" to something actually broken. |

### Phase 4 — Pre-deploy certification

| Agent | What for |
|---|---|
| [`seo-discovery`](seo-discovery.md) | **🔧 Technical:** Optimizes technical SEO and visibility for search engines **and AIs** (Google, Bing, ChatGPT, Perplexity, Claude). Includes Crawl Budget & Non-JS Scrapers doctrine. |
| | **🏠 In plain words:** It's the **visibility specialist**: makes sure Google finds your site, and also that AI chatbots (ChatGPT, Claude, Perplexity) can read and cite it. |
| [`api-tester`](api-tester.md) | **🔧 Technical:** Validates API endpoints against spec. Coverage, OWASP API Top 10 security, P95 performance. |
| | **🏠 In plain words:** It's the **server-side tester**: checks that internal URLs (the APIs) respond fast, have no security vulnerabilities, and return what they promise. |
| [`performance-benchmarker`](performance-benchmarker.md) | **🔧 Technical:** Measures Core Web Vitals, load times, bottlenecks, load testing. If `deploy_url` exists, tests against public URL (not localhost). |
| | **🏠 In plain words:** It's the **timer**: measures how fast the site loads (the metrics Google also looks at) and identifies what's taking longer than it should. |
| [`reality-checker`](reality-checker.md) | **🔧 Technical:** **Final pre-production gate**. Default `NEEDS WORK` — only flips to OK with complete evidence. Includes No-JS Render Audit (Step 4.5), dynamic Mixed Content, False Positive Guardrail (re-runs 2-3 random PASS). |
| | **🏠 In plain words:** It's the **final building inspector**: by default says "NEEDS WORK". Only approves with complete evidence that everything works. Re-tests at random some previous checks to make sure they weren't false positives. |

### Phase 5 — Publishing (only with user confirmation)

| Agent | What for |
|---|---|
| [`git`](git.md) | **🔧 Technical:** Commits and pushes to GitHub. Uses HTTPS + token (`gh auth token`). Only acts when the orchestrator instructs after user confirmation. |
| | **🏠 In plain words:** It's the one that **saves changes to the repository** (the online "memory" of the code). Only does it when you give explicit OK. |
| [`deployer`](deployer.md) | **🔧 Technical:** Deploys to Vercel (web) or EAS Build (mobile) using CLI. Only acts with confirmation. |
| | **🏠 In plain words:** It's the **mover**: takes the finished project and publishes it online (Vercel for web, App Store / Google Play for mobile). Only does it when you give OK. |

---

## Glosario de términos técnicos / Technical glossary

### Sistema interno / Internal system

| Término | Explicación |
|---|---|
| **Agente / Agent** | ES: Especialista que sabe hacer una cosa. Técnicamente: un archivo `.md` con instrucciones que Claude ejecuta cuando es invocado. · EN: Specialist that knows how to do one thing. Technically: a `.md` file with instructions that Claude executes when invoked. |
| **Pipeline** | ES/EN: Línea de producción de 5 fases que sigue un proyecto desde la idea hasta la publicación. / 5-phase production line a project follows from idea to publishing. |
| **Engram** | ES: Memoria persistente del sistema. Guarda decisiones, estado de proyectos y descubrimientos entre sesiones y entre PCs. · EN: System's persistent memory. Stores decisions, project state, and discoveries across sessions and PCs. |
| **MCP** | ES/EN: Model Context Protocol. Estándar para conectar Claude con herramientas externas (Playwright, GitHub, Vercel, etc.). / Standard for connecting Claude with external tools. |
| **Orquestador / Orchestrator** | ES: Claude actuando como coordinador. No hace trabajo real, solo distribuye. · EN: Claude acting as coordinator. Does no real work, only delegates. |
| **AUTO_AUDIT** | ES/EN: Chequeo automático que cada agente corre sobre su propio output antes de devolverlo. / Automatic check each agent runs on its own output before returning it. |
| **DAG state** | ES: Estado del proyecto (qué fase está, qué tareas se completaron, qué falló). DAG = Directed Acyclic Graph (modelo del flujo). · EN: Project state (which phase, completed tasks, failures). DAG = Directed Acyclic Graph (flow model). |

### Estándares de la industria / Industry standards

| Término | Explicación |
|---|---|
| **STRIDE** | ES/EN: Framework de Microsoft para analizar amenazas de seguridad (Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege). / Microsoft framework for analyzing security threats. |
| **OWASP Top 10** | ES/EN: Las 10 vulnerabilidades web más comunes según la fundación OWASP (estándar de seguridad web). / The 10 most common web vulnerabilities per the OWASP foundation. |
| **Core Web Vitals** | ES/EN: 3 métricas de Google que miden experiencia del usuario en la web (velocidad de carga, interactividad, estabilidad visual). / 3 Google metrics measuring user experience on the web. |
| **P95** | ES: Percentil 95. "El 95% de los pedidos responden en menos de X ms". · EN: 95th percentile. "95% of requests respond in less than X ms". |
| **Mixed Content** | ES/EN: Cuando un sitio HTTPS carga recursos HTTP — los navegadores lo bloquean por seguridad. / When an HTTPS site loads HTTP resources — browsers block this for security. |

### Herramientas y servicios mencionados / Tools and services mentioned

| Término | Explicación |
|---|---|
| **Playwright** | ES/EN: Herramienta de Microsoft para automatizar navegadores (clicks, screenshots, validación visual). / Microsoft tool for browser automation. |
| **React / Vue / TS** | ES/EN: Librerías y lenguaje (TypeScript) para construir interfaces web. / Libraries and language for building web UIs. |
| **Tailwind / shadcn/ui** | ES/EN: Librería de estilos (Tailwind) y catálogo de componentes (shadcn/ui) para React. / Style library and component catalog for React. |
| **Next.js** | ES/EN: Framework basado en React para sitios y apps web. / React-based framework for sites and web apps. |
| **PostgreSQL / Prisma / Supabase** | ES: Base de datos (PostgreSQL), su capa de acceso desde código (Prisma), y plataforma que incluye DB + auth + storage (Supabase). · EN: Database (PostgreSQL), its code access layer (Prisma), and platform with DB + auth + storage (Supabase). |
| **React Native / Expo** | ES/EN: Framework para apps móviles iOS+Android usando código JavaScript. / Framework for mobile apps using JavaScript code. |
| **Phaser.js / PixiJS / WebGL / Canvas API** | ES/EN: Herramientas para programar juegos que corren en el navegador. / Tools for programming browser-based games. |
| **HuggingFace / Cloudflare Workers AI / Pollinations / Replicate / Gemini** | ES: Servicios que generan imágenes y videos con IA. Los 3 primeros tienen opciones gratis. · EN: AI services that generate images and videos. The first 3 have free tiers. |
| **Vercel / EAS Build** | ES: Plataformas que hostean sitios web (Vercel) y compilan apps móviles (EAS Build). · EN: Platforms that host websites (Vercel) and build mobile apps (EAS Build). |
| **CodePen** | ES/EN: Web pública donde devs publican demos de efectos visuales. / Public site where devs publish visual effect demos. |
| **GitHub / git** | ES: Plataforma que aloja código (GitHub) y la herramienta para gestionar versiones (git). · EN: Platform that hosts code (GitHub) and the tool to manage versions (git). |

---

## Total + routing por modelo / Model routing

**25 agentes** organizados en 5 fases + Fase 2B condicional + 2 agentes meta transversales.

| Modelo | Agentes | Razón |
|---|---|---|
| **Opus** (5) | orquestador, project-manager-senior, security-engineer, game-designer, reality-checker | Decisiones arquitectónicas complejas, planificación, threat modeling, certificación final |
| **Sonnet** (20) | Todos los demás | Ejecución de tareas definidas, QA, utilidades, creativos |

*25 agents organized in 5 phases + Phase 2B conditional + 2 cross-cutting meta agents. **Opus** (5): complex architectural decisions, planning, threat modeling, final certification. **Sonnet** (20): defined task execution, QA, utilities, creative.*

Para detalle de coordinación (DAG state, retries, fallbacks): ver [`orquestador.md`](orquestador.md). Para protocolo compartido (Engram 2-pasos, Return Envelope, VISUAL_IMPACT, Delegation Stop Rules): ver [`agent-protocol.md`](agent-protocol.md).

*For coordination details (DAG state, retries, fallbacks): see [`orquestador.md`](orquestador.md). For shared protocol: see [`agent-protocol.md`](agent-protocol.md).*
