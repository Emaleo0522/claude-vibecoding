#!/usr/bin/env node
/**
 * Hook: pre-compact-engram (PreCompact)
 * Se ejecuta antes de compactar contexto.
 *
 * Que hace (no bloquea la compactacion, siempre exit 0), solo si stdin es una entrada real
 * de PreCompact (hook_event_name "PreCompact"); con cualquier otra cosa sale sin escribir.
 * Tests: tests/pre-compact-engram.test.js
 * 1. Guarda un snapshot a disco: snapshots/pre-compact-latest.json (tool count, cwd,
 *    fase del pipeline si hay .pipeline/estado.yaml en el cwd).
 * 2. Escribe el trigger snapshots/compaction-pending.json. Lo consume el Boot Sequence
 *    del orquestador (paso 0b de agents/orquestador.md), que hace el dual-write del
 *    DAG State y borra el archivo. Fuera del modo pipeline nadie lo lee.
 * 3. Borra el contador de tool calls de os.tmpdir() (si existe).
 *
 * NOTA: PreCompact hooks NO pueden llamar a MCPs (Engram); solo escriben a disco.
 * El mensaje que se escribe a stderr al final NO llega a Claude: "Claude never sees
 * stderr from a hook that exits 0" (hooks-doc.md:816), y PreCompact no tiene canal
 * hacia el modelo con exit 0 (solo exit 2 o decision:block, que bloquearian la
 * compactacion; hooks-doc.md:1014). Queda solo para el log de debug.
 *
 * Vibecoding v2.2. La version que bloqueaba via stderr (inspirada por MemPalace) se
 * reemplazo por el trigger file; la cabecera se corrigio el 2026-11-03.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const COUNTER_FILE = path.join(os.tmpdir(), '.claude-tool-call-counter.json');
const SNAPSHOT_DIR = path.join(os.homedir(), '.claude', 'snapshots');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'pre-compact-latest.json');
const TRIGGER_FILE = path.join(SNAPSHOT_DIR, 'compaction-pending.json');

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    // Solo una entrada real de PreCompact escribe algo (hooks-doc.md:3306: trae
    // "hook_event_name": "PreCompact"). Con `{}` o stdin vacio (audit-system T2/T5, una corrida
    // a mano) antes se escribia un compaction-pending.json falso que el orquestador tomaba como
    // compactacion real en su paso 0b. (2026-11-03)
    let data = null;
    try { data = JSON.parse(input); } catch (e) { /* no es JSON */ }
    if (!data || typeof data !== 'object' || data.hook_event_name !== 'PreCompact') process.exit(0);

    // Leer el contador de tool calls si existe
    let toolCallCount = 0;
    try {
      const counterData = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      toolCallCount = counterData.count || 0;
    } catch (e) {}

    // Crear directorio de snapshots si no existe
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    // Detectar si hay un pipeline activo (buscar .pipeline/ en cwd)
    const cwd = process.cwd();
    let pipelineActive = false;
    let pipelinePhase = '';
    let pipelineTask = '';
    try {
      const estadoPath = path.join(cwd, '.pipeline', 'estado.yaml');
      if (fs.existsSync(estadoPath)) {
        pipelineActive = true;
        const estado = fs.readFileSync(estadoPath, 'utf8');
        // Parser seguro: ignora comentarios (#...), quita quotes, maneja inline comments.
        // Busca solo top-level keys (sin indentación) para evitar matching en sub-objetos.
        const extractYamlField = (content, key) => {
          const lines = content.split('\n');
          for (const line of lines) {
            // Skip comments y líneas indentadas (sub-objetos)
            if (/^\s*#/.test(line) || /^\s/.test(line)) continue;
            const m = line.match(new RegExp(`^${key}\\s*:\\s*(.*)$`));
            if (m) {
              // Quitar inline comment y quotes
              let value = m[1].replace(/\s*#.*$/, '').trim();
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              return value;
            }
          }
          return null;
        };
        pipelinePhase = extractYamlField(estado, 'fase_actual') || '';
        const tarea = extractYamlField(estado, 'tarea_actual');
        const total = extractYamlField(estado, 'total_tareas');
        if (tarea && total && /^\d+$/.test(tarea) && /^\d+$/.test(total)) {
          pipelineTask = `${tarea}/${total}`;
        }
      }
    } catch (e) {}

    // Guardar snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      event: 'pre-compact',
      toolCallCount,
      cwd,
      pipelineActive,
      pipelinePhase,
      pipelineTask,
      note: 'Context was compacted. DAG State dual-write was requested before compaction.',
    };

    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

    // Escribir trigger file — Boot Sequence lo detecta y ejecuta dual-write
    // Esto reemplaza la instrucción en stderr que causaba respuestas vacías sin tool calls
    const trigger = {
      timestamp: snapshot.timestamp,
      pipelineActive,
      pipelinePhase,
      pipelineTask,
      cwd,
      instruction: 'dual-write-dag-state',
    };
    fs.writeFileSync(TRIGGER_FILE, JSON.stringify(trigger, null, 2));

    // Reset tool call counter (nuevo contexto despues de compactar)
    try {
      fs.unlinkSync(COUNTER_FILE);
    } catch (e) {}

    // Mensaje informativo para el log de debug: con exit 0 no le llega a Claude (hooks-doc.md:816)
    const pipelineInfo = pipelineActive
      ? ` Pipeline activo: ${pipelinePhase}, tarea ${pipelineTask}.`
      : '';

    process.stderr.write(
      '[pre-compact-engram] Snapshot guardado.' + pipelineInfo +
      ' Trigger file escrito en snapshots/compaction-pending.json.' +
      ' Boot Sequence detectará y ejecutará dual-write al iniciar.'
    );

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
