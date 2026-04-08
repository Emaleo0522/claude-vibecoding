#!/usr/bin/env node
/**
 * Hook: pre-compact-engram (PreCompact / Notification)
 * Se ejecuta antes de compactar contexto.
 * Guarda un snapshot del estado de la sesion (tool call count, timestamp,
 * working directory) en un archivo local para que la siguiente sesion
 * pueda leerlo.
 *
 * NOTA: PreCompact hooks NO pueden llamar a MCPs (Engram).
 * Solo pueden escribir a disco. session-start-context.js lee esto al inicio.
 *
 * El DAG State del proyecto se persiste por separado:
 * - Engram: {proyecto}/estado (escrito por el orquestador despues de cada tarea)
 * - Disco: {project_dir}/.pipeline/estado.yaml (dual-write del orquestador)
 * Este hook NO es responsable del DAG State — solo del snapshot de sesion.
 *
 * Vibecoding v2.1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const COUNTER_FILE = path.join(os.tmpdir(), '.claude-tool-call-counter.json');
const SNAPSHOT_DIR = path.join(os.homedir(), '.claude', 'snapshots');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'pre-compact-latest.json');

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
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

    // Guardar snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      event: 'pre-compact',
      toolCallCount,
      cwd: process.cwd(),
      note: 'Context was compacted. Check Engram for project state. Counter reset.',
    };

    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));

    // Reset tool call counter (nuevo contexto despues de compactar)
    try {
      fs.unlinkSync(COUNTER_FILE);
    } catch (e) {}

    process.stderr.write(
      'Pre-compact snapshot saved. Engram state is persistent — project context preserved.'
    );

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
