# Claude Vibecoding

> Un sistema multiagente para construir software de principio a fin con Claude. Desde una landing simple hasta una app con auth + base de datos. **Te acompaña en cada decisión clave, sin pedirte permiso para cada coma.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-stable-success)
![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20Windows-lightgrey)

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
| **Landing / sitio público** | Página de un restaurante, portfolio, lanzamiento de producto | Vite + React + Tailwind o HTML estático |
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

El script instala los 25 agentes + 13 referencias, los 15 hooks, el `CLAUDE.md` global, y configura git/GitHub/Vercel. Te va preguntando los datos que necesita (tu nombre, email, usuario de GitHub). **Reiniciá Claude Code** cuando termine y ya estás listo.

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
# Agentes (debería ser 38: 25 agentes + 13 referencias)
ls ~/.claude/agents/*.md | wc -l

# Hooks (debería ser 14)
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
Fase 5  Publicación    →  git (con tu confirmación) + deployer (con tu confirmación)
```

Para **modificar un proyecto que ya está hecho**, el sistema entra en modo modificación: corre un *Paso 0 de auditoría* sobre el código heredado (detecta defaults problemáticos antes de tocar nada), después solo ejecuta los agentes afectados por el cambio.

### Lo que te protege en el camino

- **15 hooks reactivos** bloquean cosas peligrosas en tiempo real: `git --no-verify`, `git push --force`, `rm -rf`, `DROP TABLE`, `chmod 777`, edición de archivos secretos (`.env`, claves privadas), uso de `--no-gpg-sign`. Otros avisan: `debugger` o `console.log` en código de producción, `@ts-ignore`, animaciones excesivas, container CSS con cap "SaaS feel", fuentes declaradas sin cargar, navegación móvil sin hamburger.
- **AUTO_AUDIT pre-return**: antes de devolver código, el `frontend-developer` corre 5 reglas grep ejecutables (no paleta teal por default, no Inter como heading en moods bold, hero con media coherente, motion según dial, shadow según mood). Si falla → regenera. Si pasa → marca cambio como `VISUAL_IMPACT: high|medium|low`.
- **Checkpoint humano automático**: cuando el cambio tiene `VISUAL_IMPACT: high`, el orquestador te muestra el resultado antes de marcar la tarea como completa. La doctrina: el agente decide solo cuando hay UNA respuesta correcta; en todo lo demás (visual, multi-opción, irreversible, iterado 2+ veces) te pregunta con su recomendación incluida.
- **9 capas de defensa anti-falso-positivo** en QA: visual fidelity LLM-as-judge (5 dimensiones contra referencia), network inspection (Mixed Content, status 0, leaks de localhost), E2E flows obligatorios en auth/CRUD, reality-checker re-corre 2-3 PASS al azar.

---

## Configuración

### Engram MCP (memoria persistente) — obligatorio

Engram es lo que hace que el sistema *recuerde* entre sesiones. Sin él, cada conversación arranca de cero. Se instala automáticamente con el script de Linux y con la guía de Windows.

### Engram Sync (memoria cross-machine) — opcional

Si trabajás desde varias computadoras, el hook `engram-sync` empuja automáticamente la memoria a un repo privado de GitHub al cerrar sesión. Así arrancás en el desktop y seguís en la laptop sin perder contexto.

```bash
# 1. Creá un repo privado en GitHub (ej: mi-engram-sync)
# 2. Inicializalo en ~/.engram/:
cd ~/.engram && git init && git remote add origin https://github.com/TU_USUARIO/mi-engram-sync.git
# El hook engram-sync (ya instalado) hace el resto
```

### Variables de entorno para assets generativos — opcional

Solo necesarias si tu proyecto va a generar logos, imágenes hero o videos con IA.

| Variable | Servicio | Costo aprox | Cómo obtenerla |
|---|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | $0.02-0.04 por imagen | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `HF_TOKEN` | HuggingFace | Gratis | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `REPLICATE_API_TOKEN` | Replicate | $0.05 por video | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) |

Alcanza con **una** clave de imagen (Gemini o HuggingFace). Si seteás las dos, Gemini es primary y HuggingFace es fallback automático.

Dónde ponerlas: agregalas a `~/.bashrc` (Linux), o a Environment Variables del sistema (Windows), o a un archivo `~/.claude/.env` con una variable por línea.

### Pixel Bridge — opcional, decorativo

Una oficina pixel art donde los agentes caminan a sus escritorios cuando se les asigna una tarea, reportan al orquestador, y descansan cuando no hay trabajo. **Puramente visual**, no afecta el pipeline. Te lo ofrece el instalador.

---

## Modo Claude normal vs Modo Orquestador

| Modo | Cuándo usarlo | Cómo activarlo |
|---|---|---|
| **Claude normal** | Preguntas, fixes puntuales, revisar código, chat técnico | Default — solo hablar |
| **Orquestador** | Proyecto completo de principio a fin | Decí: *"modo orquestador — [tu idea]"* |

En modo normal, Claude responde como siempre pero tiene acceso a los hooks, AUTO_AUDIT y memoria. En modo orquestador, adopta el rol de coordinador y delega a los 24 subagentes.

---

## Documentación técnica completa

Para developers que quieran ir más allá:

| Archivo | Para qué |
|---|---|
| [`agents/orquestador.md`](agents/orquestador.md) | Comportamiento completo del orquestador: detección de modos, pipeline detallado, DAG State, fallbacks |
| [`agents/agent-protocol.md`](agents/agent-protocol.md) | Protocolo compartido entre subagentes: Engram (2 pasos), Return Envelope, VISUAL_IMPACT, reglas universales |
| [`agents/pipeline-reference.md`](agents/pipeline-reference.md) | Detalles de cada fase, tools por agente, stack adaptable, Design Intelligence Engine |
| [`templates/global-claude.md`](templates/global-claude.md) | El `CLAUDE.md` que se instala — toda la doctrina del sistema (Checkpoint humano, Engram, hooks, mod mode) |
| [`agents/ux-architect.md`](agents/ux-architect.md) | Tokens de diseño, container strategy, anchor scroll con sticky |
| [`agents/ui-designer.md`](agents/ui-designer.md) | Design system, SaaS Teal Default Detector (T1-T7), accesibilidad |
| [`agents/frontend-developer.md`](agents/frontend-developer.md) | Implementación frontend, AUTO_AUDIT pre-return, design decision tree |
| [`agents/evidence-collector.md`](agents/evidence-collector.md) | QA visual con Playwright, 9 capas anti-falso-positivo |
| [`hooks/`](hooks/) | Los 15 hooks reactivos: bloqueos, advertencias, auditorías, tracking |
| [`design-data/`](design-data/) | Design Intelligence Engine: 8 CSVs con 161 industrias indexadas via BM25 |

---

## Arquitectura en disco

```
~/.claude/
├── agents/            # 25 agentes + 13 referencias = 38 archivos .md
├── design-data/       # Design Intelligence Engine (search.js + 8 CSVs)
├── hooks/             # 15 hooks reactivos
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
| Frontend | Next.js, SvelteKit, Astro, Vite+React | Next.js (apps), Vite+React (landings) |
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
2. Si agregás un hook nuevo, sumalo a la tabla en `templates/global-claude.md` y al script `install/linux.sh`.
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
