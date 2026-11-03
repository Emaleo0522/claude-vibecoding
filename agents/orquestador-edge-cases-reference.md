---
name: orquestador-edge-cases-reference
description: Edge cases del orquestador — Troubleshooting (puertos, permisos, SEO loop, Mixed Content), Project Enrollment (ambiguous_project flow, recovery_token, bootstrap), Graceful Degradation (Engram down, Playwright down, debugging pipeline fallido). Cargado bajo demanda cuando el orquestador detecta condición de error. Extraído de orquestador.md el 2026-05-19 para reducir boot tokens en flujos normales.
---

# Orquestador — Edge Cases y Graceful Degradation

> **Cuándo cargar este archivo**: el orquestador lo lee cuando se cumple AL MENOS UNO de estos triggers:
> - Subagente retorna `STATUS: fallido` o no retorna (timeout)
> - Error `ambiguous_project` al hacer `mem_save`
> - Engram MCP no responde (>10s) o retorna error
> - Playwright MCP no disponible (evidence-collector falla por screenshot)
> - Proyecto NUEVO sin `.engram/config.json` (primer enrollment)
> - User pide debug ("¿qué pasó con X?", "no anduvo Y")
> - Puerto ocupado / permisos Bash / Mixed Content detectado / api-spec faltante
>
> En flujo normal (todo va bien, proyecto existente, Engram OK, Playwright OK) → no cargar este archivo, ahorra ~1.6K tokens.

---

## Troubleshooting

- **Puerto ocupado**: indicar al subagente `lsof -ti:PORT && kill $(lsof -ti:PORT) || true` (Windows: `netstat -ano | findstr :PORT` + `taskkill /PID <pid> /F`)
- **Permisos Bash en background**: si subagente falla por permisos, ejecutar desde contexto principal
- **SEO → Frontend loop**: seo-discovery reporta issues → orquestador lanza frontend-developer → evidence-collector valida → seo-discovery re-verifica. **Máximo 2 iteraciones** (seo-discovery → fix → seo-discovery). Si después de 2 iteraciones el score no alcanza el mínimo, loguear issues pendientes en `{proyecto}/seo` y continuar a reality-checker con los issues documentados.
- **Subagente devuelve formato invalido**: pedir que reformatee usando su Return Envelope (max 2 intentos, luego escalar al usuario)
- **Engram timeout/lento**: si `mem_search` tarda >10s, verificar que Engram MCP server esta corriendo. Fallback: usar disco (`.pipeline/`)
- **Subagente crashea mid-tarea**: verificar Engram (`mem_search("{proyecto}/tarea-{N}")`) — si guardo resultado, continuar con QA. Si no guardo, re-delegar
- **Mixed Content en Fase 4**: si reality-checker detecta `http://` en codigo, verificar que el backend tiene HTTPS antes de re-deployar
- **api-spec faltante en Fase 4**: pedir a backend-architect que lo genere como tarea dedicada (no como parte de otra tarea)

---

## Project Enrollment (OBLIGATORIO antes del primer mem_save de un proyecto nuevo)

Desde Engram v1.15.9+ la validación rechaza `mem_save` con `project=` para proyectos no enrolled en el store/session/config. Para proyectos NUEVOS (sin git remote conocido ni `.engram/config.json`), el primer save fallará con `ambiguous_project` error.

**Acción obligatoria del orquestador en Fase 1, ANTES del primer `mem_save({proyecto}/...)`** (que típicamente es `{proyecto}/intent` en Paso 0):

1. Crear el directorio del proyecto si no existe: `mkdir -p {project_dir}`
2. Crear `.engram/config.json` para enrollment:
   ```bash
   mkdir -p {project_dir}/.engram
   echo '{"project_name": "{proyecto}"}' > {project_dir}/.engram/config.json
   ```
3. (Opcional, recomendado) inicializar git si va a ser un repo: `cd {project_dir} && git init`
4. Confirmar enrollment leyendo el archivo: `cat {project_dir}/.engram/config.json`
5. Recién entonces hacer el primer `mem_save` con `project: "{proyecto}"`

**Si el primer mem_save de todos modos retorna `ambiguous_project` error** (caso edge):
- El error trae `recovery_token` y `available_projects` en el envelope
- Reintentar el `mem_save` con: `project_choice_reason: "user_selected_after_ambiguous_project"`, `project: "{proyecto}"`, y el `recovery_token` recibido
- El reintento debe hacerse en la misma sesión (token corto-vivido)

**Para proyectos EXISTENTES** (ya con buckets en Engram, ej: `vetconnect`, `kahntus`, `dashboard-pm`): este paso es **innecesario** — el bucket ya está enrolled. Solo aplicar para proyectos cuyo nombre nunca apareció antes en `engram projects list`.

**Verificación rápida antes del Paso 0**: `engram projects list 2>/dev/null | grep -w "{proyecto}"` — si retorna 0 resultados, el proyecto es nuevo y necesita enrollment.

---

## Graceful Degradation

### Dual-Write (ver pipeline-reference.md § "Reglas clave del pipeline" y Boot Sequence §0b)
Cajones con dual-write obligatorio: `estado`, `tareas` (SIEMPRE) + `css-foundation`, `design-system`, `security-spec` (post-Fase 2). Estructura en `{project_dir}/.pipeline/`. Crear con `mkdir -p` al primer write. Agregar `.pipeline/` a `.gitignore`.

### Si Engram es inalcanzable (fallback completo)
Engram es el sistema de memoria persistente. Si falla, el pipeline NO puede operar normalmente.
1. **Pasar detalles INLINE** a los subagentes (inflacion temporal de contexto)
2. Subagentes guardan resultados en disco: `{project_dir}/.pipeline/{cajon-name}.md`
3. Cuando Engram se recupere, migrar archivos de disco a cajones Engram
4. **Limite**: maximo 5 tareas en modo degradado antes de pausar y avisar al usuario
5. Marcar en DAG State (si es posible): `engram_degraded: true`

### Si Playwright MCP no está disponible
Sin Playwright, no hay QA visual (evidence-collector no puede capturar screenshots).
1. Ejecutar checks de código solamente: `npm run build` (verifica compilación), `npx eslint .` (lint), `grep -r "http://" --include="*.ts*"` (Mixed Content)
2. Marcar tareas como `qa_mode: "code-only"` en DAG State
3. reality-checker opera sin screenshots — reportar con confianza reducida
4. **Avisar al usuario**: "QA visual no disponible. Mixed Content y regresiones visuales no serán detectados. Se recomienda testeo manual antes de deploy."

### Debugging de pipeline fallido
Para reconstruir qué pasó:
1. `mem_search("{proyecto}/estado")` → fase actual, tareas completadas, fallos
2. `/tmp/qa/` → screenshots por número de tarea
3. `mem_search("{proyecto}/tarea-{N}")` → resultado de implementación
4. `mem_search("{proyecto}/qa-{N}")` → feedback de QA
5. `git log --oneline -5` → si se llegó a Fase 5
