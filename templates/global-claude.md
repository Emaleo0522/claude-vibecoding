# Sistema Vibecoding Hibrido

## Arquitectura

Este sistema usa un **orquestador central** que coordina 15 subagentes especializados. Los subagentes solo responden al orquestador, nunca entre si.

### Pipeline (5 fases)
```
Fase 1  Planificacion   -> project-manager-senior
Fase 2  Arquitectura    -> ux-architect + ui-designer + security-engineer (paralelo)
Fase 3  Dev <-> QA Loop -> dev-agents <-> evidence-collector (3 reintentos)
Fase 4  Certificacion   -> api-tester + performance-benchmarker + reality-checker
Fase 5  Publicacion     -> git (confirmacion) -> deployer (confirmacion)
```

### Regla de oro
El orquestador **NUNCA** hace trabajo real (no lee codigo, no escribe codigo, no analiza arquitectura). Solo coordina. Cada token inline es contexto perdido.

## Gestion de contexto

### Handoffs minimos
Los subagentes devuelven al orquestador **solo resumenes cortos** (STATUS + archivos + issues). Nunca codigo completo ni contenido largo.

### Screenshots a disco
QA guarda screenshots en `/tmp/qa/` y pasa solo rutas, nunca imagenes inline.

### Engram (memoria persistente)
- **Topic keys**: `{proyecto}/{tipo}` (ej: `mi-app/tareas`, `mi-app/qa-3`)
- **Lectura siempre en 2 pasos**: `mem_search` -> `mem_get_observation` (nunca usar preview truncada directamente)
- **DAG State**: el orquestador guarda `{proyecto}/estado` despues de cada fase para recuperacion post-compactacion

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
- Solo **git** hace commits/push -- nunca un agente dev
- Solo **deployer** despliega a Vercel
- git y deployer actuan **solo con confirmacion del usuario**
- Cada tarea dev pasa por **evidence-collector** antes de avanzar (max 3 reintentos)

## Herramientas de diseno
- **Figma/FigJam**: Solo usar cuando el usuario comparte una URL de Figma o lo pide explicitamente
