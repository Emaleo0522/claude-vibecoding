# Sistema Vibecoding Híbrido

## Dos modos de trabajo

Claude opera en dos modos distintos. El usuario elige explícitamente cuál usar:

| Modo | Cuándo usarlo | Cómo activarlo |
|------|--------------|----------------|
| **Claude normal** | Preguntas, fixes puntuales, revisiones, chat técnico | Por defecto — simplemente habla |
| **Orquestador** | Proyectos completos de software de principio a fin | Di explícitamente: *"activa el pipeline"*, *"modo orquestador"*, o *"nuevo proyecto completo: X"* |

Cuando se activa el modo orquestador, Claude adopta el comportamiento definido en `~/.claude/agents/orquestador.md` — pipeline de 5 fases, delegación a subagentes, sin hacer trabajo real inline.

## Arquitectura

Este sistema usa un **orquestador central** (1 coordinador + 21 subagentes = 22 entidades). Los subagentes solo responden al orquestador, nunca entre sí.

### Pipeline (5 fases)
```
Fase 1  Planificación   → project-manager-senior
Fase 2  Arquitectura    → ux-architect → ui-designer + security-engineer (ux-arch primero, luego los otros en paralelo)
Fase 3  Dev ↔ QA Loop  → dev-agents ↔ evidence-collector (3 reintentos)
Fase 4  Certificación   → seo-discovery + api-tester + performance-benchmarker + reality-checker
Fase 5  Publicación     → git (confirmación) → deployer (confirmación)
```

### Regla de oro
El orquestador **NUNCA** hace trabajo real (no lee código, no escribe código, no analiza arquitectura). Solo coordina. Cada token inline es contexto perdido.

## Gestión de contexto

### Handoffs mínimos
Los subagentes devuelven al orquestador **solo resúmenes cortos** (STATUS + archivos + issues). Nunca código completo ni contenido largo.

### Screenshots a disco
QA guarda screenshots en `/tmp/qa/` y pasa solo rutas, nunca imágenes inline.

### Engram (memoria persistente — protege el contexto)
- **Topic keys**: `{proyecto}/{tipo}` (ej: `mi-app/tareas`, `mi-app/qa-3`)
- **Lectura siempre en 2 pasos**: `mem_search` → `mem_get_observation` (nunca usar preview truncada directamente)
- **DAG State**: el orquestador guarda `{proyecto}/estado` despues de cada TAREA completada (no solo fases)
- **Guardar completo, leer selectivo**: subagentes solo leen los cajones que necesitan, nunca todo
- **No duplicar en contexto**: si la info esta en Engram, pasar solo la ruta al cajon, no el contenido
- **Retomar sin inventar**: al reanudar post-compactacion, `{proyecto}/estado` tiene todo para continuar
- **Actualizar, no duplicar**: si un cajon ya existe y se va a reescribir (ej: retry de tarea o QA), usar `mem_update(observation_id, nuevo_contenido)` — nunca crear dos entradas con el mismo topic_key. Buscar con `mem_search` primero para obtener el observation_id
- **Proactive saves**: subagentes guardan descubrimientos no obvios inmediatamente con `mem_save` (topic key: `{proyecto}/discovery-{descripcion}`)
- **Dual-write critico**: `{proyecto}/estado` y `{proyecto}/tareas` se guardan SIEMPRE en Engram + disco (`{project_dir}/.pipeline/`)

### Lectura Engram — bloque canonico (referencia para todos los agentes)
```
# Leer de Engram (2 pasos OBLIGATORIOS — nunca usar preview truncada)
result = mem_search("{proyecto}/{cajon}")
if result.observation_id:
    full = mem_get_observation(result.observation_id)
    # usar full.content — NUNCA result.preview
else:
    # cajon no existe — informar al orquestador
```

### Continuidad entre sesiones

Si un usuario abre una NUEVA conversacion y dice "retomar {proyecto}":

1. El orquestador busca `{proyecto}/estado` en Engram (Boot Sequence)
2. Lee el DAG State completo (fase, stack, tareas, progreso)
3. Presenta al usuario:
   ```
   Retomando {proyecto}
   Fase: {fase_actual}
   Tareas: {completadas}/{total}
   Ultima actividad: {ultimo_save}

   ¿Continuo desde donde quedo?
   ```
4. No re-ejecuta fases completadas ni re-pregunta decisiones ya tomadas
5. Si hay una tarea en progreso que no llego a PASS, la re-intenta

**Esto funciona porque TODO el estado esta en Engram, no en la conversacion.**
**Cualquier persona (u otra sesion de Claude) puede retomar leyendo el DAG State.**

### Topic keys del sistema (referencia rápida)
| Topic key | Generado por | Leído por |
|-----------|-------------|-----------|
| `{proyecto}/estado` | orquestador | orquestador (retomar tras compactación) |
| `{proyecto}/tareas` | project-manager-senior | todos los agentes dev |
| `{proyecto}/css-foundation` | ux-architect | ui-designer, frontend-developer |
| `{proyecto}/design-system` | ui-designer | frontend-developer, mobile-developer |
| `{proyecto}/security-spec` | security-engineer | backend-architect, frontend-developer |
| `{proyecto}/api-spec` | backend-architect | api-tester (Fase 4) |
| `{proyecto}/tarea-{N}` | dev agents (frontend, backend, etc.) | evidence-collector |
| `{proyecto}/qa-{N}` | evidence-collector | reality-checker |
| `{proyecto}/gdd` | game-designer | xr-immersive-developer |
| `{proyecto}/branding` | brand-agent | orquestador |
| `{proyecto}/creative-assets` | image-agent, logo-agent, video-agent | orquestador |
| `{proyecto}/seo` | seo-discovery | reality-checker |
| `{proyecto}/api-qa` | api-tester | reality-checker |
| `{proyecto}/perf-report` | performance-benchmarker | reality-checker |
| `{proyecto}/certificacion` | reality-checker | orquestador |
| `{proyecto}/git-commit` | git | orquestador |
| `{proyecto}/costs` | orquestador | orquestador (resumen de costos API del pipeline creativo) |
| `{proyecto}/deploy-url` | deployer | orquestador |

## Herramientas por agente

| Agente | Tools principales |
|--------|-------------------|
| orquestador | Agent (spawn subagentes), Engram MCP |
| project-manager-senior | Read, Write, Engram MCP |
| ux-architect | Read, Write, Engram MCP |
| ui-designer | Read, Write, Engram MCP |
| security-engineer | Read, Write, Engram MCP |
| frontend-developer | Read, Write, Edit, Bash, Engram MCP |
| backend-architect | Read, Write, Edit, Bash, Engram MCP |
| rapid-prototyper | Read, Write, Edit, Bash, Engram MCP |
| mobile-developer | Read, Write, Edit, Bash, Engram MCP |
| game-designer | Read, Write, Engram MCP |
| xr-immersive-developer | Read, Write, Edit, Bash, Engram MCP |
| evidence-collector | Read, Bash, Playwright MCP, Engram MCP |
| reality-checker | Read, Bash, Glob, Grep, Playwright MCP, Engram MCP |
| seo-discovery | Read, Write, Edit, Bash, Engram MCP |
| api-tester | Read, Bash, Engram MCP |
| performance-benchmarker | Read, Bash, Playwright MCP, Engram MCP |
| brand-agent | Read, Write, Bash, Engram MCP |
| image-agent | Read, Write, Bash, Engram MCP |
| logo-agent | Read, Write, Bash, Engram MCP |
| video-agent | Read, Write, Bash, Engram MCP |
| git | Bash (git, gh), Engram MCP |
| deployer | Bash (vercel), Engram MCP |

## Reglas clave
- Solo el **orquestador** guarda DAG State en Engram
- Los subagentes guardan sus propios resultados en Engram con topic keys del proyecto
- Solo **evidence-collector** y **reality-checker** hacen QA visual
- Solo **git** hace commits/push — nunca un agente dev
- Solo **deployer** despliega a Vercel
- git y deployer actúan **solo con confirmación del usuario**
- Cada tarea dev pasa por **evidence-collector** antes de avanzar (máx 3 reintentos)
- **El orquestador NO activa git hasta que evidence-collector retorna PASS** — nunca saltear QA antes de push, aunque el tiempo apremia. Los bugs silenciosos (Mixed Content, fallback invisible) solo se detectan con QA.

## Stack adaptable por proyecto

El orquestador decide el stack en Fase 1 basándose en los requisitos. No hay stack fijo — se adapta:

| Capa | Opciones disponibles | Preferido |
|------|---------------------|-----------|
| Frontend | Next.js, SvelteKit, Nuxt, Astro, Vite+React | Next.js (apps), Vite+React (landing) |
| Backend | Hono, Express, Fastify | Hono (edge-ready, liviano) |
| DB | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle (type-safe, edge) |
| API type-safe | tRPC, oRPC, ts-rest | tRPC (si frontend+backend TS) |
| Validación | Zod | Siempre |
| State mgmt | Zustand, Jotai, Pinia | Zustand (React) |
| Data fetching | TanStack Query | Siempre en apps con API |
| Forms | react-hook-form + Zod | Siempre en apps con forms |
| Jobs/Background | BullMQ, Inngest | BullMQ (si Redis), Inngest (serverless) |
| Email | React Email + Resend | Siempre que haya transaccional |
| Estructura | Single-repo, Monorepo (apps/+packages/) | Monorepo si frontend+backend separados |
| Mobile | React Native + Expo SDK 52+, NativeWind 4, Expo Router | React Native + Expo (iOS + Android desde un repo) |
| Animación | Framer Motion (React), GSAP (complejo), CSS transitions (simple) | Framer Motion |
| Data Viz | Recharts (React), Chart.js (vanilla), D3.js (custom) | Recharts |
| Linting | ESLint + Stylelint | Siempre |
| Game 2D | Phaser.js 3, PixiJS, Canvas API | Phaser.js (completo), PixiJS (renderer puro) |
| Game 3D | Three.js, Babylon.js | Three.js |
| Game Audio | Howler.js, Web Audio API | Howler.js |
| Game Physics | Matter.js (2D, integrado Phaser), Cannon-es (3D) | Matter.js |
| Level Design | Tiled (JSON/TMX), LDtk | Tiled |
| Sprites | Aseprite (paid), LibreSprite/Piskel (FOSS) | Aseprite o LibreSprite |

## Autenticación estándar — Better Auth
- **Better Auth** es el sistema de auth por defecto para todos los proyectos nuevos
- Referencia completa: `~/.claude/agents/better-auth-reference.md`
- Agentes que lo usan: backend-architect (server), frontend-developer (client), rapid-prototyper (full-stack)
- Solo usar Clerk/Supabase Auth/JWT custom si el proyecto ya los tiene implementados

### Reglas críticas (validadas en producción)
- **Migración NO es automática**: siempre agregar `"migrate": "npx @better-auth/cli migrate"` al `package.json` y ejecutarlo antes del primer `npm run dev`
- **Next.js 16+**: usar `proxy.ts` con `export async function proxy()` — el archivo `middleware.ts` está deprecado

## Agentes creativos — Assets visuales
Pipeline de generación de assets (logos, imágenes, videos) para proyectos web.

### Orden de ejecución obligatorio
1. **brand-agent** → genera `assets/brand/brand.json` con identidad completa
2. Orquestador presenta propuesta al usuario → **PAUSA PARA APROBACIÓN**
3. **logo-agent** + **image-agent** → en paralelo, ambos leen `brand.json`
4. **video-agent** → después de image-agent (necesita `assets/images/hero.png`)

### Reglas críticas
- **brand-agent SIEMPRE primero** — ningún agente creativo funciona sin `brand.json`
- **Aprobación de marca antes de generar assets** — no auto-generar sin confirmación del usuario
- Los agentes leen brand.json del filesystem, el orquestador solo pasa `project_dir`
- El orquestador guarda `{proyecto}/branding` en Engram con `user_approved: true` tras aprobación
- Si brand.json ya existe y `user_approved: true` → saltar brand-agent, usar existente
- video-agent entrega siempre un `fallback.css` aunque el video falle

### Engram para proyectos creativos
- `{proyecto}/branding` → path de brand.json, hash, version, user_approved, learned_preferences
- `{proyecto}/creative-assets` → inventario con estructura:
  ```json
  {
    "images": { "hero": {"path": "...", "dimensions": "1920x1080", "format": "png", "hash": "..."}, "mobile": {...} },
    "logos": { "primary": {"svg_path": "...", "png_path": "...", "hash": "..."}, "horizontal": {...}, "icon": {...}, "monochrome": {...} },
    "video": { "hero_video": {"path": "...", "duration": "5s", "format": "mp4", "hash": "..."}, "fallback_css": {"path": "..."} }
  }
  ```
- NO guardar binarios ni SVG completos en Engram — solo paths y metadata

### Negative prompts base (referencia para agentes creativos)
- **Base**: `blurry, pixelated, low quality, worst quality, deformed, watermark, oversaturated`
- **+Personas**: `deformed face, extra fingers, mutated hands, bad anatomy, extra limbs`
- **+Texto**: `text, letters, words, typography, font, writing, watermark text`
Cada agente agrega los suyos según contexto (SAFE/MEDIUM/RISKY en image-agent, motion artifacts en video-agent).

### Cost tracking para agentes creativos
El orquestador mantiene un cajón `{proyecto}/costs` con el costo estimado por invocación de API:
- brand-agent: $0 (sin API externa)
- image-agent (Gemini): ~$0.02-0.04/imagen | image-agent (HuggingFace): $0 (free tier)
- logo-agent (Gemini): ~$0.02-0.04/logo | logo-agent (HuggingFace): $0 (free tier)
- video-agent: ~$0.03-0.10/video (Replicate)
Los agentes reportan el costo en su STATUS al orquestador. Máximo estimado del pipeline creativo completo: ~$0.40 (con 3 reintentos de video + Gemini).

### Variables de entorno requeridas

| Variable | Servicio | Costo | Cómo obtener | Usado por |
|----------|----------|-------|-------------|-----------|
| `GEMINI_API_KEY` | Google AI Studio | ~$0.02-0.04/img (billing requerido) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → habilitar billing en Google Cloud | image-agent, logo-agent |
| `HF_TOKEN` | HuggingFace | Gratis (free tier) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | image-agent, logo-agent |
| `REPLICATE_API_TOKEN` | Replicate | ~$0.03-0.10/video | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) | video-agent |

**Gemini requiere billing**: la generación de imágenes por API NO funciona en el free tier de Google AI Studio. Hay que habilitar facturación en el proyecto de Google Cloud asociado. Sin billing, usar HuggingFace (gratis).

**Al menos una key de imagen es obligatoria**: `GEMINI_API_KEY` o `HF_TOKEN`. Si ambas están, Gemini es primario con HuggingFace como fallback.

**Resolución de env vars** (cascada de búsqueda): variable de entorno del sistema → `.env` en el proyecto → `~/.claude-agents/.env` (fallback global)

## Best Practices Cross-Cutting (validadas en producción)

### SEO-Frontend Sync
- FAQ visible en HTML DEBE coincidir con FAQPage JSON-LD (Google penaliza divergencia)
- AggregateRating/Reviews JSON-LD solo con datos de testimonios REALES, nunca inventados
- `@vercel/og` es el método preferido para OG images dinámicos en Next.js (no Pillow/canvas)
- Páginas con SEO dinámico (colecciones, productos) → Server Component + `generateMetadata`
- **`llms.txt` + `llms-full.txt` para AI search**: sitios que quieren visibilidad en ChatGPT, Perplexity, Claude deben incluir estos archivos en la raíz. `llms.txt` = descripción concisa + catálogo + contacto. `llms-full.txt` = FAQ completa + descripciones detalladas de productos/servicios. Son como `robots.txt` pero para LLMs.
- **`robots.txt` con AI crawlers explícitos**: agregar `User-agent: GPTBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `PerplexityBot`, `Applebot-Extended` con `Allow: /` — los bots respetan esto y es señal de que el sitio quiere ser indexado por IAs

### Performance Web (obligatorio en todos los proyectos)
- Preconnect + dns-prefetch para dominios externos (Unsplash, Google Fonts, CDNs)
- **Preconnect al backend propio también**: si hay API calls a un origen externo (PocketBase, Express, etc.), agregar `<link rel="preconnect" href="https://mi-backend.com">` — ahorra el DNS lookup en el primer fetch
- `manifest.json` básico siempre (PWA-ready, mejora Lighthouse)
- `theme-color` meta tag para mobile browsers
- Google Search Console verification tag como placeholder (listo para reemplazar)
- **`<link rel="preload" as="image">` para el LCP element**: si la imagen más grande del viewport está en CSS o tiene `loading="auto"`, el browser la descubre tarde. Identificar el LCP y agregarlo como preload explícito en `<head>`
- **PNG grandes como background → WebP obligatorio**: imágenes PNG usadas como `background-image` en CSS pueden superar 1MB fácilmente. Convertir a WebP (ahorro típico >90%). La imagen no aparece en el HTML, el browser la descubre al parsear CSS — doble penalización.

### Vercel — Sitios Estáticos
- **`Cache-Control: max-age=0` es el default de Vercel** para todos los assets estáticos — el browser re-valida en cada visita. Para añadir browser caching, crear `vercel.json` con headers explícitos: `max-age=604800` para `/assets/**`, `max-age=3600` para `/js/**` y `/css/**`
- **Security headers via `vercel.json`**: Vercel no agrega X-Frame-Options, X-Content-Type-Options, Referrer-Policy ni Permissions-Policy por defecto. Agregarlos en `vercel.json` bajo `"source": "/(.*)"`. Plantilla mínima:
  ```json
  { "headers": [{ "source": "/(.*)", "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
  ]}]}
  ```
- **Admin panel en sitio estático**: agregar en `vercel.json` un header `X-Robots-Tag: noindex, nofollow` + `Cache-Control: no-store` para la ruta `/admin.html` — evita que Google indexe el panel y que browsers cacheen la sesión

### PocketBase (validado en producción)
- **Boolean `required: true` rompe toggles**: Go trata `false` como zero value → falla validación. Campos booleanos que se van a alternar entre `true`/`false` NUNCA deben tener `required: true` en el schema.
- **listRule/viewRule deben diferenciar admin vs público**: si el admin panel necesita ver ítems ocultos, usar `published = true || @request.auth.collectionName = "admin_collection"`. Sin esto, el admin queda ciego a los registros ocultados.
- **Siempre exponer `errBody.data` en errores de API**: el `message` top-level es genérico ("Failed to update record."). El detalle real (qué campo falla, qué código de validación) está en `errBody.data`. Loguear ambos al debuggear.
- **Superadmin auth cambió en v0.23+**: el endpoint `/api/admins/auth-with-password` devuelve 404 en versiones nuevas. Usar `/api/collections/_superusers/auth-with-password` con el mismo body `{identity, password}`.
- **Reglas de coleccion son independientes por operacion**: create/list/update/delete pueden tener reglas distintas. Una coleccion puede permitir create a usuarios pero tener update en null (solo admin). Verificar las 4 reglas al debuggear 400/403.
- **NULL vs empty string en rules**: `NULL` listRule = solo admins (403). `""` = acceso publico. Son distintos en SQLite — verificar con `QUOTE(listRule)`.
- **Sort fields**: `sort=campo1,campo2` multi-campo retorna 400 en muchas versiones. `sort=-created` tambien puede fallar. Solucion segura: `sort=-id` (ULID-based, time-sortable desde v0.16+).
- **PocketBase en Docker**: no tiene `sqlite3` dentro del container. Siempre `docker stop` antes de editar `.db` directamente.
- **HTTPS obligatorio**: si frontend es HTTPS, backend DEBE ser HTTPS. Ver seccion "DevOps VPS" para soluciones.

### CSS Patterns (validados en producción)
- **`::after` para background images**: mejor que un div extra. El pseudo-elemento va con `position: absolute; inset: 0; z-index: 0; pointer-events: none`. Los hijos del contenedor necesitan `position: relative; z-index: 1`.
- **`max()` para secciones full-width con contenido centrado**: `padding: Xpx max(24px, calc((100vw - 1200px) / 2))` — en pantallas anchas centra el contenido, en mobile mantiene mínimo de 24px. Reemplaza el patrón `max-width + margin: auto` sin perder responsividad.
- **`translateX` en `position: fixed` puede fijar el scroll horizontal**: al animar un toast/modal hacia afuera del viewport con `translateX(400px)`, el browser puede crear scroll horizontal y quedar stuck en esa posición. Usar `translateY` (vertical) para estas animaciones.
- **Clases genéricas colisionan entre admin y sitio público**: si `admin.html` e `index.html` comparten clase `.stat-number`, un `querySelectorAll('.stat-number')` en el admin encuentra los elementos equivocados. Usar IDs específicos o clases prefijadas (`admin-stat-number`) para elementos exclusivos del panel.

### Accesibilidad (obligatorio en todos los proyectos)
- **axe-core en QA**: evidence-collector y reality-checker inyectan axe-core 4.10.0 desde CDN en el navegador durante testing con Playwright. 0 violaciones critical/serious para PASS.
- **eslint-plugin-jsx-a11y**: siempre incluir en proyectos React/Next.js — atrapa errores de a11y en build time
- **Stylelint**: ejecutar `stylelint "**/*.css"` en proyectos con CSS custom. Reglas mínimas: `no-descending-specificity`, `declaration-block-no-duplicate-properties`, `no-duplicate-selectors`
- **Skip-nav link**: toda app con navbar debe tener `<a href="#main-content" class="skip-nav">Skip to content</a>` como primer hijo de `<body>`
- **Focus trap en modales**: todo modal/drawer debe atrapar el foco con `focus-trap-react` o equivalente

### Bundle Size Gates (performance)
- **bundlewatch**: configurar en `package.json` con límites por bundle. Gate obligatorio en Fase 4 si el proyecto tiene build JS.
- Límites recomendados: main bundle < 250KB gzip, vendor < 150KB gzip, páginas individuales < 50KB gzip

### QA & Certificación
- Siempre testear contra **build de producción** (`npm run build && npm start`), no dev server
- Matar procesos en puerto antes de levantar servidor de test (`lsof -ti:PORT && kill ...`)
- SEO Score mínimo 85/100 para certificación (reality-checker lo valida)
- Links internos: todos deben retornar HTTP 200 (verificar con sitemap.xml)
- JSON-LD: todos los bloques deben ser parseables (validar con `python3 -m json.tool`)
- **Mixed Content check obligatorio**: si el frontend va a HTTPS (Vercel, Netlify, etc.), verificar SIEMPRE que el backend también tiene HTTPS antes de pushear. El error es silencioso — la app cae al fallback sin mostrar nada en la UI.

### DevOps VPS (validado en producción con Oracle Cloud)

#### Mixed Content HTTPS — static site HTTPS + backend HTTP
Browsers bloquean TODAS las requests HTTP desde páginas HTTPS. Afecta `fetch()`, `img src`, `video src`, `XMLHttpRequest`.

**Soluciones (de más simple a más permanente)**:
1. **nginx + Let's Encrypt** (requiere puertos 80/443 accesibles + dominio): Permanente, sin dependencias externas. Usar `sslip.io` si no hay dominio propio: `161-153-203-83.sslip.io` resuelve a `161.153.203.83`.
2. **Cloudflare Quick Tunnel** (sin cuenta ni dominio): `cloudflared tunnel --url http://localhost:PORT` → URL `*.trycloudflare.com`. Cambio en cada restart — solo para fix temporal.
3. **Cloudflare Named Tunnel** (requiere cuenta + dominio): Permanente, conecta outbound, no necesita puertos abiertos en el firewall.

#### Oracle Cloud Free Tier — Dos capas de firewall independientes
Oracle tiene DOS firewalls que **ambos** deben permitir el puerto:
- **Capa 1 — UFW** (dentro de la VM, configurable vía SSH): `sudo ufw allow 80/tcp`
- **Capa 2 — VCN Security List** (nivel de red, solo en Oracle Cloud console): Networking → VCNs → Security Lists → Add Ingress Rule → CIDR `0.0.0.0/0`, TCP, puerto
- **Diagnóstico**: si `ufw allow` no sirve → es VCN. Test: `curl http://IP:PORT` desde fuera — si da 000 (timeout), es VCN; si da error de conexión, es UFW.
- **Workaround sin tocar VCN**: Cloudflare Tunnel (conecta outbound, no necesita inbound ports)

#### nginx como reverse proxy + Let's Encrypt
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d MI-DOMINIO.sslip.io --non-interactive --agree-tos -m email@example.com
```

## Overrides Windows — Diferencias con Linux/Claude Code

### Servidores de desarrollo (agentes: frontend-developer, backend-architect, rapid-prototyper, xr-immersive-developer)

**NUNCA** arrancar servidores con `npm run dev` via Bash directamente.
**SIEMPRE** usar `preview_start` del Claude Preview MCP.

Pasos obligatorios:
1. Crear o verificar `.claude/launch.json` en el directorio de trabajo con la configuracion del proyecto
2. Llamar `preview_start` con el nombre definido en `launch.json`
3. Usar `preview_logs` para verificar que arranco sin errores
4. Pasar la URL (`http://localhost:{puerto}`) al agente de QA

Formato de `.claude/launch.json` en Windows:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "nombre-proyecto",
      "runtimeExecutable": "cmd",
      "runtimeArgs": ["/c", "cd nombre-proyecto && npm run dev"],
      "port": 3000
    }
  ]
}
```

> **Motivo**: En Claude Desktop/Windows, `npm` no esta disponible directamente en el PATH del entorno de herramientas. `cmd /c` resuelve el PATH correctamente.

### Comandos de una sola vez (instalar deps, migrar DB, build)
Estos si se ejecutan via Bash normal:
```bash
cd nombre-proyecto && npm install
cd nombre-proyecto && npm run migrate
cd nombre-proyecto && npm run build
```

### Puertos en Windows
- Matar procesos: `netstat -ano | findstr :PORT` + `taskkill /PID <pid> /F`
- Linux equivalente: `lsof -ti:PORT | xargs kill -9`

### Next.js — Versiones
- Usar **Next.js 15 o 16** (no 14)
- Next.js 16+: `proxy.ts` en raiz del proyecto (no `middleware.ts`)

## Herramientas de diseno
- **Figma/FigJam**: Solo usar cuando el usuario comparte una URL de Figma o lo pide explicitamente
