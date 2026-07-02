---
name: orquestador-fase45-reference
description: FASE 4 (SEO + Certificación, 4 pasos secuenciales con tiers, skip conditions, No-JS Render Audit handler, manejo de fallos) + FASE 5 (Publicación: git → deployer Vercel/EAS, handoffs, manejo de errores, resumen final) del orquestador. Cargado por el orquestador SOLO cuando todas las tareas de Fase 3 están en PASS. Las reglas inline en orquestador.md (límite 3 ciclos re-cert, pre-autorización git/deploy, orden de re-certificación) rigen siempre. Extraído de orquestador.md el 2026-07-02 para reducir tokens residentes (plan Engram #3521).
---

# Orquestador — Fases 4 y 5 (detalle completo)

> El stub con las reglas inviolables (límite 3 ciclos, pre-autorización, orden de re-cert) vive en `orquestador.md` § FASE 4/5. Si esto cambia, actualizar el stub en sincronía.

### FASE 4 — SEO + Certificacion Final (secuencia con tiers)

Solo ejecutar cuando TODAS las tareas estan en PASS o aceptadas con limitacion.

**La Fase 4 se ejecuta en 4 pasos secuenciales para evitar re-trabajo:**

```
Paso 1: seo-discovery (tier: "structural")
  Solo lo que NO cambia si el contenido se modifica:
  robots.txt, sitemap.xml, semantic HTML, heading hierarchy, lang attr

Paso 2: api-tester + performance-benchmarker (paralelo)
  Endpoints + Core Web Vitals + bundle analysis

Paso 3: seo-discovery (tier: "full")
  Todo lo que DEPENDE del contenido final:
  meta tags, JSON-LD, keyword mapping+intent, OG images,
  llms.txt, analisis competitivo, GEO scoring

Paso 4: reality-checker (gate final)
  Lee todos los cajones y certifica
```

**Por que 2 pasadas de SEO**: si reality-checker dice NEEDS WORK y volvemos a Fase 3,
solo hay que re-ejecutar `tier: "full"` (el structural ya esta hecho). Ahorra ~1000 tokens por ronda.

---

**Paso 1 — seo-discovery (structural)**
- Pasa al agente: `tier: "structural"`, project_dir, URL
- Implementa: robots.txt, sitemap.xml, semantic HTML check, heading hierarchy
- Guarda en: `{proyecto}/seo` con `seo_tier: "structural"`
- Devuelve: Return Envelope con archivos creados

**Paso 2 — api-tester + performance-benchmarker** (paralelo, despues del paso 1)

**api-tester** (CONDICIONAL — solo si hay backend/API)
- **Skip condition**: si DAG State `stack.backend: "none"` Y no hay tareas de tipo `backend` en `{proyecto}/tareas` → SALTAR api-tester completamente. Marcar `api_tester: "skipped-no-backend"` en DAG State. Esto aplica a: landing pages, portfolios, sitios estáticos, juegos client-side.
- Lee: `{proyecto}/api-spec` (generado por backend-architect; **sin fallback** — tareas tiene formato incompatible)
- **ANTES de lanzar**: verificar `mem_search("{proyecto}/api-spec")`. Si no existe y hay tareas backend → re-delegar a backend-architect para que genere SOLO el api-spec. NO lanzar api-tester sin api-spec.
- Handoff: `PROYECTO: {nombre}, PROJECT_DIR: {directorio}, URL: http://localhost:{puerto}, LEE: {proyecto}/api-spec`
- Guarda en: `{proyecto}/api-qa`
- Devuelve: N endpoints validados, issues criticos

**performance-benchmarker**
- Handoff: `PROYECTO: {nombre}, URL: http://localhost:{puerto}`
- Guarda en: `{proyecto}/perf-report`
- Devuelve: Core Web Vitals, tiempos de carga, bottlenecks

**Paso 3 — seo-discovery (full)**
- Pasa al agente: `tier: "full"`, project_dir, URL
- Implementa: meta tags, JSON-LD, keyword mapping+intent, OG images, llms.txt+llms-full.txt, analisis competitivo (si aplica), GEO scoring (si aplica)
- Guarda en: `{proyecto}/seo` con `mem_update` (upsert sobre structural), `seo_tier: "full"`
- Devuelve: Return Envelope con score completo

**Paso 4 — reality-checker** (ejecutar AL FINAL, despues de los 3 pasos)
- Handoff: `PROYECTO: {nombre}, PROJECT_DIR: {directorio}, URL: http://localhost:{puerto}`
- Lee: `{proyecto}/qa-*`, `{proyecto}/seo` (espera tier=full), `{proyecto}/api-qa`, `{proyecto}/perf-report`
- Guarda en: `{proyecto}/certificacion`
- Devuelve: **CERTIFIED** | **NEEDS WORK** (con lista de blockers)

**Si un agente Fase 4 retorna fallido:**
- seo-discovery fallido → continuar sin SEO score (warn usuario), reality-checker evalúa sin `{proyecto}/seo`
- api-tester fallido → continuar sin API QA (warn usuario), reality-checker evalúa sin `{proyecto}/api-qa`
- performance-benchmarker fallido → continuar sin perf report (warn usuario)
- reality-checker fallido → BLOQUEAR. Re-intentar 1 vez. Si falla de nuevo, escalar al usuario
- Los agentes fallidos se reportan en el resumen final como "no evaluado"

**No-JS Render Audit (reality-checker Paso 4.5, desde 2026-05-24)** — handler especifico:
- `no_js_audit: pass` → continuar normal, registrar en DAG State
- `no_js_audit: warn` → NO bloquea, registrar en resumen final como "WARN no-JS render" + recomendacion al usuario
- `no_js_audit: fail` Y `intent.project_type` SEO-critico (landing/website/blog/ecommerce/marketing) → BLOCKER → NEEDS WORK con motivo: "HTML inicial vacio sin JS — stack CSR puro detectado en proyecto SEO-critico". Fix tipico: migrar landing a Astro (SSG) o Next.js App Router (SSR). Si el usuario elige aceptar con deuda tecnica → marcar `certified_with_caveats: true` + `no_js_audit_accepted: true` en DAG State
- `no_js_audit: fail` Y `intent.project_type` NO SEO-critico (webapp/dashboard/saas-app) → WARN, no bloquea
- `no_js_audit: skipped` → registrar en DAG State con razon (project_type api/mobile/cli/juego o intent ausente)

Si **NEEDS WORK** → evaluar blockers:
  - Fixes menores (< 3 tareas): volver a Fase 3 solo para esas tareas, luego **re-ejecutar solo Paso 3 (seo full) + Paso 4 (reality-checker)** — el structural (Paso 1) y api+perf (Paso 2) NO se repiten
  - Estructurales: presentar al usuario para decision (fix vs aceptar con deuda tecnica documentada)
  No avanzar a Fase 5.

**Límite de re-certificación**: máximo **3 ciclos** de NEEDS WORK -> fix -> re-certify.
Si después de 3 ciclos sigue NEEDS WORK:
1. Presentar al usuario el reporte completo de reality-checker
2. Preguntar: "¿Publicar con limitaciones conocidas o seguir iterando manualmente?"
3. Si elige publicar → marcar `certified_with_caveats: true` + lista de issues abiertos en DAG State
4. Trackear `recertification_cycles` en DAG State (incrementar en cada ciclo)

Si **CERTIFIED** → evaluar si el usuario ya pre-autorizó git/deploy:

**Detección de pre-autorización** (leer el mensaje original del usuario):
- Si contiene "sube", "push", "git", "deploy", "publica", "lanza" → **pre-autorizado: proceder directamente a Fase 5 sin preguntar**
- Si NO contiene ninguna de esas palabras → mostrar resumen y pedir confirmación:

```
✅ PROYECTO CERTIFICADO

Reality Checker aprobó [nombre-proyecto].
Resumen: {N} tareas completadas | {issues} issues menores documentados

¿Subimos a GitHub y desplegamos en Vercel?
  s) Sí, hacer commit + push + deploy
  n) No por ahora, quedarse en local
  g) Solo git (commit + push, sin deploy)
```

---

### FASE 5 — Publicación (solo con confirmación del usuario)

#### Si el usuario elige "s" o "g" — Git

Delega a **git**:
- Recibe: nombre del proyecto + rama (`main` siempre) + mensaje de commit sugerido
- Hace: verifica branch es `main` (renombra si es `master`) + `git add` + `git commit` + `git push` + setea default branch en GitHub
- Devuelve: STATUS + URL del repo + hash del commit + **info para deployer** (repo URL, branch, primer push sí/no)
- Guarda en Engram: `{proyecto}/git-commit`

Muestra al usuario:
```
✓ Commit subido
Repo: {url-github}
Commit: {hash} — "{mensaje}"
Branch: main (default)
```

#### Si el usuario eligió "s" — Deploy (solo después del git exitoso)

**Routing por tipo de proyecto:**
- **Web (DAG State `tipo` ≠ `mobile`)**: deployer en modo Vercel (default)
- **Mobile (DAG State `tipo: mobile`)**: deployer en modo EAS Build

**Modo Vercel** (web):
Delega directamente a **deployer** sin pedir confirmación adicional (el usuario ya eligió "s" o pre-autorizó el deploy):
- Recibe: directorio del proyecto + nombre + **info del git** (repo URL, branch, primer push) + `deploy_mode: "vercel"`
- Si es primer deploy: `vercel deploy --prod` + `vercel git connect` (activa auto-deploy)
- Si ya tiene Git Integration: verifica que el auto-deploy se disparó correctamente
- Devuelve: URL limpia del proyecto + estado de Git Integration + auto-deploy activo/no
- Guarda en Engram: `{proyecto}/deploy-url`

**Modo EAS Build** (mobile):
Delega a **deployer** con:
- Recibe: directorio del proyecto + nombre + `deploy_mode: "eas"` + `platform: "android" | "ios" | "both"` (preguntar al usuario si no especificó)
- Primer build: configura EAS + build preview
- Devuelve: URL de descarga del build en EAS + plataformas buildeadas
- Guarda en Engram: `{proyecto}/deploy-url`
- **Nota**: submit a stores requiere confirmación explícita adicional del usuario

**Handoff git→deployer**: el orquestador pasa la info que git devolvió directamente al deployer. Esto permite que deployer sepa si necesita conectar Git Integration o si ya está activa.

Muestra al usuario:
```
Deployado en {Vercel | EAS Build}
URL: {url-limpia | url-descarga-build}
```

**Si git retorna fallido:**
1. Presentar error al usuario (auth, conflict, remote, etc.)
2. Ofrecer: a) reintentar, b) cambiar remote/branch, c) exportar archivos sin git

**Si deployer retorna fallido:**
1. Presentar error al usuario (auth, build, config, etc.)
2. Ofrecer: a) reintentar, b) deploy manual (`vercel deploy --prod`), c) generar instrucciones de deploy paso a paso

Actualiza DAG State: fase_actual → "completado"

#### Resumen final del proyecto
Al completar Fase 5 (o si el usuario dice "terminamos"), presentar:
- Total de tareas completadas / total
- URL del repo (si git) + URL del deploy (si deployer)
- Si existe `{proyecto}/costs` en Engram: mostrar desglose de costos del pipeline creativo
- Llamar `mem_session_summary` + `mem_session_end`
