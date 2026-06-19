#!/usr/bin/env node
/**
 * healthcheck — "¿estoy listo?" en un solo comando.
 *
 * Orquesta las verificaciones ya existentes y devuelve un veredicto único:
 *   1. audit-system.js   (catálogo de agentes, hooks, settings, protocolo)
 *   2. drift-check.js    (repo ↔ ~/.claude en sync, por hash)
 *   3. mcp-registry.js   (schema del inventario MCP)
 *   4. engram binario     (presencia — proxy barato de memoria persistente)
 *
 * Uso:
 *   node healthcheck.js              # terse: una línea por chequeo + veredicto
 *   node healthcheck.js --verbose    # pasa --verbose a los sub-chequeos
 *
 * Exit: 0 = READY (sin FAIL)  |  1 = NOT READY (algún FAIL).
 * WARN no rompe (drift, degraded, pending tokens, engram ausente).
 * Utilidad MANUAL, no hook reactivo. Fail-open: un sub-chequeo que tira excepción
 * se reporta como WARN, nunca crashea el healthcheck.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();

// ---- funciones PURAS (testeadas) ----------------------------------------
function parseAuditStatus(stdout) {
  const statusMatch = stdout.match(/Status:\s*(HEALTHY|DEGRADED|BROKEN)/);
  const scoreMatch = stdout.match(/Score:\s*(\d+\/\d+)/);
  return {
    status: statusMatch ? statusMatch[1] : 'UNKNOWN',
    score: scoreMatch ? scoreMatch[1] : '?',
  };
}

function aggregate(parts) {
  const fails = [];
  const warns = [];
  const lines = [];

  // audit
  const a = parts.audit;
  lines.push(`audit-system : ${a.status} (${a.score})`);
  if (a.status === 'BROKEN' || a.status === 'UNKNOWN') fails.push(`audit-system ${a.status}`);
  else if (a.status === 'DEGRADED') warns.push('audit-system DEGRADED');

  // drift
  const d = parts.drift;
  lines.push(`drift        : ${d.summary}`);
  if (!d.clean) warns.push('drift detectado (repo ↔ ~/.claude desincronizados)');

  // mcp
  const m = parts.mcp;
  lines.push(`mcp-registry : ${m.summary}${m.errors.length ? '  [SCHEMA ERRORS]' : ''}`);
  if (m.errors.length) fails.push(`mcp-registry schema: ${m.errors.join('; ')}`);
  else if (/^SKIP/.test(m.summary)) warns.push('mcp-registry no legible (SKIP)');

  // engram
  const e = parts.engram;
  lines.push(`engram       : ${e.present ? 'binario presente' : 'NO encontrado'}`);
  if (!e.present) warns.push('engram binario ausente (memoria persistente degradada)');

  const ready = fails.length === 0;
  return {
    ready,
    verdict: ready ? 'VIBECODING READY' : 'VIBECODING NOT READY',
    fails,
    warns,
    lines,
  };
}

// ---- glue de I/O (verificado corriendo el CLI real) ----------------------
function runAudit(verbose) {
  try {
    const out = execFileSync('node', [path.join(__dirname, 'audit-system.js')], {
      encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseAuditStatus(out);
  } catch (e) {
    // audit-system sale 1 cuando hay FAILs pero igual imprime el Status en stdout
    const out = (e.stdout || '').toString();
    if (out) return parseAuditStatus(out);
    return { status: 'UNKNOWN', score: '?' };
  }
}

function runDrift() {
  try {
    const { findRepo, computeDrift, formatReport } = require('./drift-check.js');
    const repo = findRepo(null);
    if (!repo) return { clean: true, summary: 'SKIP — repo no encontrado (fail-open)' };
    const rep = formatReport(computeDrift(repo, path.join(HOME, '.claude'), HOME));
    return { clean: rep.clean, summary: rep.summary };
  } catch (e) {
    return { clean: true, summary: `SKIP — ${e.message}` };
  }
}

function runMcp() {
  try {
    const { loadRegistry, validate, formatSummary } = require('./mcp-registry.js');
    const reg = loadRegistry(path.join(__dirname, '..', 'mcp.registry.json'));
    return { errors: validate(reg).errors, summary: formatSummary(reg) };
  } catch (e) {
    return { errors: [], summary: `SKIP — ${e.message}` };
  }
}

function checkEngram() {
  const candidates = [
    path.join(HOME, 'go', 'bin', 'engram'),
    path.join(HOME, 'go', 'bin', 'engram.exe'),
  ];
  let present = candidates.some(c => fs.existsSync(c));
  if (!present) {
    // ¿en PATH?
    try { execFileSync('engram', ['--version'], { timeout: 5000, stdio: 'ignore' }); present = true; }
    catch (_) { /* no en PATH */ }
  }
  return { present };
}

if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  const parts = {
    audit: runAudit(verbose),
    drift: runDrift(),
    mcp: runMcp(),
    engram: checkEngram(),
  };
  const r = aggregate(parts);

  console.log('=== VIBECODING HEALTHCHECK ===');
  for (const l of r.lines) console.log(l);
  if (r.warns.length) { console.log('\nWARN:'); for (const w of r.warns) console.log(`  ! ${w}`); }
  if (r.fails.length) { console.log('\nFAIL:'); for (const f of r.fails) console.log(`  X ${f}`); }
  console.log(`\n${'='.repeat(30)}\n${r.verdict}`);
  process.exit(r.ready ? 0 : 1);
}

module.exports = { parseAuditStatus, aggregate };
