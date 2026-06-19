#!/usr/bin/env node
/**
 * TDD — drift-check.js
 * Sin framework: node assert. Corre con `node tests/drift-check.test.js`.
 * Exit 0 = todos PASS, 1 = algún FAIL.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { computeDrift, formatReport, findRepo } = require('../hooks/drift-check.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

// -- Fixtures --------------------------------------------------------------
function w(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-test-'));
  const repo = path.join(root, 'repo');
  const home = path.join(root, 'home');
  const claude = path.join(home, '.claude');

  // agents: same (match), diff (drift), onlyrepo (missing), onlyrun (extra)
  w(path.join(repo, 'agents', 'same.md'), 'IGUAL');
  w(path.join(claude, 'agents', 'same.md'), 'IGUAL');
  w(path.join(repo, 'agents', 'diff.md'), 'VERSION-A');
  w(path.join(claude, 'agents', 'diff.md'), 'VERSION-B');
  w(path.join(repo, 'agents', 'onlyrepo.md'), 'NUEVO');
  w(path.join(claude, 'agents', 'onlyrun.md'), 'SATELITE');

  // hooks: same .js (match), un .txt que NO debe contar (ext no rastreada)
  w(path.join(repo, 'hooks', 'h.js'), 'console.log(1)');
  w(path.join(claude, 'hooks', 'h.js'), 'console.log(1)');
  w(path.join(repo, 'hooks', 'nota.txt'), 'ignorar');
  w(path.join(claude, 'hooks', 'nota.txt'), 'ignorar-distinto');

  // CLAUDE.md: repo root vs ~/.claude/CLAUDE.md (candidato preferido)
  w(path.join(repo, 'CLAUDE.md'), 'DOCTRINA');
  w(path.join(claude, 'CLAUDE.md'), 'DOCTRINA');

  return { root, repo, home, claude };
}

// -- Tests -----------------------------------------------------------------
test('clasifica match/drift/missing/extra correctamente', () => {
  const fx = buildFixture();
  const r = computeDrift(fx.repo, fx.claude, fx.home);
  assert.ok(r.drift.includes('agents/diff.md'), 'diff.md debe ser DRIFT');
  assert.ok(r.missing.includes('agents/onlyrepo.md'), 'onlyrepo.md debe ser MISSING');
  assert.ok(r.extra.includes('agents/onlyrun.md'), 'onlyrun.md debe ser EXTRA');
  assert.ok(r.match.includes('agents/same.md'), 'same.md debe ser MATCH');
});

test('respeta extensiones rastreadas (.txt en hooks no cuenta como drift)', () => {
  const fx = buildFixture();
  const r = computeDrift(fx.repo, fx.claude, fx.home);
  assert.ok(r.match.includes('hooks/h.js'), 'h.js debe matchear');
  assert.ok(!r.drift.includes('hooks/nota.txt'), 'nota.txt NO debe contar (ext no rastreada)');
  assert.ok(!r.extra.includes('hooks/nota.txt'), 'nota.txt NO debe contar como extra');
});

test('rastrea CLAUDE.md root vs ~/.claude/CLAUDE.md', () => {
  const fx = buildFixture();
  const r = computeDrift(fx.repo, fx.claude, fx.home);
  assert.ok(r.match.includes('CLAUDE.md'), 'CLAUDE.md debe matchear contra ~/.claude/CLAUDE.md');
});

test('CLAUDE.md drift se detecta', () => {
  const fx = buildFixture();
  fs.writeFileSync(path.join(fx.claude, 'CLAUDE.md'), 'DOCTRINA-MODIFICADA');
  const r = computeDrift(fx.repo, fx.claude, fx.home);
  assert.ok(r.drift.includes('CLAUDE.md'), 'CLAUDE.md modificado debe ser DRIFT');
});

test('formatReport: limpio cuando solo hay matches/extras', () => {
  const r = { drift: [], missing: [], extra: ['agents/sat.md'], match: ['agents/a.md'] };
  const rep = formatReport(r);
  assert.strictEqual(rep.clean, true);
  assert.ok(rep.summary.startsWith('CLEAN'), `summary debía empezar con CLEAN: ${rep.summary}`);
});

test('formatReport: NO limpio cuando hay drift o missing', () => {
  const rep = formatReport({ drift: ['agents/x.md'], missing: [], extra: [], match: [] });
  assert.strictEqual(rep.clean, false);
  assert.ok(rep.summary.startsWith('DRIFT'), `summary debía empezar con DRIFT: ${rep.summary}`);
});

test('formatReport terse NO lista matches; verbose SÍ', () => {
  const r = { drift: [], missing: [], extra: [], match: ['agents/a.md'] };
  assert.strictEqual(formatReport(r, { verbose: false }).text, '');
  assert.ok(formatReport(r, { verbose: true }).text.includes('agents/a.md'));
});

test('findRepo encuentra por path explícito y devuelve null si no hay', () => {
  const fx = buildFixture();
  assert.strictEqual(findRepo(fx.repo), fx.repo, 'debe encontrar repo con agents/ y hooks/');
  assert.strictEqual(findRepo('/no/existe/aca'), null, 'debe devolver null si no hay repo');
});

console.log(`\ndrift-check tests: ${passed} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
