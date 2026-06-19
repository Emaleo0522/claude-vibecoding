#!/usr/bin/env node
/**
 * mcp-registry — lee mcp.registry.json (inventario legible de MCPs) y reporta un
 * resumen terse por status. Reemplaza el inventario en prosa que vivía suelto en
 * CLAUDE.md por una fuente de verdad consultable y validable.
 *
 * Uso:
 *   node mcp-registry.js               # resumen terse (1 línea + problemas)
 *   node mcp-registry.js --verbose     # lista todos los servers
 *   node mcp-registry.js --strict      # exit 1 si el registry tiene errores de schema
 *   node mcp-registry.js --json        # imprime el summarize() como JSON
 *
 * Exit: 0 normal. Con --strict: 1 si hay errores de validación.
 * Utilidad MANUAL (no hook reactivo). JSON nativo, sin dependencias (no js-yaml).
 */
const fs = require('fs');
const path = require('path');

const VALID_STATUSES = ['LIVE', 'CONFIG_ONLY', 'PENDING_TOKEN', 'OPTIONAL', 'MISSING'];
const DEFAULT_FILE = path.join(__dirname, '..', 'mcp.registry.json');

function loadRegistry(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** validate — función pura. Devuelve { errors: [] }. */
function validate(registry) {
  const errors = [];
  if (!registry || typeof registry !== 'object') return { errors: ['registry no es un objeto'] };
  if (!Array.isArray(registry.servers)) return { errors: ['servers debe ser un array'] };
  const seen = new Set();
  for (const s of registry.servers) {
    const id = s && s.id ? s.id : '(sin id)';
    if (!s.id) errors.push('server sin id');
    if (!s.capability) errors.push(`${id}: sin capability`);
    if (!s.status) errors.push(`${id}: sin status`);
    else if (!VALID_STATUSES.includes(s.status)) errors.push(`${id}: status inválido "${s.status}"`);
    if (s.id) {
      if (seen.has(s.id)) errors.push(`${id}: id duplicado`);
      seen.add(s.id);
    }
  }
  return { errors };
}

/** summarize — función pura. Conteos por status + lista de problemas. */
function summarize(registry) {
  const byStatus = {};
  const problems = [];
  for (const s of registry.servers) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    if (s.status === 'PENDING_TOKEN') problems.push(`${s.id} (PENDING_TOKEN${s.env && s.env.length ? `: ${s.env.join(',')}` : ''})`);
    if (s.status === 'MISSING') problems.push(`${s.id} (MISSING)`);
  }
  return { total: registry.servers.length, byStatus, problems };
}

function formatSummary(registry, precomputed) {
  const s = precomputed || summarize(registry);
  const counts = Object.entries(s.byStatus).map(([k, v]) => `${v} ${k}`).join(', ');
  return `${s.total} MCPs (${counts})`;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  let registry;
  try {
    registry = loadRegistry(DEFAULT_FILE);
  } catch (e) {
    console.log(`mcp-registry: SKIP — no se pudo leer mcp.registry.json (${e.message}). Fail-open.`);
    process.exit(0);
  }

  const v = validate(registry);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ summary: summarize(registry), errors: v.errors }, null, 2));
    process.exit(argv.includes('--strict') && v.errors.length ? 1 : 0);
  }

  const sum = summarize(registry);
  console.log(`mcp-registry: ${formatSummary(registry, sum)}`);
  if (argv.includes('--verbose')) {
    for (const s of registry.servers) console.log(`  ${s.status.padEnd(13)} ${s.id.padEnd(18)} ${s.capability}`);
  }
  if (sum.problems.length) console.log(`  pendientes: ${sum.problems.join(' · ')}`);
  if (v.errors.length) {
    console.log(`  ERRORES de schema: ${v.errors.join('; ')}`);
    if (argv.includes('--strict')) process.exit(1);
  }
  process.exit(0);
}

module.exports = { loadRegistry, validate, summarize, formatSummary, VALID_STATUSES };
