#!/usr/bin/env node
/**
 * Hook: config-protection (PreToolUse, matcher Write|Edit|MultiEdit|NotebookEdit)
 * Dos niveles de proteccion:
 *   - BLOCK (exit 2 + stderr): archivos de secrets/credenciales, nunca los editan agentes.
 *     En PreToolUse el exit 2 bloquea y Claude recibe el stderr como motivo (hooks-doc.md:991).
 *   - AVISO (exit 0 + JSON por stdout con hookSpecificOutput.additionalContext): configs de
 *     linting/formatting/typescript. Antes iba por stderr con exit 0 y no le llegaba a nadie:
 *     "Claude never sees stderr from a hook that exits 0" (hooks-doc.md:816). PreToolUse admite
 *     additionalContext, que se agrega junto al resultado de la tool (hooks-doc.md:1964, 1115).
 *     No se fija permissionDecision: el permiso sigue su curso normal.
 *
 * Vibecoding v2.1 - Expandido con proteccion de secrets
 * 2026-11-03 - .npmrc, service-account*.json, .dev.vars, *.env.*; .env.example/.sample/.template
 *              ya no se bloquean (son plantillas publicas); cubre MultiEdit y NotebookEdit
 *              (notebook_path). Tests: tests/config-protection.test.js
 * 2026-11-03 - (tanda 3) Todos los patrones sin distinguir mayusculas; .netrc/_netrc,
 *              .git-credentials y .pgpass; <nombre>.env (prod.env). `app.env.ts`,
 *              `config.env.js`, `vite.env.d.ts` y otros archivos de codigo ya no se bloquean.
 */

// Plantillas publicas de archivos de entorno: se pueden editar.
const TEMPLATE_RE = /\.(example|sample|template)$/i;

// Todos los patrones sin distinguir mayusculas: Windows no las distingue, `.ENV` es `.env`.
// Extensiones de codigo fuente: `app.env.ts` o `vite.env.d.ts` son codigo, no archivos de entorno.
const CODE_AFTER_ENV = /\.env\.(?:d\.)?(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|php|cs|vue|svelte|astro|css|scss|md)$/i;

// Nivel 1: BLOCK, archivos que NUNCA deben ser editados por agentes
const BLOCKED_PATTERNS = [
  /^\.env/i,             // .env, .env.local, .env.production, .envrc, etc. (salvo plantillas)
  /\.env$/i,             // prod.env, staging.env
  /\.env\./i,            // app.env.local, config.env.production (salvo plantillas y codigo: CODE_AFTER_ENV)
  /^\.dev\.vars/i,       // secretos locales de Cloudflare Workers (wrangler)
  /^\.npmrc$/i,          // tokens de registry npm
  /^service-account.*\.json$/i, // claves de cuenta de servicio (GCP, Firebase)
  /^[._]netrc$/i,        // credenciales de red (.netrc; _netrc en Windows)
  /^\.git-credentials$/i, // credential.helper store de git
  /^\.pgpass$/i,         // passwords de PostgreSQL
  /\.pem$/i,             // certificados
  /\.key$/i,             // private keys
  /^credentials/i,       // credentials.json, credentials.yaml, etc.
  /^\.?secrets?\./i,     // secret.json, .secret, secrets.yaml, etc.
  /secret[_-]?key/i,     // secret_key.json, secret-key.pem, etc.
  /^id_rsa/i,            // SSH keys
  /^id_ed25519/i,        // SSH keys (ed25519)
  /\.pfx$/i,             // certificate bundles
  /\.p12$/i,             // PKCS12 certificates
];
// Solo estos patrones (los de entorno) aceptan la excepcion de plantilla.
const ENV_FAMILY = new Set([0, 1, 2, 3]);
const ENV_INFIX = 2;

// Nivel 2: AVISO, archivos de config que se pueden modificar con cuidado
const WARNED_PATTERNS = [
  /\.eslintrc/i,
  /eslint\.config/i,
  /\.prettierrc/i,
  /prettier\.config/i,
  /\.stylelintrc/i,
  /stylelint\.config/i,
  /tsconfig.*\.json$/i,
  /biome\.json/i,
  /\.editorconfig/i,
];

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Devuelve { block: msg } | { warn: msg } | null
function evaluate(toolName, toolInput) {
  if (!EDIT_TOOLS.has(toolName)) return null;
  const filePath = String((toolInput || {}).file_path || (toolInput || {}).notebook_path || '');
  const fileName = filePath.split('/').pop().split('\\').pop();
  if (!fileName) return null;

  for (let i = 0; i < BLOCKED_PATTERNS.length; i++) {
    if (!BLOCKED_PATTERNS[i].test(fileName)) continue;
    if (ENV_FAMILY.has(i) && TEMPLATE_RE.test(fileName)) continue;
    if (i === ENV_INFIX && CODE_AFTER_ENV.test(fileName)) continue;
    return {
      block: `BLOCKED: Editing secret/credential file "${fileName}" is not allowed. ` +
        'These files contain sensitive data and must be edited manually by the user. ' +
        'Ask the user for explicit permission if this is intentional.',
    };
  }

  for (const pattern of WARNED_PATTERNS) {
    if (pattern.test(fileName)) {
      return {
        warn: `config-protection: "${fileName}" es un archivo de configuración de linting/formato/TypeScript. ` +
          'Un cambio acá puede aflojar las reglas de todo el proyecto; conviene que no las debilite.',
      };
    }
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
      const r = evaluate(data.tool_name || '', data.tool_input || {});
      if (r && r.block) { process.stderr.write(r.block); process.exit(2); }
      if (r && r.warn) {
        // Salir en el callback: asi el JSON termina de escribirse aunque stdout sea asincrono.
        process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: r.warn } }), () => process.exit(0));
        return;
      }
      process.exit(0);
    } catch (err) {
      process.exit(0);
    }
  });
}

module.exports = { evaluate };
