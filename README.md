# Claude Vibecoding — Sistema Multi-Agente

22 agentes especializados que convierten ideas en aplicaciones web, móviles, juegos y APIs listas para produccion. Un orquestador central coordina un pipeline profesional de 5 fases: planificacion, arquitectura, desarrollo con QA visual, certificacion y deploy.

Compatible con **Linux (Claude Code)** y **Windows (Claude Desktop)**.

---

## Instalacion

### Linux (Claude Code)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

Reinicia Claude Code cuando termine.

### Windows (Claude Desktop)

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```

Segui la guia paso a paso en [`install/windows.md`](install/windows.md), o abri Claude Desktop en la carpeta del repo y decile:

> "Instalate el sistema de este repo siguiendo install/windows.md"

---

## Uso

```
@orquestador quiero crear [tu idea]
```

El sistema se encarga del resto: planifica, te muestra que va a construir para tu aprobacion, diseña, implementa con QA visual, certifica y publica.

---

## Pipeline

```
Tu idea
  │
  ▼
FASE 1 — Planificacion
  project-manager-senior ──► tareas granulares con criterios de aceptacion
  │
  ▼ ◄── PAUSA: el orquestador te muestra el scope y espera tu aprobacion
  │
  ▼
FASE 2 — Arquitectura (paralelo)
  ux-architect      ──► fundacion CSS, tokens, breakpoints
  ui-designer       ──► design system, componentes, WCAG AA
  security-engineer ──► threat model STRIDE, headers OWASP
  │
  ▼
FASE 2B — Assets Creativos (opcional, paralelo)
  brand-agent  ──► identidad de marca (brand.json)
  image-agent  ──► hero images (HuggingFace FLUX.1)
  logo-agent   ──► logos SVG vectorizados (FLUX.1 + vtracer)
  video-agent  ──► videos de fondo (Replicate LTXVideo / fallback CSS)
  │
  ▼
FASE 3 — Desarrollo ↔ QA Loop
  dev-agent ──► implementa ──► evidence-collector valida (max 3 reintentos)
  │
  ▼
FASE 4 — Certificacion
  seo-discovery          ──► SEO audit + AI discovery (score 100pts)
  api-tester             ──► endpoints, OWASP API Top 10
  performance-benchmarker ──► Core Web Vitals, Lighthouse
  reality-checker        ──► gate final (default: NEEDS WORK)
  │
  ▼
FASE 5 — Publicacion (con confirmacion del usuario)
  git      ──► commit + push a GitHub
  deployer ──► deploy a Vercel + Git Integration
```

---

## Agentes

| Fase | Agente | Funcion |
|:----:|--------|---------|
| 1 | `project-manager-senior` | Convierte ideas en tareas granulares con criterios de aceptacion |
| 2 | `ux-architect` | Fundacion CSS: tokens, layout, tema light/dark, breakpoints |
| 2 | `ui-designer` | Design system visual, componentes, accesibilidad WCAG AA |
| 2 | `security-engineer` | Threat model STRIDE, headers de seguridad, OWASP Top 10 |
| 2B | `brand-agent` | Identidad de marca: paleta, tipografia, tono, personalidad |
| 2B | `image-agent` | Hero images y galeria via HuggingFace FLUX.1-schnell |
| 2B | `logo-agent` | Logos SVG vectorizados (FLUX.1 + vtracer) |
| 2B | `video-agent` | Videos de fondo (Replicate LTXVideo / fallback CSS) |
| 3 | `frontend-developer` | React/Vue/TS, Tailwind, shadcn/ui, Zustand, TanStack Query |
| 3 | `mobile-developer` | React Native + Expo, NativeWind 4, Expo Router, EAS Build |
| 3 | `backend-architect` | Hono/Express, Drizzle/Prisma, tRPC, PostgreSQL, Better Auth |
| 3 | `rapid-prototyper` | MVPs multi-stack para validacion rapida |
| 3 | `game-designer` | Game Design Document: mecanicas, loops, economia, balance |
| 3 | `xr-immersive-developer` | Phaser.js, PixiJS, Canvas API, WebGL |
| 3 | `evidence-collector` | QA visual con Playwright MCP, screenshots en 3 viewports |
| 4 | `seo-discovery` | SEO audit, meta tags, JSON-LD, sitemap, llms.txt, AI discovery |
| 4 | `api-tester` | Cobertura de endpoints, OWASP API Top 10, latencia P95 |
| 4 | `performance-benchmarker` | Core Web Vitals, Lighthouse, bundle analysis |
| 4 | `reality-checker` | Gate final pre-produccion con evidencia visual |
| 5 | `git` | Commit + push a GitHub, branch management |
| 5 | `deployer` | Deploy a Vercel + Git Integration para auto-deploy |
| * | `orquestador` | Coordinador central, gestiona las 5 fases |
| ref | `better-auth-reference` | Guia de autenticacion (email/password, OAuth, sesiones) |

---

## Stack adaptable

El orquestador elige el stack en Fase 1 segun los requisitos del proyecto. No hay stack fijo.

| Capa | Opciones | Preferido |
|------|----------|-----------|
| Frontend | Next.js, SvelteKit, Nuxt, Astro, Vite+React | Next.js (apps), Vite+React (landing) |
| Backend | Hono, Express, Fastify | Hono (edge-ready) |
| Base de datos | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle (type-safe, edge) |
| API | tRPC, REST, GraphQL | tRPC (full TypeScript) |
| Auth | Better Auth | Siempre (salvo proyecto existente con otra solucion) |

---

## Memoria persistente — Engram

El sistema usa **Engram MCP** como memoria entre sesiones. Cada proyecto tiene sus propios cajones con topic keys `{proyecto}/{tipo}`:

| Cajon | Contenido |
|-------|-----------|
| `{proyecto}/estado` | DAG State: fase actual, stack, tareas completadas. Permite retomar despues de una compactacion de contexto sin perder progreso |
| `{proyecto}/tareas` | Lista completa de tareas con criterios de aceptacion (PM Senior) |
| `{proyecto}/css-foundation` | Variables CSS, tokens, breakpoints (UX Architect) |
| `{proyecto}/design-system` | Design system visual, componentes (UI Designer) |
| `{proyecto}/security-spec` | Threat model, headers, OWASP checklist (Security Engineer) |
| `{proyecto}/tarea-{N}` | Resultado de implementacion de cada tarea (dev agents) |
| `{proyecto}/qa-{N}` | Resultado QA de cada tarea con screenshots en /tmp/qa/ (Evidence Collector) |
| `{proyecto}/certificacion` | Reporte final del Reality Checker |
| `{proyecto}/deploy-url` | URL limpia del deploy en Vercel |

**Protocolo de lectura:** siempre en 2 pasos: `mem_search` → `mem_get_observation`. Nunca usar la preview truncada directamente.

**Protocolo de escritura:** si un cajon ya existe (ej: reintento de tarea fallida), los agentes usan `mem_update` en vez de `mem_save` para evitar duplicados. El orquestador siempre lee el resultado mas reciente del mismo cajon.

Si el contexto se compacta en medio de un proyecto, el orquestador lee `{proyecto}/estado` y retoma exactamente desde donde estaba.

---

## Assets creativos (Fase 2B)

La Fase 2B genera assets visuales con IA generativa. Se activa automaticamente si el proyecto tiene landing page, logo o hero section.

**Flujo:** brand-agent genera identidad → usuario aprueba → logo-agent + image-agent en paralelo → video-agent (opcional)

Ningun asset creativo bloquea el pipeline. Si una API falla, hay cadena de fallback:
- Imagenes: FLUX.1 → SDXL → Pollinations.ai (gratis)
- Video: LTXVideo → CSS animation
- Logo: FLUX.1 + vtracer → PNG directo

### Credenciales

| Variable | Servicio | Costo | Usado por |
|----------|----------|-------|-----------|
| `HF_TOKEN` | [HuggingFace](https://huggingface.co) | Gratis | image-agent, logo-agent |
| `REPLICATE_API_TOKEN` | [Replicate](https://replicate.com) | ~$0.05/video | video-agent |

```bash
export HF_TOKEN="hf_tu_token"
export REPLICATE_API_TOKEN="r8_tu_token"
```

**vtracer** (opcional): mejora logos PNG a SVG vectorizado. Instalar con `cargo install vtracer` o desde [releases](https://github.com/visioncortex/vtracer/releases). Sin el, los logos se entregan como PNG.

> **Nota**: la URL de la HuggingFace Inference API cambio en 2025 a `router.huggingface.co/hf-inference`. Los agentes ya usan la URL correcta.

---

## Servicios y MCPs

| Servicio | Funcion | Activacion |
|----------|---------|------------|
| Engram | Memoria persistente entre sesiones | Plugin MCP (automatico) |
| Context7 | Documentacion tecnica actualizada | MCP (automatico) |
| Playwright | QA visual con screenshots | MCP (automatico) |
| Vercel CLI | Deploy a produccion | `vercel login` |
| GitHub CLI | Repos, commits, push | `gh auth login` |

---

## Branching strategy

Por defecto, el sistema trabaja **directo en `main`** sin feature branches. Esto es seguro cuando:
- Sos el unico desarrollador
- El pipeline QA valida antes de pushear
- Vercel tiene rollback instantaneo

**Si trabajas en equipo**, cambia a un flujo con branches:

```
main (produccion, protegida)
  └── feature/nombre-tarea
      └── PR + merge a main despues de certificacion
```

| Situacion | Estrategia |
|-----------|------------|
| Solo, proyecto personal | Directo a `main` (default) |
| Solo, con usuarios reales | Recomendado usar branches |
| Equipo 2+ personas | **Obligatorio** usar branches |

Para cambiar el comportamiento, modifica `agents/git.md`. El auto-deploy de Vercel solo se dispara en `main`, asi que las feature branches no generan deploys accidentales.

---

## Estructura del repositorio

```
agents/                         21 agentes + referencia Better Auth
  ├── orquestador.md
  ├── project-manager-senior.md
  ├── ux-architect.md
  ├── ui-designer.md
  ├── security-engineer.md
  ├── frontend-developer.md
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
  ├── linux.sh                  Instalacion automatica (Linux/Claude Code)
  └── windows.md                Guia paso a paso (Windows/Claude Desktop)
templates/
  ├── global-claude.md          CLAUDE.md para Linux
  ├── windows-claude.md         CLAUDE.md para Windows
  ├── windows-launch.json       Preview servers en Windows
  ├── settings.json             Configuracion MCPs (Engram)
  └── settings.local.json       Permisos para todos los agentes
CLAUDE.md                       Instrucciones del sistema (auto-leido por Claude)
```

---

## Requisitos minimos

| Plataforma | Necesitas |
|------------|-----------|
| Linux | Ubuntu/Debian, Claude Code. El script instala Node.js, Vercel CLI y gh CLI |
| Windows | Git for Windows (Git Bash), Claude Desktop. Ver [`install/windows.md`](install/windows.md) |

---

## Creditos

Inspirado en:
- [Agency Agents](https://github.com/msitarzewski/agency-agents) — agentes especializados con metricas
- [Agent Teams Lite](https://github.com/Gentleman-Programming/agent-teams-lite) — DAG State, handoffs minimos, Engram
