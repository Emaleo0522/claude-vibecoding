#!/usr/bin/env node
/**
 * risk-line.js — mide si cada trabajo con cambios cierra con su línea `Riesgo:`
 * (CLAUDE.md global § "Método con red", paso 6). SOLO REGISTRO: nunca bloquea,
 * nunca escribe a stdout/stderr, siempre exit 0.
 *
 * Eventos (settings.json, timeout 5):
 *   PostToolUse Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell → anota cambios
 *   PreToolUse Agent → anota revisores lanzados con la consigna de evidencia
 *   Stop → si no quedan subagentes en segundo plano y hubo cambios, registra en
 *          ~/.claude/logs/riesgo-line.jsonl y empieza de cero
 *
 * El estado es un archivo de eventos por sesión al que solo se le agregan líneas:
 * las herramientas en paralelo disparan PostToolUse a la vez y un leer-modificar-escribir
 * perdía marcas y llegó a dejar el JSON ilegible (verificado 2026-11-03).
 *
 * Reporte: node risk-line.js --report
 * Spec: docs/specs/linea-riesgo-hook.md
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME = process.env.USERPROFILE || process.env.HOME || os.homedir();
const DEFAULTS = {
  stateDir: process.env.RIESGO_STATE_DIR || path.join(HOME, '.claude', 'state', 'riesgo'),
  logFile: process.env.RIESGO_LOG_FILE || path.join(HOME, '.claude', 'logs', 'riesgo-line.jsonl'),
  tmpRoots: [os.tmpdir()],
};
const STALE_MS = 12 * 3600 * 1000;

const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.gd',
  '.sh', '.ps1', '.sql', '.prisma', '.css', '.scss', '.html', '.vue', '.svelte', '.astro', '.json', '.yaml', '.yml', '.toml',
  '.glsl', '.ipynb']);
const CODE_NAMES = new Set(['dockerfile', 'makefile']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
// Background tasks que todavía van a volver con trabajo: mientras existan, el trabajo no está cerrado.
const AGENT_TASKS = new Set(['subagent', 'workflow', 'teammate']);
// Orden importa: la primera que coincide nombra la operación.
const OPS = [
  ['git push', /^git(\s+(-C\s+("[^"]*"|'[^']*'|\S+)|-c\s+\S+))*\s+push\b/],
  ['ssh', /^(ssh|scp|rsync)\b/],
  ['gh pr merge', /^gh\s+pr\s+merge\b/],
  ['deploy', /^((npx\s+)?vercel\b.*(--prod|\bdeploy\b)|npm\s+run\s+deploy\b|(npx\s+)?eas\s+(submit|build)\b)/],
  ['migrate', /^((npx\s+)?(prisma\s+migrate|drizzle-kit\s+(push|migrate)|@better-auth\/cli(@\S+)?\s+migrate|supabase\s+db\s+push)\b|npm\s+run\s+(migrate|db:push|db:migrate)\b)/],
  ['docker compose', /^docker[\s-]compose\b.*\bup\b/],
  ['systemctl', /^systemctl\s+(restart|start|stop|reload)\b/],
  ['npm publish', /^npm\s+publish\b/],
];
// Solo cuenta como revisor el agente lanzado con la consigna de evidencia del método.
const REVIEW_RE = /no encontr[ée] problemas|contexto limpio|consigna de evidencia|veredicto/i;

const norm = p => String(p || '').replace(/\\/g, '/').toLowerCase();

function parseRiesgo(text) {
  const out = { present: false, ninguno: false, items: [] };
  if (!text) return out;
  const lines = String(text).split('\n')
    .map(l => l.replace(/[*`_|]/g, ' ').replace(/^\s*(#+|[-+>]|\d+\.)\s+/, '').trim());
  // La línea de cierre es el último "Riesgo:" que empieza una línea u oración;
  // una mención en medio de una frase no cuenta.
  let rest = null;
  for (const l of lines.reverse()) {
    const ms = [...l.matchAll(/(?:^|[.!?]\s+)riesgo\s*:(.*)$/gi)];
    if (ms.length) { rest = ms[ms.length - 1][1]; break; }
  }
  if (rest === null) return out;
  rest = rest.replace(/\([^)]*\)/g, ' ');
  out.ninguno = /^\s*ninguno\b/i.test(rest);
  // Solo los números que siguen a "ítem/ítems" en cadena ("2, 5", "2 y 5"); "deploy en 2 pasos" no es un ítem.
  const nums = [];
  for (const m of rest.matchAll(/[íi]tems?\s*((?:\d+\s*(?:,|\by\b|\be\b)?\s*)+)/gi)) nums.push(...m[1].match(/\d+/g));
  out.items = [...new Set(nums.map(Number).filter(n => n >= 1 && n <= 7))];
  out.present = out.ninguno || out.items.length > 0;
  return out;
}

function isCodePath(file, opts = DEFAULTS) {
  const p = norm(file);
  if (!p) return false;
  if (!CODE_EXT.has(path.extname(p)) && !CODE_NAMES.has(path.basename(p))) return false;
  if (/\/scratchpad\/|\/appdata\/local\/temp\/|^\/tmp\/|\/\.claude\/projects\/[^/]+\/memory\//.test(p)) return false;
  return !(opts.tmpRoots || []).some(t => p.startsWith(norm(t) + '/'));
}

// Parte un comando en segmentos por && || ; | y salto de línea, respetando comillas,
// y corta en el primer heredoc (<<): su cuerpo es texto, no comandos.
function segments(cmd) {
  const out = [];
  let cur = '', q = null;
  const s = String(cmd || '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '<' && s[i + 1] === '<') break;
    if (c === ';' || c === '\n' || c === '|' || (c === '&' && s[i + 1] === '&')) {
      out.push(cur); cur = '';
      if ((c === '|' && s[i + 1] === '|') || c === '&') i++;
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function isOpCommand(cmd) {
  for (const seg of segments(cmd)) {
    const s = seg.trim()
      .replace(/^(\w+=("[^"]*"|'[^']*'|\S*)\s+)+/, '')  // VAR=valor delante del comando
      .replace(/^sudo\s+/, '');
    for (const [name, re] of OPS) if (re.test(s)) return name;
  }
  return null;
}

const stateFile = (sid, opts) => path.join(opts.stateDir, String(sid || 'sin-sesion').replace(/[^\w.-]/g, '_') + '.jsonl');

function append(sid, ev, opts) {
  fs.mkdirSync(opts.stateDir, { recursive: true });
  fs.appendFileSync(stateFile(sid, opts), JSON.stringify({ ...ev, ts: (opts.now || Date.now)() }) + '\n');
}

function readEvents(sid, opts) {
  let raw = '';
  try { raw = fs.readFileSync(stateFile(sid, opts), 'utf8'); } catch { return []; }
  const out = [];
  for (const l of raw.split('\n')) { if (!l) continue; try { out.push(JSON.parse(l)); } catch { /* línea rota: se saltea */ } }
  return out;
}

function handle(ev, opts = DEFAULTS) {
  const sid = ev.session_id;
  const ti = ev.tool_input || {};
  if (ev.hook_event_name === 'PostToolUse') {
    if (EDIT_TOOLS.has(ev.tool_name)) {
      const f = ti.file_path || ti.notebook_path;
      if (isCodePath(f, opts)) append(sid, { t: 'code', sub: !!ev.agent_id, f: path.basename(String(f)) }, opts);
    } else if (SHELL_TOOLS.has(ev.tool_name)) {
      const op = isOpCommand(ti.command);
      if (op) append(sid, { t: 'op', op }, opts);
    }
    return null;
  }
  if (ev.hook_event_name === 'PreToolUse') {
    if (ev.tool_name === 'Agent' && REVIEW_RE.test(String(ti.prompt || ''))) append(sid, { t: 'rev' }, opts);
    return null;
  }
  if (ev.hook_event_name !== 'Stop') return null;

  if ((ev.background_tasks || []).some(t => AGENT_TASKS.has(t && t.type))) return null; // todavía hay trabajo afuera
  const now = (opts.now || Date.now)();
  const evs = readEvents(sid, opts).filter(e => now - (e.ts || 0) <= STALE_MS);
  try { fs.unlinkSync(stateFile(sid, opts)); } catch { /* no había estado */ }
  const firstChange = evs.findIndex(e => e.t === 'code' || e.t === 'op');
  if (firstChange < 0) return null;
  const code = evs.filter(e => e.t === 'code');
  const rec = {
    ts: new Date(now).toISOString(), session: sid, cwd: ev.cwd,
    codeEdits: code.length, subagentEdits: code.filter(e => e.sub).length,
    files: [...new Set(code.map(e => e.f))].slice(0, 20),
    ops: [...new Set(evs.filter(e => e.t === 'op').map(e => e.op))],
    riesgo: parseRiesgo(ev.last_assistant_message),
    reviewerLaunched: evs.slice(firstChange + 1).some(e => e.t === 'rev'),
    stopHookActive: !!ev.stop_hook_active,
  };
  fs.mkdirSync(path.dirname(opts.logFile), { recursive: true });
  fs.appendFileSync(opts.logFile, JSON.stringify(rec) + '\n');
  return rec;
}

function report(logFile = DEFAULTS.logFile) {
  let rows = [];
  try { rows = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { /* sin registro todavía */ }
  const r = { turnos: rows.length, conLinea: 0, conItem: 0, itemConRevisor: 0, items: {} };
  for (const x of rows) {
    if (x.riesgo && x.riesgo.present) r.conLinea++;
    const items = (x.riesgo && x.riesgo.items) || [];
    if (items.length) { r.conItem++; if (x.reviewerLaunched) r.itemConRevisor++; }
    for (const n of items) r.items[n] = (r.items[n] || 0) + 1;
  }
  return r;
}

if (require.main === module) {
  if (process.argv.includes('--report')) {
    const r = report();
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0) + '%';
    console.log(`riesgo-line: ${r.turnos} trabajos con cambios · con línea ${r.conLinea} (${pct(r.conLinea, r.turnos)}) · con ítem ${r.conItem} · ítem con revisor ${r.itemConRevisor} (${pct(r.itemConRevisor, r.conItem)}) · ítems ${JSON.stringify(r.items)}`);
    process.exit(0);
  }
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    try { handle(JSON.parse(raw)); } catch { /* fail-open: nunca romper la sesión */ }
    process.exit(0);
  });
  process.stdin.on('error', () => process.exit(0));
}

module.exports = { parseRiesgo, isCodePath, isOpCommand, handle, report };
