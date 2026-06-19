#!/usr/bin/env node
/**
 * drift-check — compara la copia VIVA (~/.claude/) contra el repo claude-vibecoding
 * y reporta divergencias de CONTENIDO (hash sha256).
 *
 * Complementa T1 de audit-system.js: T1 valida QUÉ agentes existen (catálogo);
 * drift-check valida si su CONTENIDO coincide con el repo fuente. Resuelve el dolor
 * histórico de quedar desincronizado sin enterarse (ver .gitattributes 2026-05-20).
 *
 * Uso:
 *   node drift-check.js                # terse: solo divergencias + 1 línea resumen
 *   node drift-check.js --verbose      # lista cada archivo (match/extra incluidos)
 *   node drift-check.js --repo <path>  # path explícito al repo
 *   VIBECODING_REPO=<path> node drift-check.js
 *
 * Exit: 0 = limpio (sin DRIFT ni MISSING)  |  1 = hay divergencias
 *       0 = repo no encontrado (SKIP, fail-open — nunca rompe un flujo).
 *
 * Es una UTILIDAD MANUAL (como audit-system.js), NO un hook reactivo: no se cablea
 * en settings.json, no se dispara por tool call. Cuesta tokens solo cuando se invoca.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();

// Conjunto rastreado: directorios que históricamente driftearon.
const TRACKED_DIRS = [
  { name: 'agents', exts: ['.md'] },
  { name: 'hooks', exts: ['.js', '.sh'] },
];
// Archivos sueltos: repo-relative -> primer candidato existente bajo HOME.
// CLAUDE.md vive runtime en ~/.claude/CLAUDE.md (lo que Claude carga, T9 prioridad 1);
// el instalador histórico además escribe ~/CLAUDE.md. Preferimos el primero.
const TRACKED_FILES = [
  { repo: 'CLAUDE.md', homeCandidates: ['.claude/CLAUDE.md', 'CLAUDE.md'] },
];

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => {
    const full = path.join(dir, f);
    // statSync tira en symlinks colgantes; lo saltamos en vez de romper el flujo (fail-open).
    let st;
    try { st = fs.statSync(full); } catch (_) { return false; }
    if (!st.isFile()) return false;
    if (!exts) return true;
    return exts.some(e => f.endsWith(e));
  });
}

/**
 * computeDrift — función PURA (testeable).
 *   match   = existe en ambos, hash igual
 *   drift   = existe en ambos, hash distinto
 *   missing = existe en repo, no instalado en runtime
 *   extra   = instalado en runtime, no en repo (satélite o stale — nunca falla)
 */
function computeDrift(repoDir, claudeDir, homeDir, opts = {}) {
  const trackedDirs = opts.trackedDirs || TRACKED_DIRS;
  const trackedFiles = opts.trackedFiles || TRACKED_FILES;
  const result = { drift: [], missing: [], extra: [], match: [] };

  for (const { name, exts } of trackedDirs) {
    const repoSub = path.join(repoDir, name);
    const runSub = path.join(claudeDir, name);
    const repoFiles = new Set(listFiles(repoSub, exts));
    const runFiles = new Set(listFiles(runSub, exts));

    for (const f of repoFiles) {
      const rel = `${name}/${f}`;
      if (!runFiles.has(f)) { result.missing.push(rel); continue; }
      const eq = sha256(path.join(repoSub, f)) === sha256(path.join(runSub, f));
      (eq ? result.match : result.drift).push(rel);
    }
    for (const f of runFiles) {
      if (!repoFiles.has(f)) result.extra.push(`${name}/${f}`);
    }
  }

  for (const { repo, homeCandidates } of trackedFiles) {
    const repoPath = path.join(repoDir, repo);
    if (!fs.existsSync(repoPath)) continue;
    const runRel = homeCandidates.find(c => fs.existsSync(path.join(homeDir, c)));
    if (!runRel) { result.missing.push(repo); continue; }
    const eq = sha256(repoPath) === sha256(path.join(homeDir, runRel));
    (eq ? result.match : result.drift).push(repo);
  }

  return result;
}

function isRepo(c) {
  return fs.existsSync(path.join(c, 'agents')) && fs.existsSync(path.join(c, 'hooks'));
}

function findRepo(explicit) {
  // Un --repo explícito es autoritativo: si no es válido, NO hace fallback silencioso
  // a otro repo (evita comparar contra el repo equivocado sin avisar).
  if (explicit) return isRepo(explicit) ? explicit : null;
  const candidates = [
    process.env.VIBECODING_REPO,
    path.join(HOME, 'dev', 'claude-vibecoding'),
    path.join(HOME, 'claude-vibecoding'),
    path.join(HOME, 'repos', 'claude-vibecoding'),
  ].filter(Boolean);
  for (const c of candidates) {
    if (isRepo(c)) return c;
  }
  return null;
}

function formatReport(result, opts = {}) {
  const verbose = opts.verbose || false;
  const { drift, missing, extra, match } = result;
  const lines = [];
  for (const f of drift) lines.push(`  DRIFT    ${f}`);
  for (const f of missing) lines.push(`  MISSING  ${f}  (en repo, no instalado)`);
  if (verbose) {
    for (const f of extra) lines.push(`  extra    ${f}  (runtime-only / satélite)`);
    for (const f of match) lines.push(`  ok       ${f}`);
  }
  const clean = drift.length === 0 && missing.length === 0;
  const summary = clean
    ? `CLEAN — ${match.length} en sync${extra.length ? `, ${extra.length} runtime-only` : ''}`
    : `DRIFT — ${drift.length} divergentes, ${missing.length} sin instalar (${match.length} ok)`;
  return { text: lines.join('\n'), summary, clean };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const repoIdx = argv.indexOf('--repo');
  const explicit = repoIdx >= 0 ? argv[repoIdx + 1] : null;
  const repo = findRepo(explicit);
  const claudeDir = path.join(HOME, '.claude');

  if (!repo) {
    console.log('drift-check: SKIP — repo claude-vibecoding no encontrado (set VIBECODING_REPO o --repo). Fail-open.');
    process.exit(0);
  }
  const rep = formatReport(computeDrift(repo, claudeDir, HOME), { verbose });
  if (rep.text) console.log(rep.text);
  console.log(`drift-check: ${rep.summary}`);
  process.exit(rep.clean ? 0 : 1);
}

module.exports = { sha256, listFiles, computeDrift, findRepo, formatReport };
