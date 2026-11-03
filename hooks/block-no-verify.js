#!/usr/bin/env node
/**
 * Hook: block-dangerous (PreToolUse)
 * Bloquea comandos destructivos: git bypasses, rm -rf, DROP TABLE, etc.
 * Exit 2 = BLOCK (Claude recibe el stderr como motivo), Exit 0 = ALLOW
 *
 * Vibecoding v2.1 - Expandido con patrones destructivos
 * 2026-09-27 - Cubre tambien la tool PowerShell (matcher "Bash|PowerShell" en settings.json)
 *              + patrones propios de PowerShell.
 * 2026-11-03 - Saltos de hooks de git leidos con un parser de comandos, no con regex sobre el
 *              texto: `git commit -n` (tambien dentro de `-anm`), `-c core.hooksPath=...`,
 *              `git config core.hooksPath ...` y `--no-verify` en commit/push/merge/pull/rebase/am.
 *              El parser respeta comillas y saltea cuerpos de heredoc, asi que un `echo`, un
 *              mensaje de commit o un heredoc que mencionan la bandera ya no bloquean.
 *            - Tanda de correccion (verificacion.md): el lector entiende barra invertida y
 *              backtick de PowerShell (con continuacion de linea), comentarios # y <# #>,
 *              here-strings @'...'@, sustituciones $(...) y `...`, y vuelve a analizar el
 *              argumento de bash/sh -c, pwsh/powershell -Command o -EncodedCommand, cmd /c y
 *              eval/Invoke-Expression. Si no puede cerrar una comilla o sustitucion y el texto
 *              parece un salto de hooks, bloquea. Bloquea tambien saltos por entorno: HUSKY=0,
 *              HUSKY_SKIP_HOOKS, LEFTHOOK=0, GIT_CONFIG_KEY_n=core.hooksPath y
 *              GIT_CONFIG_PARAMETERS (delante de git, o con export / $env: / set).
 *              Tests: tests/block-no-verify.test.js (incluye paridad contra 960036e)
 */

// ── Lector chico de comandos: Bash, PowerShell y cmd ──
// mode: 'bash' | 'ps' | 'cmd'. Entiende comillas, escapes (\ en bash, ` en PowerShell, ^ en cmd),
// continuacion de linea, comentarios #, heredocs y here-strings, y sustituciones $(...) y `...`,
// cuyo contenido se vuelve a analizar como comando. Lo que el lector no puede cerrar (una
// comilla o una sustitucion sin terminar) se marca como inseguro: si ademas el texto parece un
// salto de hooks, se bloquea (fail-closed solo para eso).

// Saca el cuerpo de cada heredoc (<<EOF, <<-EOF, <<'EOF', <<"EOF"; no los here-string <<<).
// El cuerpo es texto, no comandos. Si no aparece la linea de cierre no se saca nada:
// mejor revisar de mas que dejar pasar.
function stripHeredocs(cmd) {
  let s = String(cmd || '');
  const re = /(^|[^<])<<(-?)\s*(['"]?)([A-Za-z_][\w-]*)\3/g;
  let m;
  while ((m = re.exec(s))) {
    const lineEnd = s.indexOf('\n', re.lastIndex);
    if (lineEnd < 0) break;
    const lines = s.slice(lineEnd + 1).split('\n');
    const close = lines.findIndex(l => (m[2] ? l.replace(/^\t+/, '') : l).trim() === m[4]);
    if (close < 0) continue;
    const bodyLen = lines.slice(0, close + 1).join('\n').length;
    s = s.slice(0, lineEnd + 1) + s.slice(lineEnd + 1 + bodyLen + 1);
    re.lastIndex = lineEnd;
  }
  return s;
}

const isEscape = (mode, c) => (mode === 'bash' && c === '\\') || (mode === 'ps' && c === '`') || (mode === 'cmd' && c === '^');

// Indice del ')' que cierra el '(' de s[open], o -1. Saltea comillas y escapes.
function closeParen(s, open, mode) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (isEscape(mode, c)) { i++; continue; }
    if (c === "'" && mode !== 'cmd') { const k = s.indexOf("'", i + 1); if (k < 0) return -1; i = k; continue; }
    if (c === '"') {
      let k = i + 1;
      while (k < s.length && s[k] !== '"') k += isEscape(mode, s[k]) ? 2 : 1;
      if (k >= s.length) return -1;
      i = k; continue;
    }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

// Proximo backtick sin escapar (sustitucion de bash), o -1.
function findBacktick(s, from) {
  for (let k = from; k < s.length; k++) {
    if (s[k] === '\\') { k++; continue; }
    if (s[k] === '`') return k;
  }
  return -1;
}

// Sustituciones $(...) dentro de un texto expandible (here-string "@...@" de PowerShell).
function substitutionsIn(text, mode, nested) {
  for (let k = text.indexOf('$('); k >= 0; k = text.indexOf('$(', k + 2)) {
    const e = closeParen(text, k + 1, mode);
    if (e < 0) return false;
    nested.push(text.slice(k + 2, e));
    k = e - 1;
  }
  return true;
}

// Parte en segmentos por ; && || | & ( ) { } y salto de linea fuera de comillas (`2>&1` y `&>`
// no cortan) y junta aparte el contenido de las sustituciones de comandos.
function scan(cmd, mode = 'bash') {
  const s = mode === 'bash' ? stripHeredocs(cmd) : String(cmd || '');
  const segs = [], nested = [];
  let cur = '', unsafe = false;
  const atWordStart = () => cur === '' || /\s$/.test(cur);
  for (let i = 0; i < s.length; i++) {
    const c = s[i], nx = s[i + 1];

    if (isEscape(mode, c)) {
      if (nx === '\n') { cur += ' '; i++; continue; }                          // continuacion de linea
      if (nx === '\r' && s[i + 2] === '\n') { cur += ' '; i += 2; continue; }
      if (nx === undefined) { unsafe = true; continue; }
      cur += c + nx; i++; continue;                                           // words() resuelve el escape
    }
    if (c === '#' && mode !== 'cmd' && atWordStart()) {                        // comentario hasta fin de linea
      while (i + 1 < s.length && s[i + 1] !== '\n') i++;
      continue;
    }
    if (mode === 'ps' && c === '<' && nx === '#') {                            // comentario de bloque <# ... #>
      const e = s.indexOf('#>', i + 2);
      if (e < 0) { unsafe = true; break; }
      i = e + 1; continue;
    }
    if (mode === 'ps' && c === '@' && (nx === "'" || nx === '"') && /^[ \t]*\r?\n/.test(s.slice(i + 2, i + 64))) {
      const close = s.indexOf('\n' + nx + '@', i + 2);                          // here-string @'...'@ / @"..."@
      if (close < 0) { unsafe = true; break; }
      const body = s.slice(s.indexOf('\n', i + 2) + 1, close).replace(/\r$/, '');
      if (nx === '"' && !substitutionsIn(body, mode, nested)) unsafe = true;
      cur += "'" + body.replace(/'/g, "''") + "'";
      i = close + 2; continue;
    }
    if (c === "'" && mode !== 'cmd') {
      let k = i + 1;
      for (;;) {
        k = s.indexOf("'", k);
        if (k >= 0 && mode === 'ps' && s[k + 1] === "'") { k += 2; continue; }
        break;
      }
      if (k < 0) { unsafe = true; cur += s.slice(i); break; }
      cur += s.slice(i, k + 1); i = k; continue;
    }
    if (c === '"') {
      let k = i + 1, closed = false;
      while (k < s.length) {
        const d = s[k];
        if (isEscape(mode, d) && mode !== 'cmd') { k += 2; continue; }
        if (d === '"') {
          if (mode === 'ps' && s[k + 1] === '"') { k += 2; continue; }
          closed = true; break;
        }
        if (mode !== 'cmd' && d === '$' && s[k + 1] === '(') {
          const e = closeParen(s, k + 1, mode);
          if (e < 0) break;
          nested.push(s.slice(k + 2, e)); k = e + 1; continue;
        }
        if (mode === 'bash' && d === '`') {
          const e = findBacktick(s, k + 1);
          if (e < 0) break;
          nested.push(s.slice(k + 1, e)); k = e + 1; continue;
        }
        k++;
      }
      if (!closed) { unsafe = true; cur += s.slice(i); break; }
      cur += s.slice(i, k + 1); i = k; continue;
    }
    if (mode === 'bash' && c === '`') {
      const e = findBacktick(s, i + 1);
      if (e < 0) { unsafe = true; break; }
      nested.push(s.slice(i + 1, e)); cur += ' '; i = e; continue;
    }
    if (mode !== 'cmd' && c === '$' && nx === '(') {
      const e = closeParen(s, i + 1, mode);
      if (e < 0) { unsafe = true; break; }
      nested.push(s.slice(i + 2, e)); cur += ' '; i = e; continue;
    }
    if (mode !== 'cmd' && c === '$' && nx === '{') {                           // ${VAR}: no es un bloque
      const e = s.indexOf('}', i + 2);
      if (e < 0) { unsafe = true; break; }
      cur += s.slice(i, e + 1); i = e; continue;
    }
    const ampRedirect = c === '&' && (s[i - 1] === '>' || nx === '>');
    if (c === ';' || c === '\n' || c === '|' || c === '(' || c === ')' || c === '{' || c === '}' || (c === '&' && !ampRedirect)) {
      segs.push(cur); cur = '';
      if ((c === '|' && nx === '|') || (c === '&' && nx === '&')) i++;
      continue;
    }
    cur += c;
  }
  segs.push(cur);
  return { segs: segs.map(x => x.trim()).filter(Boolean), nested, unsafe };
}

// Compatibilidad: solo los segmentos.
const segments = (cmd, mode) => scan(cmd, mode).segs;

// Palabras de un segmento, sin comillas ni escapes (lo que el programa recibe en argv).
function words(seg, mode = 'bash') {
  const out = [];
  let cur = '', q = null, has = false;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q === "'") {
      if (c === "'") {
        if (mode === 'ps' && seg[i + 1] === "'") { cur += "'"; i++; continue; }
        q = null; continue;
      }
      cur += c; continue;
    }
    if (q === '"') {
      if (mode === 'bash' && c === '\\' && '"\\$`'.includes(seg[i + 1] || '\0')) { cur += seg[++i]; continue; }
      if (mode === 'ps' && c === '`' && i + 1 < seg.length) { cur += seg[++i]; continue; }
      if (c === '"') {
        if (mode === 'ps' && seg[i + 1] === '"') { cur += '"'; i++; continue; }
        q = null; continue;
      }
      cur += c; continue;
    }
    if (isEscape(mode, c)) { if (i + 1 < seg.length) { cur += seg[++i]; has = true; } continue; }
    if (c === '"' || (c === "'" && mode !== 'cmd')) { q = c; has = true; continue; }
    if (/\s/.test(c)) { if (has) out.push(cur); cur = ''; has = false; continue; }
    cur += c; has = true;
  }
  if (has) out.push(cur);
  return out;
}

// ── Reglas de git ──

// Palabras que pueden ir antes de git en un segmento: prefijos de ejecucion y palabras de
// control de bash (if/then/do...) o la llave de un bloque de PowerShell o bash.
const PREFIXES = new Set(['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'builtin',
  'if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{', '}']);
// Interpretes cuyo argumento es otro comando: se vuelve a analizar.
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const PS_VALUE_OPTS = /^[-/](executionpolicy|ex|ep|workingdirectory|wd|windowstyle|w|outputformat|of|inputformat|if|configurationname|settingsfile|custompipename|version)$/i;
const MAX_DEPTH = 6;
// Opciones globales de git que llevan valor separado.
const GIT_GLOBAL_WITH_ARG = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix', '--exec-path']);
// Subcomandos donde --no-verify saltea hooks, y sus opciones con valor (para no leer un mensaje como bandera).
const SUBS = {
  commit: {
    shortArg: 'mFCct', shortOptAttached: 'Su',
    longArg: ['--message', '--file', '--author', '--date', '--template', '--reuse-message', '--reedit-message',
      '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file'],
  },
  merge: { shortArg: 'mFsX', shortOptAttached: 'S', longArg: ['--message', '--file', '--strategy', '--strategy-option', '--into-name'] },
  // pull le pasa --no-verify al merge que hace
  pull: { shortArg: 'sX', shortOptAttached: 'S', longArg: ['--strategy', '--strategy-option', '--upload-pack', '--depth', '--deepen', '--shallow-since', '--shallow-exclude'] },
  rebase: { shortArg: 'xsXC', shortOptAttached: 'S', longArg: ['--onto', '--exec', '--strategy', '--strategy-option'] },
  push: { shortArg: 'o', shortOptAttached: '', longArg: ['--repo', '--push-option', '--receive-pack', '--exec'] },
  am: { shortArg: 'C', shortOptAttached: 'S', longArg: ['--directory', '--exclude', '--include', '--patch-format', '--resolvemsg'] },
};

const isHooksPathSetting = v => /^core\.hookspath(=|$)/i.test(String(v || ''));
// git acepta abreviaturas unicas de opciones largas: --no-veri, --no-verif, --no-verify.
const isNoVerify = t => t.length >= '--no-veri'.length && '--no-verify'.startsWith(t);
const ASSIGN_RE = /^([A-Za-z_]\w*)=([\s\S]*)$/;

// Variables de entorno que saltean hooks: husky (HUSKY=0, HUSKY_SKIP_HOOKS de la v4), lefthook,
// y core.hooksPath por GIT_CONFIG_COUNT/GIT_CONFIG_KEY_n o GIT_CONFIG_PARAMETERS.
function envSkip(name, value) {
  const n = String(name).toUpperCase(), v = String(value);
  if ((n === 'HUSKY' || n === 'LEFTHOOK') && /^(0|false)$/i.test(v.trim())) return 'husky';
  if (n === 'HUSKY_SKIP_HOOKS' && v.trim() !== '') return 'husky';
  if (/^GIT_CONFIG_KEY_\d+$/.test(n) && /^core\.hookspath$/i.test(v.trim())) return 'hooksPath';
  if (n === 'GIT_CONFIG_PARAMETERS' && /core\.hookspath/i.test(v)) return 'hooksPath';
  return null;
}

const MSG_NO_VERIFY = 'BLOCKED: --no-verify (or git commit -n) detected. Hooks exist for a reason. ' +
  'If you really need this, ask the user for explicit permission.';
const MSG_HOOKS_PATH = 'BLOCKED: core.hooksPath override detected. It replaces or disables the repo git hooks. ' +
  'If you really need this, ask the user for explicit permission.';
const MSG_ENV = 'BLOCKED: git hooks skipped through the environment (HUSKY=0, HUSKY_SKIP_HOOKS, LEFTHOOK=0). ' +
  'If you really need this, ask the user for explicit permission.';
const MSG_UNPARSEABLE = 'BLOCKED: this command could not be parsed safely (unclosed quote or substitution) and it looks ' +
  'like a git hook skip (--no-verify, commit -n, core.hooksPath, HUSKY=0). Rewrite it or ask the user for explicit permission.';

// Solo se usa cuando el lector no pudo cerrar algo: si el texto se parece a un salto de hooks, bloquea.
const SUSPECT_RE = [
  /\bgit(\.exe)?\b[\s\S]*\b(commit|push|merge|pull|rebase|am)\b[\s\S]*(--no-veri|\s-[a-z]*n)/i,
  /core\.hookspath/i,
  /\b(husky|husky_skip_hooks|lefthook)\s*=/i,
  /GIT_CONFIG_(KEY_\d+|PARAMETERS)/i,
];
const suspect = s => SUSPECT_RE.some(re => re.test(String(s || '')));

// `export HUSKY=0`, `$env:HUSKY=0`, `set HUSKY=0` (cmd): marcan el resto del comando.
function exportedSkips(seg, tokens, mode, env) {
  if (mode === 'ps') {
    const m = seg.match(/^\$env:([A-Za-z_]\w*)\s*=\s*([\s\S]*)$/i);
    if (!m) return false;
    const k = envSkip(m[1], words(m[2], 'ps').join(' '));
    if (k) env[k] = true;
    return true;
  }
  const head = String(tokens[0] || '').toLowerCase();
  if ((mode === 'bash' && (head === 'export' || head === 'declare' || head === 'typeset')) || (mode === 'cmd' && head === 'set')) {
    for (const t of tokens.slice(1)) {
      const m = t.match(ASSIGN_RE);
      const k = m && envSkip(m[1], m[2]);
      if (k) env[k] = true;
    }
    return true;
  }
  return false;
}

function checkGit(t, env) {
  if (env.hooksPath) return MSG_HOOKS_PATH;
  let i = 0;
  // Opciones globales: -C dir, -c k=v, --config-env=k=VAR, --git-dir=x, --no-pager...
  while (i < t.length && t[i].startsWith('-')) {
    const a = t[i];
    if (a === '-c' || a === '--config-env') { if (isHooksPathSetting(t[i + 1])) return MSG_HOOKS_PATH; i += 2; continue; }
    if (a.startsWith('--config-env=')) { if (isHooksPathSetting(a.slice(13))) return MSG_HOOKS_PATH; i++; continue; }
    if (a.startsWith('-c') && !a.startsWith('--')) { if (isHooksPathSetting(a.slice(2))) return MSG_HOOKS_PATH; i++; continue; }
    i += GIT_GLOBAL_WITH_ARG.has(a) ? 2 : 1;
  }
  const sub = t[i];
  const args = t.slice(i + 1);

  if (sub === 'config') {
    const k = args.findIndex(isHooksPathSetting);
    if (k < 0) return null;
    const before = args.slice(0, k);
    const verb = before.find(a => !a.startsWith('-'));
    if (verb === 'get' || verb === 'list') return null;
    if (before.some(a => /^(--get|--get-all|--get-regexp|--list|-l|--show-origin|--show-scope)$/.test(a))) return null;
    const writes = verb === 'set' || verb === 'unset' || before.some(a => /^(--unset|--unset-all|--replace-all|--add)$/.test(a));
    return writes || k < args.length - 1 ? MSG_HOOKS_PATH : null;
  }

  const spec = SUBS[sub];
  if (!spec) return null;
  if (env.husky) return MSG_ENV;
  for (let j = 0; j < args.length; j++) {
    const a = args[j];
    if (a === '--') break;
    if (a.startsWith('--')) {
      if (isNoVerify(a)) return MSG_NO_VERIFY;
      if (!a.includes('=') && spec.longArg.includes(a)) j++;
      continue;
    }
    if (a.length < 2 || a[0] !== '-') continue;
    // Grupo de banderas cortas: -anm "x". La primera que lleva valor se come el resto (o la palabra siguiente).
    for (let k = 1; k < a.length; k++) {
      const c = a[k];
      if (sub === 'commit' && c === 'n') return MSG_NO_VERIFY;
      if (spec.shortArg.includes(c)) { if (k === a.length - 1) j++; break; }
      if (spec.shortOptAttached.includes(c)) break;
    }
  }
  return null;
}

// Un segmento ya partido en palabras: asignaciones y prefijos, despues el programa.
function checkTokens(tokens, mode, depth, env) {
  const local = { ...env };
  let i = 0;
  for (; i < tokens.length; i++) {
    const m = tokens[i].match(ASSIGN_RE);
    if (m) { const k = envSkip(m[1], m[2]); if (k) local[k] = true; continue; }
    if (PREFIXES.has(tokens[i])) continue;
    break;
  }
  if (i >= tokens.length) return null;
  const base = String(tokens[i]).split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');
  const rest = tokens.slice(i + 1);

  if (SHELLS.has(base)) {                                   // bash -c "...", sh -lc '...'
    const j = rest.findIndex(t => /^-[a-z]*c[a-z]*$/i.test(t));
    return j >= 0 && j + 1 < rest.length ? checkHookSkips(rest[j + 1], 'bash', depth + 1, local) : null;
  }
  if (base === 'pwsh' || base === 'powershell') {           // -Command, -EncodedCommand, o posicional en powershell 5.1
    for (let j = 0; j < rest.length; j++) {
      const t = rest[j];
      if (/^[-/]c(o(m(m(a(n(d)?)?)?)?)?)?$/i.test(t)) return checkHookSkips(rest.slice(j + 1).join(' '), 'ps', depth + 1, local);
      if (/^[-/]e(c|n(c(o(d(e(d(c(o(m(m(a(n(d)?)?)?)?)?)?)?)?)?)?)?)?)?$/i.test(t)) {
        let decoded = '';
        try { decoded = Buffer.from(String(rest[j + 1] || ''), 'base64').toString('utf16le'); } catch { /* base64 roto */ }
        return checkHookSkips(decoded, 'ps', depth + 1, local);
      }
      if (/^[-/]f(ile)?$/i.test(t)) return null;
      if (PS_VALUE_OPTS.test(t)) { j++; continue; }
      if (/^[-/]/.test(t)) continue;
      return base === 'powershell' ? checkHookSkips(rest.slice(j).join(' '), 'ps', depth + 1, local) : null;
    }
    return null;
  }
  if (base === 'cmd') {                                     // cmd /c ..., cmd /k ...
    const j = rest.findIndex(t => /^\/[ck]$/i.test(t));
    return j >= 0 ? checkHookSkips(rest.slice(j + 1).join(' '), 'cmd', depth + 1, local) : null;
  }
  if (base === 'eval' || base === 'invoke-expression' || base === 'iex') {
    return checkHookSkips(rest.join(' '), mode, depth + 1, local);
  }
  return base === 'git' ? checkGit(rest, local) : null;
}

function checkHookSkips(command, mode, depth, env) {
  if (depth > MAX_DEPTH) return suspect(command) ? MSG_UNPARSEABLE : null;
  const { segs, nested, unsafe } = scan(command, mode);
  if (unsafe && suspect(command)) return MSG_UNPARSEABLE;
  const taint = { ...env };
  for (const seg of segs) {
    const tokens = words(seg, mode);
    if (exportedSkips(seg, tokens, mode, taint)) continue;
    const msg = checkTokens(tokens, mode, depth, taint);
    if (msg) return msg;
  }
  for (const n of nested) {
    const msg = checkHookSkips(n, mode, depth + 1, taint);
    if (msg) return msg;
  }
  return null;
}

// ── Reglas sobre el texto (las de antes de 2026-11-03, sin cambios) ──

function check(command, mode = 'bash') {
  const skip = checkHookSkips(command, mode, 0, {});
  if (skip) return skip;

  // Detectar --no-gpg-sign (tambien peligroso si hay signing configurado)
  if (/git\s+(commit|tag)\s+.*--no-gpg-sign/.test(command)) {
    return 'BLOCKED: --no-gpg-sign detected. ' +
      'If you need to skip GPG signing, ask the user for explicit permission.';
  }

  // Detectar git push --force / -f (puede sobrescribir historia remota)
  // Cubre el bypass `git -C <dir> push --force` (cerrado por gentle-pi v0.5.0, hardening 2026-06-14)
  if (/\bgit\s+(?:-C\s+\S+\s+)?push\b[^;|&\n]*(--force\b|--force-with-lease\b|\s-[A-Za-z]*f\b)/.test(command)) {
    return 'BLOCKED: git push --force detected. This can overwrite remote history. ' +
      'Ask the user for explicit permission.';
  }

  // Detectar rm -rf con paths peligrosos (/, ~, ., ..)
  if (/\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\s+|.*-fr\s+)(\/|~|\.\.|\.(?:\s|$))/.test(command) ||
      /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\s+|.*-fr\s+)\*/.test(command)) {
    return 'BLOCKED: Destructive rm command detected (rm -rf on root, home, or wildcard). ' +
      'Ask the user for explicit permission before deleting.';
  }

  // Detectar git reset --hard
  if (/git\s+reset\s+--hard/.test(command)) {
    return 'BLOCKED: git reset --hard detected. This discards uncommitted changes permanently. ' +
      'Ask the user for explicit permission.';
  }

  // Detectar git clean -fd (borra archivos untracked)
  if (/git\s+clean\s+(-[a-zA-Z]*f|-f)/.test(command)) {
    return 'BLOCKED: git clean -f detected. This deletes untracked files permanently. ' +
      'Ask the user for explicit permission.';
  }

  // Detectar DROP TABLE / DROP DATABASE
  if (/\b(DROP\s+(TABLE|DATABASE|SCHEMA))\b/i.test(command)) {
    return 'BLOCKED: DROP TABLE/DATABASE detected. This is irreversible. ' +
      'Ask the user for explicit permission.';
  }

  // Detectar chmod 777 (permisos excesivos), cubre flags recursivos -R y 0777 (hardening 2026-06-14)
  if (/\bchmod\s+(?:-\S+\s+)*0?777\b/.test(command)) {
    return 'BLOCKED: chmod 777 detected. This grants full permissions to everyone. ' +
      'Use more restrictive permissions (e.g., 755). Ask the user if 777 is intended.';
  }

  // Detectar chown -R (cambio recursivo de ownership puede romper un sistema) (hardening 2026-06-14)
  if (/\bchown\s+(-[A-Za-z]*R\b|--recursive)/.test(command)) {
    return 'BLOCKED: chown -R detected. Recursive ownership change can break a system. ' +
      'Ask the user for explicit permission.';
  }

  // Detectar curl|sh / wget|bash (ejecucion remota sin inspeccion)
  if (/\b(curl|wget)\s+.*\|\s*(sh|bash|zsh|node|python)/.test(command)) {
    return 'BLOCKED: Piping remote content directly to shell detected. ' +
      'Download and inspect the script first. Ask the user for explicit permission.';
  }

  // PowerShell: borrado recursivo sobre raiz de disco, home, carpeta actual/padre o comodin
  // (Remove-Item y sus alias). Un borrado recursivo de una subcarpeta puntual se permite.
  if (/\b(Remove-Item|rm|ri|del|erase|rd|rmdir)\b(?=[^;|&\n]*\s-r[a-z]*\b)[^;|&\n]*?\s["']?(~|\$HOME|\$env:USERPROFILE|\$env:HOMEPATH|[A-Za-z]:\\?|\*|\.\.?)["']?(?=\s|$)/i.test(command)) {
    return 'BLOCKED: Recursive delete on a drive root, home, current/parent folder or wildcard. ' +
      'Ask the user for explicit permission before deleting.';
  }

  // PowerShell: contenido remoto ejecutado sin inspeccion (irm|iex, iex (irm ...))
  if (/\b(irm|iwr|Invoke-RestMethod|Invoke-WebRequest|curl|wget)\b[^\n]*\|\s*(iex|Invoke-Expression)\b/i.test(command) ||
      /\b(iex|Invoke-Expression)\s*\(+\s*(irm|iwr|Invoke-RestMethod|Invoke-WebRequest|New-Object\s+Net\.WebClient)/i.test(command)) {
    return 'BLOCKED: Remote content piped to Invoke-Expression detected. ' +
      'Download and inspect the script first. Ask the user for explicit permission.';
  }

  return null;
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
      const toolName = data.tool_name || '';
      // Shells: Bash y PowerShell (en Windows PowerShell es la terminal principal; fix 2026-09-27)
      if (toolName !== 'Bash' && toolName !== 'PowerShell') process.exit(0);
      const msg = check(String((data.tool_input || {}).command || ''), toolName === 'PowerShell' ? 'ps' : 'bash');
      if (msg) { process.stderr.write(msg); process.exit(2); }
      process.exit(0);
    } catch (err) {
      // Fail-open: en caso de error, permitir (no romper el flujo)
      process.exit(0);
    }
  });
}

module.exports = { check, scan, segments, words, stripHeredocs };
