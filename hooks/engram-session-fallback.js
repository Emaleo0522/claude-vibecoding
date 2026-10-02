#!/usr/bin/env node
/**
 * Hook: engram-session-fallback (SessionStart)
 *
 * Engram v2 solo deja escribir por MCP (mem_save, mem_judge...) si la sesión
 * de Claude Code está registrada en el server local. El plugin la registra en
 * session-start.sh, pero falla en dos casos (diagnóstico 2026-10-01, pc004):
 *   1. Sin `jq` instalado el script no puede leer el session_id → nunca registra.
 *   2. Con carpeta de inicio ambigua (ej. /home/pc004, varios repos git) se
 *      saltea el registro a propósito.
 * Resultado: todo mem_save falla con "unknown_session".
 *
 * Este hook registra la sesión si todavía no existe: con el proyecto que
 * resuelve el server para el cwd, o con un proyecto neutro si es ambiguo.
 * Cada save sigue pasando project= explícito (regla de CLAUDE.md); el cruce
 * de proyectos está verificado en v2.2.1.
 *
 * Fail-open: nunca bloquea el arranque de la sesión.
 */

const FALLBACK_PROJECT = process.env.ENGRAM_FALLBACK_PROJECT || 'personal';
const ENGRAM_URL = process.env.ENGRAM_URL || `http://127.0.0.1:${process.env.ENGRAM_PORT || 7437}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options = {}) {
  const res = await fetch(`${ENGRAM_URL}${path}`, { ...options, signal: AbortSignal.timeout(2000) });
  let body = null;
  try { body = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, body };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || '{}');
  const sessionId = input.session_id;
  const cwd = input.cwd;
  if (!sessionId || !cwd) return;

  // El plugin puede estar levantando el server en paralelo: esperar hasta ~3 s.
  for (let i = 0; i < 6; i++) {
    try { if ((await request('/health')).status === 200) break; } catch { /* todavía no */ }
    await sleep(500);
  }

  // Si el plugin ya la registró, no hacer nada.
  const existing = await request(`/sessions/${encodeURIComponent(sessionId)}`);
  if (existing.status === 200 && existing.body && existing.body.id) return;

  const resolved = await request(`/project/current?cwd=${encodeURIComponent(cwd)}`);
  const source = resolved.body && resolved.body.project_source;
  const project = source && source !== 'ambiguous' && resolved.body.project
    ? resolved.body.project
    : FALLBACK_PROJECT;

  const created = await request('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sessionId, project, directory: cwd, ownership_mode: 'project_owned' }),
  });

  if (created.status >= 200 && created.status < 300) {
    if (project === FALLBACK_PROJECT && source === 'ambiguous') {
      process.stdout.write(`Engram: carpeta de inicio ambigua; sesión registrada con proyecto '${project}'. Pasá siempre project= explícito en mem_save.\n`);
    }
  } else {
    process.stderr.write(`warning: engram-session-fallback no pudo registrar la sesión (HTTP ${created.status}); usar CLI 'engram save'.\n`);
  }
}

main().catch(() => {}).finally(() => process.exit(0));
