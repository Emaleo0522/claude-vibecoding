# Sistema Vibecoding Híbrido

## Arquitectura

Este sistema usa un **orquestador central** (1 coordinador + 15 subagentes = 16 entidades). Los subagentes solo responden al orquestador, nunca entre sí.

### Pipeline (5 fases)
```
Fase 1  Planificación   → project-manager-senior
Fase 2  Arquitectura    → ux-architect + ui-designer + security-engineer (paralelo)
Fase 3  Dev ↔ QA Loop  → dev-agents ↔ evidence-collector (3 reintentos)
Fase 4  Certificación   → api-tester + performance-benchmarker + reality-checker
Fase 5  Publicación     → git (confirmación) → deployer (confirmación)
```

### Regla de oro
El orquestador **NUNCA** hace trabajo real (no lee código, no escribe código, no analiza arquitectura). Solo coordina. Cada token inline es contexto perdido.

## Gestión de contexto

### Handoffs mínimos
Los subagentes devuelven al orquestador **solo resúmenes cortos** (STATUS + archivos + issues). Nunca código completo ni contenido largo.

### Screenshots a disco
QA guarda screenshots en `/tmp/qa/` y pasa solo rutas, nunca imágenes inline.
> **Windows**: `/tmp/` funciona en bash (Git Bash lo mapea al temp de Windows). Sin cambios necesarios.

### Engram (memoria persistente)
- **Topic keys**: `{proyecto}/{tipo}` (ej: `mi-app/tareas`, `mi-app/qa-3`)
- **Lectura siempre en 2 pasos**: `mem_search` → `mem_get_observation` (nunca usar preview truncada directamente)
- **DAG State**: el orquestador guarda `{proyecto}/estado` después de cada fase para recuperación post-compactación

## Herramientas por agente

| Agente | Tools principales |
|--------|-------------------|
| orquestador | Agent (spawn subagentes), Engram MCP |
| project-manager-senior | Read, Write, Engram MCP |
| ux-architect | Read, Write, Engram MCP |
| ui-designer | Read, Write, Engram MCP |
| security-engineer | Read, Write, Engram MCP |
| frontend-developer | Read, Write, Edit, Bash, **Preview MCP**, Engram MCP |
| backend-architect | Read, Write, Edit, Bash, **Preview MCP**, Engram MCP |
| rapid-prototyper | Read, Write, Edit, Bash, **Preview MCP**, Engram MCP |
| game-designer | Read, Write, Engram MCP |
| xr-immersive-developer | Read, Write, Edit, Bash, **Preview MCP**, Engram MCP |
| evidence-collector | Read, Bash, Playwright MCP, Engram MCP |
| reality-checker | Read, Bash, Glob, Grep, Playwright MCP, Engram MCP |
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

## Autenticación estándar — Better Auth
- **Better Auth** es el sistema de auth por defecto para todos los proyectos nuevos
- Referencia completa: `~/.claude/agents/better-auth-reference.md`
- Agentes que lo usan: backend-architect (server), frontend-developer (client), rapid-prototyper (full-stack)
- Solo usar Clerk/Supabase Auth/JWT custom si el proyecto ya los tiene implementados

### Reglas críticas (validadas en producción)
- ⚠️ **Migración NO es automática**: siempre agregar `"migrate": "npx @better-auth/cli migrate"` al `package.json` y ejecutarlo antes del primer `npm run dev`
- ⚠️ **Next.js 16+**: usar `proxy.ts` con `export async function proxy()` — el archivo `middleware.ts` está deprecado

## Overrides Windows — Diferencias con Linux/Claude Code

> Estas instrucciones sobreescriben el comportamiento por defecto de los agentes cuando aplique.

### Servidores de desarrollo (agentes: frontend-developer, backend-architect, rapid-prototyper, xr-immersive-developer)

**NUNCA** arrancar servidores con `npm run dev` via Bash directamente.  
**SIEMPRE** usar `preview_start` del Claude Preview MCP.

Pasos obligatorios:
1. Crear o verificar `.claude/launch.json` en el directorio de trabajo con la configuración del proyecto
2. Llamar `preview_start` con el nombre definido en `launch.json`
3. Usar `preview_logs` para verificar que arrancó sin errores
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
Template listo en `templates/windows-launch.json`.

> **Motivo**: En Claude Desktop/Windows, `npm` no está disponible directamente en el PATH del entorno de herramientas. `cmd /c` resuelve el PATH correctamente.

### Comandos de una sola vez (instalar deps, migrar DB, build)
Estos sí se ejecutan via Bash normal:
```bash
cd nombre-proyecto && npm install
cd nombre-proyecto && npm run migrate
cd nombre-proyecto && npm run build
```

### Next.js — rapid-prototyper
- Usar **Next.js 15 o 16** (no 14)
- Next.js 16+: `proxy.ts` en raíz del proyecto (no `middleware.ts`)

## Herramientas de diseño
- **Figma/FigJam**: Solo usar cuando el usuario comparte una URL de Figma o lo pide explícitamente

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
- `{proyecto}/creative-assets` → inventario de assets generados (rutas + checksums)
- NO guardar binarios ni SVG completos en Engram — solo paths y metadata

### Variables de entorno requeridas
- `HF_TOKEN` — HuggingFace (registro gratis en hf.co) — para image-agent y logo-agent
- `REPLICATE_API_TOKEN` — Replicate (registro gratis, free credits) — para video-agent
