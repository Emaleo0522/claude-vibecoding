#!/usr/bin/env node
/**
 * Hook: quality-gate (PostToolUse, matcher Write|Edit|MultiEdit)
 * Despues de editar/escribir archivos TS/JS, avisa sobre patrones problematicos en el
 * contenido nuevo: debugger, .only(), @ts-ignore/@ts-nocheck, `any` repetido, TODO/FIXME,
 * secretos y passwords hardcodeados, y console.log/warn/error/info/debug en codigo de
 * produccion (ignora tests, scripts, hooks, config; absorbido de console-log-warning.js,
 * archivado el 2026-11-03).
 *
 * Como avisa: JSON por stdout con hookSpecificOutput.additionalContext y exit 0
 * (hooks-doc.md:2228, PostToolUse lo agrega junto al resultado de la tool). Antes escribia a
 * stderr con exit 0 y no llegaba: "Claude never sees stderr from a hook that exits 0"
 * (hooks-doc.md:816). No bloquea nunca. Fail-open.
 *
 * Vibecoding v2.1 - Expandido con deteccion de secrets hardcodeados
 * Tests: tests/quality-gate.test.js
 */

const path = require('path');

const JS_TS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

const PATTERNS = [
  { regex: /(?::\s*any\b|<any>|\bas\s+any\b)/g, msg: 'TypeScript `any` type detected — consider using a specific type', severity: 'warn' },
  { regex: /\/\/\s*@ts-ignore/g, msg: '@ts-ignore detected — prefer @ts-expect-error with explanation', severity: 'warn' },
  { regex: /\/\/\s*@ts-nocheck/g, msg: '@ts-nocheck detected — this disables type checking for the entire file', severity: 'warn' },
  { regex: /\.only\s*\(/g, msg: '.only() in test — will skip other tests if committed', severity: 'error' },
  { regex: /debugger;/g, msg: 'debugger statement found — remove before committing', severity: 'error' },
  { regex: /TODO|FIXME|HACK|XXX/g, msg: 'TODO/FIXME/HACK marker found — track or resolve', severity: 'info' },
  { regex: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token|private[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}/ig, msg: 'Possible hardcoded secret/API key detected — use environment variables instead', severity: 'error', excludeEnvPatterns: true },
  { regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}/ig, msg: 'Possible hardcoded password detected — use environment variables instead', severity: 'error', excludeEnvPatterns: true },
];

// Patterns that indicate the match is an env var reference (not a hardcoded secret)
const ENV_REFERENCE_PATTERNS = [
  /process\.env\./,
  /import\.meta\.env\./,
  /Deno\.env\./,
  /Bun\.env\./,
  /\.env\?\./,      // optional chaining on env object
  /ENV\[/,          // Ruby/Node style ENV lookups
];

// console.* es aceptable en estos archivos (se comparan con la ruta en barras normales:
// el filtro viejo de console-log-warning fallaba con rutas de Windows).
const CONSOLE_IGNORED = [
  /\.test\./,
  /\.spec\./,
  /\.config\./,
  /\/__tests__\//,
  /\/tests?\//,
  /scripts\//,
  /hooks\//,
  /\.claude\//,
  /node_modules\//,
  /logger\./,
  /debug\./,
];
const CONSOLE_RE = /console\.(log|warn|error|debug|info)\s*\(/g;

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

// Texto nuevo que trajo la tool: content (Write), new_string (Edit), edits[].new_string (MultiEdit).
function newText(toolInput) {
  const ti = toolInput || {};
  if (Array.isArray(ti.edits)) return ti.edits.map(e => (e && e.new_string) || '').join('\n');
  return ti.content || ti.new_string || '';
}

function analyze(toolName, toolInput) {
  if (!EDIT_TOOLS.has(toolName)) return [];
  const filePath = String((toolInput || {}).file_path || '');
  if (!JS_TS_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) return [];
  const content = newText(toolInput);
  if (!content || content.length < 5) return [];

  const warnings = [];
  for (const pattern of PATTERNS) {
    const matches = content.match(pattern.regex);
    if (!matches || matches.length === 0) continue;
    // 'any' en comentarios o strings es OK, pero dificil de detectar sin AST: solo con 3 o mas
    if (pattern.msg.includes('`any` type')) {
      if (matches.length >= 3) warnings.push(`[${pattern.severity}] ${pattern.msg} (${matches.length}x)`);
    } else if (pattern.excludeEnvPatterns) {
      // Para secrets/passwords: descartar los que estan en una linea que lee una env var
      const realMatches = matches.filter((match) => {
        const idx = content.indexOf(match);
        if (idx === -1) return true;
        const lineStart = content.lastIndexOf('\n', idx) + 1;
        const lineEnd = content.indexOf('\n', idx);
        const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
        return !ENV_REFERENCE_PATTERNS.some((re) => re.test(line));
      });
      if (realMatches.length > 0) warnings.push(`[${pattern.severity}] ${pattern.msg} (${realMatches.length}x)`);
    } else {
      warnings.push(`[${pattern.severity}] ${pattern.msg} (${matches.length}x)`);
    }
  }

  const normPath = filePath.replace(/\\/g, '/');
  if (!CONSOLE_IGNORED.some(re => re.test(normPath))) {
    const cm = content.match(CONSOLE_RE);
    if (cm && cm.length > 0) {
      warnings.push(`[warn] ${cm.length} console statement(s) in production code — remove or use a proper logger`);
    }
  }
  return warnings;
}

if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      input = input.trim();
      if (!input) process.exit(0);
      const data = JSON.parse(input);
      const toolInput = data.tool_input || {};
      const warnings = analyze(data.tool_name || '', toolInput);
      if (warnings.length === 0) process.exit(0);
      const fileName = path.basename(String(toolInput.file_path || ''));
      const additionalContext = `quality-gate [${fileName}]: ${warnings.join(' | ')}`;
      // Salir en el callback: asi el JSON termina de escribirse aunque stdout sea asincrono.
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }), () => process.exit(0));
    } catch (err) {
      process.exit(0);
    }
  });
}

module.exports = { analyze, newText };
