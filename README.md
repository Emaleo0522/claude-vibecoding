# Claude Vibecoding

Un equipo de 26 agentes de IA que convierte tus ideas en aplicaciones listas para produccion. Vos describis lo que queres, ellos planifican, disenan, programan, testean y publican.

**No necesitas saber programar.** Tampoco necesitas supervisar cada paso. El sistema maneja todo el proceso con un pipeline profesional de 5 fases y te pide aprobacion solo en los momentos clave.

Compatible con **Linux (Claude Code)** y **Windows (Claude Desktop)**.

---

## Que hace exactamente

Imaginate que tenes un equipo de desarrollo completo trabajando para vos:

1. Un **project manager** que entiende tu idea y la convierte en tareas concretas
2. **Arquitectos** que disenan la base visual y la seguridad
3. **Desarrolladores** especializados en frontend, backend, mobile y juegos
4. **Inspectores de calidad** que revisan cada pieza con capturas de pantalla reales
5. Un **equipo de certificacion** que audita SEO, performance, accesibilidad y seguridad
6. Un **equipo de publicacion** que sube tu codigo a GitHub y lo publica en internet

Todo esto pasa automaticamente. Vos solo decis que queres y aprobas los resultados.

---

## Instalacion

### Opcion 1: Decile a Claude que se instale

Si ya tenes Claude Code o Claude Desktop funcionando, abri una conversacion nueva y pega esto:

```
Clona https://github.com/Emaleo0522/claude-vibecoding e instala el sistema
siguiendo las instrucciones en install/linux.sh (Linux) o install/windows.md (Windows)
```

Claude lee las instrucciones y se instala solo.

### Opcion 2: Instalacion manual

**Linux / macOS (Claude Code):**
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```
Reinicia Claude Code cuando termine.

**Windows (Claude Desktop):**
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```
Segui la guia paso a paso en [`install/windows.md`](install/windows.md).

---

## Uso

Una vez instalado, tenes dos modos:

**Modo normal** — Claude responde como siempre. Preguntas, fixes, chat tecnico.

**Modo pipeline** — Claude activa los 26 agentes y construye tu proyecto completo:

```
modo orquestador — quiero crear una app de delivery de comida para mi barrio
```

Tambien funciona con:
```
activa el pipeline — landing page para mi estudio de yoga
nuevo proyecto completo: juego de naves espacial para el navegador
```

El sistema se encarga del resto. Te va a pedir aprobacion en estos momentos:
- Despues de planificar (para que revises las tareas y el stack)
- Despues de disenar la marca (si tu proyecto necesita logo/imagenes)
- Antes de publicar en GitHub y Vercel

---

## Que puede construir

| Tipo | Ejemplo | Stack tipico |
|------|---------|-------------|
| Landing page | Portfolio, pagina de restaurante | Vite + React + Tailwind |
| App web | Dashboard, SaaS, e-commerce | Next.js + Hono + PostgreSQL |
| App mobile | iOS + Android desde un repo | React Native + Expo |
| Juego browser | Platformer, puzzle, arcade | Phaser.js + TypeScript |
| API | REST, GraphQL, WebSocket | Hono + Drizzle + tRPC |

El stack no es fijo — el sistema elige la mejor combinacion segun tu proyecto. Si queres usar algo especifico, mencionalo y lo respeta.

---

## Pipeline

```
Tu idea
  |
  v
FASE 1 — Planificacion
  project-manager-senior --> tareas con criterios de aceptacion
  |
  v
FASE 2 — Arquitectura
  ux-architect      --> fundacion CSS, tokens, breakpoints (PRIMERO)
  ui-designer       --> design system, componentes, WCAG AA
  security-engineer --> threat model, headers OWASP
  |
  v
FASE 2B — Assets creativos (opcional)
  brand-agent  --> identidad de marca (paleta, tipografia, tono)
  image-agent  --> hero images (Gemini o HuggingFace)
  logo-agent   --> logos SVG vectorizados
  video-agent  --> videos de fondo (o CSS fallback)
  |
  v
FASE 3 — Desarrollo + QA
  dev-agent --> implementa --> evidence-collector valida con screenshots
  (si falla, reintenta hasta 3 veces con feedback especifico)
  |
  v
FASE 4 — Certificacion
  seo-discovery           --> SEO + AI discovery (score 100pts)
  api-tester              --> endpoints, OWASP API Top 10
  performance-benchmarker --> Core Web Vitals, Lighthouse
  reality-checker         --> gate final (default: NEEDS WORK)
  |
  v
FASE 5 — Publicacion (con tu confirmacion)
  git      --> commit + push a GitHub
  deployer --> deploy a Vercel
```

---

## Los 26 agentes

| Fase | Agente | Que hace |
|:----:|--------|---------|
| 1 | `project-manager-senior` | Convierte tu idea en tareas concretas con criterios de aceptacion |
| 2 | `ux-architect` | Crea la base CSS: tokens de diseno, layout, tema claro/oscuro |
| 2 | `ui-designer` | Disena componentes visuales con accesibilidad WCAG AA |
| 2 | `security-engineer` | Analiza amenazas y define headers de seguridad |
| 2B | `brand-agent` | Genera identidad de marca: paleta, tipografia, tono |
| 2B | `image-agent` | Crea imagenes con IA (Gemini o HuggingFace FLUX.1) |
| 2B | `logo-agent` | Genera logos SVG vectorizados |
| 2B | `video-agent` | Crea videos de fondo (o CSS animado como fallback) |
| 3 | `frontend-developer` | Implementa la interfaz: React, Tailwind, shadcn/ui |
| 3 | `backend-architect` | Construye APIs, base de datos, autenticacion |
| 3 | `rapid-prototyper` | Arma MVPs rapidos para validar ideas |
| 3 | `mobile-developer` | Desarrolla apps iOS/Android con React Native + Expo |
| 3 | `game-designer` | Crea el documento de diseno del juego (mecanicas, balance) |
| 3 | `xr-immersive-developer` | Implementa juegos con Phaser.js, PixiJS o Three.js |
| 3 | `evidence-collector` | Testea cada tarea con screenshots en 3 dispositivos |
| 4 | `seo-discovery` | Optimiza SEO y visibilidad en buscadores e IAs |
| 4 | `api-tester` | Valida endpoints contra OWASP API Top 10 |
| 4 | `performance-benchmarker` | Mide Core Web Vitals y analiza bundles |
| 4 | `reality-checker` | Auditoria final (por defecto dice "necesita trabajo") |
| 5 | `git` | Hace commit y push a GitHub |
| 5 | `deployer` | Publica en Vercel con auto-deploy |
| * | `orquestador` | Coordina todo. Nunca programa, solo delega |

---

## Gestion de contexto y memoria

El sistema esta disenado para no perder tu progreso, incluso si la sesion se corta o la ventana de contexto se compacta.

**Como lo hace:**
- **Engram**: memoria persistente que sobrevive entre sesiones. Todo el estado del proyecto se guarda aca.
- **DAG State**: despues de cada tarea completada, el orquestador guarda un snapshot completo del progreso.
- **Boot Sequence**: al iniciar, el sistema busca automaticamente si hay un proyecto en curso para retomarlo.
- **Dual-write**: los datos criticos se guardan en Engram Y en disco, por si uno falla.
- **Proactive saves**: los agentes guardan descubrimientos importantes inmediatamente, no al final.

**Retomar un proyecto:**
Abri una conversacion nueva y deci:
```
retomar [nombre-del-proyecto]
```
El sistema lee el estado guardado y continua exactamente donde quedo. Funciona incluso si otra persona retoma el proyecto.

---

## Assets creativos (Fase 2B)

Si tu proyecto necesita marca visual, el sistema genera logos, imagenes y videos con IA. Se activa automaticamente si detecta que necesitas landing page, hero section o logo.

**Flujo:** brand-agent crea la identidad --> vos aprobas --> se generan los assets

### Credenciales (opcionales, solo para Fase 2B)

| Variable | Servicio | Costo | Para que |
|----------|----------|-------|---------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | ~$0.02-0.04/imagen | Imagenes de mejor calidad (requiere billing) |
| `HF_TOKEN` | [HuggingFace](https://huggingface.co/settings/tokens) | Gratis | Imagenes gratis (calidad buena) |
| `REPLICATE_API_TOKEN` | [Replicate](https://replicate.com/account/api-tokens) | ~$0.05/video | Videos de fondo |

Si no configuras ninguna key, el sistema salta la Fase 2B y construye el proyecto sin assets generados. El pipeline de desarrollo sigue funcionando al 100%.

```bash
# Opcion A: Gemini (mejor calidad, requiere billing en Google Cloud)
export GEMINI_API_KEY="tu_api_key"

# Opcion B: HuggingFace (gratis)
export HF_TOKEN="hf_tu_token"

# Solo si queres videos de fondo
export REPLICATE_API_TOKEN="r8_tu_token"
```

---

## Servicios y MCPs

| Servicio | Para que | Se instala con |
|----------|---------|---------------|
| **Engram** | Memoria persistente entre sesiones | Instalacion automatica |
| **Context7** | Documentacion tecnica actualizada | Instalacion automatica |
| **Playwright** | Screenshots de QA en 3 dispositivos | Instalacion automatica |
| **Vercel CLI** | Publicar en internet | `npm i -g vercel && vercel login` |
| **GitHub CLI** | Subir codigo a GitHub | `gh auth login` |

---

## Que pasa cuando algo falla

El sistema no asume que todo va a salir bien. Tiene mecanismos para cada escenario:

| Situacion | Que hace |
|-----------|---------|
| Una tarea falla en QA | La reintenta hasta 3 veces con feedback especifico |
| Despues de 3 intentos sigue fallando | Te pregunta que hacer: reasignar, partir en sub-tareas, o aceptar con limitacion |
| La sesion se corta | Guarda progreso automaticamente, retoma al abrir nueva sesion |
| Engram no responde | Usa disco local como respaldo temporal |
| Playwright no esta disponible | Hace QA solo con checks de codigo (sin screenshots) |
| Un asset creativo falla | Cadena de fallback (ej: Gemini falla --> HuggingFace --> placeholder) |
| reality-checker no aprueba | Vuelve a Fase 3 solo para las tareas con problemas |

---

## Estructura del repositorio

```
agents/                         26 agentes + referencia Better Auth
  orquestador.md                Coordinador central (nunca programa)
  project-manager-senior.md     Planificacion
  ux-architect.md               Fundacion CSS
  ui-designer.md                Design system
  security-engineer.md          Seguridad
  frontend-developer.md         UI web
  backend-architect.md          APIs y DB
  rapid-prototyper.md           MVPs rapidos
  mobile-developer.md           Apps mobile
  game-designer.md              Diseno de juegos
  xr-immersive-developer.md     Implementacion de juegos
  evidence-collector.md         QA visual por tarea
  reality-checker.md            Certificacion final
  api-tester.md                 Testing de APIs
  performance-benchmarker.md    Performance
  seo-discovery.md              SEO + AI discovery
  brand-agent.md                Identidad de marca
  image-agent.md                Imagenes con IA
  logo-agent.md                 Logos SVG
  video-agent.md                Videos de fondo
  git.md                        Git + GitHub
  deployer.md                   Vercel deploy
  better-auth-reference.md      Guia de autenticacion
install/
  linux.sh                      Instalacion automatica (Linux/macOS)
  windows.md                    Guia paso a paso (Windows)
templates/
  global-claude.md              CLAUDE.md para Linux
  windows-claude.md             CLAUDE.md para Windows
  windows-launch.json           Config de preview servers
  settings.json                 Config de MCPs (Engram)
  settings.local.json           Permisos para los 26 agentes
CLAUDE.md                       Instrucciones del sistema
```

---

## Requisitos

| Plataforma | Necesitas |
|------------|-----------|
| Linux / macOS | Claude Code instalado. El script instala Node.js, Vercel CLI y GitHub CLI |
| Windows | Git for Windows + Claude Desktop. La guia te lleva paso a paso |

---

## Para desarrolladores

### Arquitectura

El sistema usa un patron **hub-and-spoke**: 1 orquestador (hub) + 21 subagentes (spokes). Los subagentes nunca se comunican entre si — todo pasa por el orquestador.

**Regla de oro**: el orquestador NUNCA lee ni escribe codigo. Cada token que consume en trabajo real infla el contexto y acerca la compactacion. Solo coordina.

### Contexto y tokens

- **Handoffs minimos**: subagentes devuelven solo STATUS + archivos + issues, nunca codigo completo
- **Engram con topic keys**: 19 cajones con roles definidos (quien escribe, quien lee)
- **DAG State granular**: se guarda despues de cada TAREA completada (no solo fases)
- **Pre-resolucion de IDs**: el orquestador cachea observation_ids al inicio para evitar busquedas repetidas
- **Dual-write**: estado y tareas se guardan en Engram + disco como respaldo

### Modificar agentes

Cada agente es un archivo `.md` en `agents/`. Podes editarlos directamente. Estructura tipica:

```markdown
---
name: nombre-agente
description: Que hace este agente
---

## Lo que hago
## Como leo de Engram
## Como guardo resultado
## Proactive saves (discoveries)
## Return Envelope
## Tools asignadas
```

### Stack adaptable

| Capa | Preferido | Alternativas |
|------|-----------|-------------|
| Frontend | Next.js (apps), Vite+React (landing) | SvelteKit, Nuxt, Astro |
| Backend | Hono (edge-ready) | Express, Fastify |
| DB | PostgreSQL (prod), Supabase (MVP) | SQLite |
| ORM | Drizzle (type-safe, edge) | Prisma |
| API | tRPC (full TypeScript) | REST, GraphQL |
| Auth | Better Auth | Siempre para proyectos nuevos |
| Mobile | React Native + Expo SDK 52+ | NativeWind 4, Expo Router |
| Juegos 2D | Phaser.js 3 | PixiJS, Canvas API |

---

## Repos hermanos

Este sistema usa repos separados para datos que tienen ciclo de vida propio:

| Repo | Que contiene | Para que |
|------|-------------|---------|
| [`codepen-vault`](https://github.com/Emaleo0522/codepen-vault) | Efectos extraidos de CodePen (original.json + README + preview) | `codepen-explorer` guarda aca, `frontend-developer` lee de aca |
| [`engram-sync`](https://github.com/Emaleo0522/engram-sync) | Chunks comprimidos de la memoria persistente (Engram) | Backup y sync multi-PC de toda la memoria del sistema |

---

## Creditos

Inspirado en:
- [Agency Agents](https://github.com/msitarzewski/agency-agents) — agentes especializados con metricas
- [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) — SDD, Engram, context management patterns
- [pixel-agents](https://github.com/pablodelucca/pixel-agents) — visualizacion pixel art de agentes
