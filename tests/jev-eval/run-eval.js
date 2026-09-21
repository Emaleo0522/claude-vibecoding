// Evalúa Jev como pre-gate de routing del pipeline vibecoding contra las decisiones reales del project-manager-senior.
// Uso: TYPESAFE_API_KEY=... node run-eval.js [--limit N]
const fs = require('fs');
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error('Falta TYPESAFE_API_KEY'); process.exit(1); }
const limit = Number((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity;
const tasks = require('./dataset.json').slice(0, limit);

const AGENTES = {
  'frontend-developer': 'UI web: React/Vue/TS, Tailwind, componentes, secciones de landing, animaciones, Three.js, Phaser',
  'backend-architect': 'APIs, schemas de DB, migraciones, Drizzle/Prisma, Hono/Express, Supabase server-side, RLS, storage',
  'mobile-developer': 'Apps móviles React Native / Expo, navegación nativa, NativeWind',
  'image-agent': 'Generación de imágenes (hero, fondos, thumbnails, fotos de producto)',
  'logo-agent': 'Generación de logos SVG',
  'brand-agent': 'Identidad visual: paleta, tipografía, tono, brand.json',
  'ux-architect': 'Fundación CSS: design tokens, layout, breakpoints, tema claro/oscuro',
  'ui-designer': 'Design system visual: componentes, estados, paleta aplicada',
  'security-engineer': 'Threat modeling, headers de seguridad, OWASP, validaciones críticas',
  'evidence-collector': 'QA visual con screenshots, validación contra spec',
  'rapid-prototyper': 'MVP full-stack completo en una sola tarea (Next.js + Prisma + Supabase)',
};
const TIPOS = {
  config: 'Setup del proyecto, scaffolding, dependencias, tooling, CI, monorepo',
  frontend: 'Interfaz de usuario, componentes, estilos, animaciones, escenas 3D',
  backend: 'API, base de datos, schema, auth server-side, lógica de servidor',
  fullstack: 'Una sola tarea que cubre frontend y backend juntos',
};
const normTipo = (t) => ({ setup: 'config', 'frontend-3d': 'frontend' }[t] || t);
const SEC_RE = /\b(auth|login|signup|sesi[oó]n|rls|jwt|password|contrase|secret|token|cors|helmet|csp|rate.?limit|saniti|xss|csrf|permis|policy|policies|encrypt|hash)/i;

async function ask(t) {
  const body = {
    model: 'jev-latest',
    state: { proyecto: t.project, tarea: t.title, descripcion: t.desc },
    questions: {
      agente: { type: 'choice', instructions: 'En un pipeline de desarrollo con subagentes especializados, ¿qué agente debe ejecutar esta tarea?', criteria: AGENTES },
      tipo: { type: 'choice', instructions: 'Tipo de tarea', criteria: TIPOS },
      toca_seguridad: { type: 'noul', instructions: '¿La tarea implementa o modifica algo de seguridad (autenticación, autorización, secrets, headers, validación de input, RLS)?', criteria: { true: 'Sí, toca auth/permisos/secrets/validación/headers', false: 'No toca seguridad' } },
    },
  };
  const t0 = Date.now();
  const res = await fetch('https://api.typesafe.ai/v1/systemone', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const ms = Date.now() - t0;
  if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json();
  return { ms, tokens: j.usage.input_tokens, agente: j.answers.agente.choice, agente_conf: j.answers.agente.confidence, tipo: j.answers.tipo.choice, tipo_conf: j.answers.tipo.confidence, sec: j.answers.toca_seguridad.noul };
}

(async () => {
  const out = [];
  const CONC = 4;
  for (let i = 0; i < tasks.length; i += CONC) {
    const batch = await Promise.all(tasks.slice(i, i + CONC).map(t => ask(t).then(r => ({ ...t, jev: r })).catch(e => ({ ...t, error: e.message }))));
    out.push(...batch);
    process.stderr.write(`\r${out.length}/${tasks.length}`);
  }
  process.stderr.write('\n');
  fs.writeFileSync('results.json', JSON.stringify(out, null, 1));

  const ok = out.filter(r => r.jev);
  const errs = out.filter(r => r.error);
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : 'n/a';
  const agCases = ok.filter(r => r.agente && AGENTES[r.agente]);
  const agHit = agCases.filter(r => r.jev.agente === r.agente);
  const tpCases = ok.filter(r => r.tipo && TIPOS[normTipo(r.tipo)]);
  const tpHit = tpCases.filter(r => r.jev.tipo === normTipo(r.tipo));
  const secGT = ok.map(r => ({ r, gt: SEC_RE.test(r.title + ' ' + r.desc), pred: r.jev.sec >= 0.5 }));
  const secHit = secGT.filter(x => x.gt === x.pred);
  const hi = agCases.filter(r => r.jev.agente_conf >= 0.8), lo = agCases.filter(r => r.jev.agente_conf < 0.8);
  const totTok = ok.reduce((a, r) => a + r.jev.tokens, 0);
  const avgMs = ok.reduce((a, r) => a + r.jev.ms, 0) / ok.length;

  console.log(`\n== Jev eval — ${ok.length} tareas OK, ${errs.length} errores ==`);
  console.log(`agente (routing):   ${agHit.length}/${agCases.length} = ${pct(agHit.length, agCases.length)}`);
  console.log(`  conf>=0.8:        ${hi.filter(r => r.jev.agente === r.agente).length}/${hi.length} = ${pct(hi.filter(r => r.jev.agente === r.agente).length, hi.length)}`);
  console.log(`  conf<0.8:         ${lo.filter(r => r.jev.agente === r.agente).length}/${lo.length} = ${pct(lo.filter(r => r.jev.agente === r.agente).length, lo.length)}`);
  console.log(`tipo:               ${tpHit.length}/${tpCases.length} = ${pct(tpHit.length, tpCases.length)}`);
  console.log(`toca_seguridad vs regex: ${secHit.length}/${secGT.length} = ${pct(secHit.length, secGT.length)}  (regex es proxy, revisar desacuerdos)`);
  console.log(`latencia media ${avgMs.toFixed(0)} ms | tokens ${totTok} | costo ~$${(totTok * 0.042 / 1e6).toFixed(5)}`);

  console.log('\n-- Desacuerdos agente (GT → Jev [conf]):');
  for (const r of agCases.filter(r => r.jev.agente !== r.agente)) console.log(`  ${r.project} / ${r.title.slice(0, 55)}: ${r.agente} → ${r.jev.agente} [${r.jev.agente_conf}]`);
  console.log('\n-- Desacuerdos tipo (GT → Jev [conf]):');
  for (const r of tpCases.filter(r => r.jev.tipo !== normTipo(r.tipo))) console.log(`  ${r.project} / ${r.title.slice(0, 55)}: ${r.tipo} → ${r.jev.tipo} [${r.jev.tipo_conf}]`);
  console.log('\n-- Desacuerdos seguridad (regex → Jev p):');
  for (const x of secGT.filter(x => x.gt !== x.pred)) console.log(`  ${x.r.project} / ${x.r.title.slice(0, 55)}: regex=${x.gt} → jev=${x.r.jev.sec}`);
  if (errs.length) console.log('\n-- Errores:', errs.map(e => e.error).slice(0, 3));
})();
