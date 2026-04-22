# Upgrade Log — Context Management + Best Practices

## Audit Completo 10 Fases — 2026-04-22 ✅

### Summary
Audit arquitectonico completo post-fix 2026-04-19, expandido de 6 a 10 fases. Incluye 4 fases nuevas no cubiertas previamente: Distribution Integrity, Install Script E2E, README Coherence, UPGRADE_LOG Management. Identifico drift critico en templates y install docs que un usuario nuevo hubiera recibido al instalar.

### Resultado por fase

| Fase | Subject | Status | Findings |
|------|---------|--------|----------|
| 1 | Sync repo ↔ local | ✅ FIXED | 6 hooks + 4 agents out of sync (repo newer, local outdated) |
| 2 | Hooks + audit-system + engram-sync E2E | ✅ PASS | 11/11 HEALTHY, 13 hooks, engram-sync pushed today |
| 3 | MCPs + tokens + deadlocks | ✅ PASS | 4 MCPs (engram/context7/playwright/pixel-bridge), anti-loop present, deploy_url consistent |
| 4 | External integrations (GitHub/Vercel/CodePen/Engram-sync) | ✅ PASS | gh auth OK, vercel OK, 8 vault entries, engram.db 2.9MB |
| 5 | Regression + Windows + pixel-bridge + protocol | ✅ PASS | 25/25 protocol compliant, Windows overrides via CLAUDE.md |
| 6 | self-auditor + Engram + MEMORY | ✅ PASS | self-auditor present, Engram healthy, 15 memory files |
| 7 | Distribution Integrity (NEW) | ✅ FIXED | templates/global-claude.md + windows-claude.md obsoletos (sin Intent Clarifier, anti-generic) |
| 8 | Install script E2E (NEW) | ✅ PASS | set -e, idempotent (.bak), __CLAUDE_HOME__ placeholder, no hardcoded user |
| 9 | README coherence (NEW) | ✅ PASS | 38 agents/13 hooks/13 refs/8 CSVs verificados, no broken links |
| 10 | UPGRADE_LOG management (NEW) | ✅ FIXED | Entry agregada para audit completo |

### Drift fixes aplicados

**1. Hooks desincronizados (repo → local)**
- `~/.claude/hooks/` tenia 6 hooks viejos (audit-system, cost-tracker, engram-sync, pre-compact-engram, quality-gate, suggest-compact)
- Repo tenia las versiones con fixes Medium del backlog 2026-04-19 (YAML parser robusto, secret regex env-aware, atomic log writes)
- Sincronizados los 6 hooks a local

**2. Agents desincronizados (repo → local)**
- `~/.claude/agents/` tenia 4 agents viejos (brand-agent, frontend-developer, pipeline-reference, ui-designer)
- Repo tenia las versiones con Intent Clarifier + anti-generic + QA hardening del 2026-04-19
- Sincronizados los 4 agents a local

**3. Templates obsoletos (critico)**
- `templates/global-claude.md` y `templates/windows-claude.md` tenian version pre-2026-04-19 (sin Intent Clarifier, Visual Direction Checkpoint, anti-generic guardrails, QA hardening)
- Impacto: usuarios nuevos corriendo `install/linux.sh` recibian CLAUDE.md viejo aunque el repo README anunciaba las features nuevas
- Fix: templates overwriteados con CLAUDE.md actual (identicos ahora)

**4. install/windows.md desactualizado**
- Decia "Resultado esperado: HEALTHY (6/6)" cuando el audit-system ahora devuelve 11/11
- Fix: actualizado a "HEALTHY (11/11)"

### Nuevas fases introducidas

La plantilla de audit original (6 fases) cubria arquitectura interna pero no validaba:

- **Fase 7 Distribution Integrity**: que lo instalado por el installer coincida con lo advertido por README. Esencial para usuarios nuevos.
- **Fase 8 Install Script E2E**: idempotencia (re-install sin romper), placeholders funcionan, fail-fast con `set -e`, sin hardcoded user info.
- **Fase 9 README Coherence**: claims verificables (contadores exactos, links no rotos, comandos que funcionan).
- **Fase 10 UPGRADE_LOG Management**: cada cambio sistemico queda documentado para trazabilidad.

Estas 4 fases deberian correr en cada audit futuro — son las que atrapan la divergencia repo-templates que tuvimos esta vez.

### Backup de seguridad
- `~/.claude/backups/mini-audit-2026-04-22/` (1MB, pre-sync completo de hooks + agents + CLAUDE.md + settings.json)
- `~/.claude/.audit-2026-04-19-backup/` del audit previo, preservado

### Validacion final
- `node ~/.claude/hooks/audit-system.js` → 11/11 HEALTHY
- `diff -rq` repo/hooks vs local/hooks → 0 files differ
- `diff -rq` repo/agents vs local/agents → 0 files differ
- `diff -q` CLAUDE.md vs templates/global-claude.md → identicos
- `diff -q` CLAUDE.md vs templates/windows-claude.md → identicos

### Recomendacion operativa
Cada cambio a `CLAUDE.md`, `agents/`, o `hooks/` debe propagarse simultaneamente a:
- `~/.claude/` (local runtime)
- `templates/global-claude.md` + `templates/windows-claude.md` (installer targets)
- `UPGRADE_LOG.md` (trazabilidad)

Sin esto, el installer queda desincronizado del estado actual del repo.

---

## v2.2 — Context Window Optimization — 2026-04-08

### Summary
Two targeted improvements to context window management, inspired by analysis of [MemPalace](https://github.com/milla-jovovich/mempalace) architecture. Zero new dependencies, zero protocol changes for sub-agents.

### Changes

**1. PreCompact Blocking (pre-compact-engram.js)**
- Hook now emits "COMPACTION IMMINENT -- SAVE STATE NOW" via stderr before compaction
- Instructs the orchestrator to do dual-write (Engram + disk) before context is lost
- Detects active pipeline by reading `.pipeline/estado.yaml` for current phase/task
- Includes pipeline status in the stderr message for context
- Previous behavior: only saved metadata snapshot (tool count, cwd) passively
- New behavior: actively forces state preservation before compaction

**2. Progressive DAG State Loading (orquestador.md Boot Sequence)**
- Boot Sequence now loads DAG State in 2 levels: light (~50-100 tokens) vs full (~500-2000 tokens)
- Light boot: fase_actual + tarea_actual/total + stack 1-liner + ultimo_save
- Full boot: only when orchestrator needs to make coordination decisions (phase transitions, escalations, scope changes)
- Orchestrator retains observation_id for on-demand re-reads, discards full YAML from context
- No changes needed in sub-agents -- they still read their specific drawers in full via 2-step pattern

### Files modified
- `hooks/pre-compact-engram.js` — rewritten with pipeline detection + stderr blocking message
- `agents/orquestador.md` — Boot Sequence rewritten with 2-level progressive loading + PreCompact v2.2 note
- `CLAUDE.md` — 3 sections updated (Carga progresiva, hook table, Resiliencia Engram)
- `README.md` — New "Context Window Management (v2.2)" section + hook table updated

### Audit result
6/6 PASS (syntax, consistency across 3 files, settings.json integration, agent-protocol compatibility, cross-references)

---

## Auditoria v3 — 2026-03-30

### Resumen
Auditoria arquitectonica completa del sistema post-adicion de codepen-explorer y agent-protocol. 18 fixes aplicados en 15 archivos. Re-auditoria verifico 0 issues pendientes.

### Fixes HIGH (4)
- **H1**: codepen-explorer migrado de Chrome MCP (no configurado) a Playwright MCP
- **H2**: CLAUDE.md conteo corregido "1+21=22" → "1+22=23". Seccion "Referencias tecnicas" agregada (7 archivos). codepen-explorer en tabla de coordinacion.
- **H3**: settings.local.json — `rm:*` restringido a patrones seguros, `sudo` → ask, permisos muertos eliminados, `mv:*` y `browser_install` agregados
- **H4**: MEMORY.md alineado con realidad (3 cajones creativos separados)

### Fixes MEDIUM (9)
- **M1**: STATUS utilitarios (OK/SAVED/FOUND/NOT_FOUND/BLOCKED) en agent-protocol.md y orquestador validacion
- **M2**: Camino muerto "Fase 2B paralela" eliminado. Step numbers CodePen corregidos (1-6)
- **M3**: DAG State: a11y/bundle/lint → null defaults. Bloque `codepen:` agregado. costs con mem_save explicito
- **M4**: `project` param en mem_save de 5 agentes Fase 3-4 (evidence-collector, reality-checker, api-tester, performance-benchmarker, seo-discovery)
- **M6**: DrawSVGPlugin "GSAP Club required" → "incluido desde 2025"
- **M8**: Rollback en git.md (git revert) y deployer.md (vercel promote)
- **M9**: evidence-collector retry self-guard (rechaza intento > 3)
- agent-protocol.md regla 1 con Windows guard
- Recovery post-compactacion simplificado

### Fixes LOW (2 aplicados, 3 mantenidos por diseno)
- **L5**: ux-architect description "junto con" → "ANTES de"
- **L6/L7**: Monorepo detection 4x y retry block 7x MANTENIDOS — diseno hub-and-spoke requiere agentes autocontenidos

### Re-auditoria (3 fixes adicionales)
- `Bash(done)` remanente eliminado de settings.local.json
- codepen-explorer tool table en CLAUDE.md expandida a 6 tools Playwright
- security-engineer en orquestador: "nada" → `{proyecto}/tareas`

### Archivos modificados
agent-protocol.md, api-tester.md, codepen-explorer.md, deployer.md, evidence-collector.md, git.md, orquestador.md, performance-benchmarker.md, reality-checker.md, seo-discovery.md, ux-architect.md, CLAUDE.md (x3 con templates), settings.local.json

### Sync repo (2026-03-30)
- README.md reescrito (conteos, codepen-explorer, coordinacion, topic keys, refs)
- install/linux.sh conteos corregidos (23+7)
- install/windows.md conteos corregidos (23+7)
- UPGRADE_LOG.md actualizado

---

## Fecha: 2026-03-23

---

## Fase 1: Context Management Foundation ✅ COMPLETADA

### 1.1 Boot Sequence ✅
- Archivo: agents/orquestador.md (linea 12)
- Agrega deteccion automatica de proyecto existente al inicio de cada interaccion
- Busca en Engram antes de asumir proyecto nuevo
- Incluye mem_session_start obligatorio

### 1.2 Session Lifecycle ✅
- Archivo: agents/orquestador.md (linea 58)
- Tres fases: arranque (session_start), durante (saves proactivos), cierre (session_summary + session_end)
- Pre-resolucion de topic keys incluida aqui (cache de observation_ids)
- Regla de 3 delegaciones: si pasaron 3+ sin guardar DAG → guardar ahora

### 1.3 DAG State granular ✅
- Archivo: agents/orquestador.md (seccion DAG State)
- Campos nuevos: tarea_actual, ultimo_save, drawer_ids, backup_disk
- Cambio de "guardar por fase" a "guardar por tarea completada"
- Backward-compatible: campos nuevos son opcionales en YAML

### 1.4 Context Health Check ✅
- Archivo: agents/orquestador.md (linea 724)
- Checklist de 3 puntos antes de cada delegacion en Fase 3
- Previene perdida de progreso si compactacion ocurre mid-delegacion

### 1.5 Proactive Save Mandate ✅
- Archivo: agents/orquestador.md (en seccion Engram)
- Define formato discovery: What/Why/Where/Learned
- Topic key: {proyecto}/discovery-{descripcion-corta}
- Instruccion para subagentes de guardar hallazgos inmediatamente

---

## Fase 2: Agent Communication Protocol ✅ COMPLETADA

### 2.1 Return Envelope Standard ✅
- Archivo: agents/orquestador.md (linea 636) + 21 agentes
- 4 formatos: Dev, QA, Fase4, Fase5
- Cada agente tiene su copia del formato correcto

### 2.2 Canonical 2-step Read ✅
- Archivo: CLAUDE.md (seccion Engram)
- Bloque de pseudocodigo unico de referencia
- Disponible para todos los agentes

### 2.3 Proactive Save en cada agente ✅
- 21 archivos de agentes actualizados
- Seccion "Proactive saves (discoveries)" con formato mem_save
- Verificado: 21 archivos tienen la seccion

---

## Fase 3: Token Optimization ✅ COMPLETADA

### 3.1 Pre-resolucion topic keys ✅
- Integrado en Session Lifecycle (1.2)
- Cache de observation_ids en DAG State (campo drawer_ids)
- Subagentes reciben obs_id directamente, saltan mem_search

### 3.2 Handoff optimizado ✅
- Archivo: agents/orquestador.md (Fase 3, paso 3)
- Formato compacto con obs_ids pre-resueltos
- Referencia a Return Envelope en vez de repetir formato

---

## Fase 4: Robustness ✅ COMPLETADA

### 4.1 Dual-write cajones criticos ✅
- Archivo: agents/orquestador.md (seccion Graceful Degradation)
- estado + tareas se escriben en Engram + disco ({project_dir}/.pipeline/)
- Fallback: si Engram falla → leer de disco

### 4.2 Inter-session continuity ✅
- Archivo: CLAUDE.md (seccion "Continuidad entre sesiones")
- Protocolo para retomar proyecto en nueva conversacion
- Cualquier persona puede retomar leyendo DAG State

---

## Archivos modificados (resumen)

| Archivo | Cambios aplicados |
|---------|------------------|
| agents/orquestador.md | Boot Sequence, Session Lifecycle, DAG granular, Health Check, Proactive Save, Return Envelope, Handoff optimizado, Dual-write |
| CLAUDE.md | Canonical 2-step read, Inter-session continuity, DAG por tarea, Proactive saves, Dual-write |
| 21 agentes restantes | Proactive saves + Return Envelope (formato por tipo) |

## Verificacion

- [x] 21 agentes con "Proactive saves": confirmado
- [x] 22 agentes con "Return Envelope": confirmado (21 + orquestador)
- [x] Boot Sequence en orquestador: confirmado
- [x] Session Lifecycle en orquestador: confirmado
- [x] Canonical read block en CLAUDE.md: confirmado
- [x] Inter-session continuity en CLAUDE.md: confirmado
- [x] 23 archivos copiados a ~/.claude/agents/: confirmado
- [x] CLAUDE.md copiado a ~/CLAUDE.md: confirmado

---

## Fix Arquitectura 2026-04-19 — Anti-Generic + QA Hardening ✅

**Trigger**: auditoría reveló que el pipeline podía aprobar proyectos con landing visualmente genérico Y bugs de auth sin detectar ninguno (caso VetConnect). 7 fases sistémicas para cerrar los 2 agujeros.

### Fase 1: Intent Clarifier Layer ✅
- Archivo: agents/orquestador.md (FASE 1 Paso 0, +162 líneas)
- Heurística clarity score 0-10 (word count + design vocab + referencias + features)
- 6 preguntas con opciones múltiples (Q1 tipo, Q2 industria dinámica, Q3 mood preset, Q4 referencia opcional, Q5 originalidad, Q6 audiencia)
- Q3 + Q5 obligatorias — bloquea "decidí vos" en proyectos UI
- Mapping directo a style-presets.csv rows (8 presets)
- Nuevo topic_key: `{proyecto}/intent` con anti_patterns_HIGH heredados

### Fase 2: Visual Direction Checkpoint polimórfico ✅
- Archivo: agents/orquestador.md (Fase 2 Paso 1.5a/b/c, reescrito)
- Extractor polimórfico — 6 fuentes: figma (detecta raster-only), image, url_website, brand_textual, preset, none
- Pre-fill obligatorio desde intent (no arranca de cero)
- Schema extendido: reference_for_qa, extracted_palette, extracted_typography, awesome_design_md_refs
- WebFetch automático a awesome-design-md según mood_preset (tokens abstractos, nunca logos)
- Eliminada ruta "decidí vos"

### Fase 3: brand-agent schema v2 ✅
- Archivo: agents/brand-agent.md (326 → 440 líneas)
- Lee intent + visual-direction con 2-pasos obligatorio
- Deriva colors/typography de extracted_palette si extraction_status=success (no inventa)
- brand.json schema_version=2: mood_vector (8 dim), reference_ids, anti_patterns_HIGH ejecutables, typography_pair, extraction_metadata
- Validación anti-genérico pre-return (FAIL si Inter en mood editorial, si teal en mood warm, etc.)

### Fase 4: Guardrails anti-generic ejecutables ✅
- Archivo: agents/ui-designer.md (313 → 404 líneas)
  - Paso 0e SaaS Teal Default Detector con 6 reglas T1-T6
  - AUTO_AUDIT pre-return obligatorio
- Archivo: agents/frontend-developer.md (583 → 661 líneas)
  - Pre-return Audit con 5 grep commands sobre código generado
  - Taste-skill dials → Tier de animación (1/2/3) + constraints de layout/density
  - AUTO_AUDIT en Return Envelope

### Fase 5: QA Hardening — 9 capas de defensa ✅
- Archivo: agents/evidence-collector.md (311 → 501 líneas)
  - Paso 4b AUTO_AUDIT verification upstream
  - Paso 4c Visual Fidelity LLM-as-judge (5 dims, threshold ≥7/10)
  - Paso 4d E2E flows obligatorios (signup→login→dashboard→logout, error states)
  - Paso 4e Network inspection OBLIGATORIA (antes opcional)
  - Paso 4f Testing contra deploy_url
  - Return Envelope: VISUAL_FIDELITY, NETWORK_AUDIT, E2E_FLOWS, FAIL_TYPE
- Archivo: agents/reality-checker.md (420 → 601 líneas)
  - Default STRICT NEEDS WORK con evidencia positiva citada
  - Paso 2B False Positive Guardrail (re-ejecuta 2-3 qa-{N} PASS)
  - Paso 4B Mixed Content DINÁMICO (no grep estático)
  - Paso 8 Design Tools Usage Audit (verifica intent, VDC, brand v2, AUTO_AUDITs)
  - Paso 9 Evidence Trail Mandatory (cada PASS cita path/URL/log)
- Archivo: agents/api-tester.md
  - ESCALATE si api-spec missing (antes fallback silencioso a tareas.md)
  - Testing contra deploy_url si existe
- Archivo: agents/performance-benchmarker.md
  - PageSpeed Insights contra deploy_url OBLIGATORIO cuando existe

### Archivos modificados (resumen fix 2026-04-19)

| Archivo | Δ líneas | Cambio clave |
|---------|----------|--------------|
| orquestador.md | +325 | Intent Clarifier + VDC polimórfico |
| pipeline-reference.md | +81 | Docs Intent + anti-generic + QA hardening |
| brand-agent.md | +114 | Lee Engram + schema v2 |
| ui-designer.md | +91 | 6 reglas T1-T6 + AUTO_AUDIT |
| frontend-developer.md | +78 | Pre-return audit + dials |
| evidence-collector.md | +190 | 4b-f: AUTO_AUDIT, Visual Fidelity, E2E, Network, deploy_url |
| reality-checker.md | +181 | 2B False Positive + 4B dinámico + 8 + 9 |
| api-tester.md | +13 | ESCALATE + deploy_url |
| performance-benchmarker.md | +20 | PSI deploy_url |
| CLAUDE.md | +35 | Secciones Intent Clarifier + Anti-Generic + QA |

**Total**: ~1128 líneas añadidas al pipeline.

### Verificación

- [x] Intent Clarifier con heurística clarity score operativo
- [x] Visual Direction Checkpoint pre-filleado obligatorio
- [x] brand.json schema v2 implementado
- [x] ui-designer AUTO_AUDIT con 6 reglas T1-T6
- [x] frontend-developer Pre-return Audit con 5 grep checks
- [x] evidence-collector Visual Fidelity LLM-as-judge
- [x] evidence-collector E2E flows obligatorios en auth/CRUD
- [x] reality-checker False Positive Guardrail
- [x] reality-checker Mixed Content dinámico
- [x] reality-checker Design Tools Usage Audit
- [x] reality-checker Evidence Trail Mandatory
- [x] api-tester ESCALATE sin api-spec
- [x] performance-benchmarker deploy_url PSI

**Nuevos topic keys en Engram**:
- `{proyecto}/intent` (nuevo)
- `{proyecto}/visual-direction` (schema extendido)
- `{proyecto}/branding` (schema v2)
- `{proyecto}/design-system` (+AUTO_AUDIT)
- `{proyecto}/qa-{N}` (+VISUAL_FIDELITY, NETWORK_AUDIT, E2E_FLOWS, FAIL_TYPE)
- `{proyecto}/certificacion` (+DESIGN_TOOLS_AUDIT, FALSE_POSITIVE_GUARDRAIL, MIXED_CONTENT_DYNAMIC, EVIDENCE_TRAIL)
