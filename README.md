# Claude Vibecoding — Sistema Multi-Agente

> Para alguien que nunca programó y quiere usar IA para crear webs, apps móviles, juegos indie, APIs y más — sin tocar código a mano.

22 agentes especializados que convierten ideas en aplicaciones listas para producción. Un **orquestador central** coordina un pipeline profesional de 5 fases: planificación, arquitectura, desarrollo con QA visual, certificación y deploy.

Compatible con **Linux (Claude Code)** y **Windows (Claude Desktop)**.

---

## ¿Cómo funciona?

Vos describís tu idea. El sistema se encarga del resto.

```
"modo orquestador — quiero una app para gestionar inventario de mi negocio"
```

El orquestador planifica las tareas, diseña la arquitectura, implementa con QA visual en cada paso, certifica la calidad y publica en internet. Vos solo aprobas en los puntos clave.

**No necesitás saber programar.** La IA hace el trabajo técnico; vos tomás las decisiones de negocio.

---

## Instalación

### Linux (Claude Code)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

El script detecta tu sistema, instala dependencias faltantes (Node.js, gh CLI, Vercel CLI), copia los 22 agentes y configura todo. Reinicia Claude Code cuando termine.

### Windows (Claude Desktop)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```

Seguí la guía paso a paso en [`install/windows.md`](install/windows.md), o abrí Claude Desktop en la carpeta del repo y decile:

> "Instalate el sistema de este repo siguiendo install/windows.md"

---

## Uso

El sistema tiene dos modos. Vos elegís:

| Modo | Cuándo | Cómo activarlo |
|------|--------|----------------|
| **Claude normal** | Preguntas, fixes puntuales, revisiones, chat técnico | Por defecto — simplemente habla |
| **Orquestador** | Proyecto completo de principio a fin | Escribí: `modo orquestador — [tu idea]` |

```
modo orquestador — quiero crear una app de gestión de inventario
```

El sistema se encarga del resto: planifica, te muestra el scope para tu aprobación, diseña, implementa con QA visual, certifica y publica.

---

## Pipeline de 5 Fases

```
Tu idea
  │
  ▼
FASE 1 — Planificación
  project-manager-senior ──► tareas granulares con criterios de aceptación
  │
  ▼ ◄── PAUSA: el orquestador te muestra el scope y espera tu aprobación
  │
  ▼
FASE 2 — Arquitectura (secuencial: ux-architect primero, luego paralelo)
  ux-architect      ──► fundación CSS, tokens, breakpoints
  ui-designer       ──► design system, componentes, WCAG AA
  security-engineer ──► threat model STRIDE, headers OWASP
  │
  ▼
FASE 2B — Assets Creativos (opcional, paralelo)
  brand-agent  ──► identidad de marca (brand.json)   ◄── PAUSA para aprobación
  image-agent  ──► hero images (HuggingFace FLUX.1)
  logo-agent   ──► logos SVG vectorizados (FLUX.1 + vtracer)
  video-agent  ──► videos de fondo (Replicate LTXVideo / fallback CSS)
  │
  ▼
FASE 3 — Desarrollo ↔ QA Loop
  dev-agent ──► implementa ──► evidence-collector valida (máx 3 reintentos)
  │
  ▼
FASE 4 — Certificación
  seo-discovery           ──► SEO audit + AI discovery (score 100pts)
  api-tester              ──► endpoints, OWASP API Top 10
  performance-benchmarker ──► Core Web Vitals, Lighthouse
  reality-checker         ──► gate final (default: NEEDS WORK)
  │
  ▼
FASE 5 — Publicación (con confirmación del usuario)
  git      ──► commit + push a GitHub
  deployer ──► deploy a Vercel + Git Integration
```

---

## Los 22 Agentes

| Fase | Agente | Qué hace |
|:----:|--------|---------|
| 1 | `project-manager-senior` | Convierte tu idea en tareas concretas con criterios de aceptación |
| 2 | `ux-architect` | Fundación CSS: tokens de diseño, layout, tema claro/oscuro, breakpoints |
| 2 | `ui-designer` | Design system visual, componentes reutilizables, accesibilidad WCAG AA |
| 2 | `security-engineer` | Threat model STRIDE, headers de seguridad, checklist OWASP Top 10 |
| 2B | `brand-agent` | Identidad de marca: paleta de colores, tipografía, tono, personalidad |
| 2B | `image-agent` | Hero images y galería vía HuggingFace FLUX.1-schnell |
| 2B | `logo-agent` | Logos SVG vectorizados (FLUX.1 + vtracer) |
| 2B | `video-agent` | Videos de fondo en loop (Replicate LTXVideo / fallback CSS) |
| 3 | `frontend-developer` | React/Vue/TS, Tailwind, shadcn/ui, Zustand, TanStack Query |
| 3 | `mobile-developer` | React Native + Expo, NativeWind 4, Expo Router, EAS Build |
| 3 | `backend-architect` | Hono/Express, Drizzle/Prisma, tRPC, PostgreSQL, Better Auth |
| 3 | `rapid-prototyper` | MVPs multi-stack para validación rápida |
| 3 | `game-designer` | Game Design Document: mecánicas, loops, economía, balance |
| 3 | `xr-immersive-developer` | Phaser.js, PixiJS, Canvas API, WebGL — juegos en el navegador |
| 3 | `evidence-collector` | QA visual con Playwright: screenshots reales en 3 viewports |
| 4 | `seo-discovery` | SEO técnico, meta tags, JSON-LD, sitemap, llms.txt para IA search |
| 4 | `api-tester` | Cobertura de endpoints, OWASP API Top 10, latencia P95 |
| 4 | `performance-benchmarker` | Core Web Vitals, Lighthouse, bundle analysis |
| 4 | `reality-checker` | Gate final pre-producción con evidencia visual (default: NEEDS WORK) |
| 5 | `git` | Commit + push a GitHub, branch management |
| 5 | `deployer` | Deploy a Vercel + Git Integration para auto-deploy |
| * | `orquestador` | Coordinador central — NUNCA hace trabajo real, solo coordina |

> También incluye `better-auth-reference.md`: guía interna de autenticación (email/password, OAuth, sesiones) que leen los agentes dev.

---

## Stack Adaptable

El orquestador elige el stack según los requisitos del proyecto. No hay stack fijo.

| Capa | Opciones | Preferido |
|------|----------|-----------|
| Frontend | Next.js, SvelteKit, Nuxt, Astro, Vite+React | Next.js (apps), Vite+React (landings) |
| Backend | Hono, Express, Fastify | Hono (edge-ready, liviano) |
| Base de datos | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle (type-safe, edge) |
| API type-safe | tRPC, oRPC, ts-rest | tRPC (full TypeScript) |
| Auth | Better Auth | Siempre (salvo proyecto existente con otra solución) |
| Mobile | React Native + Expo SDK 52+ | Expo (iOS + Android desde un repo) |
| Juegos 2D | Phaser.js 3, PixiJS, Canvas API | Phaser.js (completo) |
| Juegos 3D | Three.js, Babylon.js | Three.js |

---

## Memoria Persistente — Engram

El sistema usa **Engram MCP** para recordar el contexto entre sesiones. Si Claude se queda sin contexto a mitad de un proyecto, el orquestador recupera el estado exacto y continúa sin perder trabajo.

Cada proyecto tiene sus propios "cajones" con claves `{proyecto}/{tipo}`:

| Cajón | Generado por | Contenido |
|-------|-------------|-----------|
| `{proyecto}/estado` | orquestador | Estado del pipeline: fase actual, stack, tareas completadas |
| `{proyecto}/tareas` | project-manager-senior | Lista de tareas con criterios de aceptación |
| `{proyecto}/css-foundation` | ux-architect | Tokens CSS, variables, breakpoints |
| `{proyecto}/design-system` | ui-designer | Design system, componentes |
| `{proyecto}/security-spec` | security-engineer | Threat model, headers, OWASP checklist |
| `{proyecto}/api-spec` | backend-architect | Contrato de endpoints (leído por api-tester en Fase 4) |
| `{proyecto}/qa-{N}` | evidence-collector | QA visual por tarea con screenshots en `/tmp/qa/` |
| `{proyecto}/branding` | brand-agent | Identidad de marca aprobada (path de brand.json) |
| `{proyecto}/creative-assets` | image/logo/video agents | Inventario de assets generados (rutas + checksums) |
| `{proyecto}/git-commit` | git | Hash + URL del commit |
| `{proyecto}/deploy-url` | deployer | URL del deploy en Vercel |

Si el contexto se compacta a mitad de un proyecto, el orquestador lee `{proyecto}/estado` y retoma exactamente desde donde estaba.

---

## Assets Creativos (Fase 2B)

La Fase 2B genera assets visuales con IA generativa. Se activa automáticamente si el proyecto tiene landing page, logo o hero section.

**Flujo:** brand-agent genera identidad → usuario aprueba → logo-agent + image-agent en paralelo → video-agent (opcional)

Si una API falla, hay fallback automático:
- Imágenes: FLUX.1 → Pollinations.ai (gratis)
- Video: LTXVideo → CSS animation
- Logo: FLUX.1 + vtracer → PNG directo

### Variables de entorno necesarias

| Variable | Servicio | Costo | Usado por |
|----------|----------|-------|-----------|
| `HF_TOKEN` | [HuggingFace](https://huggingface.co) | Gratis | image-agent, logo-agent |
| `REPLICATE_API_TOKEN` | [Replicate](https://replicate.com) | ~$0.05/video | video-agent |

```bash
export HF_TOKEN="hf_tu_token"
export REPLICATE_API_TOKEN="r8_tu_token"
```

**vtracer** (opcional): mejora logos PNG a SVG vectorizado. Instalar con `cargo install vtracer` o desde [releases](https://github.com/visioncortex/vtracer/releases).

---

## Servicios y MCPs

| Servicio | Función | Activación |
|----------|---------|------------|
| Engram | Memoria persistente entre sesiones | Plugin MCP (automático) |
| Context7 | Documentación técnica actualizada en tiempo real | MCP (automático) |
| Playwright | QA visual con screenshots reales | MCP (automático) |
| Vercel CLI | Deploy a producción | `vercel login` |
| GitHub CLI | Repos, commits, push | `gh auth login` |

---

## 🎮 Sistema Visual de Agentes — Pixel Art Office (Opcional)

Ve en tiempo real a los 22 agentes moviéndose por una oficina en pixel art. Cuando un agente recibe una tarea, camina a su escritorio y se pone a trabajar (aura verde + nombre resaltado). Cuando termina, camina hacia el orquestador a reportar con una burbuja de chat, y vuelve a deambular. Los agentes inactivos charlan entre sí.

> **Completamente opcional.** El sistema de vibecoding funciona perfectamente sin esto. Es solo una visualización.

### ¿Cómo funciona?

Un servidor local (`http://localhost:3456`) lee los archivos JSONL de `~/.claude/projects/` en tiempo real y proyecta la actividad como animaciones de pixel art en el navegador. Los **22 agentes siempre están presentes** en la oficina, aunque estén inactivos.

### Assets requeridos

Los sprites, tiles y fuentes vienen del proyecto original [pixel-agents](https://github.com/pablodelucca/pixel-agents) de [@pablodelucca](https://github.com/pablodelucca). El AI los descarga automáticamente durante la instalación.

```
assets/
├── sprites/
│   ├── characters/    ← sprites de personajes (16×24px, 6 paletas de color)
│   ├── tiles/         ← floor tiles, wall tiles (suelo, paredes)
│   └── furniture/     ← escritorios, sillas, plantas, estantes, PCs, etc.
└── fonts/
    └── FSPixelSansUnicode-Regular.ttf
```

### Instalación — Claude Desktop (Windows)

Al final del proceso de instalación (`install/windows.md`), Claude te preguntará si querés el sistema visual. Si decís que sí, Claude configura todo automáticamente.

También podés pedirlo en cualquier momento:

> *"Instala el sistema visual de pixel art para Claude Desktop. Creá un servidor standalone Node.js+Express en `~/.claude/pixel-bridge/standalone/` que lea `~/.claude/projects/*.jsonl` en tiempo real y sirva una UI en `http://localhost:3456`. Los 22 agentes del sistema deben estar siempre presentes en la oficina. Bajá los assets (sprites, tiles, furniture, fonts) de https://github.com/pablodelucca/pixel-agents desde la carpeta `assets/` del repo."*

### Instalación — Claude Code (Linux/CLI)

El sistema visual funciona igual para Claude Code — misma arquitectura, el servidor standalone corre como proceso de fondo y abrís `http://localhost:3456` en el navegador.

Al final del script `install/linux.sh`, se te pregunta si querés instalarlo. También podés pedirlo después:

> *"Instala el sistema visual de pixel art para Claude Code. Configuralo como servidor standalone en `~/.claude/pixel-bridge/standalone/` (no como extensión de VS Code). El servidor debe leer `~/.claude/projects/*.jsonl` y servir la UI en `http://localhost:3456`. Basate en https://github.com/pablodelucca/pixel-agents para la arquitectura y los assets."*

### Créditos del sistema visual

Basado en [pixel-agents](https://github.com/pablodelucca/pixel-agents) de [@pablodelucca](https://github.com/pablodelucca), diseñado originalmente como extensión de VS Code para Claude Code. Esta versión es una adaptación standalone que funciona con Claude Desktop y Claude Code CLI sin necesitar VS Code.

---

## Branching Strategy

Por defecto, el sistema trabaja **directo en `main`** sin feature branches. Esto es seguro cuando:
- Sos el único desarrollador
- El pipeline QA valida antes de pushear
- Vercel tiene rollback instantáneo

**Si trabajas en equipo**, cambiá a un flujo con branches:

```
main (producción, protegida)
  └── feature/nombre-tarea
      └── PR + merge a main después de certificación
```

| Situación | Estrategia |
|-----------|------------|
| Solo, proyecto personal | Directo a `main` (default) |
| Solo, con usuarios reales | Recomendado usar branches |
| Equipo 2+ personas | **Obligatorio** usar branches |

Para cambiar el comportamiento, modificá `agents/git.md`. El auto-deploy de Vercel solo se dispara en `main`, así que las feature branches no generan deploys accidentales.

---

## Estructura del Repositorio

```
agents/                          22 agentes + referencia Better Auth
  ├── orquestador.md             ← coordinador central (nunca es subagente)
  ├── project-manager-senior.md
  ├── ux-architect.md
  ├── ui-designer.md
  ├── security-engineer.md
  ├── frontend-developer.md
  ├── mobile-developer.md
  ├── backend-architect.md
  ├── rapid-prototyper.md
  ├── game-designer.md
  ├── xr-immersive-developer.md
  ├── evidence-collector.md
  ├── reality-checker.md
  ├── api-tester.md
  ├── performance-benchmarker.md
  ├── seo-discovery.md
  ├── git.md
  ├── deployer.md
  ├── brand-agent.md
  ├── image-agent.md
  ├── logo-agent.md
  ├── video-agent.md
  └── better-auth-reference.md
install/
  ├── linux.sh                   Instalación automática (Linux / Claude Code)
  └── windows.md                 Guía paso a paso (Windows / Claude Desktop)
templates/
  ├── global-claude.md           CLAUDE.md para Linux
  ├── windows-claude.md          CLAUDE.md para Windows
  ├── windows-launch.json        Preview servers en Windows
  ├── settings.json              Configuración MCPs (Engram)
  └── settings.local.json        Permisos para todos los agentes
CLAUDE.md                        Instrucciones del sistema (leído automáticamente por Claude)
```

---

## Requisitos Mínimos

| Plataforma | Necesitás |
|------------|-----------|
| Linux | Ubuntu/Debian, Claude Code. El script instala Node.js, Vercel CLI y gh CLI automáticamente |
| Windows | Git for Windows (Git Bash), Claude Desktop. Ver [`install/windows.md`](install/windows.md) |

---

## Créditos

Inspirado en:
- [Agency Agents](https://github.com/msitarzewski/agency-agents) — agentes especializados con métricas
- [Agent Teams Lite](https://github.com/Gentleman-Programming/agent-teams-lite) — DAG State, handoffs mínimos, Engram
- [pixel-agents](https://github.com/pablodelucca/pixel-agents) — visualización pixel art de agentes (sistema visual opcional)
