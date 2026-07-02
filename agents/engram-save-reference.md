---
name: engram-save-reference
description: Protocolo completo "guarda en engram" cross-PC (7 pasos, whitelist de buckets) + protocolo de save robusto anti silent-fail cloud (3 capas) + contrato lifecycle needs_review. Cargado on-demand cuando el usuario pide guardar memoria ("guardá", "guardalo", "remember this"), al diagnosticar problemas de sync cloud, o al cerrar sesión con saves. Las invariantes core (project= explícito, scope=personal, verify post-save, prohibición SSH) viven en CLAUDE.md global — esta ref tiene el flujo completo. Extraído de CLAUDE.md global el 2026-07-02 para reducir boot tokens (plan Engram #3521).
---

# Engram Save Reference — protocolos completos de escritura

> Fuente canónica del flujo de guardado. El resumen con invariantes vive en CLAUDE.md global § "Gestión de contexto". Si esto cambia, actualizar el resumen en sincronía.

## Protocolo "guarda en engram" — cross-PC garantizado (modo Claude normal)

Cuando el usuario diga "guarda en engram", "guardalo", "guardá esto", "remember this" o similar, ejecutar en orden:

1. **Determinar tema** desde contexto reciente de la conversación (qué se estuvo discutiendo)
2. **Decidir el `project=` ANTES de buscar** (constraint cloud whitelist):
   - Si el tema es específico de un proyecto existente → `project="saldoar"`, `project="claude-vibecoding"`, etc. (debe ser uno YA enrolled en cloud — ver `engram projects list`)
   - Si es info **truly personal cross-PC** (preferencias, tareas multi-proyecto, decisiones globales) → `project="personal"` (bucket limpio, agregado al cloud whitelist el 2026-05-15)
   - Si es **info de ideas/inbox** → `project="ideas-vault"`
   - Si es **info de efectos/reels/codepen** → `project="reel-vault"` o `codepen-vault`
   - Si es **info de tooling/scripts/utilities** → `project="tooling-vault"`
   - Si es **descubrimiento cross-proyecto** → `project="discoveries"`
   - **Para nombres nuevos no en la lista actual**: agregar a `ENGRAM_CLOUD_ALLOWED_PROJECTS` en el server Oracle vía SSH. Sin eso, el cloud retorna 403 forbidden. La lista actual incluye los proyectos existentes + 6 buckets clean nuevos (personal, cross-pc, ideas-vault, reel-vault, tooling-vault, discoveries). Ver `/opt/engram-cloud/.env` en server.
3. **Buscar similares** antes de escribir:
   ```
   results = mem_search(tema, project="<el-decidido-en-paso-2>", scope="personal")
   ```
4. **Decidir acción**:
   - **Si hay match relevante (similitud alta + mismo dominio)**:
     - `mem_update(observation_id, ...)` si es refinamiento o corrección
     - `mem_save(topic_key="{family}/{nuevo-slug}", ...)` si es nuevo subtema de la misma familia
     - `mem_judge` si el nuevo contradice un existente
   - **Si NO hay match**: `mem_save` con `topic_key` nuevo y namespace lógico (ej `saldoar/proveedores/reunion-15hs`, `vibecoding/refero-integration`)
5. **SIEMPRE `scope="personal"`** — los saves scope=project NO auto-syncan al cloud (validado 2026-05-15). El cloud sync funciona scope-agnostic pero el filtro por defecto del MCP usa scope.
6. **`project=` EXPLÍCITO en mem_save Y mem_search** — el MCP auto-detecta project del cwd del server (varía por PC según donde abriste Claude Desktop). Sin project explícito, cada PC routea a un bucket distinto y los saves no se cruzan aunque el cloud los tenga. **Esto es crítico para cross-PC retomable**.
7. **Confirmar al usuario** qué topic_key + project se usaron y por qué (linking vs nuevo).

**Razón**: validado empíricamente 2026-05-15 — obs guardada en casa con auto-detect `project=system32` → invisible desde pc004 con auto-detect distinto. Solo después de `mem_search("...", project="<el-correcto>")` explícito desde la otra PC, la obs aparece.

**Cloud allowlist** (resuelto self-hosted 2026-05-15): el server Oracle Cloud (`161.153.203.83`) tiene `ENGRAM_CLOUD_ALLOWED_PROJECTS` en `/opt/engram-cloud/.env`. Para agregar un bucket nuevo: SSH al server, editar `.env`, `docker compose up -d cloud`. Backup automático por convención `.env.bak.YYYYMMDD-pre-{razon}`. Issue upstream para auto-allow opt-in: github.com/Gentleman-Programming/engram

**Anti-patrón a evitar**: dejar que el MCP auto-detecte project del cwd. SIEMPRE pasar `project=` explícito en ambos `mem_save` y `mem_search` cross-PC. Si necesitás un bucket personal global, usar `project="system32"` (de-facto convention) hasta que upstream permita nombres custom.

## Protocolo de save robusto — anti silent-fail cloud (2026-05-18)

Validado empíricamente: `mem_save` puede retornar OK al cliente y aun así NUNCA llegar al cloud si la observation viola constraints del cloud server (HTTP 500 silencioso). Las obs quedan local-only e invisibles cross-PC hasta que se reparen manualmente.

**Capa 1 — Pre-save (obligatorio antes de TODO `mem_save`)**:
1. `title` **NUNCA es opcional**. Si dudo, formato: `{tema-corto} — {fecha YYYY-MM-DD}`. Mínimo 8 chars, máximo 80.
2. `content` mínimo 20 chars con info real. NO guardar placeholders ("WIP", "TBD", "(empty)").
3. `topic_key` con namespace `{proyecto}/{slug}` o `{family}/{slug}`.
4. `project=` explícito (whitelist del cloud) — NUNCA dejar auto-detect del cwd.
5. `scope="personal"` para cross-PC (regla validada 2026-05-15).

**Capa 1b — Whitelist gate (solo si el project es desconocido)**:

Lista sintética de buckets más usados (verificar con `engram projects list` si tu proyecto no está acá):
- `claude-vibecoding` (sistema)
- `saldoar`, `saldoar-outreach`
- `vetconnect`, `kahntus`, `kahntus-portfolio`
- `dashboard-pm`
- `personal`, `ideas-vault`, `discoveries`
- `system32`
- `cross-claude-mailbox` (canal asíncrono entre instancias — ver `cross-claude-mailbox-reference.md`)

Si tu proyecto NO está en esta lista → correr `engram projects list | grep -w "{nombre}"` antes del primer save. Si no aparece, es proyecto nuevo (Path B bootstrap CLI).

- Si confirma 403/desconocido: **NO inventar** un bucket. Preguntar al usuario: (a) usar uno existente que aplique, o (b) autorizar agregar el nuevo a la whitelist (requiere SSH al server + edit `/opt/engram-cloud/.env` + `docker compose up -d cloud` + backup `.env.bak.YYYYMMDD-pre-{razon}`).
- **NUNCA hacer SSH + restart sin confirmación EXPLÍCITA del usuario** — toca infra del server productivo. "Explícita" = el usuario dijo literalmente *"sí, hacé el SSH"* o referencia inequívoca a la acción concreta. Un *"OK dale"* a una pregunta genérica (ej: *"¿activamos el bucket?"*) **NO es autorización SSH**. Si la respuesta fue ambigua, preguntar explícitamente: *"¿Confirmás que vas a hacer SSH al server Oracle + editar .env + docker compose up -d cloud?"* — esperar respuesta literal afirmativa.

**Capa 2 — Post-save verify (1 search barato, obligatorio)**:
Después de cada `mem_save` exitoso:
```
verify = mem_search(topic_key_exacto, project=mismo_project, limit=1)
if verify retorna empty → loguear y avisar al usuario
```
Confirmar al usuario: *"Guardado #ID title='X' project=Y topic_key=Z"*. Sin la confirmación, no asumir que se guardó.

**Capa 3 — Cloud sync gate (antes de cerrar sesión / cada N saves)**:
Si guardaste memoria en esta sesión, antes de "dar por terminado":
```bash
engram cloud upgrade doctor --project <proyecto>
```
- `status=ready` → OK
- `status=blocked, class=repairable` → `engram cloud upgrade repair --project X --apply` + `engram sync --cloud --project X`
- `status=blocked, class=blocked` → identificar la obs problemática (`title required` o `content required`), `mem_update` con título/content válido, repetir doctor
  - **Excepción `relation/upsert`** (2026-05-18): si el `message` contiene `"relation"/"upsert"` (mutation legacy no soportada por el cloud actual), NO es reparable desde el cliente. Loguear WARN, cerrar sesión OK. Bug upstream engram cloud — el hook `engram-cloud-sync-on-stop.sh` ya filtra este caso defensivamente.

**Anti-patrones detectados (no repetir)**:
- ❌ `mem_save(content=..., type="decision")` sin `title=` → cloud rechaza 500
- ❌ `mem_save(title="", ...)` con title vacío string → cloud rechaza 500
- ❌ Pensar que `mem_save` exitoso = "está en el cloud". Solo significa "está en SQLite local".

**Hook `engram-cloud-sync-on-stop.sh` (patched 2026-05-18)**: corre `engram cloud upgrade doctor` pre-flight y aplica `repair --apply` automáticamente si hay observations reparables antes del push. Regex de detección de errores extendido para incluir `status 500`, `title is required`, `content is required`, `transport_failed`, `upgrade_blocked`, `upgrade_repairable` (antes solo capturaba 403/forbidden). Filtro defensivo para `relation/upsert` (bug upstream cloud).

## Apéndice — Contrato de lifecycle de memoria `needs_review` (2026-06-14)

Adaptado de gentle-pi v0.5.0. **Availability-gated**: funciona hoy aunque nuestro Engram (cloud Oracle v1.16.1) aún no exponga la feature; se activa solo cuando actualicemos a ≥v1.16.2 (`mem_review` vive en el profile `--tools=agent` que ya usamos).

1. **Preferir `mem_review` (action `list`) si está disponible** → si no existe/no responde, fallback a `mem_search`/`mem_context` **sin fallar la tarea** (degradación graceful).
2. **`needs_review` = contexto stale**, NO verdad. Una observación marcada `needs_review` (su `review_after` venció) se trata como **sospechosa: verificar contra evidencia actual antes de confiar en ella**, y si es interpretable, surfacearla al usuario (mapea a la doctrina de Checkpoint humano).
3. **NUNCA auto-marcar `mark_reviewed`** sin confirmación explícita del usuario o un comando dedicado de mantenimiento de memoria. Marcar revisado es una decisión del usuario, no del agente.
4. **Caveat cross-PC**: `mark_reviewed` es local-only (no sincroniza casa↔pc004 todavía, validado 2026-06-14). No asumir que revisar en una PC se refleja en la otra.
