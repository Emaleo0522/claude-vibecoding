#!/usr/bin/env node
/**
 * jev-review-check.js — Pre-review barato del diff con jev-review (Jev / TypeSafe AI), en modo prueba (shadow).
 *
 * Prueba 2026-09-21 → 2026-10-21 (CLAUDE.md § "Prueba jev-review"): Claude corre esto antes de cada commit
 * no-trivial, hace la fresh review de siempre y después registra si Jev coincidió. Al cierre, --report decide.
 *
 * Uso:
 *   node ~/.claude/hooks/jev-review-check.js --repo <path>                       # corre jev-review, imprime resumen, loguea run
 *   node ~/.claude/hooks/jev-review-check.js --verdict <run_id> <agree|partial|disagree|noise> [--note "..."]
 *   node ~/.claude/hooks/jev-review-check.js --report                            # resumen de la prueba
 *
 * Requiere: clone de github.com/devagrawal09/jev-review con `npm install` (default ~/dev/jev-review, override JEV_REVIEW_DIR),
 * TYPESAFE_API_KEY en env, y Node >=24 o `tsx` instalado en el clone (Node 20: `npm i --no-save tsx`).
 * Fail-open: cualquier falta → "SKIP" + exit 0. Nunca bloquea un commit.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const LOG = path.join(os.homedir(), '.claude', 'logs', 'jev-review-trial.jsonl');
const JEV_REVIEW_DIR = process.env.JEV_REVIEW_DIR || path.join(os.homedir(), 'dev', 'jev-review');
const PRICE_IN = 0.042; // USD / M input tokens — jev-review no reporta tokens; se estima por chars del diff

function skip(msg) { console.log('jev-review-check: SKIP — ' + msg); process.exit(0); }
function readLog() {
  if (!fs.existsSync(LOG)) return [];
  return fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function appendLog(entry) { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, JSON.stringify(entry) + '\n'); }

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const vi = a.indexOf('--verdict');
  return { repo: get('--repo'), report: a.includes('--report'), note: get('--note'), verdict: vi >= 0 ? { run: a[vi + 1], value: a[vi + 2] } : null };
}

function runReview(repo) {
  const cli = path.join(JEV_REVIEW_DIR, 'src', 'cli', 'review-changes.ts');
  if (!fs.existsSync(cli)) skip(`jev-review no encontrado en ${JEV_REVIEW_DIR} (git clone https://github.com/devagrawal09/jev-review ~/dev/jev-review && cd ~/dev/jev-review && npm install && npm i --no-save tsx)`);
  if (!process.env.TYPESAFE_API_KEY) skip('TYPESAFE_API_KEY no configurada');
  const major = Number(process.versions.node.split('.')[0]);
  const args = major >= 24 ? [cli, repo] : ['--import', 'tsx', cli, repo];
  if (major < 24 && !fs.existsSync(path.join(JEV_REVIEW_DIR, 'node_modules', 'tsx'))) skip(`Node ${process.versions.node} < 24 y falta tsx en ${JEV_REVIEW_DIR} (npm i --no-save tsx)`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: JEV_REVIEW_DIR, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 120000 });
  if (r.status !== 0) skip('jev-review falló: ' + (r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' | '));
  let out;
  try { out = JSON.parse(r.stdout); } catch { skip('salida no parseable de jev-review'); }
  return { out, ms: Date.now() - t0 };
}

function main() {
  const { repo, report, verdict, note } = parseArgs();

  if (verdict) {
    if (!['agree', 'partial', 'disagree', 'noise'].includes(verdict.value)) { console.error('verdict: agree | partial | disagree | noise'); process.exit(1); }
    const runs = readLog().filter(e => e.kind === 'run' && e.run_id === verdict.run);
    if (!runs.length) { console.error('run_id no encontrado: ' + verdict.run); process.exit(1); }
    appendLog({ kind: 'verdict', ts: new Date().toISOString(), run_id: verdict.run, verdict: verdict.value, note: note || '' });
    console.log(`jev-review-check: verdict ${verdict.value} registrado para ${verdict.run}`);
    return;
  }

  if (report) {
    const log = readLog();
    const runs = log.filter(e => e.kind === 'run');
    const verdicts = Object.fromEntries(log.filter(e => e.kind === 'verdict').map(e => [e.run_id, e]));
    const count = (k) => runs.filter(r => verdicts[r.run_id]?.verdict === k).length;
    const withF = runs.filter(r => r.findings.length);
    console.log(`== Prueba jev-review — ${runs.length} runs (${runs.filter(r => r.skipped).length} skip) | ${withF.length} con findings | ${runs.length - Object.keys(verdicts).length} sin verdict ==`);
    console.log(`verdicts: agree ${count('agree')} · partial ${count('partial')} · disagree ${count('disagree')} · noise ${count('noise')}`);
    const dims = {};
    for (const r of runs) for (const f of r.findings) dims[f.dimension] = (dims[f.dimension] || 0) + 1;
    console.log('findings por dimensión:', JSON.stringify(dims));
    console.log(`latencia media ${Math.round(runs.reduce((a, r) => a + r.ms, 0) / (runs.length || 1))} ms | costo estimado $${runs.reduce((a, r) => a + r.cost_est_usd, 0).toFixed(6)}`);
    for (const r of runs) console.log(`  ${r.run_id} ${r.repo.split('/').pop()} files=${r.files} findings=${r.findings.length} ${verdicts[r.run_id] ? verdicts[r.run_id].verdict + (verdicts[r.run_id].note ? ' — ' + verdicts[r.run_id].note : '') : '(sin verdict)'}`);
    return;
  }

  if (!repo) { console.error('Uso: --repo <path> | --verdict <run_id> <agree|partial|disagree|noise> [--note ..] | --report'); process.exit(1); }
  const abs = path.resolve(repo);
  const st = spawnSync('git', ['-C', abs, 'status', '--porcelain'], { encoding: 'utf8' });
  if (st.status !== 0) skip(`${abs} no es un repo git`);
  if (!st.stdout.trim()) skip('working tree limpio — nada que revisar (jev-review compara vs HEAD; correr antes de commitear)');
  const diffChars = (spawnSync('git', ['-C', abs, 'diff', 'HEAD'], { encoding: 'utf8', maxBuffer: 64 << 20 }).stdout || '').length;

  const { out, ms } = runReview(abs);
  const run_id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 5);
  const findings = (out.findings || []).map(f => ({ file: f.file, dimension: f.dimension, p: f.probability, line: f.line, mechanism: f.mechanism, severity: f.severity, action: f.action }));
  const matrix = (out.matrix || []).map(m => ({ file: m.file, max: Math.max(...['correctness', 'security', 'reliability', 'compatibility', 'testGap'].map(k => m[k] || 0)) }));
  // Estimación: cada archivo se manda con el diff + contexto ~5 veces (screen, profile, evidence, mechanism, severity)
  const cost_est_usd = +(diffChars / 4 * 5 * PRICE_IN / 1e6).toFixed(6);
  appendLog({ kind: 'run', ts: new Date().toISOString(), run_id, repo: abs, files: (out.screenedFiles || 0), ms, cost_est_usd, findings, matrix });

  const rc = findings.filter(f => f.action === 'request_changes');
  console.log(`jev-review-check: run ${run_id} | ${(out.screenedFiles || 0)} archivos | ${findings.length} findings (${rc.length} request_changes) | ${ms} ms`);
  for (const f of findings) console.log(`  ${f.action === 'request_changes' ? '✗' : '•'} ${f.file}:${f.line} ${f.dimension} p=${f.p} sev=${f.severity} (${f.mechanism})`);
  console.log(`  → tras tu fresh review: node ~/.claude/hooks/jev-review-check.js --verdict ${run_id} <agree|partial|disagree|noise> --note "..."`);
}

try { main(); } catch (e) { skip('error inesperado: ' + e.message); }
