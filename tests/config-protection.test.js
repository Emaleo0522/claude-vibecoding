#!/usr/bin/env node
/**
 * TDD: config-protection.js (PreToolUse).
 * BLOQUEA (exit 2) secretos; AVISA configs de lint por JSON additionalContext con exit 0
 * (hooks-doc.md:816 "Claude never sees stderr from a hook that exits 0"; :1964 PreToolUse
 * admite additionalContext). Sin framework: `node tests/config-protection.test.js`.
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = process.env.HOOK_UNDER_TEST || path.join(__dirname, '..', 'hooks', 'config-protection.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function run(tool, input) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_name: tool, tool_input: input }), encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}
const fp = f => ({ file_path: f, content: 'x', old_string: 'a', new_string: 'b' });

const blocks = (f, tool = 'Edit', input) => test(`BLOQUEA  ${tool} ${f}`, () => {
  const r = run(tool, input || fp(f));
  assert.strictEqual(r.code, 2, `esperaba exit 2, dio ${r.code}`);
  assert.ok(/BLOCKED/.test(r.stderr));
});
const allows = (f, tool = 'Edit', input) => test(`DEJA     ${tool} ${f}`, () => {
  const r = run(tool, input || fp(f));
  assert.strictEqual(r.code, 0, `esperaba exit 0, dio ${r.code}`);
  assert.strictEqual(r.stdout.trim(), '', `no debería avisar nada: ${r.stdout}`);
});
const warns = (f, tool = 'Edit') => test(`AVISA    ${tool} ${f}`, () => {
  const r = run(tool, fp(f));
  assert.strictEqual(r.code, 0, `esperaba exit 0, dio ${r.code}`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.ok(out.hookSpecificOutput.additionalContext.includes(path.basename(f)), 'nombra el archivo');
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, undefined, 'no decide permisos: sigue el flujo normal');
});

console.log('(a) secretos nuevos');
blocks('C:/p/.npmrc');
blocks('/p/service-account.json');
blocks('/p/service-account-prod.json');
blocks('/p/.dev.vars');
blocks('/p/app.env.local');
blocks('/p/config.env.production');
blocks('C:\\p\\backend\\prod.env.secret', 'Write');
allows('/p/.env.example');
allows('/p/.env.sample');
allows('/p/.env.template');
allows('/p/app.env.example');
blocks('/p/credentials.example');
blocks('/p/secrets.template');
allows('/p/npmrc.md');
allows('/p/docs/service-account.md');

console.log('(a2) regresión: lo que ya bloqueaba');
blocks('/p/.env');
blocks('/p/.env.local');
blocks('/p/.env.production', 'Write');
blocks('/p/server.pem');
blocks('/p/server.key');
blocks('/p/credentials.json');
blocks('/p/secrets.yaml');
blocks('/p/.secret.json');
blocks('/p/my_secret_key.txt');
blocks('/home/u/.ssh/id_rsa');
blocks('/home/u/.ssh/id_ed25519.pub');
blocks('/p/cert.pfx');
blocks('/p/cert.p12');
allows('/p/src/app.ts');
allows('/p/README.md');

console.log('(c) MultiEdit y NotebookEdit');
blocks('/p/.env', 'MultiEdit', { file_path: '/p/.env', edits: [{ old_string: 'a', new_string: 'b' }] });
blocks('/p/credentials.ipynb', 'NotebookEdit', { notebook_path: '/p/credentials.ipynb', new_source: 'x' });
allows('/p/nb.ipynb', 'NotebookEdit', { notebook_path: '/p/nb.ipynb', new_source: 'x' });
allows('/p/.env', 'Read', { file_path: '/p/.env' });

console.log('(b) avisos de config de lint que llegan al modelo');
warns('/p/.eslintrc.js');
warns('/p/eslint.config.mjs');
warns('/p/.prettierrc');
warns('/p/tsconfig.json');
warns('/p/tsconfig.build.json', 'Write');
warns('/p/biome.json', 'MultiEdit');
warns('/p/.editorconfig');
warns('/p/.stylelintrc.json');
test('el aviso no va por stderr (no llega con exit 0)', () => assert.strictEqual(run('Edit', fp('/p/.eslintrc.js')).stderr, ''));

console.log('(d) sin distinguir mayúsculas (Windows no las distingue)');
blocks('C:\\p\\.ENV');
blocks('/p/.Env.Local');
blocks('/home/u/.ssh/ID_RSA');
blocks('/p/SERVER.PEM');
blocks('/p/Server.Key');
blocks('/p/Service-Account.json');
blocks('/p/.NPMRC');
blocks('/p/.DEV.VARS');
blocks('/p/CREDENTIALS.JSON');
blocks('/p/Secrets.yaml');
blocks('/p/CERT.PFX');
blocks('/p/PROD.ENV');
blocks('/p/.ENVRC');
allows('/p/.ENV.EXAMPLE');
allows('/p/.Env.Sample');
warns('/p/TSCONFIG.JSON');
warns('/p/.ESLintrc.json');

console.log('(e) credenciales de red y de base de datos');
blocks('/home/u/.netrc');
blocks('C:\\Users\\u\\_netrc');
blocks('/home/u/.git-credentials');
blocks('/home/u/.pgpass');
blocks('C:\\Users\\u\\_NETRC');
allows('/p/docs/netrc.md');
allows('/p/src/pgpass-parser.ts');

console.log('(f) familia .env por nombre, no código con "env" en el nombre');
blocks('/p/prod.env');
blocks('/p/backend/staging.env');
blocks('/p/.envrc');
allows('/p/src/app.env.ts');
allows('/p/src/config.env.js');
allows('/p/vite.env.d.ts');
allows('/p/src/env.ts');
allows('/p/src/environment.ts');
allows('/p/src/app.env.mjs');
allows('/p/components/Form.env.tsx');
allows('/p/docs/app.env.md');

console.log('fail-open');
test('JSON roto', () => assert.strictEqual(spawnSync(process.execPath, [HOOK], { input: '{x', encoding: 'utf8' }).status, 0));
test('stdin vacío', () => assert.strictEqual(spawnSync(process.execPath, [HOOK], { input: '', encoding: 'utf8' }).status, 0));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
