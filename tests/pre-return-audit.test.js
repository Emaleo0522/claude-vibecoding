#!/usr/bin/env node
/**
 * TDD: pre-return-audit (PostToolUse async, matcher Write|Edit|MultiEdit).
 * En modo hook los hallazgos tienen que llegar: JSON hookSpecificOutput.additionalContext en una
 * linea por stdout (un hook async entrega additionalContext y systemMessage en el turno siguiente,
 * hooks-doc.md:4093; formato del ejemplo oficial async, hooks-doc.md:4130). Modo CLI igual que antes.
 * Fixtures que disparan y que no disparan cada regla R1-R5.
 *
 * Implementacion bajo prueba: PRA_CMD (por defecto `node hooks/pre-return-audit.js`).
 * Paridad con el .sh viejo: PRA_OLD=<ruta al .sh viejo> agrega la comparacion regla por regla.
 * Sin framework: `node tests/pre-return-audit.test.js`.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const CMD = (process.env.PRA_CMD || `node ${path.join(REPO, 'hooks', 'pre-return-audit.js')}`).split(' ');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pra-test-'));
const fwd = p => p.replace(/\\/g, '/');
// Cada fixture en su carpeta: R2 mira los HTML hermanos.
function fixture(name, files) {
  const dir = path.join(ROOT, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
  return dir;
}
// Estado de deduplicacion aislado del real (PRA_STATE_DIR).
const STATE = path.join(ROOT, '_estado');
function hook(file, tool = 'Write', extra = {}, env = {}) {
  const r = spawnSync(CMD[0], [...CMD.slice(1)], {
    input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: tool, tool_input: { file_path: file }, ...extra }),
    encoding: 'utf8', env: { ...process.env, PRA_STATE_DIR: STATE, ...env },
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function cli(files, cmd = CMD) {
  const r = spawnSync(cmd[0], [...cmd.slice(1), `--files=${files.join(' ')}`], { encoding: 'utf8', input: '' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function hookRules(file, extra, env) {
  const r = hook(file, 'Write', extra, env);
  assert.strictEqual(r.code, 0, `exit ${r.code}`);
  if (!r.stdout.trim()) return [];
  const out = JSON.parse(r.stdout.trim());
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PostToolUse');
  return [...new Set(out.hookSpecificOutput.additionalContext.match(/R\d(?=\[)/g) || [])].sort();
}
const rulesOf = text => [...new Set(text.match(/R\d(?=\[)/g) || [])].sort();

const SIX_TRANSITIONS = Array.from({ length: 6 }, (_, i) => `.a${i} { transition: opacity .2s; }`).join('\n');
const FIVE_TRANSITIONS = Array.from({ length: 5 }, (_, i) => `.a${i} { transition: opacity .2s; }`).join('\n');

const CASES = [
  // [nombre, archivos, archivo a auditar, reglas esperadas]
  ['r1-dispara', { 'a.css': '.container { max-width: 1200px; margin: 0 auto; }' }, 'a.css', ['R1']],
  ['r1-1280', { 'a.css': ':root { --max: 1280px; }' }, 'a.css', ['R1']],
  ['r1-ancho-ok', { 'a.css': '.container { max-width: 1600px; }' }, 'a.css', []],
  ['r1-prose', { 'a.css': '.prose { max-width: 1100px; }' }, 'a.css', []],
  ['r1-container-md', { 'a.css': ':root { --container-md: 1100px; }' }, 'a.css', []],
  ['r1-fluido', { 'a.css': '.c { max-width: min(100% - 2rem, 1200px); }' }, 'a.css', []],
  ['r1-media-query', { 'a.css': '@media (max-width: 1024px) { .a { display: none; } }' }, 'a.css', []],
  ['r1-media-1200', { 'a.css': '@media screen and (max-width:1200px) {\n  .nav { display: none; }\n}' }, 'a.css', []],
  ['r1-container-query', { 'a.css': '@container card (max-width: 1100px) { .t { font-size: 1rem; } }' }, 'a.css', []],
  ['r1-media-y-cap', { 'a.css': '@media (max-width: 1024px) { .a { display: none; } }\n.container { max-width: 1200px; }' }, 'a.css', ['R1']],
  ['r2-dispara', { 'a.css': 'body { font-family: "Satoshi", sans-serif; }' }, 'a.css', ['R2']],
  ['r2-font-face', { 'a.css': '@font-face { font-family: "Satoshi"; src: url(s.woff2); }\nbody { font-family: "Satoshi", sans-serif; }' }, 'a.css', []],
  ['r2-link-hermano', { 'a.css': 'body { font-family: "Sora", sans-serif; }', 'index.html': '<link href="https://fonts.googleapis.com/css2?family=Sora&display=swap" rel="stylesheet">' }, 'a.css', []],
  ['r2-system', { 'a.css': 'body { font-family: system-ui, sans-serif; }' }, 'a.css', []],
  ['r3-dispara', { 'a.css': 'header { position: sticky; top: 0; }' }, 'a.css', ['R3']],
  ['r3-con-padding', { 'a.css': 'html { scroll-padding-top: 80px; }\nheader { position: sticky; top: 0; }' }, 'a.css', []],
  ['r3-sin-sticky', { 'a.css': 'header { position: fixed; top: 0; }' }, 'a.css', []],
  ['r4-dispara', { 'index.html': '<header><nav><a href="#a">A</a></nav></header>' }, 'index.html', ['R4']],
  ['r4-con-toggle', { 'index.html': '<nav><button aria-expanded="false">menu</button></nav>' }, 'index.html', []],
  ['r4-dashboard', { 'panel.html': '<nav><a href="/x">x</a></nav>' }, 'panel.html', []],
  ['r4-landing-jsx', { 'Home.jsx': 'export default () => <nav className="hero"><a>x</a></nav>;' }, 'Home.jsx', ['R4']],
  ['r5-dispara', { 'a.css': SIX_TRANSITIONS }, 'a.css', ['R5']],
  ['r5-con-media', { 'a.css': SIX_TRANSITIONS + '\n@media (prefers-reduced-motion: reduce) { * { transition: none; } }' }, 'a.css', []],
  ['r5-cinco', { 'a.css': FIVE_TRANSITIONS }, 'a.css', []],
  ['varias', { 'a.scss': '.c { max-width: 1100px; }\nheader { position: sticky; top: 0; }\n' + SIX_TRANSITIONS }, 'a.scss', ['R1', 'R3', 'R5']],
  ['no-relevante', { 'a.js': '.c { max-width: 1200px; }' }, 'a.js', []],
];

console.log('modo hook: hallazgos por additionalContext');
for (const [name, files, target, expected] of CASES) {
  const dir = fixture(name, files);
  test(`${name} → [${expected.join(',')}]`, () => assert.deepStrictEqual(hookRules(path.join(dir, target)), expected));
}
test('archivo inexistente: silencio', () => assert.deepStrictEqual(hookRules(path.join(ROOT, 'no-existe.css')), []));
test('ruta con espacios (antes se partía en dos)', () => {
  const dir = fixture('con espacio', { 'a.css': '.container { max-width: 1200px; }' });
  assert.deepStrictEqual(hookRules(path.join(dir, 'a.css')), ['R1']);
});
test('ruta Windows con barras invertidas', () => {
  const dir = fixture('win', { 'a.css': '.container { max-width: 1200px; }' });
  assert.deepStrictEqual(hookRules(path.join(dir, 'a.css').replace(/\//g, '\\')), ['R1']);
});
test('el JSON va en una línea y el stderr queda vacío', () => {
  const dir = fixture('una-linea', { 'a.css': '.container { max-width: 1200px; }' });
  const r = hook(path.join(dir, 'a.css'));
  assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  assert.strictEqual(r.stderr, '');
});
test('el aviso nombra la ruta y el detalle de la regla', () => {
  const dir = fixture('detalle', { 'a.css': '.container { max-width: 1200px; }' });
  const ctx = JSON.parse(hook(path.join(dir, 'a.css')).stdout).hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes('a.css') && /container-cap-saas-feel/.test(ctx), ctx);
});
test('R2 fuente de dos palabras cargada por Google Fonts no dispara', () => {
  const dir = fixture('r2-dos-palabras', { 'a.css': 'body { font-family: "Space Grotesk", sans-serif; }', 'index.html': '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap" rel="stylesheet">' });
  assert.deepStrictEqual(hookRules(path.join(dir, 'a.css')), []);
});
console.log('no repetir el mismo aviso (regla + archivo) en la misma sesión');
test('segunda edición del mismo archivo en la misma sesión: silencio', () => {
  const dir = fixture('dedup-1', { 'a.css': '.container { max-width: 1200px; }' });
  const f = path.join(dir, 'a.css');
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-a' }), ['R1']);
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-a' }), []);
});
test('otra sesión vuelve a avisar', () => {
  const dir = fixture('dedup-2', { 'a.css': '.container { max-width: 1200px; }' });
  const f = path.join(dir, 'a.css');
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-b' }), ['R1']);
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-c' }), ['R1']);
});
test('una regla nueva en el mismo archivo sí avisa, sin repetir la vieja', () => {
  const dir = fixture('dedup-3', { 'a.css': '.container { max-width: 1200px; }' });
  const f = path.join(dir, 'a.css');
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-d' }), ['R1']);
  fs.writeFileSync(f, '.container { max-width: 1200px; }\nheader { position: sticky; top: 0; }');
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-d' }), ['R3']);
});
test('la misma regla en otro archivo sí avisa', () => {
  const d1 = fixture('dedup-4a', { 'a.css': '.container { max-width: 1200px; }' });
  const d2 = fixture('dedup-4b', { 'b.css': '.container { max-width: 1200px; }' });
  assert.deepStrictEqual(hookRules(path.join(d1, 'a.css'), { session_id: 'ses-e' }), ['R1']);
  assert.deepStrictEqual(hookRules(path.join(d2, 'b.css'), { session_id: 'ses-e' }), ['R1']);
});
test('la misma ruta con barras distintas cuenta como el mismo archivo', () => {
  const dir = fixture('dedup-5', { 'a.css': '.container { max-width: 1200px; }' });
  const f = path.join(dir, 'a.css');
  assert.deepStrictEqual(hookRules(f.replace(/\\/g, '/'), { session_id: 'ses-f' }), ['R1']);
  assert.deepStrictEqual(hookRules(f.replace(/\//g, '\\'), { session_id: 'ses-f' }), []);
});
test('sin session_id avisa siempre', () => {
  const dir = fixture('dedup-6', { 'a.css': '.container { max-width: 1200px; }' });
  const f = path.join(dir, 'a.css');
  assert.deepStrictEqual(hookRules(f), ['R1']);
  assert.deepStrictEqual(hookRules(f), ['R1']);
});
test('estado ilegible o no escribible: fail-open, avisa igual', () => {
  const dir = fixture('dedup-7', { 'a.css': '.container { max-width: 1200px; }', 'no-es-carpeta': 'x' });
  const f = path.join(dir, 'a.css');
  const env = { PRA_STATE_DIR: path.join(dir, 'no-es-carpeta') };
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-g' }, env), ['R1']);
  assert.deepStrictEqual(hookRules(f, { session_id: 'ses-g' }, env), ['R1']);
});
test('el estado vive en PRA_STATE_DIR, un archivo por sesión', () => {
  assert.ok(fs.readdirSync(STATE).some(x => x.includes('ses-a')), fs.readdirSync(STATE).join(','));
});
test('el modo CLI no deduplica', () => {
  const dir = fixture('dedup-cli', { 'a.css': '.c { max-width: 1200px; }' });
  const f = fwd(path.join(dir, 'a.css'));
  assert.deepStrictEqual(rulesOf(cli([f]).stderr), ['R1']);
  assert.deepStrictEqual(rulesOf(cli([f]).stderr), ['R1']);
});

test('stdin sin file_path: silencio', () => {
  const r = spawnSync(CMD[0], CMD.slice(1), { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } }), encoding: 'utf8' });
  assert.strictEqual(r.status, 0); assert.strictEqual((r.stdout || '').trim(), '');
});
test('JSON roto: fail-open', () => assert.strictEqual(spawnSync(CMD[0], CMD.slice(1), { input: '{x', encoding: 'utf8' }).status, 0));

console.log('modo CLI (--files), como lo usa el Modo Modificación');
test('limpio: PASS por stdout, exit 0', () => {
  const dir = fixture('cli-ok', { 'a.css': '.c { max-width: 1600px; }' });
  const r = cli([fwd(path.join(dir, 'a.css'))]);
  assert.strictEqual(r.code, 0);
  assert.ok(/verdict: PASS/.test(r.stdout) && /files_audited: 1/.test(r.stdout), r.stdout);
});
test('con hallazgos: lista por stderr, exit 1', () => {
  const d1 = fixture('cli-mal', { 'a.css': '.c { max-width: 1200px; }', 'index.html': '<nav><a>x</a></nav>' });
  const r = cli([fwd(path.join(d1, 'a.css')), fwd(path.join(d1, 'index.html'))]);
  assert.strictEqual(r.code, 1);
  assert.deepStrictEqual(rulesOf(r.stderr), ['R1', 'R4']);
  assert.ok(/2 warning\(s\)/.test(r.stderr), r.stderr);
});
test('el wrapper hooks/pre-return-audit.sh sigue funcionando', () => {
  const dir = fixture('cli-wrapper', { 'a.css': '.c { max-width: 1200px; }' });
  const r = cli([fwd(path.join(dir, 'a.css'))], ['bash', fwd(path.join(REPO, 'hooks', 'pre-return-audit.sh'))]);
  assert.strictEqual(r.code, 1);
  assert.deepStrictEqual(rulesOf(r.stderr), ['R1']);
});

if (process.env.PRA_OLD) {
  console.log('paridad con el .sh viejo (mismas reglas sobre las mismas fixtures)');
  for (const [name, files, target, expected] of CASES) {
    if (name === 'no-relevante') continue;
    // Diferencia buscada: el .sh viejo daba R1 en breakpoints @media/@container (verificacion.md, objeción 3).
    if (['r1-media-query', 'r1-media-1200', 'r1-container-query'].includes(name)) continue;
    test(`paridad ${name}`, () => {
      const f = fwd(path.join(ROOT, name, target));
      const old = rulesOf(cli([f], ['bash', process.env.PRA_OLD]).stderr);
      const neu = rulesOf(cli([f]).stderr);
      assert.deepStrictEqual(neu, old);
    });
  }
}

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
