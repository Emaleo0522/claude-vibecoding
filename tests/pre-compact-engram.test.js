#!/usr/bin/env node
/**
 * TDD: pre-compact-engram.js (PreCompact).
 * Solo una entrada real de PreCompact (hook_event_name "PreCompact", hooks-doc.md:3306) escribe
 * el snapshot y el trigger compaction-pending.json que consume el paso 0b del orquestador.
 * Con `{}`, stdin vacio o JSON de otro evento no escribe nada: asi audit-system (T2 con "" y T5
 * con "{}") deja de crear disparadores falsos. HOME/USERPROFILE/TEMP apuntan a una carpeta de prueba.
 * Sin framework: `node tests/pre-compact-engram.test.js`.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = process.env.HOOK_UNDER_TEST || path.join(__dirname, '..', 'hooks', 'pre-compact-engram.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pce-test-'));
  const home = path.join(root, 'home'), tmp = path.join(root, 'tmp'), cwd = path.join(root, 'proyecto');
  for (const d of [home, tmp, cwd]) fs.mkdirSync(d, { recursive: true });
  const snaps = path.join(home, '.claude', 'snapshots');
  return {
    root, home, tmp, cwd,
    trigger: path.join(snaps, 'compaction-pending.json'),
    snapshot: path.join(snaps, 'pre-compact-latest.json'),
    counter: path.join(tmp, '.claude-tool-call-counter.json'),
  };
}
function run(sb, input) {
  const env = { ...process.env, HOME: sb.home, USERPROFILE: sb.home, TEMP: sb.tmp, TMP: sb.tmp, TMPDIR: sb.tmp };
  return spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', env, cwd: sb.cwd });
}
const PRECOMPACT = JSON.stringify({ session_id: 'abc', transcript_path: '/x.jsonl', cwd: '/p', hook_event_name: 'PreCompact', trigger: 'manual', custom_instructions: null });

console.log('entradas que no son PreCompact: no escribe nada');
for (const [name, input] of [['{}', '{}'], ['stdin vacío', ''], ['texto que no es JSON', 'hola'], ['otro evento', JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Bash' })], ['JSON que no es objeto', '[1,2]']]) {
  test(name, () => {
    const sb = sandbox();
    fs.writeFileSync(sb.counter, '{"count":7}');
    const r = run(sb, input);
    assert.strictEqual(r.status, 0);
    assert.ok(!fs.existsSync(sb.trigger), 'escribió compaction-pending.json');
    assert.ok(!fs.existsSync(sb.snapshot), 'escribió pre-compact-latest.json');
    assert.ok(fs.existsSync(sb.counter), 'borró el contador');
  });
}

console.log('PreCompact real: comportamiento de siempre');
test('escribe snapshot y trigger, y borra el contador', () => {
  const sb = sandbox();
  fs.writeFileSync(sb.counter, '{"count":7}');
  const r = run(sb, PRECOMPACT);
  assert.strictEqual(r.status, 0);
  const trig = JSON.parse(fs.readFileSync(sb.trigger, 'utf8'));
  const snap = JSON.parse(fs.readFileSync(sb.snapshot, 'utf8'));
  assert.strictEqual(trig.instruction, 'dual-write-dag-state');
  assert.strictEqual(snap.event, 'pre-compact');
  assert.strictEqual(snap.toolCallCount, 7);
  assert.ok(!fs.existsSync(sb.counter), 'no borró el contador');
});
test('con .pipeline/estado.yaml en el cwd anota fase y tarea', () => {
  const sb = sandbox();
  fs.mkdirSync(path.join(sb.cwd, '.pipeline'));
  fs.writeFileSync(path.join(sb.cwd, '.pipeline', 'estado.yaml'), 'fase_actual: "fase-3"  # dev\ntarea_actual: 4\ntotal_tareas: 9\n');
  run(sb, PRECOMPACT);
  const trig = JSON.parse(fs.readFileSync(sb.trigger, 'utf8'));
  assert.deepStrictEqual([trig.pipelineActive, trig.pipelinePhase, trig.pipelineTask], [true, 'fase-3', '4/9']);
});
test('trigger auto también escribe', () => {
  const sb = sandbox();
  run(sb, JSON.stringify({ hook_event_name: 'PreCompact', trigger: 'auto' }));
  assert.ok(fs.existsSync(sb.trigger));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
