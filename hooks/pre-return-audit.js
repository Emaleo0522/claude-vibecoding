#!/usr/bin/env node
/**
 * pre-return-audit.js — Reglas UNIVERSALES de auditoria CSS/HTML/JSX.
 * Complementa frontend-audit.sh (que requiere --mood/--hero/--motion del agente).
 * Port a node (2026-11-03) de pre-return-audit.sh con las mismas 5 reglas y los mismos
 * mensajes; el .sh quedo como envoltorio para quien lo invoque por CLI.
 *
 * Por que node: el .sh sacaba file_path con python3, partia las rutas con espacios y en modo
 * hook escribia los hallazgos a stderr, que no llegan a nadie. Aca el JSON se arma sin
 * dependencias y la regla R2 compara el nombre de fuente con "+" literal (el .sh usaba `\+`
 * de grep basico, que es "uno o mas", y daba falso positivo con fuentes de dos palabras
 * cargadas por Google Fonts, como family=Space+Grotesk).
 *
 * Modos:
 *   1. Hook PostToolUse async (settings.json): stdin con tool_input.file_path. Si hay hallazgos
 *      imprime UNA linea JSON {"hookSpecificOutput":{"hookEventName":"PostToolUse",
 *      "additionalContext":"..."}} y sale 0. Un hook async entrega additionalContext y
 *      systemMessage en el turno siguiente (hooks-doc.md:4093), en una linea propia
 *      (hooks-doc.md:4098; mismo formato que el ejemplo oficial async, hooks-doc.md:4130).
 *   2. CLI / Modo Modificacion: node pre-return-audit.js --files="a.css b.html"
 *      (separadas por espacio, como antes). Sin hallazgos: YAML PASS por stdout, exit 0.
 *      Con hallazgos: lista por stderr, exit 1 (senal para quien invoca).
 *
 * Ajustes 2026-11-03 (verificacion.md):
 *   - R1 ignora las lineas @media y @container: un breakpoint `@media (max-width: 1024px)` no es
 *     un container global (antes avisaba "usar 1600-1920px").
 *   - En modo hook no repite el mismo aviso (regla + archivo) dentro de una sesion: guarda lo ya
 *     avisado en un archivo por session_id en PRA_STATE_DIR (por defecto
 *     <tmp>/claude-pre-return-audit/), solo agregando lineas. Sin session_id, o si el estado no se
 *     puede leer o escribir, avisa igual (fail-open). Los archivos de mas de 2 dias se borran.
 *     El modo CLI no deduplica.
 * Nunca exit 2. Fail-open. Tests: tests/pre-return-audit.test.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const RELEVANT_EXT = new Set(['.css', '.scss', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const STYLE_EXT = new Set(['.css', '.scss']);
const MARKUP_EXT = new Set(['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro']); // R4 (sin .htm, igual que el .sh)

const FONT_NAMES = ['Space Grotesk', 'Plus Jakarta', 'Sora', 'Manrope', 'Cascadia', 'Geist', 'Satoshi', 'Clash', 'General Sans', 'Bricolage', 'Instrument', 'Recoleta', 'Tobias', 'Editorial'];
const FONT_ALT = FONT_NAMES.join('|');
const CUSTOM_FONT_RE = new RegExp(`font-family:[^;]*\\b(${FONT_ALT})\\b`);
const FONT_NAME_RE = new RegExp(`(${FONT_ALT})`);

const readLines = f => { try { return fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { return []; } };
const anyLine = (lines, re) => lines.some(l => re.test(l));

// Igual que el .sh: grep por linea sobre cada archivo.
function auditFile(f) {
  const findings = [];
  const ext = path.extname(f).toLowerCase();
  const lines = readLines(f);

  // R1: container max 1000-1299px (SaaS feel). Excepciones documentadas: prose, forms, inputs,
  // --container-sm/md/lg. Las formulas min()/clamp() no matchean a proposito (ADR #3517 P4).
  if (STYLE_EXT.has(ext)) {
    const hits = [];
    lines.forEach((l, i) => {
      if (/(max-width|--max|--envelope-max|--container-xl):\s*1[012][0-9][0-9]px/.test(l) &&
          !/prose|2xl|form|input|--container-(sm|md|lg)/.test(l) && !/@media|@container/.test(l)) hits.push(i + 1);
    });
    if (hits.length) {
      findings.push(`R1[container-cap-saas-feel]: ${f} → max-width 1180-1280px detectado en container global. Regla ux-architect.md: usar 1600-1920px para moods bold. Excepciones: max-w-prose (texto), forms. Líneas: ${hits[0]}`);
    }
  }

  // R2: fuente custom declarada sin <link> ni @font-face (en este archivo o en HTML hermanos).
  if (STYLE_EXT.has(ext)) {
    const hit = lines.find(l => CUSTOM_FONT_RE.test(l));
    if (hit) {
      const fontName = hit.match(FONT_NAME_RE)[1];
      let loaded = anyLine(lines, /@font-face|@import.*fonts/);
      if (!loaded) {
        const dir = path.dirname(f);
        const needle = fontName.replace(/ /g, '+').toLowerCase();
        let htmls = [];
        try { htmls = fs.readdirSync(dir).filter(x => x.endsWith('.html')); } catch { /* carpeta ilegible */ }
        loaded = htmls.some(h => readLines(path.join(dir, h))
          .some(l => /fonts\.googleapis|fonts\.bunny|@font-face/.test(l) && l.toLowerCase().includes(needle)));
      }
      if (!loaded) {
        findings.push(`R2[font-declared-not-loaded]: ${f} declara "${fontName}" pero no encuentro <link href=fonts.googleapis> ni @font-face en este archivo ni en HTML cercanos. Resultado: fallback a system-ui.`);
      }
    }
  }

  // R3: sticky con top sin scroll-padding-top (los anchor jumps quedan tapados).
  if (STYLE_EXT.has(ext) && anyLine(lines, /position:\s*sticky\s*;?[^}]*top:/) && !anyLine(lines, /scroll-padding-top|scroll-padding\s*:/)) {
    findings.push(`R3[sticky-no-scroll-padding]: ${f} tiene position:sticky en header pero falta scroll-padding-top en <html>. Anchor jumps quedarán ocultos detrás del header. Aplicar: html { scroll-padding-top: var(--scroll-pad-top); }`);
  }

  // R4: nav sin patron hamburguesa, solo si parece landing/marketing.
  if (MARKUP_EXT.has(ext) && anyLine(lines, /<nav\b|class="nav-links"/) &&
      !anyLine(lines, /aria-expanded|nav-toggle|hamburger|menu-toggle|MenuIcon|HamburgerMenu/) &&
      (anyLine(lines, /landing|hero|marketing|home|index/i) || path.basename(f) === 'index.html')) {
    findings.push(`R4[nav-mobile-no-hamburger]: ${f} tiene <nav> pero sin aria-expanded/nav-toggle/hamburger. Revisar que en mobile (<768px) no quede el menú permanentemente desplegado.`);
  }

  // R5: mas de 5 lineas con animaciones/transiciones sin prefers-reduced-motion.
  if (STYLE_EXT.has(ext)) {
    const count = lines.filter(l => /@keyframes|animation:|transition:/.test(l)).length;
    if (count > 5 && !anyLine(lines, /prefers-reduced-motion/)) {
      findings.push(`R5[reduced-motion-missing]: ${f} tiene ${count} animaciones/transiciones pero falta @media (prefers-reduced-motion: reduce). Usuarios con sensibilidad vestibular afectados.`);
    }
  }
  return findings;
}

function relevantFiles(files) {
  return files.filter(f => {
    if (!RELEVANT_EXT.has(path.extname(f).toLowerCase())) return false;
    try { return fs.statSync(f).isFile(); } catch { return false; }
  });
}

function audit(files) {
  const relevant = relevantFiles(files);
  return { relevant, findings: relevant.flatMap(auditFile) };
}

// ── Deduplicacion por sesion (solo modo hook) ──
const STATE_TTL_MS = 2 * 24 * 3600 * 1000;
const stateDir = () => process.env.PRA_STATE_DIR || path.join(os.tmpdir(), 'claude-pre-return-audit');

function pruneState(dir, now) {
  try {
    for (const x of fs.readdirSync(dir)) {
      const p = path.join(dir, x);
      try { if (now - fs.statSync(p).mtimeMs > STATE_TTL_MS) fs.unlinkSync(p); } catch { /* otro proceso lo borro */ }
    }
  } catch { /* sin carpeta todavia */ }
}

// Devuelve solo los hallazgos que esta sesion todavia no vio. Clave: regla + ruta normalizada.
function freshFindings(findings, sessionId, file, now = Date.now()) {
  if (!sessionId || !findings.length) return findings;
  const where = String(file).replace(/\\/g, '/').toLowerCase();
  const keyed = findings.map(f => ({ f, key: `${(String(f).match(/^R\d/) || ['R?'])[0]}|${where}` }));
  try {
    const dir = stateDir();
    const stateFile = path.join(dir, String(sessionId).replace(/[^\w.-]/g, '_') + '.txt');
    let seen = new Set();
    try { seen = new Set(fs.readFileSync(stateFile, 'utf8').split('\n').filter(Boolean)); } catch { /* primera vez */ }
    const fresh = keyed.filter(k => !seen.has(k.key));
    if (fresh.length) {
      fs.mkdirSync(dir, { recursive: true });
      // Solo se agregan lineas: dos hooks en paralelo, a lo sumo, repiten un aviso.
      fs.appendFileSync(stateFile, fresh.map(k => k.key).join('\n') + '\n');
    }
    pruneState(dir, now);
    return fresh.map(k => k.f);
  } catch {
    return findings; // estado roto: avisar igual
  }
}

function hookOutput(findings) {
  if (!findings.length) return '';
  const additionalContext = `pre-return-audit: ${findings.length} aviso(s) en reglas universales CSS/HTML/JSX (no bloquea). ` +
    findings.join(' | ');
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } });
}

function main() {
  const arg = process.argv.slice(2).find(a => a.startsWith('--files='));
  if (arg) {
    const { relevant, findings } = audit(arg.slice('--files='.length).split(/\s+/).filter(Boolean));
    if (!relevant.length) process.exit(0);
    if (!findings.length) {
      process.stdout.write(`PRE_RETURN_AUDIT:\n  verdict: PASS\n  files_audited: ${relevant.length}\n`, () => process.exit(0));
      return;
    }
    const lines = ['', `⚠️  PRE_RETURN_AUDIT — ${findings.length} warning(s):`, ...findings.map(x => `  • ${x}`), '',
      '  (Hook fail-open: no bloquea. Revisar antes de devolver al usuario.)', ''];
    process.stderr.write(lines.join('\n'), () => process.exit(1));
    return;
  }
  if (process.stdin.isTTY) process.exit(0);
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    try {
      raw = raw.trim();
      if (!raw) process.exit(0);
      const data = JSON.parse(raw) || {};
      const file = String((data.tool_input || {}).file_path || '');
      if (!file) process.exit(0);
      const out = hookOutput(freshFindings(audit([file]).findings, data.session_id, file));
      if (!out) process.exit(0);
      process.stdout.write(out + '\n', () => process.exit(0));
    } catch { process.exit(0); }
  });
}

if (require.main === module) main();

module.exports = { audit, auditFile, hookOutput, freshFindings };
