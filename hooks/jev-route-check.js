#!/usr/bin/env node
/**
 * jev-route-check.js — Pre-gate de routing + seguridad con Jev (TypeSafe AI) sobre la lista de tareas del PM.
 * Eval 2026-09-21 (Engram claude-vibecoding #3402): 93% acierto de agente en 117 tareas reales, $0.005 total.
 *
 * Uso (lo invoca el orquestador en Fase 1 paso 5b, después de project-manager-senior):
 *   node ~/.claude/hooks/jev-route-check.js --file {project_dir}/.pipeline/tareas.md [--project nombre] [--json]
 *
 * Lee el dual-write en disco (nunca Engram — no infla contexto). Por cada tarea pregunta:
 *   agente         → choice entre los agentes dev del pipeline (segunda opinión al Tipo/Agente del PM)
 *   toca_seguridad → noul: auth/permisos/secrets/validación/headers/RLS
 * Escribe {project_dir}/.pipeline/jev-route-check.json y devuelve por stdout un resumen corto.
 *
 * Umbrales: discrepancia se reporta solo con conf >= 0.90; flag de seguridad con p >= 0.80.
 * Fail-open: sin TYPESAFE_API_KEY, sin red o error de API → "SKIP" + exit 0. Nunca bloquea el pipeline.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const API = 'https://api.typesafe.ai/v1/systemone';
const LOG = path.join(os.homedir(), '.claude', 'logs', 'jev-route-check.jsonl');
const CONF_MIN = 0.9;
const SEC_MIN = 0.8;
const PRICE_IN = 0.042; // USD / M input tokens (early access 2026-09)

// Agentes dev del pipeline que pueden recibir una tarea en Fase 3 (+ los de Fase 2/2B que a veces aparecen en tareas)
const AGENTES = {
  'frontend-developer': 'UI web: React/Vue/TS, Tailwind, componentes, secciones de landing, animaciones, Three.js, Phaser',
  'backend-architect': 'APIs, schemas de DB, migraciones, Drizzle/Prisma, Hono/Express, Supabase server-side, RLS, storage, setup de monorepo/workspace',
  'mobile-developer': 'Apps móviles React Native / Expo, navegación nativa, NativeWind',
  'xr-immersive-developer': 'Implementación de juegos de navegador: Canvas, Phaser, PixiJS, WebGL, game loop, física',
  'game-designer': 'Game Design Document: mecánicas, loops, economía, balance (diseño, no código)',
  'rapid-prototyper': 'MVP full-stack completo en una sola tarea (Next.js + Prisma + Supabase)',
  'image-agent': 'Generación de imágenes (hero, fondos, thumbnails, fotos de producto)',
  'logo-agent': 'Generación de logos SVG',
  'brand-agent': 'Identidad visual: paleta, tipografía, tono, brand.json',
  'ux-architect': 'Fundación CSS: design tokens, layout, breakpoints, tema claro/oscuro',
  'ui-designer': 'Design system visual: componentes, estados, paleta aplicada',
  'security-engineer': 'Threat modeling, headers de seguridad, OWASP, cifrado, rate limiting, validaciones críticas',
  'evidence-collector': 'QA visual con screenshots, validación contra spec',
};
// Tipo del PM → agente por defecto (tabla Fase 3 paso 2 de orquestador.md). config no mapea: depende del contenido.
const TIPO_AGENTE = { frontend: 'frontend-developer', backend: 'backend-architect', mobile: 'mobile-developer', juego: 'xr-immersive-developer', fullstack: 'rapid-prototyper' };

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  return { file: get('--file'), project: get('--project'), json: a.includes('--json') };
}

const clean = (s) => s.replace(/\*\*/g, '').replace(/\n{2,}/g, '\n').trim();

// Formatos del PM vistos en producción: "Tarea 3: x", "## Tarea 0: x", "### T01: x", "### T-01: x", "### TAREA 2 — x", "### Tarea A1: x"
const HDR = /^(?:#{1,4}\s*)?(?:\*\*)?(?:Tarea|TAREA|T)[-\s]?([A-Z]?\d+)(?:\*\*)?\s*[:—–-]\s*(.+?)\s*(?:\*\*)?\s*$/gm;
function parseMarkdown(content) {
  const idx = []; let m;
  HDR.lastIndex = 0;
  while ((m = HDR.exec(content))) idx.push({ n: m[1], title: clean(m[2]), start: m.index, end: m.index + m[0].length });
  return idx.map((h, i) => {
    const block = content.slice(h.end, idx[i + 1] ? idx[i + 1].start : undefined);
    const agente = (block.match(/\*{0,2}Agente\*{0,2}\s*:\s*\*{0,2}([a-z0-9-]+)/i) || [])[1];
    const tipo = (block.match(/\*{0,2}Tipo\*{0,2}\s*:\s*\*{0,2}([a-z0-9-]+)/i) || [])[1];
    const desc = clean(block.split('\n').filter(l => !/^\s*[-*]?\s*\*{0,2}(Agente|Tipo)\*{0,2}\s*:/i.test(l)).join('\n')).slice(0, 700);
    return { n: h.n, title: h.title, pm_agente: agente ? agente.toLowerCase() : null, tipo: tipo ? tipo.toLowerCase() : null, desc };
  }).filter(t => t.desc.length >= 40);
}
// tareas.yaml del pipeline: bloques "- id: N / title: / agent: / description: |"
function parseYaml(content) {
  const parts = content.split(/^\s+- id:\s*(\d+)\s*$/m).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const b = parts[i + 1];
    const title = (b.match(/^\s+title:\s*"?(.+?)"?\s*$/m) || [])[1];
    const agent = (b.match(/^\s+agent:\s*([a-z0-9-]+)/m) || [])[1];
    const desc = (b.match(/^\s+description:\s*\|?\s*\n([\s\S]*?)(?=^\s{4}[a-z_]+:)/m) || [])[1] || '';
    if (title) out.push({ n: parts[i], title, pm_agente: agent || null, tipo: null, desc: clean(desc.replace(/^\s+/gm, '')).slice(0, 700) });
  }
  return out.filter(t => t.desc.length >= 40);
}

async function ask(key, project, t) {
  const body = {
    model: 'jev-latest',
    state: { proyecto: project, tarea: t.title, descripcion: t.desc },
    questions: {
      agente: { type: 'choice', instructions: 'En un pipeline de desarrollo con subagentes especializados, ¿qué agente debe ejecutar esta tarea?', criteria: AGENTES },
      toca_seguridad: { type: 'noul', instructions: '¿La tarea implementa o modifica algo de seguridad (autenticación, autorización, secrets, headers, validación de input, RLS, cifrado, rate limiting)?', criteria: { true: 'Sí, toca auth/permisos/secrets/validación/headers/cifrado', false: 'No toca seguridad' } },
    },
  };
  const res = await fetch(API, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 160));
  const j = await res.json();
  return { jev_agente: j.answers.agente.choice, conf: j.answers.agente.confidence, seguridad_p: j.answers.toca_seguridad.noul, tokens: j.usage.input_tokens };
}

function skip(msg) { console.log('jev-route-check: SKIP — ' + msg); process.exit(0); }

(async () => {
  const { file, project, json } = parseArgs();
  if (!file) { console.error('Uso: node jev-route-check.js --file {project_dir}/.pipeline/tareas.md [--project nombre] [--json]'); process.exit(1); }
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) skip('TYPESAFE_API_KEY no configurada (fail-open)');
  if (!fs.existsSync(file)) skip('no existe ' + file);
  const content = fs.readFileSync(file, 'utf8');
  const tasks = (file.endsWith('.yaml') || file.endsWith('.yml') ? parseYaml : parseMarkdown)(content);
  if (!tasks.length) skip('no se pudieron parsear tareas en ' + file);
  const proj = project || path.basename(path.resolve(file, '..', '..'));

  const t0 = Date.now();
  const results = [];
  const CONC = 4;
  for (let i = 0; i < tasks.length; i += CONC) {
    const batch = await Promise.all(tasks.slice(i, i + CONC).map(t => ask(key, proj, t).then(r => ({ ...t, ...r })).catch(e => ({ ...t, error: e.message }))));
    results.push(...batch);
  }
  const ok = results.filter(r => !r.error);
  if (!ok.length) skip('API falló en todas las tareas: ' + (results[0].error || '?'));

  for (const r of ok) {
    const expected = r.pm_agente || TIPO_AGENTE[r.tipo] || null;
    r.pm_agente_efectivo = expected;
    r.discrepancia = !!(expected && r.jev_agente !== expected && r.conf >= CONF_MIN);
    r.security_review = r.seguridad_p >= SEC_MIN;
  }
  const disc = ok.filter(r => r.discrepancia);
  const sec = ok.filter(r => r.security_review);
  const tokens = ok.reduce((a, r) => a + r.tokens, 0);
  const cost = tokens * PRICE_IN / 1e6;

  const outFile = path.join(path.dirname(file), 'jev-route-check.json');
  const report = {
    project: proj, file, generated_at: new Date().toISOString(), model: 'jev-latest', thresholds: { conf_min: CONF_MIN, sec_min: SEC_MIN },
    tareas: ok.length, errores: results.length - ok.length, tokens, cost_usd: +cost.toFixed(6), ms: Date.now() - t0,
    discrepancias: disc.map(r => ({ n: r.n, title: r.title, pm: r.pm_agente_efectivo, jev: r.jev_agente, conf: r.conf })),
    security_review: sec.map(r => ({ n: r.n, title: r.title, p: r.seguridad_p })),
    tasks: ok.map(({ desc, ...r }) => r),
  };
  fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify({ ts: report.generated_at, project: proj, tareas: ok.length, tokens, cost_usd: report.cost_usd, discrepancias: disc.length, security_review: sec.length, ms: report.ms }) + '\n');
  } catch { /* log es best-effort */ }

  if (json) { console.log(JSON.stringify(report)); return; }
  console.log(`jev-route-check: ${ok.length} tareas | ${disc.length} discrepancias (conf≥${CONF_MIN}) | ${sec.length} con security_review (p≥${SEC_MIN}) | ${report.ms} ms | $${report.cost_usd}`);
  for (const d of report.discrepancias) console.log(`  ↔ Tarea ${d.n} "${d.title.slice(0, 60)}": PM=${d.pm} → Jev=${d.jev} [${d.conf}]`);
  for (const s of report.security_review) console.log(`  🔒 Tarea ${s.n} "${s.title.slice(0, 60)}" [p=${s.p}]`);
  console.log(`  → ${outFile}`);
})().catch(e => skip('error inesperado: ' + e.message));
