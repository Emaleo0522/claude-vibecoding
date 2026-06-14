# Upgrade Log — Context Management + Best Practices

## Hardening seguridad + Delegación Zen + Contrato lifecycle memoria — 2026-06-14 ✅

### Resumen

Cuatro cambios tras auditar el sistema contra las releases de Gentleman de jun-2026 (Engram v1.16.2/3, gentle-pi v0.5.0, gentle-ai v1.38–1.40.1):

1. **Endurecimiento de `block-no-verify.js`** — cerrados 3 bypasses de comandos destructivos detectados al comparar con el hard-deny de gentle-pi v0.5.0:
   - `git -C <dir> push --force` ahora se bloquea (el regex viejo exigía `git push` adyacente; el flag global `-C <dir>` lo evadía).
   - `chmod -R 777` y `chmod 0777` ahora se bloquean (antes solo `chmod 777` literal).
   - Nuevo bloqueo de `chown -R` / `chown --recursive`.
   - Verificado con 15 casos de test: 8 destructivos bloqueados, 7 seguros permitidos, 0 falsos positivos (incl. `git commit -m 'fix push -f bug'`).

2. **Delegación Zen** (`hooks/zen-delegate.js` + sección en CLAUDE.md) — delegación de tareas mecánicas a modelos open-source vía opencode Go. Solo 2 modelos aprobados por eval real (deepseek-v4-flash para estructura/JSON, qwen3.7-plus para copy castellano); deepseek-v4-pro, kimi-k2.6 y minimax-m3 rechazados por reasoning leakage. Reglas de calidad inviolables: validación por muestreo, output marcado como delegado, nunca delegar decisiones visuales/QA/arquitectura.

3. **Contrato de lifecycle de memoria** (`CLAUDE.md` § "Contrato de lifecycle de memoria" + regla 5 en `orquestador.md`) — adaptado de gentle-pi v0.5.0, availability-gated. Al recuperar memoria: preferir `mem_review` action `list` si está disponible → fallback graceful a `mem_search`/`mem_context`; tratar `needs_review` como contexto stale a verificar contra evidencia (no verdad); nunca auto-marcar `mark_reviewed` sin confirmación del usuario. Funciona hoy aunque el Engram cloud (v1.16.1) aún no exponga la feature; se activa al actualizar a ≥v1.16.2. Caveat: `mark_reviewed` es local-only (no sincroniza cross-PC todavía).

4. **Ejes 4R faltantes en reality-checker** (`reality-checker.md` Paso 5 + trigger de FAIL + traza en CLAUDE.md) — adaptado de los 4R review agents de gentle-ai v1.40.1. Agregados como revisores read-only "find, don't fix": **R2 Claridad** (código muerto, magic numbers, lógica duplicada, naming que oculta intención) y **R4 Resiliencia** (data-fetching sin estado loading/error, dependencias externas sin fallback/timeout, flujos críticos pago/auth/submit sin manejo de error). Completa la cobertura 4R: R1 Risk = security-engineer, R3 Reliability = evidence-collector, R2+R4 = estos. Flujo crítico sin estado de error → blocker (NEEDS WORK).

### Por qué

El audit confirmó que el sistema está sano y maduro; la mayoría de las features de Gentleman son Pi/OpenCode-native (no aplican a Claude-native). Estos cuatro cambios son los de mayor retorno y menor riesgo: seguridad concreta (gaps reales verificados) + ahorro de tokens en lo mecánico sin tocar calidad + frescura de memoria contra drift + cobertura completa de revisión de código (los 4 ejes adversariales), todo mapeando a la doctrina de Checkpoint humano.

### Backlog (no aplicado, evaluado)

- Upgrade Engram 1.16.1→1.16.3 (CLI casa+pc004, luego Oracle); seguro pero baja prioridad (mark_reviewed no sincroniza cross-PC).
- Hook estilo-GGA (review LLM pre-commit vía zen-delegate contra anti-patterns HIGH).
- Upgrade Engram 1.16.1→1.16.3 (seguro; baja prioridad porque mark_reviewed no sincroniza cross-PC aún).

## License change: MIT → PolyForm Noncommercial 1.0.0 — 2026-05-27 ✅

### Resumen

Cambio de licencia para prevenir uso comercial / reventa sin autorización. **MIT** (que permite explícitamente *"copy, modify, merge, publish, distribute, sublicense, **and/or sell**"*) → **PolyForm Noncommercial License 1.0.0** (uso personal/educativo/nonprofit/investigación permitido sin restricción; uso comercial requiere licencia separada).

### Por qué PolyForm Noncommercial (vs alternativas)

- **vs MIT/Apache/BSD**: estas permiten venta. No cumplen el objetivo.
- **vs AGPL-3.0**: permite uso comercial pero obliga publicar SaaS modificado. Más permisivo que lo que se quiere.
- **vs BSL (Business Source License)**: similar pero más complejo (define "Change Date" en que revierte a Apache). Para el caso simple no aporta.
- **vs Creative Commons (CC BY-NC)**: la propia Creative Commons recomienda explícitamente NO usar sus licencias para software (falta cláusulas de patentes y otros aspectos específicos del código).
- **PolyForm Noncommercial 1.0.0** ✓ — diseñada específicamente para software, sin loopholes, redacción clara, sin "Change Date" que confunda. Permite personal use, hobby, charitable orgs, educational, public research, government.

### Cambios aplicados

- `LICENSE` — texto completo PolyForm Noncommercial 1.0.0 (oficial de polyformproject.org) + copyright Leonardo Emanuel Mansilla + sección Commercial Use (bilingüe) con email de contacto + sección License History
- `README.md` — badge "License: MIT" → "License: PolyForm Noncommercial 1.0.0" (color orange) + aviso visible bajo los badges sobre uso no comercial + email de contacto + sección Licencia al final reescrita con history nota
- `README.en.md` — mismo trato bilingüe (badge + warning + License section)

### Disclaimer importante

**MIT no se puede revocar retroactivamente.** Cualquiera que haya clonado o forkeado este repositorio antes de 2026-05-27 mantiene los derechos MIT sobre esas versiones específicas. La nueva licencia aplica a:
- La versión actual (este commit y posteriores)
- Cualquier código nuevo que se agregue desde ahora

Esto está documentado explícitamente en LICENSE (sección "License History") y en la sección Licencia del README.

### Lo que sigue siendo legal hacer (PolyForm Noncommercial)

- Uso personal, hobby, experimentación
- Estudio, investigación pública
- Uso en organizaciones sin fines de lucro, educativas, de salud pública, ambientales, gubernamentales
- Modificar y redistribuir (siempre que sea no comercial y mantenga la licencia)

### Lo que YA NO es legal hacer

- Vender el software o derivados
- Ofrecerlo como producto comercial / SaaS pago
- Incorporarlo en producto comercial de empresa con fines de lucro
- Sublicenciar a terceros

Para esos casos: **emaleo0522@gmail.com** (licencia comercial separada).

### Decisión NO tomada

- **Trademark del nombre "Claude Vibecoding"**: no registrado (requiere trámite en INPI Argentina, separado del scope de este commit). Si en el futuro se quiere, se puede sumar — la licencia y el trademark son independientes.
- **CLA (Contributor License Agreement)**: no implementado todavía. Si se reciben contribuciones externas en el futuro, considerar agregar CLA para mantener la capacidad de relicenciar.

### Disclaimer legal

No soy abogado. Este cambio se hizo basado en análisis comparativo de licencias disponibles. Para enforcement de la licencia ante violaciones, consultar abogado de propiedad intelectual.

---

## Auditoría completa post-bc01124 — recovery de 3 archivos no pusheados — 2026-05-26 ✅

### Contexto

Después del fix bc01124 (POST-MORTEM debajo), el usuario activó Modo Diagnóstico para verificar que la regresión del 44f4058 era un caso aislado o si había más trabajo perdido. La auditoría reveló que el mismo patrón **"edits aplicados a runtime sin commit al repo"** se había producido en otros 3 archivos del sistema durante las semanas previas.

### Hallazgos críticos

| Archivo | Detalle | Recovery commit |
|---|---|---|
| `agents/self-auditor.md` | Repo del 2026-04-07 (sin T9 Architecture Drift Check). Runtime tiene T9 desde 2026-05-25 (obs #3342). 35 líneas + cambio score 8/8 → 9/9 perdidas | `8060e9c` |
| `agents/orquestador.md` | Repo = 1599 líneas (contenido inline duplicado con refs). Runtime = 1379 líneas (con pointers). 220 líneas de drift = la partición modular del 2026-05-19 (obs #3289) nunca llegó al repo correctamente. Commit `db7ce47` creó los `*-reference.md` pero NO limpió el orquestador.md correspondientemente | `3959f55` |
| `agents/pipeline-reference.md` | Runtime tiene tabla expandida de política free-first (5 columnas × 4 agentes, Cloudflare setup, anti-pattern Together AI explícito, env vars con costos). Repo tenía versión abreviada del mismo día sin la expansión | `26b212b` |

### Impacto en tokens (boot común)

| Estado | CLAUDE.md | orquestador.md | Total boot |
|---|---|---|---|
| Pre-44f4058 (optimizado) | ~9,955 tok | ~21,791 tok | ~31,746 tok |
| 44f4058 (regresión) | ~11,520 tok | ~25,225 tok | ~36,745 tok |
| bc01124 (fix #1) | ~9,955 tok ✅ | ~25,225 tok ❌ | ~35,180 tok |
| 3959f55 (fix #2 hoy) | ~9,955 tok ✅ | ~21,791 tok ✅ | ~31,746 tok |

**Ahorro neto vs el peor caso (44f4058): ~5,000 tokens por sesión.** Comparado con "todo inline sin partición": ~12,300 tokens ahorrados por sesión (en línea con el -7.9K declarado en obs #3289).

### Otros fixes incluidos en este commit

- **Drift de conteos en docs**: `CLAUDE.md` decía "15 referencias / 12 archivos" (real: 21). `README.md` decía "20 referencias / 47 archivos" (real: 21 / 48). `README.en.md` estaba más atrás: "15 references / 41 files / 16 hooks" (real: 21 / 48 / 13+3). Corregido en los 3 archivos.

### Causa raíz del patrón "runtime no pusheado"

En todos los casos: edición aplicada a `~/.claude/agents/<archivo>.md` en una sesión + obs Engram describiendo el cambio + **olvido del `git commit/push` correspondiente**. La obs declara "aplicado completo" basándose en que el runtime quedó actualizado, pero el repo nunca recibe el cambio.

Combinado con el bug del 44f4058 (asumir "más completo = más correcto" sin verificar headers de extracción), el resultado es drift acumulado invisible hasta que alguien hace un audit dedicado.

### Doctrina actualizada — cómo actualizar la arquitectura sin repetir el patrón

**Workflow correcto cuando se modifica un agente / hook / ref técnica:**

1. Editar el archivo en el repo `claude-vibecoding/` (no en `~/.claude/` directo).
2. `cp` el archivo del repo a `~/.claude/` para que el runtime cargue la nueva versión.
3. `git add` + `git commit` con mensaje descriptivo.
4. `git push origin main`.
5. **Verificación post-commit**: `git status` debe retornar "nothing to commit, working tree clean" Y `git log -1` debe mostrar el commit nuevo.
6. Guardar obs Engram con `topic_key` apropiado **mencionando el commit SHA** (`commit XXXXXXX pusheado a origin/main`).

**Anti-patrones a evitar:**

- ❌ Editar `~/.claude/` primero y planear "commitear después" — el "después" se olvida.
- ❌ Guardar obs Engram declarando "aplicado completo" sin verificar `git log` post-push.
- ❌ Mover contenido a refs `*-reference.md` sin limpiar el archivo origen correspondientemente (la partición incompleta crea duplicación invisible — caso orquestador.md).
- ❌ Asumir que `~/.claude/` y el repo están sincronizados por defecto. Son lugares físicamente distintos y se desincronizan por defecto.

**Fuente de verdad del CLAUDE.md** (consolidada en 44f4058 + bc01124): el archivo `CLAUDE.md` del **root del repo claude-vibecoding** es la única fuente de verdad. `install/linux.sh` lo copia a `~/CLAUDE.md`, `install/windows.md` da la instrucción manual de `cp CLAUDE.md ~/CLAUDE.md`. Los templates `global-claude.md` / `windows-claude.md` ya no existen (eliminados en 44f4058).

### Commits aplicados

- `8060e9c` feat(self-auditor): apply pending T9 Architecture Drift Check from 2026-05-25
- `3959f55` fix(orquestador): complete pending modular partition cleanup from 2026-05-19
- `26b212b` docs(pipeline-reference): expand free-first policy table with 4 backends per agent
- `ec32e93` docs: update counts (21 refs / 48 files / 13+3 hooks) in CLAUDE.md + README.md + README.en.md + UPGRADE_LOG entry
- `55d0e66` docs(pipeline-reference): make Cloudflare env setup OS-agnostic (Linux+Windows)
- `d252799` docs(readme): add Simplicity First in outputs to "What protects you" section
- `45b2999` fix(install): remove dead agents/skills/ dir references (B1+B5 audit v2)

### Lo que NO se aplicó (queda como backlog)

- 2 obs con `mem_judge` candidates pending: `#3126` x2, `#3147` x1. Pendiente resolver.
- Backlog acumulado obs #3289/#3295/#3343: AGENTS.md sin los 5 refs nuevos (verificar runtime), trigger Fase 2B app móvil, `loaded_refs` en DAG State, pre-flight `git fetch`, pregunta topology Intent Clarifier.
- `~/.claude/agents/skills/` directorio vacío huérfano (residuo de experimento `npx skills add`).
- Bug menor `hooks/audit-system.js` (fallback path wrong fuera del repo).

---

## POST-MORTEM + Fix: drift resolution con regresión accidental — 2026-05-26 ✅

### Summary

Sesión 2026-05-26 tuvo 2 momentos:

**Momento 1 (commit 44f4058)** — INTENTO de resolución del drift entre 3 versiones del CLAUDE.md. Forensics correcto identificó: root 54 commits, templates 38 y 27, sync manual fallido 3 veces. PERO el fix aplicado tomó el `CLAUDE.md` del root del repo como base, **sin reconocer** que ese archivo era la versión PRE-extracción (anterior a la optimización del 2026-05-15/19 que extrajo secciones a archivos `*-reference.md`). El templates/global-claude.md era en realidad la versión POST-extracción optimizada, y al eliminarlo se perdió la optimización.

**Momento 2 (commit XXXXXXX, este fix)** — Usuario alertó sobre la regresión: *"intentamos perfeccionar la arquitectura, particionando orquestador y mejorando claude.md dado que estos dos cargaban y consumían muchos tokens"*. Verificación reveló 7 archivos `-reference.md` con headers explícitos "Extraído de X para reducir boot tokens" — la optimización SÍ existía y fue revertida accidentalmente. Fix: recuperar la versión optimizada desde HEAD~1, hacerla el nuevo `CLAUDE.md` del root, re-aplicar Simplicity First encima.

### Causa raíz del error

Apliqué obs #3338 (trust user memory) tarde, no temprano. En el audit forense detecté que el root era "más completo" (554 líneas vs 496 del template) y asumí "más completo = más correcto". No verifiqué si la diferencia era **intencional** (optimización con extracción) o **drift** (desincronización). Mismas líneas pero rol opuesto: la versión "corta" era la correcta optimizada, no la atrasada.

Lección operativa: cuando hay diff significativo entre archivos del sistema, **verificar timestamps de extracción en archivos `-reference.md` ANTES de decidir cuál es la fuente de verdad**. Headers como "Extraído de X el YYYY-MM-DD" son señal explícita de optimización intencional.

### Estado final correcto post-fix

- `CLAUDE.md` (root del repo) = **versión optimizada con extracción aplicada** (~517 líneas: 496 base post-extracción + 21 de Simplicity First). Apunta a los `-reference.md` para detalle on-demand. **NO duplica** contenido de Modo Diagnóstico expandido, Cross-Claude Mailbox schemas, Fase 2B, etc. (esos viven en sus refs).
- `templates/global-claude.md` = ELIMINADO definitivamente. Era la versión optimizada → ahora vive como `CLAUDE.md` del root.
- `templates/windows-claude.md` = ELIMINADO definitivamente. Legacy desactualizado, contenido core viejo, sin overrides Windows reales.
- `install/linux.sh` y `install/windows.md` = apuntan a `CLAUDE.md` del root (correcto).
- `agents/simplicity-first-reference.md` = NUEVO, preservado del commit 44f4058.
- `agents/AGENTS.md` = fila simplicity-first agregada.
- Eliminación de `templates/windows-claude.md` = preservada (legacy verificado).

### Archivos tocados

- **MERGED** `CLAUDE.md` (root) — agregada sección "Checkpoint humano" que existía solo en template Linux. Corregido conteo de hooks 15→13 con tabla expandida (faltaban `pre-return-audit`, `engram-cloud-sync-on-stop`, `bridge`). Agregada nueva sección "## Simplicity First en outputs (2026-05-26)" entre Modo Diagnóstico y Delegation Stop Rules.
- **NEW** `agents/simplicity-first-reference.md` — referencia operativa con ejemplos buenos/malos, triggers detallados, cross-references a obs Engram. Ref opt-in (cargada cuando hace falta).
- **UPDATED** `agents/AGENTS.md` — nueva fila `simplicity-first` con trigger "agente duda si va corto o largo".
- **CHANGED INSTALLER PATH** `install/linux.sh:202` — `TEMPLATE` apunta a `CLAUDE.md` (root) en vez de `templates/global-claude.md`. Mismo en `install/windows.md:176` (manual instructions).
- **DELETED** `templates/global-claude.md` — redundante post-consolidación. El root es la fuente única ahora.
- **DELETED** `templates/windows-claude.md` — legacy desactualizado. Sus 54 líneas únicas resultaron ser contenido core viejo (no overrides Windows reales — esos ya están en `CLAUDE.md` § "Overrides Windows").
- **UPDATED** `README.md` + `README.en.md` — refs a `templates/global-claude.md` cambiados a `CLAUDE.md`. Conteos: 47→48 archivos en agents/, 20→21 referencias técnicas.

### Decisiones de diseño

**¿Por qué el root del repo y no un nuevo `templates/CLAUDE.md`?**
El root es visible al clonar el repo. Los devs lo encuentran sin mirar `templates/`. Mantener el folder `templates/` solo para `settings.json` / `settings.local.json` que sí necesitan staging (sin sustitución de variables).

**¿Por qué eliminar `windows-claude.md` en lugar de mergearlo?**
Audit con `comm -23` reveló 54 líneas únicas. Inspección mostró que NO eran overrides Windows (esos están en sección "Overrides Windows" del global). Eran contenido core obsoleto que no se sincronizó cuando el global avanzó. Conservar habría sido conservar drift.

**¿Por qué Simplicity First como regla core + ref opcional, no full inline?**
Mismo patrón que `orquestador.md` / `pipeline-reference.md`: regla core breve para que esté siempre en contexto (anclaje permanente), detalle extendido en ref para no inflar boot de cada sesión. Mantiene la regla operativa sin violar la propia regla a nivel meta.

**¿Por qué NO mergear el root con el global como propuse al inicio?**
El audit reveló que ambos archivos tenían contenido único valioso en direcciones opuestas: el root tenía detalle operativo (template embebido de Modo Diagnóstico, casos de uso reales, bootstrap CLI con vibefx), el global tenía "Checkpoint humano" que el root no tenía. La consolidación tomó el root como base (más actualizado) + mergeó Checkpoint humano + corrigió conteo de hooks.

### Lo que NO se tocó

- `agents/` (excepto AGENTS.md y el nuevo simplicity-first-reference.md) — los 47 archivos existentes se preservan intactos.
- Hooks (los 13 + 3 utilities) — sin cambios funcionales. Solo se corrigió el conteo en la doc.
- `settings.json`, `settings.local.json` — sin cambios.
- Engram observations existentes — sin migración necesaria. La nueva fuente de verdad respeta toda la estructura previa.

### Cómo evitarlo en el futuro (preventive)

La causa raíz del drift era arquitectónica: 3 archivos paralelos sin sync automático. La solución estructural (1 sola fuente de verdad) elimina la posibilidad técnica de drift entre Linux y Windows. **No hay forma de des-sincronizarlos porque no hay 2 archivos para des-sincronizar.**

Para drift FUTURO entre `CLAUDE.md` del root y `~/.claude/CLAUDE.md` de cada PC (que SÍ pueden divergir, porque uno es del repo y el otro es la copia operativa): el patrón aprendido (obs Engram #3337) sigue válido — usar `git checkout HEAD -- <archivo>` + `git add --renormalize` cuando hay drift CRLF/LF, separar normalize commit del content commit.

### Engram observations relacionadas

- `#3336` Authoritative files vs summaries — leer archivo correcto antes de afirmar (2026-05-25)
- `#3337` CRLF→LF split commits pattern (2026-05-25)
- `#3338` Trust user memory verify before contradict (2026-05-25)
- `#3343` Architecture review No-JS Render Audit Paso 4.5 (2026-05-25)
- `#3346` Convención agentes proyectos satélite NO van al repo (2026-05-26)
- (este upgrade) `#XXXX` Drift resolution + Simplicity First — guardado post-commit

### Aprendizajes destacados

1. **El "más actualizado" no siempre es el más completo**. Los 3 archivos tenían contenido único en direcciones distintas. Forensics empírica (git log + diff) es la única forma confiable de saber qué sobrevive del merge.
2. **3 intentos manuales previos** (`bf3eb9f`, `e830fb8`, `e4bf6ed`) intentaron cerrar el drift sin éxito sostenido. La solución manual no escala — la estructural (1 archivo) sí.
3. **Identificar archivos huérfanos antes de sincronizar**. En el audit detectamos `pen-packager.md` que pertenece al proyecto satélite vibefx (no a claude-vibecoding). Casi lo pusheamos por error al repo principal. Regla nueva en obs #3346.
4. **El nombre engaña**. `templates/global-claude.md` no era "global" sino Linux. `templates/windows-claude.md` no tenía overrides Windows reales. Verificar contenido, no asumir por nombre.
5. **Simplicity First aplica al output del modelo, no al código generado**. El sistema ya tenía guardrails contra over-engineering en código (`pre-return-audit`). La fricción real estaba en respuestas verbosas en chat. Esta regla cierra ese gap.

---

## Render-aware Phase 4 + Astro default for landings — 2026-05-24 ✅

### Summary
Tres cambios sistémicos derivados de un thread de @chorch_md sobre SEO + render (SSR/SSG vs CSR). 1) Fix de drift entre `orquestador.md` (autoritativo: Astro first + pregunta al usuario) y los summaries (`CLAUDE.md` global + `pipeline-reference.md` decían Vite+React como default fijo de landings). 2) Doctrina ejecutable "Crawl Budget & Non-JS Scrapers" en `seo-discovery.md`. 3) Nuevo gate "No-JS Render Audit" como Paso 4.5 en `reality-checker.md` — captura el caso donde el sistema eligió un stack CSR puro para una landing/blog/ecommerce, que resultaría invisible para Bing, scrapers de LLMs y previews sociales.

### Archivos tocados
- **UPDATED** `CLAUDE.md` global (línea 416) y `agents/pipeline-reference.md` (línea 224): summaries de stack defaults sincronizados con `orquestador.md` § "Decisión de stack". Astro añadido explícitamente como preferido para landings content-heavy (0 JS por default). Mensaje "el orquestador pregunta antes si hay >1 alternativa válida" sumado para dejar claro que no es mandatorio.
- **UPDATED** `agents/seo-discovery.md`: nueva sección "Crawl Budget & Non-JS Scrapers" — doctrina sobre Google segunda pasada JS (cost de crawl budget), Bing JS limitado, scrapers LLMs (GPTBot, anthropic-ai, PerplexityBot, CCBot, Google-Extended) sin JS, previews sociales sin JS. Lista de items que deben estar server-side en proyectos SEO-críticos.
- **UPDATED** `agents/reality-checker.md`: nuevo Paso 4.5 "No-JS Render Audit" entre Paso 4 (SEO Score) y Paso 4B (Mixed Content). Gate ejecutable con Playwright `javaScriptEnabled: false` + fallback curl. Mide h1, body_text, og_tags, twitter_tags, json_ld, canonical. Skip-logic por `intent.project_type`. Threshold por métrica.
- **UPDATED** `agents/orquestador.md`: DAG state schema `certificacion` extendido con `no_js_audit: "pending|pass|warn|fail|skipped"`. Handler específico en bloque "Si un agente Fase 4 retorna fallido" — fail+SEO-crítico = BLOCKER NEEDS WORK, fail+webapp = WARN, skipped = registrar razón.
- **UPDATED** `README.md` + `README.en.md`: tabla "Qué podés construir" y "Stack adaptable" mencionan Astro como default content-heavy. Pipeline de Fase 4 documenta Paso 4.5. Sección "12 capas de defensa anti-falso-positivo" suma No-JS Render Audit (era 11).

### Decisiones de diseño

**¿Por qué el gate va en reality-checker y no en seo-discovery?**
`seo-discovery` no tiene Playwright en su tools list (solo Read/Write/Edit/Bash/Engram). `reality-checker` sí, y ya lo usa en Paso 4B Mixed Content dinámico. Conceptualmente: `seo-discovery` implementa SEO (meta tags, JSON-LD, sitemap, llms.txt); `reality-checker` valida arquitectura de render. Responsabilidades distintas — el check no-JS es validación pura, no implementación.

**¿Por qué no se crea un topic_key nuevo en Engram?**
El campo `NO_JS_AUDIT` se extiende dentro del `content` existente de `{proyecto}/certificacion`. Backward compat: proyectos legacy (saldoar, cafe-premium, vetconnect, etc.) sin este campo se tratan como `skipped` retroactivamente. NO se re-validan. Solo proyectos nuevos en Fase 4 desde 2026-05-24 generan el campo. Migración cero.

**¿Por qué tres niveles de severidad según `project_type`?**
- `landing/website/blog/ecommerce/marketing` → fail = BLOCKER. Estos proyectos viven o mueren por SEO orgánico.
- `webapp/saas-app/dashboard` → fail = WARN. Es esperable que sean CSR post-login.
- `api/mobile/cli/juego` → SKIP. El check no aplica (no hay HTML público).
- Default conservador si no hay `intent.project_type` → `webapp` (no bloquear, solo avisar).

**¿Por qué se descartó "Mejora 2" (pregunta de topology landing vs app subdomain)?**
Análisis cauteloso reveló blast radius ALTO: tocaría intent-clarifier + orquestador (decisión de stack ramificada) + project-manager-senior (planifica 2 proyectos si subdomain) + deployer (asume hoy 1 proyecto = 1 deploy) + rapid-prototyper + Visual Direction Checkpoint. No es un edit puntual sino un mini-feature que cambia el modelo "1 proyecto = 1 deploy". Diferido a sesión dedicada.

### Lo que NO se tocó
- `agent-protocol.md` (Return Envelope universal sin cambios — el `NO_JS_AUDIT` es específico de reality-checker, no se generaliza)
- `AGENTS.md` (los triggers/skip conditions de las refs no cambian)
- `evidence-collector.md` (su Paso 4e Network inspection mide cosa distinta — status codes runtime con JS — no hay solape)
- Hooks (el gate corre dentro de reality-checker, no es un interceptor de tool call)
- Mejora 2 (topology question) — backlog para sesión dedicada por impacto sistémico

### Trigger del cambio
- Thread @chorch_md 2026-05-23: https://x.com/chorch_md/status/2058221989806944557
- Tesis del thread: separar SSG/SSR (web pública) de CSR (app) por subdominio para evitar perder SEO. Google renderiza JS pero en segunda pasada (crawl budget). Bing y scrapers de LLMs muchas veces no ejecutan JS.
- Discusión en respuestas: Jonatan Salas propone render híbrido en un solo stack (Astro, Next App Router, vite-plugin-ssr). Joseph Ruano usa WordPress + subdomain. Chorch confirma A y B son válidos.
- Diagnóstico inicial confundido: en la sesión, miré solo `CLAUDE.md` global y afirmé "el sistema fuerza Vite+React para landings → genera deuda SEO". El usuario recordó "habíamos trabajado para que no sea mandatorio". Verificación reveló que `orquestador.md` ya tenía Astro como default + pregunta al usuario; el drift estaba en los summaries.

### Commits incluidos en este upgrade
- `702de95` chore: normalize CRLF to LF in CLAUDE.md per .gitattributes
- `dc06028` docs(stack): clarify defaults are evaluated, not mandatory
- `24cfe6e` docs(seo): add Crawl Budget & Non-JS Scrapers doctrine
- `68d975d` feat(reality-checker): add Paso 4.5 No-JS Render Audit gate
- (este commit) README + UPGRADE_LOG sync

### Engram observations
- **#3336** (decision) `claude-vibecoding/meta/authoritative-files-vs-summaries` — regla: leer archivo autoritativo, no summary
- **#3337** (pattern) `claude-vibecoding/meta/crlf-lf-split-commits-pattern` — split CRLF→LF + content commits
- **#3338** (decision) `claude-vibecoding/meta/trust-user-memory-verify-before-contradict` — cuando el user recuerda algo distinto, verificar antes
- **#3343** (architecture) `claude-vibecoding/architecture-review/2026-05-24-no-js-render-audit` — change record completo del Paso 4.5

### Aprendizajes destacados

1. **Drift entre archivo autoritativo y summaries del CLAUDE.md global** es la deuda de docs más común. El detalle (orquestador.md) puede tener lógica nueva (Astro first + ask user) mientras los summaries del CLAUDE.md global / pipeline-reference.md quedan viejos. Verificar archivo autoritativo antes de afirmar bugs sistémicos. Ahora los summaries linkean explícitamente a `orquestador.md § "Decisión de stack"` para reducir esa deuda.

2. **Cuando el usuario recuerda algo distinto, suspender afirmación previa y verificar**. El usuario salvó este audit recordando "habíamos trabajado para que no sea mandatorio". Sin esa corrección, habría propuesto un fix innecesario y dado imagen falsa de un bug en su sistema.

3. **Refinamiento del patrón CRLF→LF (obs #3337)**: si `.gitattributes` ya está configurado para LF y los archivos en HEAD ya están en LF, `git checkout HEAD` los normaliza al traerlos del index. Re-edits sobre archivos ya normalizados NO necesitan commit separado de normalización — basta con verificar `git diff --stat` post-edit (ratio cambios/longitud archivo debe ser bajo, sin warnings CRLF).

4. **Análisis cauteloso pre-implementación evita scope creep**. La primera propuesta de "Mejora 2" sonaba como un edit puntual; un análisis arquitectónico reveló cascada a 6-8 archivos del pipeline + cambio del modelo "1 proyecto = 1 deploy". Diferir lo grande, ejecutar lo contenido.

---

## external-skills integration — 2026-05-20 ✅

### Summary
Sumar el ecosistema `npx skills add` (registry github.com/skills-sh) al sistema como **plan C opt-in** para knowledge packs comunitarios. Disparado por tweet de midudev (2026-05-16, 813 likes) promoviendo `pixel-point/animate-text`. Diseño: cero impacto en boot del orquestador, whitelist curada manualmente, instalación scoped al proyecto (nunca `-g` global), registro obligatorio en Engram para audit trail.

### Archivos tocados
- **NEW** `agents/external-skills-reference.md` — referencia condicional (~90 líneas) con whitelist inicial (`animate-text`, `frontend-design`), triggers explícitos, anti-patterns y relación con la arquitectura existente.
- **UPDATED** `agents/AGENTS.md` — nueva fila `external-skills` con trigger explícito + skip conditions ("ref interna ya cubre · proyecto fuera de Fase 3 · sin autorización").
- **UPDATED** `README.md`:
  - Contador: "25 agentes + 15 referencias técnicas" → "25 agentes + 20 referencias técnicas" (incluida external-skills)
  - Verificación post-install: "(debería ser 41)" → "(debería ser 47)"
  - Árbol de disco: actualizado a 47 archivos .md
  - Tabla de docs técnica: nueva fila para `external-skills-reference.md`, consolidación de fila duplicada de `AGENTS.md`

### Decisiones de diseño

**¿Por qué reference y no agente ejecutable?**
Las skills externas son knowledge packs (markdown + assets), no ejecutores con tools. El concepto matchea exactamente con nuestras refs internas — no con la capa de subagentes (que tienen Return Envelope + model routing + tools).

**¿Por qué whitelist manual y no auto-discover?**
Vector de prompt injection: cualquier repo público con `SKILL.md` es válido en el registry. Auto-instalar sin curado abriría a scripts maliciosos en `scripts/` de la skill. Whitelist humana = una decisión manual por skill nueva.

**¿Por qué Fase 3 dev only?**
Las skills externas se consumen cuando el dev agent ya conoce el intent visual + brand + dials. En Fases 1-2 no hay contexto suficiente; en Fase 4-5 no se modifica código. La instalación temprana sería ruido.

**¿Por qué scoped al proyecto, nunca `-g`?**
`-g` instala en `~/.claude/skills/` global, contaminando otros proyectos y rompiendo reproducibilidad. Scoped (`<project>/.claude/skills/`) deja la skill aislada y versionable con el repo del proyecto.

### Lo que NO se tocó
- Boot Sequence del orquestador (la ref es lazy-load, cero tokens en boot)
- Hooks (skills no son interceptables — son knowledge)
- MCPs (skills no son tools persistentes)
- Subagentes existentes (frontend-developer y xr-immersive-developer leerán la ref cuando matchee el trigger, sin reescritura de su agent.md)

### Próximos pasos sugeridos (no aplicados)
1. Cuando frontend-developer use una skill por primera vez, dejar un comentario en el componente con el repo + commit SHA del SKILL.md consumido (auditabilidad).
2. Si la whitelist crece a >5 entradas, sacar la tabla a `external-skills-whitelist.md` separado.
3. Considerar un hook `pre-skill-install` que bloquee `npx skills add` con `-g` o con repos fuera de whitelist (defensa adicional). Pendiente — no implementado en esta iteración.

### Trigger del cambio
- Tweet midudev 2026-05-16: https://x.com/midudev/status/2055633570211782835
- Investigación: skills.sh es "npm para Agent Skills", compatible con Claude Code + Cursor + Codex + 51 agentes más
- Decisión usuario 2026-05-20: sumar como plan C sin restringir arquitectura

---

## Gentleman Audit Adaptation — M1+M2+M2.5+M3 — 2026-05-18/19 ✅

### Summary

Comparación claude-vibecoding vs 4 repos de Gentleman-Programming (gentle-ai, gentle-pi, gentleman-guardian-angel, Gentleman-Skills). 4 patrones adaptados al sistema sin alterar la identidad propia (visual-first, end-to-end delivery con assets + deploy). Coordinación cross-PC vía Engram cloud + nuevo Mailbox Protocol opt-in.

### Cambios por milestone

**M1 — Skill index + Stop Rules + Path B** (`33b0441`, `7feab04`)
- `agents/AGENTS.md` nuevo: índice central de las 15 referencias técnicas con triggers de carga (adaptado de gentle-ai).
- `CLAUDE.md`: sección Delegation Stop Rules con umbrales cuantificados (5+ files = delegate, 20+ tool calls = pause).
- `agents/agent-protocol.md`: Path B bootstrap CLI para proyectos no enrolled en Engram DB.
- `design-data/style-presets.csv` + `search.js` + `ux-guidelines.csv`: sync drift local→repo.

**M2 — Wire AGENTS.md + Stop Rules al pipeline** (`32e334b`)
- `agents/orquestador.md`: nuevo Paso 0b en Fase 1 (lee AGENTS.md, decide `references_loaded`).
- `agents/orquestador.md`: Auto-escalación en Identidad y Regla de Oro (aplica Stop Rules en Fase 3).
- `agents/orquestador.md`: campo `references_loaded` en DAG State schema.
- `agents/agent-protocol.md`: rules #8 (Stop Rules) + #9 (consume references_loaded).

**M2.5 — Engram cloud robusto + Mailbox + SSH tightening** (`8d42afa`, `146e931`, `b47100c`, `1bc0e97`)
- Protocolo save robusto 3 capas + Capa 1b whitelist gate (pc004).
- Hook `engram-cloud-sync-on-stop.sh`: pre-flight doctor + auto-repair + regex extendido + filtro defensivo `relation/upsert`.
- Cross-Claude Mailbox Protocol OPT-IN: bucket `cross-claude-mailbox`, schemas query/reply, checks auto-resueltos, edits requieren user approval. NO ejecuta auto-check cada turn (ahorra ~3-5k tokens/día).
- Regla SSH endurecida: "explícita" requiere referencia literal a la acción, no "OK dale" genérico (post-incidente real con pc004 sobre activación del bucket).
- Política free-first sumada al CLAUDE.md raíz para parity cross-PC.

**M3 — TDD trail + Cache hash** (`40d9881`)
- `agents/evidence-collector.md` sección 4g NUEVA (opt-in cuando hay `test_commands`): RED → GREEN → TRIANGULATE → REFACTOR como evidencia ejecutable (gentle-pi). Previene anti-patrón "tests post-hoc ceremoniales".
- `agents/evidence-collector.md` sección 1b extendida: cache hash sha256-short por archivo en reintentos, ahorra ~80% tokens/tiempo si hashes idénticos + veredicto previo PASS (guardian-angel).

**README sync** (`7b1ebfc`)
- Conteo 40→41, AGENTS.md en tabla docs, Stop Rules + Mailbox opt-in + 11 capas QA documentadas.

### Mejoras descartadas conscientemente

- **SDD profiles por fase** — nuestro routing Opus/Sonnet en frontmatter es más simple y validado.
- **Multi-target adapters multi-IDE** — somos Claude-only por diseño.
- **Skills Angular/Java/Spring/Elixir/Electron** — cargables on-demand si hace falta, no entran al default.
- **Item #5 LLM-as-judge semántico** — exploratorio, valor incierto, pausado.
- **Item #7 Provider-agnostic QA con Ollama** — requiere ollama en VPS, tarea separada.

### Verificación

- 0 dead paths confirmados via grep (AGENTS.md consumido en 9 lugares en orquestador.md, Stop Rules en 3 archivos coherentes, `references_loaded` flows end-to-end).
- 0 duplicaciones (Paso 0b del orquestador ≠ Paso 0b-bis interno de ui-designer — distintos scopes).
- Cross-PC: casa + pc004 + repo sincronizados (pc004 a 2 commits post-pull pendiente).
- Engram cierre: obs #3154 `claude-vibecoding/gentleman-audit-2026-05-18/cerrado`.
- README al día con todos los cambios.

### Commits incluidos en este upgrade

- `33b0441` design-data drift fix
- `7feab04` AGENTS.md skill index + Stop Rules + Path B (M1)
- `1bc0e97` free-first policy as default backend strategy
- `8d42afa` protocolo save robusto + hook anti silent-fail (pc004)
- `146e931` bucket whitelist + relation/upsert + mailbox protocol (pc004)
- `32e334b` wire AGENTS.md + Stop Rules to pipeline (M2)
- `b47100c` mailbox to opt-in + tighten SSH authorization
- `40d9881` TDD evidence trail + cache hash en QA (M3)
- `7b1ebfc` README sync con cambios M1+M2+M2.5+M3
- (este commit) UPGRADE_LOG entry

### Aprendizajes destacados

1. Crear archivos nuevos ≠ integrarlos. Un AGENTS.md sin consumer es dead weight. Verification grep pre-commit es esencial.
2. Coordinación cross-PC con peer Claude: aprobar lo concreto, no lo abstracto. Verificar diff del commit, no solo el reporte resumen del peer.
3. Mailbox auto-check cada turn = ~3-5k tokens/día de ruido. Opt-in es la opción correcta para features de baja frecuencia.
4. SSH al server productivo requiere autorización LITERAL del usuario. Un "OK dale" a una pregunta genérica no cuenta.

---

## Free-first creative pipeline + Cloudflare Workers AI — 2026-05-18 noche ✅

### Summary
Refactor del stack de assets generativos (image-agent, logo-agent, video-agent, brand-agent) a política **free-first verificada con curl real contra fuentes primarias 2026**. Motivado por usuario sin tarjeta de crédito disponible.

Hallazgo principal: muchos "free tiers" promocionados en blogs marketing con fechas "2026" en realidad reflejan políticas viejas (2024-2025) ya retiradas. Validación empírica obligatoria de cada provider antes de incluirlo en el default.

### Cambios

- **agents/image-agent.md** + **agents/logo-agent.md**:
  - Cadena free-first: `HuggingFace FLUX.1-schnell` (primario, $0.10/mes free) → `Cloudflare Workers AI` (secundario, 10K neurons/día sin tarjeta) → `Pollinations.ai` (fallback, FLUX unlimited free).
  - Removido del default: `Together AI`. El endpoint "FLUX.1-schnell-Free" que figuraba en blogs 2024-2025 ya **no existe** en su catálogo. Free tier actual exige $5 fondeo con tarjeta. Verificado contra `api.together.xyz/v1/models` el 2026-05-18.
  - Agregado curl funcional Cloudflare con endpoint `api.cloudflare.com/client/v4/accounts/{ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`. Validado HTTP 200 con respuesta JPEG 1024x1024.
  - Backends pagos (`gemini`, `recraft`) quedan como opt-in explícito por input `backend: "gemini"` / `backend: "recraft"`.

- **agents/video-agent.md**:
  - Sin `REPLICATE_API_TOKEN` **ya NO es FAIL**. El agente retorna `STATUS=completado` con solo `fallback.css` animado como output válido. No bloquea el pipeline.
  - Documenta opciones manuales free para video real: Seedance (web, 100 free/día sin tarjeta), HuggingFace Spaces (Wan 2.1, cold start), LTX-2 self-host.

- **agents/brand-agent.md**:
  - Sub-tool opcional `dembrandt` MCP para extraer tokens reales de URLs de referencia. Sigue siendo free (texto puro sin API externa).

- **CLAUDE.md**:
  - Nueva tabla "Política free-first" con primario/secundario/fallback/opt-in por agente.
  - Setup paso a paso de Cloudflare Workers AI (signup sin tarjeta, Account ID, API Token con permiso `Account → Workers AI → Read`).
  - Caveat explícito sobre marketing reciclado con fechas "2026".

- **.env.example** (NUEVO archivo):
  - Template completo con las 6 variables documentadas (HF_TOKEN required, CLOUDFLARE_* recomendadas, REPLICATE/GEMINI/RECRAFT opt-in).
  - Links de signup directos para cada provider.
  - Notas claras sobre cuáles requieren tarjeta y cuáles no.

- **README.md** sección "Variables de entorno para assets generativos":
  - Reescrita con tabla free-first + setup Cloudflare en 3 pasos.
  - Backends descartados documentados con razón (Together AI).
  - Referencia a `.env.example` agregada.

### Validación empírica (curl real, 2026-05-18)

| Provider | HTTP | Output | Quota |
|---|---|---|---|
| HF FLUX.1-schnell | 200 | JPEG 256x256 (3.9 KB) | $0.10/mes para free users |
| Cloudflare Workers AI FLUX-schnell | 200 | JPEG 1024x1024 (105 KB) | 10K neurons/día sin tarjeta |
| Pollinations.ai (sin auth) | 200 | JPEG 256x256 (5.5 KB) | Unlimited FLUX |
| Together AI FLUX.1-schnell-Free | **402 credit_limit** | — | Endpoint requiere fondeo $5+ |

### Lecciones documentadas en CLAUDE.md y memoria personal

1. Marketing 2024-2025 que se republica con fechas "2026" engaña — siempre validar con curl real contra fuente primaria antes de incluir un provider.
2. "Free tier" puede significar 3 cosas distintas: (a) sin tarjeta y sin límite real, (b) sin tarjeta pero con quota chica, (c) requiere tarjeta para activar credits gratis. Documentar cuál de las 3.
3. `canPay: false` en HuggingFace `/whoami-v2` identifica usuarios sin tarjeta y limita el monthly credits a $0.10. Útil para detectar el modo free-first programáticamente.

### Commits relacionados

- `993d785` — sync inicial de los 4 agentes creativos free-first
- `9da7ed8` — corrección Together AI → Cloudflare en stack default
- (este commit) — README + UPGRADE_LOG + .env.example

---

## Engram refinements + Cross-Claude Mailbox — 2026-05-18 tarde ✅

### Summary
Round de refinements coordinada cross-PC (pc004 ↔ casa vía Ema relay). 3 cambios:
(1) lista sintética de buckets más usados en Capa 1b para evitar `engram projects list` por defecto;
(2) excepción `relation/upsert` documentada en Capa 3 (bug upstream cloud no reparable desde cliente);
(3) Cross-Claude Mailbox Protocol — convención asíncrona entre instancias de Claude usando `cross-claude-mailbox` bucket en engram cloud.

### Cambios
- **CLAUDE.md + templates/global-claude.md**:
  - Capa 1b: 11 buckets sintéticos listados (claude-vibecoding, saldoar, saldoar-outreach, vetconnect, kahntus, kahntus-portfolio, dashboard-pm, personal, ideas-vault, discoveries, system32, cross-claude-mailbox). Si project no está en la lista → `engram projects list | grep -w` antes del save.
  - Capa 3: nueva excepción documentada para `relation/upsert` (bug upstream cloud — el hook ya lo filtra).
  - Nueva sección "Cross-Claude Mailbox Protocol" — schema de query/reply, flujo (checks auto-resueltos, edits requieren user approval), anti-patrones, limitaciones honestas (no es realtime).
- **hooks/engram-cloud-sync-on-stop.sh**:
  - Filtro defensivo añadido: si el bloqueo es por mutation `relation/upsert`, loguear WARN en vez de ERROR + contar como sync OK. Aplicado en 2 lugares (doctor pre-flight + post-sync error detection).
  - Inline doc: "Filtro defensivo. Bug upstream engram cloud. Cuando upstream arregle, este filtro se vuelve no-op."

### Edge case descubierto (origen del fix de relation/upsert)
Al hacer `mem_save` de la obs #2731 (`claude-vibecoding/sync-cross-pc-2026-05-18-pc004-side`), engram detectó conflict candidate y aplicó `mem_judge` con relation=related. Doctor post-judge reportó `class: blocked` por `unsupported legacy mutation "relation"/"upsert"`. La observation principal sí sincronizó al cloud; la mutation de relation quedó solo en local SQLite. Bug upstream del cloud server, ya documentado.

### Próximo paso pendiente
Activar bucket `cross-claude-mailbox` en cloud whitelist — requiere SSH al server Oracle + edit `/opt/engram-cloud/.env` + `docker compose up -d cloud`. Acción separada (gateada por confirmación del usuario, no se ejecuta automáticamente).

---

## Engram silent-fail cloud fix — 2026-05-18 ✅

### Summary
Diagnosticado bug crítico: `mem_save` retornaba OK al cliente pero el cloud rechazaba con HTTP 500 silencioso cuando la observation no tenía `title` o `content`. Validado empíricamente: 3 obs guardadas el 2026-05-15 en `saldoar` (#2711, #2712, #2715) + 1 en `dashboard-pm` (#2716) quedaron locked en local, invisibles cross-PC. Aplicado fix manual via `mem_update` + `engram cloud upgrade repair --apply` + `engram sync --cloud`. Agregado protocolo de 3 capas + patch al hook para que no vuelva a pasar.

### Cambios
- **CLAUDE.md + templates/global-claude.md** — nueva sección "Protocolo de save robusto — anti silent-fail cloud (2026-05-18)" con 3 capas (pre-save validation, post-save verify, cloud sync gate) + Capa 1b whitelist gate (chequeo previo solo si project es desconocido) + anti-patrones explícitos.
- **hooks/engram-cloud-sync-on-stop.sh** — pre-flight `engram cloud upgrade doctor` antes del sync + auto `repair --apply` si está repairable + skip sync si está blocked + regex de detección de errores extendido (`status 500`, `title is required`, `content is required`, `transport_failed`, `upgrade_blocked`, `upgrade_repairable`). Antes solo capturaba 403/forbidden.

### Validación
Aplicado el propio protocolo nuevo al guardar obs #2723 (`engram/save-validation-protocol`) y #2724 (`saldoar/flujo-reembolso-lecciones-diagrama`). Cloud doctor `ready` + sync exitoso en ambos casos.

### Anti-patrones documentados (para no repetir)
- `mem_save(content=..., type="decision")` sin `title=` → cloud rechaza 500
- `mem_save(title="", ...)` con title vacío string → cloud rechaza 500
- Asumir que `mem_save` exitoso = "está en el cloud". Solo significa local SQLite.

---

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
