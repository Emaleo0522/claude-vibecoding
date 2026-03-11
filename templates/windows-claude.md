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
| frontend-developer | Read, Write, Edit, Bash, Engram MCP |
| backend-architect | Read, Write, Edit, Bash, Engram MCP |
| rapid-prototyper | Read, Write, Edit, Bash, Engram MCP |
| game-designer | Read, Write, Engram MCP |
| xr-immersive-developer | Read, Write, Edit, Bash, Engram MCP |
| evidence-collector | Read, Bash, Playwright MCP, Engram MCP |
| reality-checker | Read, Bash, Glob, Grep, Playwright MCP, Engram MCP |
| api-tester | Read, Bash, Engram MCP |
| performance-benchmarker | Read, Bash, Playwright MCP, Engram MCP |
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

## Preview servers — Windows (Claude Desktop)
Al levantar servidores de desarrollo locales con `preview_start`, usar este formato en `.claude/launch.json`:
- `"runtimeExecutable": "cmd"`
- `"runtimeArgs": ["/c", "cd nombre-proyecto && npm run dev"]`

Template listo en `templates/windows-launch.json`.

## Herramientas de diseño
- **Figma/FigJam**: Solo usar cuando el usuario comparte una URL de Figma o lo pide explícitamente
