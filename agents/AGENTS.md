# Vibecoding — Skill & Reference Index

**Regla**: cargar la referencia ANTES de empezar trabajo real. Múltiples pueden aplicar simultáneamente.

## Cómo se usa

1. Identificá triggers del contexto actual (stack, deploy_target, fase, pedido del usuario)
2. Cargá el archivo en `Path`
3. Aplicá las reglas que define
4. Saltala si aplica un `Skip when`

## Índice

| Slug | Trigger | Path | Skip when |
|------|---------|------|-----------|
| `agent-protocol` | Siempre (todos los subagentes) | `agent-protocol.md` | Nunca |
| `pipeline` | Subagente necesita detalle del pipeline (DAG, modos, fases) | `pipeline-reference.md` | Tarea standalone sin contexto pipeline |
| `intent-clarifier` | Fase 1 Paso 0 + brief vago (word count + falta de referencias) | `intent-clarifier-reference.md` | Brief claro con referencias visuales |
| `better-auth` | Implementar/tocar flows de auth en proyecto nuevo | `better-auth-reference.md` | Proyecto ya usa Clerk/Supabase Auth/JWT custom |
| `linux-hardening` | `deploy_target ∈ {vps, oracle-cloud, digitalocean, hetzner, aws-ec2, self-hosted}` | `linux-hardening-reference.md` | Vercel/Netlify/EAS Build |
| `pocketbase` | Backend = PocketBase | `pocketbase-reference.md` | Stack usa Supabase/Hono/Drizzle |
| `devops-vps` | Deploy/operate de VPS sin Vercel | `devops-vps-reference.md` | Vercel/Netlify |
| `nothing-design` | Usuario pidió Nothing aesthetic explícito | `nothing-design-reference.md` | Default — skip silencioso |
| `react-patterns` | Stack React 19 / Next.js 15-16 / Tailwind 4 / Zustand / TanStack Query | `react-patterns-reference.md` | Stack no-React |
| `redis-patterns` | Backend usa Redis (caching, pub/sub, HyperLogLog) | `redis-patterns-reference.md` | Sin Redis |
| `better-gsap` | Frontend Tier 3 (timeline, ScrollTrigger pin, SplitText, SVG morph) | `better-gsap-reference.md` | Tier 1-2 (CSS/Framer Motion) |
| `scroll-storytelling` | Lenis smooth scroll, pinning multi-sección, snap, horizontal scroll, parallax avanzado | `scroll-storytelling-reference.md` | Scroll básico nativo |
| `creative-coding` | p5.js, GLSL shaders, generative art, particle systems custom | `creative-coding-reference.md` | UI estándar sin generative |
| `advanced-effects` | Lottie, Rive, cursor effects, micro-interactions vectoriales | `advanced-effects-reference.md` | Sin animaciones vectoriales |
| `reactive-audio` | Tone.js, Web Audio API, audio que responde a scroll/data/interacción | `reactive-audio-reference.md` | Sin audio |
| `modo-diagnostico` | User dice frase exacta: "modo diagnóstico", "audita {esto/repo}", "diagnostica X", "evalúa sin tocar", "review only" | `modo-diagnostico-reference.md` | Sin trigger explícito (default skip) |
| `cross-claude-mailbox` | User activa OPT-IN: "chequeá mailbox", "mensajes de pc004", "sync cross-PC", o inicio de workflow conocido cross-PC (M1/M2/M3, coordinación de pushes) | `cross-claude-mailbox-reference.md` | Sin trigger OPT-IN (NO ejecutar searches al mailbox por default) |
| `orquestador-modificacion` | Boot Sequence detecta `{proyecto}/estado.fase_actual="completado"` Y brief usa verbos modifica/agrega/quita/redesign | `orquestador-modificacion-reference.md` | Proyecto nuevo o fase_actual ≠ completado |
| `orquestador-fase-2b` | `intent.project_type ∈ {landing, portfolio, marketing, app móvil, juego}` o user pide explícitamente "logo/imágenes/branding/hero/video" | `orquestador-fase-2b-reference.md` | API pura, dashboard interno corporativo, prototipo sin assets visuales |
| `orquestador-edge-cases` | Error subagente / `ambiguous_project` / Engram MCP no responde / Playwright MCP no disponible / debugging pipeline fallido | `orquestador-edge-cases-reference.md` | Flujo normal sin errores |
| `external-skills` | Frontend/xr-immersive dev en Fase 3 detecta gap NO cubierto por refs internas (gsap, scroll-storytelling, creative-coding, advanced-effects, reactive-audio, codepen-vault) Y usuario autoriza `npx skills add` | `external-skills-reference.md` | Ref interna ya cubre el efecto · proyecto fuera de Fase 3 · sin autorización explícita del usuario |

## Convenciones

- **Triggers** = condiciones objetivas (stack, `deploy_target`, fase). Si es subjetiva ("usuario pidió"), trigger explícito + skip default.
- **Skip when** previene carga innecesaria. Si no hay caso de skip → poner "Nunca".
- **Paths** relativos a `~/.claude/agents/`.
- Mantener este archivo **bajo 60 líneas**. Si crece más, refactorizar a sub-índices por categoría (auth, deploy, frontend-effects, etc.).

## Diferencia entre referencias y agentes

- **Referencias** (este índice) → knowledge on-demand, sin tools, sin model routing. Solo aportan reglas/patterns/anti-patterns.
- **Agentes ejecutables** (orquestador, frontend-developer, ui-designer, etc.) → tienen tools (`Read`, `Edit`, `Bash`, MCPs), model asignado (Opus/Sonnet), Return Envelope. Auto-cargan su propio `.md` al spawn — no necesitan estar en este índice.

## Quién consulta este índice

- **orquestador** — Fase 1 (decide qué referencias cargar para el proyecto) + Fase 2-5 (re-evalúa según triggers)
- **frontend-developer** — design decision tree (gsap/scroll-storytelling/creative-coding/advanced-effects/reactive-audio)
- **ui-designer** — token efficiency en carga (nothing-design solo si aplica)
- **security-engineer** — linux-hardening si `deploy_target` es VPS
- **deployer** — devops-vps si `deploy_mode=vps`
- **backend-architect** — pocketbase/redis-patterns según stack
