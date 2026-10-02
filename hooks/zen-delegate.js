#!/usr/bin/env node
/**
 * zen-delegate.js — Delegación de tareas mecánicas a modelos opencode Go.
 * Solo modelos APROBADOS por eval 2026-06-10 (ver zen-eval/results.json).
 *
 * Uso:
 *   node zen-delegate.js --task structured --prompt "..."         # deepseek-v4-flash
 *   node zen-delegate.js --task copy --prompt-file ./prompt.txt   # qwen3.7-plus
 *   node zen-delegate.js --report                                 # resumen de uso
 *
 * Reglas (CLAUDE.md § Delegación Zen):
 *   - structured: clasificación, JSON, datos de prueba, resúmenes ≤ docs medianos
 *   - copy: borradores de contenido en castellano (SIEMPRE auditados vs brand)
 *   - El output delegado NUNCA va a producción sin validación de Claude.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const MODELS = {
  structured: 'deepseek-v4-flash',
  copy: 'qwen3.7-plus',
  glm: 'glm-5.2', // razonamiento/analisis pesado — plan Go empresa (2026-08-07)
};
// Precios aprox USD/M tokens (docs opencode 2026-06) para tracking de cuota Go
const PRICE = {
  'deepseek-v4-flash': {in: 0.14, out: 0.28},
  'qwen3.7-plus': {in: 0.4, out: 2.4},
  'glm-5.2': {in: 0.6, out: 2.2},
};
const URL = 'https://opencode.ai/zen/go/v1/chat/completions';
const LOG = path.join(os.homedir(), '.claude', 'logs', 'zen-delegate.jsonl');

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 ? a[i + 1] : null;
  };
  return {
    task: get('--task'),
    prompt: get('--prompt'),
    promptFile: get('--prompt-file'),
    maxTokens: parseInt(get('--max-tokens') || '4000', 10),
    model: get('--model'),
    report: a.includes('--report'),
  };
}

function report() {
  if (!fs.existsSync(LOG)) return console.log('Sin uso registrado todavía.');
  const lines = fs.readFileSync(LOG, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  let cost = 0, calls = 0, tokIn = 0, tokOut = 0;
  const byModel = {};
  for (const e of lines) {
    calls++; cost += e.cost_usd; tokIn += e.tokens_in; tokOut += e.tokens_out;
    byModel[e.model] = (byModel[e.model] || 0) + 1;
  }
  console.log(`Llamadas: ${calls} | tokens in/out: ${tokIn}/${tokOut} | costo cuota: $${cost.toFixed(4)}`);
  console.log('Por modelo:', JSON.stringify(byModel));
}

async function main() {
  const args = parseArgs();
  if (args.report) return report();

  // Rotacion de keys: primaria -> fallback (la empresa dio 2; usar la 2da si la 1ra se queda sin cuota)
  const keys = [process.env.OPENCODE_API_KEY, process.env.OPENCODE_API_KEY_FALLBACK].filter(Boolean);
  if (!keys.length) { console.error('ERROR: falta OPENCODE_API_KEY'); process.exit(1); }
  const model = args.model || MODELS[args.task];
  if (!model) { console.error(`ERROR: --task debe ser: ${Object.keys(MODELS).join(' | ')} (o pasar --model <id>)`); process.exit(1); }
  const prompt = args.prompt || (args.promptFile && fs.readFileSync(args.promptFile, 'utf8'));
  if (!prompt) { console.error('ERROR: falta --prompt o --prompt-file'); process.exit(1); }

  const t0 = Date.now();
  const sessionId = `zen-delegate-${require('crypto').randomUUID()}`;
  // Codigos que significan "esta key no sirve ahora" -> probar la siguiente
  const ROTATE_ON = [401, 402, 403, 429];
  let res = null, data = null, keyUsed = 0, noTemp = false;
  for (let i = 0; i < keys.length; i++) {
    res = await fetch(URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keys[i]}`,
        'Content-Type': 'application/json',
        'User-Agent': 'curl/8.4.0', // el WAF de opencode bloquea UAs de librerías
        // OpenCode Go exige este header desde 2026-09-05: sin el, HTTP 400
        // MissingSessionID. Estable por invocacion (cada run es one-shot).
        'x-opencode-session': sessionId,
      },
      body: JSON.stringify({
        model,
        messages: [{role: 'user', content: prompt}],
        max_tokens: args.maxTokens,
        // algunos modelos del catalogo (kimi-k3) solo aceptan temperature 1
        ...(noTemp ? {} : {temperature: 0.3}),
      }),
    });
    keyUsed = i;
    if (res.ok) break;
    const body = (await res.text()).slice(0, 300);
    if (!noTemp && /temperature/i.test(body)) {
      noTemp = true; i--; // reintento con el mismo key, sin temperature
      continue;
    }
    const sinCuota = ROTATE_ON.includes(res.status) || /insufficient|balance|quota|limit/i.test(body);
    if (sinCuota && i < keys.length - 1) {
      console.error(`AVISO: key #${i + 1} rechazada (HTTP ${res.status}). Rotando a key #${i + 2}...`);
      continue;
    }
    console.error(`ERROR HTTP ${res.status}: ${body}`);
    process.exit(1);
  }
  data = await res.json();

  let content = data.choices?.[0]?.message?.content || '';
  // Defensa: strip de razonamiento filtrado (visto en eval con otros modelos)
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!content) { console.error('ERROR: respuesta vacía del modelo (posible truncado por reasoning). Subir --max-tokens.'); process.exit(1); }

  const u = data.usage || {};
  const p = PRICE[model] || {in: 0, out: 0};
  const cost = ((u.prompt_tokens || 0) * p.in + (u.completion_tokens || 0) * p.out) / 1e6;
  fs.mkdirSync(path.dirname(LOG), {recursive: true});
  fs.appendFileSync(LOG, JSON.stringify({
    ts: new Date().toISOString(),
    model,
    task: args.task,
    secs: Math.round((Date.now() - t0) / 100) / 10,
    tokens_in: u.prompt_tokens || 0,
    tokens_out: u.completion_tokens || 0,
    cost_usd: cost,
    finish: data.choices?.[0]?.finish_reason,
    key_slot: keyUsed + 1,
  }) + '\n');

  process.stdout.write(content + '\n');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
