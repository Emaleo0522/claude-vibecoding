#!/usr/bin/env node
/**
 * TDD — mcp-registry.js. node assert, sin framework.
 */
const assert = require('assert');
const path = require('path');
const { loadRegistry, validate, summarize, formatSummary, VALID_STATUSES } = require('../hooks/mcp-registry.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

const good = {
  version: 1,
  servers: [
    { id: 'engram', capability: 'memory', status: 'LIVE' },
    { id: 'vercel', capability: 'deploy', status: 'PENDING_TOKEN', env: ['VERCEL_TOKEN'] },
    { id: 'figma', capability: 'design', status: 'CONFIG_ONLY' },
  ],
};

test('validate: registry correcto no tiene errores', () => {
  assert.deepStrictEqual(validate(good).errors, []);
});

test('validate: detecta server sin id/capability/status', () => {
  const bad = { version: 1, servers: [{ capability: 'x', status: 'LIVE' }] };
  assert.ok(validate(bad).errors.length > 0, 'debe reportar error por id faltante');
});

test('validate: detecta status inválido', () => {
  const bad = { version: 1, servers: [{ id: 'a', capability: 'x', status: 'ENCENDIDO' }] };
  assert.ok(validate(bad).errors.some(e => e.includes('ENCENDIDO')), 'debe nombrar el status inválido');
});

test('validate: detecta servers que no es array', () => {
  assert.ok(validate({ version: 1, servers: {} }).errors.length > 0);
});

test('summarize: cuenta por status', () => {
  const s = summarize(good);
  assert.strictEqual(s.total, 3);
  assert.strictEqual(s.byStatus.LIVE, 1);
  assert.strictEqual(s.byStatus.PENDING_TOKEN, 1);
  assert.strictEqual(s.byStatus.CONFIG_ONLY, 1);
});

test('summarize: lista problemas (PENDING_TOKEN/MISSING)', () => {
  const s = summarize(good);
  assert.ok(s.problems.some(p => p.includes('vercel')), 'vercel PENDING_TOKEN debe aparecer en problems');
});

test('formatSummary: una línea con total y conteos', () => {
  const txt = formatSummary(good);
  assert.ok(/3 MCPs/.test(txt), `esperaba "3 MCPs" en: ${txt}`);
});

test('VALID_STATUSES incluye los 5 estados', () => {
  for (const s of ['LIVE', 'CONFIG_ONLY', 'PENDING_TOKEN', 'OPTIONAL', 'MISSING']) {
    assert.ok(VALID_STATUSES.includes(s), `falta ${s}`);
  }
});

test('el mcp.registry.json REAL parsea y valida sin errores', () => {
  const reg = loadRegistry(path.join(__dirname, '..', 'mcp.registry.json'));
  const v = validate(reg);
  assert.deepStrictEqual(v.errors, [], `registry real con errores: ${v.errors.join('; ')}`);
  assert.ok(reg.servers.length >= 10, 'el registry real debe tener los MCPs del sistema');
});

console.log(`\nmcp-registry tests: ${passed} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
