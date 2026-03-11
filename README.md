# Claude Vibecoding v2 — Sistema Multi-Agente

Sistema de **16 agentes especializados + Better Auth reference** para crear apps, webs y juegos sin saber programar.
Pipeline profesional de 5 fases: planificacion, arquitectura, desarrollo con QA, certificacion y deploy.

Compatible con **Linux (Claude Code)** y **Windows (Claude Desktop)**.

---

## Que cambio en v2

| v1 (anterior) | v2 (actual) |
|---|---|
| 9 agentes generales | 16 agentes especializados |
| Pipeline lineal | Pipeline de 5 fases con QA loop |
| Sin QA visual | Screenshots con Playwright MCP |
| Sin memoria | Engram MCP (memoria persistente) |
| Sin certificacion | Reality Checker como gate final |
| Sin threat model | Security Engineer (STRIDE + OWASP) |

---

## Instalacion en 2 pasos

### Linux — Claude Code

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

Reinicia Claude Code cuando termine.

### Windows — Claude Desktop

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
```

Abri Claude Desktop, abri la carpeta del repo y decile:

> "Instalate el sistema de este repo"

Claude va a leer `CLAUDE.md` y seguir los pasos de `install/windows.md` automaticamente.

---

## Como usarlo

Una vez instalado y reiniciado Claude, simplemente decile:

> "Quiero crear [tu idea]"

O invoca al orquestador directamente:

> "@orquestador quiero crear [tu idea]"

El sistema se encarga del resto: planificacion, arquitectura, codigo, QA visual, certificacion y deploy.

---

## Pipeline de 5 fases

```
Tu idea
  |
  v
FASE 1 — Planificacion
  project-manager-senior -> lista de tareas con criterios de aceptacion
  |
  v
FASE 2 — Arquitectura (paralelo)
  ux-architect     -> fundacion CSS, tokens, breakpoints
  ui-designer      -> design system, componentes, accesibilidad WCAG AA
  security-engineer -> threat model STRIDE, headers OWASP
  |
  v
FASE 3 — Desarrollo con QA Loop
  Por cada tarea:
    dev-agent (frontend/backend/game) -> implementa
    evidence-collector -> valida con screenshots (max 3 reintentos)
  |
  v
FASE 4 — Certificacion Final
  api-tester           -> endpoints, seguridad, performance P95
  performance-benchmarker -> Core Web Vitals, Lighthouse
  reality-checker       -> gate final (default: NEEDS WORK)
  |
  v
FASE 5 — Publicacion (con confirmacion)
  git      -> commit + push a GitHub
  deployer -> deploy a Vercel
```

---

## 16 Agentes incluidos

| Fase | Agente | Rol |
|------|--------|-----|
| 1 | `project-manager-senior` | Convierte ideas en tareas granulares con DoD |
| 2 | `ux-architect` | Fundacion CSS: tokens, layout, tema light/dark |
| 2 | `ui-designer` | Design system visual, componentes, WCAG AA |
| 2 | `security-engineer` | Threat model STRIDE, headers, OWASP Top 10 |
| 3 | `frontend-developer` | React/Vue/TS, Tailwind, shadcn/ui, Canvas |
| 3 | `backend-architect` | Node.js, Express, PostgreSQL, Prisma, Supabase |
| 3 | `rapid-prototyper` | MVPs en <3 dias, Next.js + Supabase + shadcn/ui |
| 3 | `game-designer` | GDD: mecanicas, loops, economia, balance |
| 3 | `xr-immersive-developer` | Phaser.js, PixiJS, Canvas API, WebGL |
| 3 QA | `evidence-collector` | QA visual con Playwright MCP, screenshots |
| 4 | `api-tester` | Cobertura endpoints, OWASP API Top 10, P95 |
| 4 | `performance-benchmarker` | Core Web Vitals, Lighthouse, bundle analysis |
| 4 | `reality-checker` | Gate final pre-produccion |
| 5 | `git` | Commit + push a GitHub (con confirmacion) |
| 5 | `deployer` | Deploy a Vercel via CLI (con confirmacion) |
| * | `orquestador` | Coordinador central, gestiona las 5 fases |
| ref | `better-auth-reference` | Guia de autenticacion con Better Auth (email/password, OAuth, sesiones) |

---

## Servicios configurados

| Servicio | Para que | Activacion |
|---|---|---|
| **Engram** | Memoria persistente entre sesiones | Plugin MCP automatico |
| **Context7** | Documentacion tecnica actualizada | MCP automatico |
| **Playwright** | QA visual con screenshots | MCP automatico |
| **Vercel CLI** | Deploy a produccion | `vercel login` |
| **GitHub CLI** | Repos, commits, push | `gh auth login` |

---

## Estructura del repositorio

```
agents/
|-- orquestador.md
|-- project-manager-senior.md
|-- ux-architect.md
|-- ui-designer.md
|-- security-engineer.md
|-- frontend-developer.md
|-- backend-architect.md
|-- rapid-prototyper.md
|-- game-designer.md
|-- xr-immersive-developer.md
|-- evidence-collector.md
|-- reality-checker.md
|-- api-tester.md
|-- performance-benchmarker.md
|-- git.md
|-- deployer.md
|-- better-auth-reference.md   <- referencia Better Auth para autenticacion
|-- skills/
install/
|-- linux.sh         -> instalacion automatica Linux
|-- windows.md       -> guia paso a paso Windows
templates/
|-- global-claude.md     -> CLAUDE.md del sistema (se copia a ~/CLAUDE.md)
|-- settings.json        -> configuracion MCPs (Engram)
|-- settings.local.json  -> permisos para todos los agentes
CLAUDE.md            -> auto-instalacion (Claude lo lee al abrir el repo)
README.md            -> esta guia
```

---

## Requisitos

**Linux:** Ubuntu/Debian recomendado, Claude Code instalado.
El script instala lo que falte: Node.js, Vercel CLI, gh CLI.

**Windows:** Git for Windows (Git Bash), Claude Desktop instalado.
Ver `install/windows.md` para los pasos detallados.

---

## Creditos

Inspirado en:
- [Agency Agents](https://github.com/msitarzewski/agency-agents) — agentes especializados con metricas
- [Agent Teams Lite](https://github.com/Gentleman-Programming/agent-teams-lite) — DAG State, handoffs minimos, Engram
