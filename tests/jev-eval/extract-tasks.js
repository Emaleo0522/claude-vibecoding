// Extrae tareas etiquetadas por project-manager-senior → dataset.json
// Fuentes: cajones {proyecto}/tareas en Engram (SQLite local) + .pipeline/tareas.{md,yaml} en disco (dual-write).
// Ground truth: "Agente:" (routing) y/o "Tipo:".
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const HOME = process.env.HOME;
const SQ = HOME + '/development/android-sdk/platform-tools/sqlite3';
const DB = HOME + '/.engram/engram.db';

const tasks = [];
const seen = new Set();
const clean = (s) => s.replace(/\*\*/g, '').replace(/\n{2,}/g, '\n').trim();
function add(project, src, n, title, agente, tipo, desc) {
  const key = project + '|' + title.toLowerCase();
  if ((!agente && !tipo) || seen.has(key) || desc.length < 40) return;
  seen.add(key);
  tasks.push({ project, src, n, title, agente: agente ? agente.toLowerCase() : null, tipo: tipo ? tipo.toLowerCase() : null, desc: desc.slice(0, 700) });
}

// Header de tarea: "Tarea 3: x", "### T01: x", "### T-01: x", "### TAREA 2 — x", "### Tarea A1: x"
const HDR = /^(?:#{1,4}\s*)?(?:\*\*)?(?:Tarea|TAREA|T)[-\s]?([A-Z]?\d+)(?:\*\*)?\s*[:—–-]\s*(.+?)\s*(?:\*\*)?\s*$/gm;
function parseMarkdown(project, src, content) {
  const idx = [];
  let m;
  HDR.lastIndex = 0;
  while ((m = HDR.exec(content))) idx.push({ n: m[1], title: clean(m[2]), start: m.index, end: m.index + m[0].length });
  for (let i = 0; i < idx.length; i++) {
    const block = content.slice(idx[i].end, idx[i + 1] ? idx[i + 1].start : undefined);
    const agente = (block.match(/\*{0,2}Agente\*{0,2}\s*:\s*\*{0,2}([a-z0-9-]+)/i) || [])[1];
    const tipo = (block.match(/\*{0,2}Tipo\*{0,2}\s*:\s*\*{0,2}([a-z0-9-]+)/i) || [])[1];
    const desc = clean(block.split('\n').filter(l => !/^\s*[-*]?\s*\*{0,2}(Agente|Tipo)\*{0,2}\s*:/i.test(l)).join('\n'));
    add(project, src, idx[i].n, idx[i].title, agente, tipo, desc);
  }
}
// YAML del pipeline: bloques "- id: N / title: / agent: / description: |"
function parseYaml(project, src, content) {
  const blocks = content.split(/^\s+- id:\s*(\d+)\s*$/m).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const b = blocks[i + 1];
    const title = (b.match(/^\s+title:\s*"?(.+?)"?\s*$/m) || [])[1];
    const agent = (b.match(/^\s+agent:\s*([a-z0-9-]+)/m) || [])[1];
    const desc = (b.match(/^\s+description:\s*\|?\s*\n([\s\S]*?)(?=^\s{4}[a-z_]+:)/m) || [])[1] || '';
    if (title) add(project, src, blocks[i], title, agent, null, clean(desc.replace(/^\s+/gm, '')));
  }
}

// 1) Engram
const sql = `select id, project, content from observations where (title like '%tareas%' or title like '%Tareas%') and (deleted_at is null or deleted_at='') order by project, id`;
for (const r of JSON.parse(execFileSync(SQ, ['-json', DB, sql], { maxBuffer: 64 << 20 }).toString() || '[]'))
  parseMarkdown(r.project, 'engram#' + r.id, r.content);
// 2) Disco
for (const dir of fs.readdirSync(HOME)) {
  const p = path.join(HOME, dir, '.pipeline');
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p).filter(f => /^tareas/.test(f))) {
    const content = fs.readFileSync(path.join(p, f), 'utf8');
    (f.endsWith('.yaml') ? parseYaml : parseMarkdown)(dir, 'disk:' + dir + '/' + f, content);
  }
}

fs.writeFileSync('dataset.json', JSON.stringify(tasks, null, 1));
const count = (k) => tasks.reduce((a, t) => (a[t[k] || '∅'] = (a[t[k] || '∅'] || 0) + 1, a), {});
console.log('tareas:', tasks.length, '| proyectos:', new Set(tasks.map(t => t.project)).size);
console.log('agente:', count('agente'));
console.log('tipo:', count('tipo'));
