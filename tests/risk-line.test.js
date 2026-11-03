#!/usr/bin/env node
/**
 * TDD — risk-line.js (hook de la línea de riesgo, solo registro)
 * Sin framework: node assert. Corre con `node tests/risk-line.test.js`.
 * Spec: docs/specs/linea-riesgo-hook.md (S2-S9).
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'risk-line.js');
const { parseRiesgo, isCodePath, isOpCommand, handle, report } = require(HOOK);

let passed = 0, failed = 0;
const pending = [];
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'riesgo-test-'));
  return { stateDir: path.join(root, 'state'), logFile: path.join(root, 'logs', 'riesgo-line.jsonl'), tmpRoots: [] };
}
const readLog = o => fs.existsSync(o.logFile) ? fs.readFileSync(o.logFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const edit = (file, extra = {}) => ({ hook_event_name: 'PostToolUse', session_id: 's1', cwd: 'C:/proj', tool_name: 'Edit', tool_input: { file_path: file }, ...extra });
const stop = (msg, extra = {}) => ({ hook_event_name: 'Stop', session_id: 's1', cwd: 'C:/proj', last_assistant_message: msg, background_tasks: [], ...extra });
const agent = prompt => ({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Agent', tool_input: { prompt } });
const VERIFICADOR = 'Revisión con consigna de evidencia: "No encontré problemas importantes" es válido. Cerrá con veredicto.';

console.log('parseRiesgo');
test('detecta "Riesgo: ninguno"', () => assert.deepStrictEqual(parseRiesgo('Listo.\nRiesgo: ninguno'), { present: true, ninguno: true, items: [] }));
test('ítems con y sin tilde, varios', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítem 2 (wallet), item 7 (nuevo)').items, [2, 7]));
test('ítems en plural con "y"', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítems 2 y 5').items, [2, 5]));
test('"ítem 2 y 5" no pierde el 5', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítem 2 (auth) y 5').items, [2, 5]));
test('números sueltos después de los ítems no cuentan', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítem 5, deploy en 2 pasos').items, [5]));
test('como encabezado markdown', () => assert.strictEqual(parseRiesgo('### Riesgo: ninguno').ninguno, true));
test('dentro de una tabla', () => assert.deepStrictEqual(parseRiesgo('| Riesgo: | ítem 2 |').items, [2]));
test('números dentro del paréntesis no cuentan', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítem 3 (cambia 4 archivos)').items, [3]));
test('**Riesgo**: ninguno (markdown alrededor del rótulo)', () => assert.strictEqual(parseRiesgo('**Riesgo**: ninguno').ninguno, true));
test('lista con viñeta', () => assert.deepStrictEqual(parseRiesgo('- Riesgo: ítem 5 (deploy)').items, [5]));
test('"Riesgo :" con espacio', () => assert.strictEqual(parseRiesgo('Riesgo : ninguno').present, true));
test('toma la ÚLTIMA línea de riesgo, no una mención anterior', () => {
  const r = parseRiesgo('El hook busca "Riesgo: ninguno" al final.\nNivel de riesgo: bajo\nRiesgo: ítem 3 (config)');
  assert.deepStrictEqual(r, { present: true, ninguno: false, items: [3] });
});
test('con dos líneas válidas gana la de cierre', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ninguno\nCorrijo: tocaba la wallet.\nRiesgo: ítem 2 (wallet)'), { present: true, ninguno: false, items: [2] }));
test('una mención en medio de una oración no es la línea', () => assert.strictEqual(parseRiesgo('Le agregué la línea Riesgo: ninguno a los tests.').present, false));
test('al principio de una oración, en la misma línea, sí cuenta', () => assert.deepStrictEqual(parseRiesgo('Verificado. Riesgo: ítem 2 (energía)').items, [2]));
test('sin línea → present false', () => assert.deepStrictEqual(parseRiesgo('Arreglé el botón.'), { present: false, ninguno: false, items: [] }));
test('ítem fuera de 1-7 no cuenta', () => assert.deepStrictEqual(parseRiesgo('Riesgo: ítem 9').items, []));
test('mensaje vacío o nulo no rompe', () => assert.strictEqual(parseRiesgo(undefined).present, false));

console.log('isCodePath (S5)');
const o0 = sandbox();
test('.js es código', () => assert.strictEqual(isCodePath('C:/proj/src/app.js', o0), true));
test('.prisma y .sql son código', () => assert.ok(isCodePath('C:/p/schema.prisma', o0) && isCodePath('/p/m.sql', o0)));
test('.ipynb y Dockerfile son código', () => assert.ok(isCodePath('C:/p/nb.ipynb', o0) && isCodePath('C:/p/Dockerfile', o0)));
test('ruta Windows con backslash y espacios', () => assert.strictEqual(isCodePath('C:\\Users\\Ema\\mi proyecto\\a.ts', o0), true));
test('.md no es código', () => assert.strictEqual(isCodePath('C:/proj/README.md', o0), false));
// Rutas fuera de AppData/Local/Temp a propósito: así solo la regla que se prueba puede excluirlas.
test('carpeta temporal configurada no cuenta', () => assert.strictEqual(isCodePath('D:/mi-tmp/x.js', { tmpRoots: ['D:/mi-tmp'] }), false));
test('la misma ruta sin esa carpeta temporal sí cuenta', () => assert.strictEqual(isCodePath('D:/mi-tmp/x.js', { tmpRoots: [] }), true));
test('scratchpad no cuenta', () => assert.strictEqual(isCodePath('D:/sesiones/abc/scratchpad/a.js', { tmpRoots: [] }), false));
test('scratchpad dentro de Temp tampoco', () => assert.strictEqual(isCodePath('C:/Users/Ema/AppData/Local/Temp/claude/s/scratchpad/a.js', o0), false));
test('memoria de Claude no cuenta', () => assert.strictEqual(isCodePath('C:/Users/Ema/.claude/projects/x/memory/a.json', o0), false));

console.log('isOpCommand (S3)');
test('ssh es operación', () => assert.strictEqual(isOpCommand('ssh ubuntu@1.2.3.4 "ls"'), 'ssh'));
test('git push es operación', () => assert.strictEqual(isOpCommand('git add . && git push origin main'), 'git push'));
test('cd x && git push', () => assert.strictEqual(isOpCommand('cd repo && git push'), 'git push'));
test('git -C con comillas y espacios', () => assert.strictEqual(isOpCommand('git -C "C:/Users/Ema/mi repo" push'), 'git push'));
test('git -c opción=valor push', () => assert.strictEqual(isOpCommand('git -c http.version=HTTP/1.1 push'), 'git push'));
test('variable de entorno antes del comando', () => assert.strictEqual(isOpCommand('GIT_SSH_COMMAND="ssh -i k" git push'), 'git push'));
test('prisma migrate es operación', () => assert.strictEqual(isOpCommand('npx prisma migrate deploy'), 'migrate'));
test('npm run migrate es operación', () => assert.strictEqual(isOpCommand('npm run migrate'), 'migrate'));
test('npm run deploy es operación', () => assert.strictEqual(isOpCommand('npm run deploy'), 'deploy'));
test('vercel --prod es operación', () => assert.strictEqual(isOpCommand('vercel --prod --yes'), 'deploy'));
test('gh pr merge es operación', () => assert.strictEqual(isOpCommand('gh pr merge 12 --squash'), 'gh pr merge'));
test('git status no es operación', () => assert.strictEqual(isOpCommand('git status && ls'), null));
test('echo que menciona git push no cuenta', () => assert.strictEqual(isOpCommand('echo "no hagas git push"'), null));
test('";" dentro de comillas no corta el comando', () => assert.strictEqual(isOpCommand('echo "listo; git push después"'), null));
test('heredoc: el cuerpo no se interpreta', () => assert.strictEqual(isOpCommand('git commit -F - <<EOF\nssh: subir keepalive\nEOF'), null));
test('escribir un script de deploy no es operar', () => assert.strictEqual(isOpCommand('cat > deploy.sh <<EOF\nrsync -a dist/ srv:/var/www\nEOF'), null));

console.log('handle: flujo de trabajo');
test('S2: edición de código + Stop con línea → registra presente', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(stop('Hecho.\nRiesgo: ninguno'), o);
  const log = readLog(o);
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].riesgo.present, true);
  assert.strictEqual(log[0].codeEdits, 1);
});
test('S2: sin línea → registra ausente', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.ts'), o);
  handle(stop('Hecho.'), o);
  assert.strictEqual(readLog(o)[0].riesgo.present, false);
});
test('S2: NotebookEdit cuenta', () => {
  const o = sandbox();
  handle({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'NotebookEdit', tool_input: { notebook_path: 'C:/p/nb.ipynb' } }, o);
  handle(stop('Riesgo: ninguno'), o);
  assert.strictEqual(readLog(o)[0].codeEdits, 1);
});
test('S2: revisor con consigna de evidencia lanzado después del cambio', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(agent(VERIFICADOR), o);
  handle(stop('Riesgo: ítem 2 (energía)'), o);
  assert.strictEqual(readLog(o)[0].reviewerLaunched, true);
});
test('S2: un agente de implementación que "verifica con tests" NO es revisor', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(agent('Implementá el login y verificá con los tests; revisá que compile.'), o);
  handle(stop('Riesgo: ítem 2'), o);
  assert.strictEqual(readLog(o)[0].reviewerLaunched, false);
});
test('S2: revisor lanzado ANTES del cambio no cuenta', () => {
  const o = sandbox();
  handle(agent(VERIFICADOR), o);
  handle(edit('C:/proj/a.js'), o);
  handle(stop('Riesgo: ítem 2'), o);
  assert.strictEqual(readLog(o)[0].reviewerLaunched, false);
});
test('S3: operación por Bash registra ops', () => {
  const o = sandbox();
  handle({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, o);
  handle(stop('Subido. Riesgo: ítem 5 (entrega)'), o);
  assert.deepStrictEqual(readLog(o)[0].ops, ['git push']);
});
test('S4: trabajo sin cambios no registra', () => {
  const o = sandbox();
  handle(edit('C:/proj/README.md'), o);
  handle(stop('Te explico...'), o);
  assert.strictEqual(readLog(o).length, 0);
});
test('S7: subagente en segundo plano → Stop no cierra; cierra el Stop final', () => {
  const o = sandbox();
  const bg = { background_tasks: [{ id: 't1', type: 'subagent', status: 'running', agent_type: 'frontend-developer' }] };
  handle(stop('Lancé el agente.', bg), o);                                   // turno 1: delego
  handle(edit('C:/proj/a.js', { agent_id: 'ag1', agent_type: 'frontend-developer' }), o);
  handle({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '<task-notification>' }, o); // aviso del agente
  handle(stop('Riesgo: ítem 7 (pantalla nueva)'), o);                        // turno 2: cierro
  const log = readLog(o);
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].subagentEdits, 1);
  assert.deepStrictEqual(log[0].riesgo.items, [7]);
});
test('S7: verificador en segundo plano → el cierre posterior registra con revisor', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(agent(VERIFICADOR), o);
  handle(stop('Lancé el verificador.', { background_tasks: [{ id: 'v', type: 'subagent', status: 'running' }] }), o);
  handle({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '<task-notification>' }, o);
  handle(stop('Verificado. Riesgo: ítem 2 (energía)'), o);
  const log = readLog(o);
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].reviewerLaunched, true);
  assert.deepStrictEqual(log[0].riesgo.items, [2]);
});
test('S7: un shell en segundo plano (dev server) no impide cerrar', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(stop('Riesgo: ninguno', { background_tasks: [{ id: 'd', type: 'shell', status: 'running', command: 'npm run dev' }] }), o);
  assert.strictEqual(readLog(o).length, 1);
});
test('Stop cierra: un segundo Stop sin cambios nuevos no duplica', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(stop('Riesgo: ninguno'), o);
  handle(stop('Riesgo: ninguno'), o);
  assert.strictEqual(readLog(o).length, 1);
});
test('eventos de más de 12 h se descartan (turno interrumpido viejo)', () => {
  const o = sandbox();
  const viejo = Date.now() - 13 * 3600 * 1000;
  handle(edit('C:/proj/viejo.js'), { ...o, now: () => viejo });
  handle(stop('Te respondo.'), o);
  assert.strictEqual(readLog(o).length, 0);
});
test('sesiones distintas no se mezclan', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  handle(stop('Riesgo: ninguno', { session_id: 's2' }), o);
  assert.strictEqual(readLog(o).length, 0);
});
test('una línea de estado rota no impide registrar', () => {
  const o = sandbox();
  handle(edit('C:/proj/a.js'), o);
  fs.appendFileSync(path.join(o.stateDir, 's1.jsonl'), '{basura sin cerrar\n');
  handle(stop('Riesgo: ninguno'), o);
  assert.strictEqual(readLog(o)[0].codeEdits, 1);
});

console.log('S6: fail-open (proceso real)');
function runHook(stdin, env = {}) {
  const r = require('child_process').spawnSync(process.execPath, [HOOK], { input: stdin, env: { ...process.env, ...env }, encoding: 'utf8' });
  return r;
}
const clean = r => r.status === 0 && r.stdout === '' && r.stderr === '';
test('JSON roto → exit 0, sin stdout ni stderr', () => assert.ok(clean(runHook('{no es json'))));
test('stdin vacío → exit 0, sin stdout ni stderr', () => assert.ok(clean(runHook(''))));
test('evento válido → exit 0, silencioso, y deja el estado escrito', () => {
  const o = sandbox();
  const r = runHook(JSON.stringify(edit('C:/proj/a.js')), { RIESGO_STATE_DIR: o.stateDir, RIESGO_LOG_FILE: o.logFile });
  assert.ok(clean(r));
  assert.ok(fs.readFileSync(path.join(o.stateDir, 's1.jsonl'), 'utf8').includes('"t":"code"'));
});
test('directorio de estado imposible → exit 0, silencioso', () => {
  const bad = path.join(__filename, 'no', 'puede');
  assert.ok(clean(runHook(JSON.stringify(edit('C:/proj/a.js')), { RIESGO_STATE_DIR: bad, RIESGO_LOG_FILE: bad })));
});

console.log('S9: eventos en paralelo (procesos reales)');
pending.push(new Promise(resolve => {
  const o = sandbox();
  const env = { ...process.env, RIESGO_STATE_DIR: o.stateDir, RIESGO_LOG_FILE: o.logFile };
  const evs = [];
  for (let i = 0; i < 8; i++) evs.push(edit(`C:/proj/f${i}.js`));
  for (let i = 0; i < 8; i++) evs.push({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'ssh srv ls' } });
  let done = 0;
  for (const ev of evs) {
    const c = spawn(process.execPath, [HOOK], { env });
    c.on('exit', () => {
      if (++done < evs.length) return;
      handle(stop('Riesgo: ítem 5'), o);
      test('16 eventos simultáneos: no se pierde ninguna edición ni la operación', () => {
        const r = readLog(o)[0];
        assert.strictEqual(r.codeEdits, 8);
        assert.deepStrictEqual(r.ops, ['ssh']);
      });
      resolve();
    });
    c.stdin.end(JSON.stringify(ev));
  }
}));

console.log('S8: report');
test('resume porcentajes', () => {
  const o = sandbox();
  handle(edit('C:/p/a.js'), o); handle(stop('Riesgo: ninguno'), o);
  handle(edit('C:/p/b.js'), o); handle(stop('Hecho.'), o);
  handle(edit('C:/p/c.js'), o); handle(agent(VERIFICADOR), o); handle(stop('Riesgo: ítem 2'), o);
  const r = report(o.logFile);
  assert.strictEqual(r.turnos, 3);
  assert.strictEqual(r.conLinea, 2);
  assert.strictEqual(r.conItem, 1);
  assert.strictEqual(r.itemConRevisor, 1);
  assert.deepStrictEqual(r.items, { 2: 1 });
});

Promise.all(pending).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
