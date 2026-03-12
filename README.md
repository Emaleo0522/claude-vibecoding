# Claude Vibecoding v2.1 — Sistema Multi-Agente

Sistema de **21 agentes especializados + Better Auth reference** para crear apps, webs y juegos sin saber programar.
Pipeline profesional de 5 fases (+ pipeline creativo): planificacion, arquitectura, assets creativos, desarrollo con QA, certificacion y deploy.

Compatible con **Linux (Claude Code)** y **Windows (Claude Desktop)**.

---

## Que cambio en v2.1

| v1 (anterior) | v2 (v2.0) | v2.1 (actual) |
|---|---|---|
| 9 agentes generales | 16 agentes especializados | **21 agentes** (16 original + 4 creativos + 1 SEO) |
| Pipeline lineal | Pipeline de 5 fases con QA loop | Pipeline de 5 fases + **Fase 2B creativa** |
| Sin QA visual | Screenshots con Playwright MCP | Screenshots con Playwright MCP |
| Sin memoria | Engram MCP (memoria persistente) | Engram MCP (memoria persistente) |
| Sin certificacion | Reality Checker como gate final | Reality Checker como gate final |
| Sin threat model | Security Engineer (STRIDE + OWASP) | Security Engineer (STRIDE + OWASP) |
| Sin assets creativos | Sin assets creativos | **Brand, imagenes, logos SVG, videos** generados por IA |

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
cd claude-vibecoding
```

Luego abri Git Bash en esa carpeta y ejecuta el instalador paso a paso siguiendo `install/windows.md`.
O abri Claude Desktop con la carpeta del repo y decile:

> "Instalate el sistema de este repo siguiendo install/windows.md"

**Incluye configuración completa para Windows:**
- `templates/windows-claude.md` — CLAUDE.md con reglas específicas Windows
- `templates/windows-launch.json` — template de launch.json para preview servers
- Pasos guiados para MCPs: Engram, Playwright, Context7

---

## Como usarlo

Una vez instalado y reiniciado Claude, simplemente decile:

> "Quiero crear [tu idea]"

O invoca al orquestador directamente:

> "@orquestador quiero crear [tu idea]"

El sistema se encarga del resto: planificacion, arquitectura, assets creativos, codigo, QA visual, certificacion y deploy.

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
FASE 2B — Assets Creativos (paralelo, automatico)
  brand-agent  -> identidad de marca (brand.json: colores, tipografia, tono)
  image-agent  -> hero images, galeria (HuggingFace FLUX.1)
  logo-agent   -> logos SVG vectorizados (FLUX.1 + vtracer)
  video-agent  -> videos de fondo (Replicate LTXVideo / fallback CSS)
  |
  v
FASE 3 — Desarrollo con QA Loop
  Por cada tarea:
    dev-agent (frontend/backend/game) -> implementa
    evidence-collector -> valida con screenshots (max 3 reintentos)
  |
  v
FASE 4 — Certificacion Final
  seo-discovery         -> SEO audit, meta tags, structured data, sitemap
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

## 21 Agentes incluidos

| Fase | Agente | Rol |
|------|--------|-----|
| 1 | `project-manager-senior` | Convierte ideas en tareas granulares con DoD |
| 2 | `ux-architect` | Fundacion CSS: tokens, layout, tema light/dark |
| 2 | `ui-designer` | Design system visual, componentes, WCAG AA |
| 2 | `security-engineer` | Threat model STRIDE, headers, OWASP Top 10 |
| **2B** | **`brand-agent`** | **Genera identidad de marca: brand.json con colores, tipografia, tono** |
| **2B** | **`image-agent`** | **Genera hero images y galeria via HuggingFace FLUX.1** |
| **2B** | **`logo-agent`** | **Genera logos SVG (FLUX.1 + vtracer vectorizacion)** |
| **2B** | **`video-agent`** | **Genera videos de fondo (Replicate LTXVideo / fallback CSS)** |
| 3 | `frontend-developer` | React/Vue/TS, Tailwind, shadcn/ui, Canvas |
| 3 | `backend-architect` | Node.js, Express, PostgreSQL, Prisma, Supabase |
| 3 | `rapid-prototyper` | MVPs en <3 dias, Next.js + Supabase + shadcn/ui |
| 3 | `game-designer` | GDD: mecanicas, loops, economia, balance |
| 3 | `xr-immersive-developer` | Phaser.js, PixiJS, Canvas API, WebGL |
| 3 QA | `evidence-collector` | QA visual con Playwright MCP, screenshots |
| 4 | `seo-discovery` | SEO audit, meta tags, structured data, sitemap |
| 4 | `api-tester` | Cobertura endpoints, OWASP API Top 10, P95 |
| 4 | `performance-benchmarker` | Core Web Vitals, Lighthouse, bundle analysis |
| 4 | `reality-checker` | Gate final pre-produccion |
| 5 | `git` | Commit + push a GitHub (con confirmacion) |
| 5 | `deployer` | Deploy a Vercel via CLI (con confirmacion) |
| * | `orquestador` | Coordinador central, gestiona las 5 fases |
| ref | `better-auth-reference` | Guia de autenticacion con Better Auth (email/password, OAuth, sesiones) |

---

## Pipeline creativo (Fase 2B)

La Fase 2B genera automaticamente los assets visuales del proyecto usando IA generativa. Se ejecuta en paralelo despues de la arquitectura y antes del desarrollo.

### Flujo

1. **`brand-agent`** — Analiza el proyecto y genera `brand.json` con la identidad de marca: paleta de colores, tipografia, tono de voz, personalidad. Este archivo alimenta a los demas agentes creativos.

2. **`image-agent`** — Genera hero images, imagenes de galeria y backgrounds usando **HuggingFace FLUX.1-schnell**. Cadena de fallback: FLUX.1 -> SDXL -> Pollinations.ai.

3. **`logo-agent`** — Genera el logo del proyecto en PNG via FLUX.1, luego lo vectoriza a SVG usando **vtracer**. Si vtracer no esta instalado, entrega el logo como PNG.

4. **`video-agent`** — Genera videos de fondo cortos usando **Replicate LTXVideo**. Si no hay credito en Replicate, entrega un **fallback CSS animation** equivalente para que el proyecto nunca quede bloqueado.

### Resultado

Todos los assets se guardan en `public/brand/` del proyecto:
- `brand.json` — identidad de marca
- `hero.webp`, `gallery-*.webp` — imagenes
- `logo.svg` (o `logo.png`) — logo
- `bg-video.mp4` (o CSS animation inline) — video de fondo

---

## Requisitos para assets creativos

Los agentes creativos (Fase 2B) usan APIs externas de IA generativa. Estas son las credenciales necesarias:

### HF_TOKEN (gratuito)

Usado por `image-agent` y `logo-agent` para generar imagenes con FLUX.1.

1. Registrate en [huggingface.co](https://huggingface.co)
2. Ve a **Settings > Access Tokens > New token**
3. Selecciona rol **Read**
4. Copia el token y configuralo como variable de entorno:
   ```bash
   export HF_TOKEN="hf_tu_token_aqui"
   ```

**Costo: $0** — El modelo FLUX.1-schnell es gratuito en el free tier de HuggingFace.

### REPLICATE_API_TOKEN (requiere credito)

Usado por `video-agent` para generar videos con LTXVideo.

1. Registrate en [replicate.com](https://replicate.com)
2. Ve a **Account > API tokens**
3. Copia el token y configuralo como variable de entorno:
   ```bash
   export REPLICATE_API_TOKEN="r8_tu_token_aqui"
   ```

**Costo: ~$0.05 por video** — El free tier da creditos iniciales pero la generacion de video tiene costo. **Sin credito, `video-agent` entrega un fallback CSS animation** para que el proyecto nunca quede bloqueado.

### vtracer (opcional)

Mejora la calidad de los logos convirtiendolos de PNG a SVG vectorizado. Usado por `logo-agent`.

```bash
# Opcion A: instalar con cargo (si tenes Rust)
cargo install vtracer

# Opcion B: descargar binario precompilado
# https://github.com/visioncortex/vtracer/releases
```

**Sin vtracer**, los logos se entregan como PNG en vez de SVG. El proyecto funciona igual.

---

## Estrategia de branches — Leer antes de usar

Por defecto, el sistema trabaja **directo en `main`** (sin branches de feature). Esto funciona bien cuando:
- Sos el unico desarrollador
- El pipeline QA (evidence-collector + reality-checker) valida antes de pushear
- Vercel tiene rollback instantaneo si algo se rompe

**Si trabajas en equipo o tenes usuarios en produccion**, deberas cambiar a un flujo con branches:

```
main (produccion, protegida)
  └── feature/nombre-tarea (desarrollo aca)
      └── PR + merge a main solo despues de certificacion
```

Para activarlo, modifica el agente `git.md`: en vez de pushear directo a `main`, que cree una branch `feature/{nombre-tarea}`, pushee ahi, y el merge a `main` sea un paso separado con confirmacion. El auto-deploy de Vercel solo se dispara cuando el codigo llega a `main`, asi que las branches de feature no generan deploys accidentales.

**Resumen rapido:**

| Situacion | Branch strategy |
|---|---|
| Solo, proyecto personal | Directo a `main` (default del sistema) |
| Solo, proyecto con usuarios reales | Recomendado usar branches |
| Equipo 2+ personas | **Obligatorio** usar branches |
| Prototipo / prueba rapida | Directo a `main` |

---

## Notas tecnicas

Lecciones aprendidas durante el testing de los agentes creativos en produccion:

- **URL de HuggingFace Inference API cambio en 2025**: usar `router.huggingface.co/hf-inference` (NO la antigua `api-inference.huggingface.co`). Los agentes ya usan la URL correcta.

- **Replicate usa prefijo `Token`** en el header de autorizacion (NO `Bearer`). Es decir: `Authorization: Token r8_xxx`.

- **FLUX.1-schnell** genera imagenes de 1024x1024 en ~5-10 segundos en el free tier. Suficiente calidad para hero images y logos base.

- **Cadenas de fallback en todos los agentes creativos**: ningun asset creativo bloquea el pipeline. Si falla la API principal, hay alternativas:
  - Imagenes: FLUX.1 -> SDXL -> Pollinations.ai (gratis, sin token)
  - Video: LTXVideo -> CSS animation (sin costo)
  - Logo: FLUX.1 + vtracer -> FLUX.1 PNG -> Pollinations.ai PNG

---

## Servicios configurados

| Servicio | Para que | Activacion |
|---|---|---|
| **Engram** | Memoria persistente entre sesiones | Plugin MCP automatico |
| **Context7** | Documentacion tecnica actualizada | MCP automatico |
| **Playwright** | QA visual con screenshots | MCP automatico |
| **Vercel CLI** | Deploy a produccion | `vercel login` |
| **GitHub CLI** | Repos, commits, push | `gh auth login` |
| **HuggingFace** | Generacion de imagenes y logos (FLUX.1) | `export HF_TOKEN=...` |
| **Replicate** | Generacion de videos (LTXVideo) | `export REPLICATE_API_TOKEN=...` |

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
|-- brand-agent.md              <- NEW: identidad de marca
|-- image-agent.md              <- NEW: generacion de imagenes (FLUX.1)
|-- logo-agent.md               <- NEW: generacion de logos SVG (FLUX.1 + vtracer)
|-- video-agent.md              <- NEW: generacion de videos (LTXVideo / CSS fallback)
|-- seo-discovery.md            <- NEW: SEO audit y optimizacion
|-- better-auth-reference.md    <- referencia Better Auth para autenticacion
|-- skills/
install/
|-- linux.sh         -> instalacion automatica Linux (Claude Code)
|-- windows.md       -> guia paso a paso Windows (Claude Desktop)
templates/
|-- global-claude.md        -> CLAUDE.md para Linux/Claude Code
|-- windows-claude.md       -> CLAUDE.md para Windows/Claude Desktop
|-- windows-launch.json     -> template launch.json para preview servers en Windows
|-- settings.json           -> configuracion MCPs (Engram) para Claude Code
|-- settings.local.json     -> permisos para todos los agentes
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
