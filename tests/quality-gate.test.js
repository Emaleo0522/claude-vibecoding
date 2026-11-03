#!/usr/bin/env node
/**
 * TDD: quality-gate.js (PostToolUse, matcher Write|Edit|MultiEdit).
 * Los avisos tienen que llegar al modelo: JSON hookSpecificOutput.additionalContext por stdout
 * con exit 0 (hooks-doc.md:816 y :2228). Absorbe lo que hacía console-log-warning.js.
 * Sin framework: `node tests/quality-gate.test.js`.
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = process.env.HOOK_UNDER_TEST || path.join(__dirname, '..', 'hooks', 'quality-gate.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function run(tool, input) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: tool, tool_input: input }), encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}
const write = (file, content) => run('Write', { file_path: file, content });
function context(r) {
  assert.strictEqual(r.code, 0, `exit ${r.code}`);
  assert.ok(r.stdout.trim(), 'esperaba un aviso por stdout');
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PostToolUse');
  return out.hookSpecificOutput.additionalContext;
}
const silent = r => { assert.strictEqual(r.code, 0); assert.strictEqual(r.stdout.trim(), '', `no debería avisar: ${r.stdout}`); };

console.log('avisos que llegan (additionalContext)');
test('debugger', () => assert.ok(/debugger/.test(context(write('/p/src/app.tsx', 'debugger; const x = 1;')))));
test('.only()', () => assert.ok(/\.only/.test(context(write('/p/src/a.spec.ts', 'it.only("x", () => {})')))));
test('@ts-ignore', () => assert.ok(/@ts-ignore/.test(context(write('/p/src/a.ts', '// @ts-ignore\nconst x = 1;')))));
test('@ts-nocheck', () => assert.ok(/@ts-nocheck/.test(context(write('/p/src/a.ts', '// @ts-nocheck\nconst x = 1;')))));
test('secreto hardcodeado', () => assert.ok(/secret/i.test(context(write('/p/src/a.js', 'const api_key = "sk_live_abcdefgh123";')))));
test('password hardcodeada', () => assert.ok(/password/i.test(context(write('/p/src/a.js', 'const password = "hunter22";')))));
test('any 3 veces', () => assert.ok(/any/.test(context(write('/p/src/a.ts', 'let a: any; let b: any; let c = x as any;')))));
test('TODO', () => assert.ok(/TODO/.test(context(write('/p/src/a.js', '// TODO: revisar\nconst x = 1;')))));
test('nombra el archivo', () => assert.ok(context(write('/p/src/app.tsx', 'debugger;')).includes('app.tsx')));
test('el aviso no va por stderr', () => assert.strictEqual(write('/p/src/app.tsx', 'debugger;').stderr, ''));
test('Edit: mira new_string', () => assert.ok(/debugger/.test(context(run('Edit', { file_path: '/p/a.js', old_string: 'x', new_string: 'debugger; y' })))));
test('MultiEdit: mira cada new_string', () => assert.ok(/debugger/.test(context(run('MultiEdit', { file_path: '/p/a.js', edits: [{ old_string: 'a', new_string: 'const z = 1;' }, { old_string: 'b', new_string: 'debugger;' }] })))));

console.log('console.log (absorbido de console-log-warning)');
test('console.log en código de producción', () => assert.ok(/console/.test(context(write('/p/src/api.ts', 'console.log("debug");')))));
test('cuenta console.warn/error/info/debug', () => assert.ok(/3 /.test(context(write('/p/src/api.ts', 'console.warn(1); console.error(2); console.info(3);')))));
test('console.time no cuenta', () => silent(write('/p/src/api.ts', 'console.time("t"); console.timeEnd("t");')));
test('ignora archivo de test', () => silent(write('/p/src/api.test.ts', 'console.log("ok");')));
test('ignora carpeta tests/ con ruta Windows', () => silent(write('C:\\p\\tests\\x.js', 'console.log("ok");')));
test('ignora carpeta __tests__', () => silent(write('/p/src/__tests__/x.js', 'console.log("ok");')));
test('ignora scripts/', () => silent(write('/p/scripts/build.js', 'console.log("ok");')));
test('ignora hooks/ y .claude/ con barras invertidas', () => silent(write('C:\\Users\\Ema\\.claude\\hooks\\x.js', 'console.log("ok");')));
test('ignora node_modules/', () => silent(write('/p/node_modules/x/index.js', 'console.log("ok");')));
test('en test igual avisa debugger', () => assert.ok(/debugger/.test(context(write('/p/src/api.test.ts', 'console.log(1); debugger;')))));

console.log('silencio');
test('código limpio', () => silent(write('/p/src/clean.ts', 'const x: string = "hola"; export default x;')));
test('any 2 veces no alcanza', () => silent(write('/p/src/a.ts', 'let a: any; let b: any;')));
test('secreto leído de process.env', () => silent(write('/p/src/a.js', 'const api_key = process.env.API_KEY || "fallbackvalue1";')));
test('archivo no JS/TS', () => silent(write('/p/README.md', 'debugger; console.log(1)')));
test('otra tool', () => silent(run('Read', { file_path: '/p/a.js' })));
test('JSON roto: fail-open', () => assert.strictEqual(spawnSync(process.execPath, [HOOK], { input: '{x', encoding: 'utf8' }).status, 0));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
