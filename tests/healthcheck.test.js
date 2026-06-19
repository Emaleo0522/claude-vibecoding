#!/usr/bin/env node
/**
 * TDD — healthcheck.js. node assert, sin framework.
 * Testea las funciones PURAS (parseAuditStatus, aggregate). El glue de spawn se
 * verifica corriendo el CLI real al final del build.
 */
const assert = require('assert');
const { parseAuditStatus, aggregate } = require('../hooks/healthcheck.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

test('parseAuditStatus extrae HEALTHY + score', () => {
  const out = 'algo\nScore: 11/11\nStatus: HEALTHY\n';
  const r = parseAuditStatus(out);
  assert.strictEqual(r.status, 'HEALTHY');
  assert.strictEqual(r.score, '11/11');
});

test('parseAuditStatus detecta BROKEN', () => {
  assert.strictEqual(parseAuditStatus('Score: 7/11\nStatus: BROKEN').status, 'BROKEN');
});

test('parseAuditStatus desconocido si no matchea', () => {
  assert.strictEqual(parseAuditStatus('ruido').status, 'UNKNOWN');
});

const okParts = {
  audit: { status: 'HEALTHY', score: '11/11' },
  drift: { clean: true, summary: 'CLEAN — 66 en sync' },
  mcp: { errors: [], summary: '16 MCPs (...)' },
  engram: { present: true },
};

test('aggregate: todo OK -> READY', () => {
  const r = aggregate(okParts);
  assert.strictEqual(r.ready, true);
  assert.ok(/READY/.test(r.verdict) && !/NOT/.test(r.verdict));
  assert.strictEqual(r.fails.length, 0);
});

test('aggregate: audit BROKEN -> NOT READY (fail)', () => {
  const r = aggregate({ ...okParts, audit: { status: 'BROKEN', score: '7/11' } });
  assert.strictEqual(r.ready, false);
  assert.ok(/NOT READY/.test(r.verdict));
  assert.ok(r.fails.some(f => /audit/i.test(f)));
});

test('aggregate: audit DEGRADED -> READY pero con warn', () => {
  const r = aggregate({ ...okParts, audit: { status: 'DEGRADED', score: '10/11' } });
  assert.strictEqual(r.ready, true);
  assert.ok(r.warns.some(w => /audit/i.test(w)));
});

test('aggregate: drift no limpio -> WARN, no fail', () => {
  const r = aggregate({ ...okParts, drift: { clean: false, summary: 'DRIFT — 1 divergente' } });
  assert.strictEqual(r.ready, true);
  assert.ok(r.warns.some(w => /drift/i.test(w)));
  assert.strictEqual(r.fails.length, 0);
});

test('aggregate: errores de schema en mcp -> FAIL', () => {
  const r = aggregate({ ...okParts, mcp: { errors: ['x: status inválido'], summary: '' } });
  assert.strictEqual(r.ready, false);
  assert.ok(r.fails.some(f => /mcp/i.test(f)));
});

test('aggregate: mcp registry ilegible (SKIP) -> WARN, no fail', () => {
  const r = aggregate({ ...okParts, mcp: { errors: [], summary: 'SKIP — no se pudo leer' } });
  assert.strictEqual(r.ready, true);
  assert.ok(r.warns.some(w => /mcp/i.test(w)));
});

test('aggregate: engram ausente -> WARN, no fail', () => {
  const r = aggregate({ ...okParts, engram: { present: false } });
  assert.strictEqual(r.ready, true);
  assert.ok(r.warns.some(w => /engram/i.test(w)));
});

console.log(`\nhealthcheck tests: ${passed} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
