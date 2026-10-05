// Lógica pura de la mascota: etapas, XP, salud, caras y el veredicto de un
// comando de test o build. Sin `$`: todo se prueba con datos.

const DAY_MS = 86_400_000
const SLEEP_AFTER_MS = 3 * DAY_MS
const XP_COMMIT = 10
const XP_TEST = 2
const XP_CURE_BUILD = 5
const MAX_XP_TESTS_PER_DAY = 10
const MAX_COMMITS_PER_CHECK = 20
const MAX_EVENTS = 10
const SUBJECT_CHARS = 60

type Stage = { name: string; from: number; faces: { bien: string; resfriada: string; enferma: string; dormida: string } }

const STAGES: Stage[] = [
  { name: 'huevo', from: 0, faces: { bien: '◯', resfriada: '◯', enferma: '◯', dormida: '◯' } },
  { name: 'cría', from: 10, faces: { bien: '(•ᴗ•)', resfriada: '(•﹏•)', enferma: '(×_×)', dormida: '(-ᴗ-) zZ' } },
  { name: 'joven', from: 100, faces: { bien: 'ʕ•ᴥ•ʔ', resfriada: 'ʕ•﹏•ʔ', enferma: 'ʕ×ᴥ×ʔ', dormida: 'ʕ-ᴥ-ʔ zZ' } },
  { name: 'adulta', from: 400, faces: { bien: 'ʕ•̀ω•́ʔ✧', resfriada: 'ʕ•̀﹏•́ʔ', enferma: 'ʕ×ω×ʔ', dormida: 'ʕ-ω-ʔ zZ' } },
  { name: 'sabia', from: 1200, faces: { bien: 'ʕ◕ω◕ʔ☆', resfriada: 'ʕ◕﹏◕ʔ', enferma: 'ʕ×ω×ʔ', dormida: 'ʕ-ω-ʔ zZ' } },
]

const NAMES = ['Bit', 'Byte', 'Nodo', 'Pixel', 'Grep', 'Tilde', 'Lambda', 'Coma', 'Bucle', 'Commit']

export type Salud = 'bien' | 'resfriada' | 'enferma'

export type Pet = {
  nombre: string
  repo: string
  ruta: string
  xp: number
  commits: number
  testsVerdes: number
  xpTestsHoy: { dia: string; n: number }
  buildRoto: boolean
  testsRojos: boolean
  salud: Salud
  marcaAutor: number | null
  ultimaActividad: number
  nacio: number
  eventos: Array<{ cuando: number; texto: string }>
}

export type PetEvent = { type: 'commits'; n: number; subject?: string } | { type: 'test'; ok: boolean } | { type: 'build'; ok: boolean }
export type NoticeKind = 'nace' | 'etapa' | 'enferma' | 'cura'
export type Notice = { kind: NoticeKind; texto: string }

/** Nombre por defecto, estable para cada repo. */
export function defaultName(repo: string): string {
  let h = 0
  for (const ch of repo) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return NAMES[h % NAMES.length]
}

export function defaultPet(repo: string, ruta: string, now: number): Pet {
  return {
    nombre: defaultName(repo), repo, ruta, xp: 0, commits: 0, testsVerdes: 0,
    xpTestsHoy: { dia: '', n: 0 }, buildRoto: false, testsRojos: false, salud: 'bien',
    marcaAutor: null, ultimaActividad: now, nacio: now, eventos: [],
  }
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
const deriveSalud = (p: Pick<Pet, 'buildRoto' | 'testsRojos'>): Salud => (p.buildRoto ? 'enferma' : p.testsRojos ? 'resfriada' : 'bien')

/** Lo que haya en el store (vacío, viejo o roto) → una mascota válida. */
export function normalizePet(raw: unknown, repo: string, ruta: string, now: number): Pet {
  const d = defaultPet(repo, ruta, now)
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const hoy = (r.xpTestsHoy ?? {}) as Record<string, unknown>
  const p: Pet = {
    ...d,
    nombre: typeof r.nombre === 'string' && validName(r.nombre) ? r.nombre : d.nombre,
    xp: num(r.xp, 0),
    commits: num(r.commits, 0),
    testsVerdes: num(r.testsVerdes, 0),
    xpTestsHoy: { dia: typeof hoy.dia === 'string' ? hoy.dia : '', n: num(hoy.n, 0) },
    buildRoto: r.buildRoto === true,
    testsRojos: r.testsRojos === true,
    marcaAutor: typeof r.marcaAutor === 'number' ? r.marcaAutor : null,
    ultimaActividad: num(r.ultimaActividad, now),
    nacio: num(r.nacio, now),
    eventos: Array.isArray(r.eventos)
      ? r.eventos.filter((e): e is { cuando: number; texto: string } => !!e && typeof (e as { texto?: unknown }).texto === 'string').slice(0, MAX_EVENTS)
      : [],
  }
  return { ...p, salud: deriveSalud(p) }
}

export function validName(s: string): string | null {
  const t = s.trim()
  return t.length >= 1 && t.length <= 20 && !/[\r\n]/.test(t) ? t : null
}

function stageIndex(p: Pet): number {
  if (p.commits === 0) return 0
  let i = 1
  for (let k = 1; k < STAGES.length; k++) if (p.xp >= STAGES[k].from) i = k
  return i
}

const asleep = (p: Pet, now: number) => now - p.ultimaActividad > SLEEP_AFTER_MS

export function face(p: Pet, now: number, blink = false): string {
  const s = STAGES[stageIndex(p)]
  const f = asleep(p, now) ? s.faces.dormida : s.faces[p.salud]
  return blink ? f.replace(/•[̀́]?/g, '-').replace(/◕/g, '-') : f
}

const level = (xp: number) => Math.floor(xp / 50) + 1

function bar(p: Pet): string {
  const i = stageIndex(p)
  const next = STAGES[i + 1]
  const filled = next ? Math.floor(((p.xp - STAGES[i].from) / (next.from - STAGES[i].from)) * 5) : 5
  const f = Math.max(0, Math.min(5, filled))
  return '▰'.repeat(f) + '▱'.repeat(5 - f)
}

export function statusLine(p: Pet, now: number): string {
  const who = `${p.nombre}@${p.repo}`
  if (stageIndex(p) === 0) return `◯ ${who} · nace con el primer commit`
  if (asleep(p, now)) return `${face(p, now)} ${who}`
  if (p.salud === 'enferma') return `${face(p, now)} ${who} · build roto`
  if (p.salud === 'resfriada') return `${face(p, now)} ${who} · tests en rojo`
  return `${face(p, now)} ${who} · nv ${level(p.xp)} ${bar(p)}`
}

const HEARTS: Record<Salud, string> = { bien: '♥♥♥♥', resfriada: '♥♥♡♡', enferma: '♥♡♡♡' }

/** Las líneas del panel /mascota. */
export function paneLines(p: Pet, now: number, blink: boolean): string[] {
  const f = face(p, now, blink)
  const inner = 20
  const pad = Math.max(0, inner - [...f].length)
  const left = Math.floor(pad / 2)
  const st = STAGES[stageIndex(p)].name
  return [
    `╭${'─'.repeat(inner)}╮`,
    `│${' '.repeat(inner)}│`,
    `│${' '.repeat(left)}${f}${' '.repeat(pad - left)}│`,
    `│${' '.repeat(inner)}│`,
    `╰${'─'.repeat(inner)}╯`,
    `${p.nombre} · ${st} · nv ${level(p.xp)} · ${p.repo}`,
    `${HEARTS[p.salud]}  ${p.commits} commits · ${p.testsVerdes} tests ✓${p.salud !== 'bien' ? ` · ${p.salud === 'enferma' ? 'build roto' : 'tests en rojo'}` : ''}`,
    ...p.eventos.slice(0, 3).map(e => `· ${e.texto}`),
  ]
}

/** Marca de agua por fecha de autor (segundos): primera vez no cuenta la historia; más de 20 de golpe, tampoco. */
export function newCommits(ats: number[], marca: number | null): { n: number; marca: number } {
  const max = ats.reduce((m, a) => Math.max(m, a), 0)
  if (marca === null) return { n: 0, marca: max }
  const newer = ats.filter(a => a > marca)
  const m = Math.max(marca, max)
  return { n: newer.length > MAX_COMMITS_PER_CHECK ? 0 : newer.length, marca: m }
}

const RANK: Record<Salud, number> = { bien: 0, resfriada: 1, enferma: 2 }
const PRIORITY: Record<NoticeKind, number> = { nace: 4, etapa: 3, enferma: 2, cura: 1 }

export function pickNotice(notices: Notice[]): Notice | null {
  return notices.reduce<Notice | null>((best, n) => (!best || PRIORITY[n.kind] > PRIORITY[best.kind] ? n : best), null)
}

const pushEvent = (p: Pet, now: number, texto: string): Pet['eventos'] => [{ cuando: now, texto }, ...p.eventos].slice(0, MAX_EVENTS)
const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)

/** Aplica un evento; devuelve la mascota nueva y los avisos que corresponden. */
export function applyEvent(prev: Pet, ev: PetEvent, now: number): { pet: Pet; notices: Notice[] } {
  const egg = stageIndex(prev) === 0
  let p: Pet = { ...prev, ultimaActividad: now }
  if (ev.type === 'commits') {
    if (ev.n <= 0) return { pet: prev, notices: [] }
    const subject = (ev.subject ?? '').replace(/\s+/g, ' ').trim().slice(0, SUBJECT_CHARS)
    const texto = ev.n === 1 ? `se comió el commit «${subject}»` : `se comió ${ev.n} commits (último: «${subject}»)`
    p = { ...p, commits: p.commits + ev.n, xp: p.xp + XP_COMMIT * ev.n, eventos: pushEvent(p, now, texto) }
  } else if (egg) {
    // el huevo no se enferma ni gana XP: solo cuenta
    if (ev.type === 'test' && ev.ok) p = { ...p, testsVerdes: p.testsVerdes + 1 }
    return { pet: p, notices: [] }
  } else if (ev.type === 'test') {
    if (ev.ok) {
      const dia = dayOf(now)
      const hoy = p.xpTestsHoy.dia === dia ? p.xpTestsHoy : { dia, n: 0 }
      const gana = hoy.n < MAX_XP_TESTS_PER_DAY
      p = { ...p, testsVerdes: p.testsVerdes + 1, testsRojos: false, xp: p.xp + (gana ? XP_TEST : 0), xpTestsHoy: { dia, n: hoy.n + (gana ? 1 : 0) } }
    } else {
      p = { ...p, testsRojos: true }
    }
  } else if (ev.ok) {
    p = { ...p, buildRoto: false, xp: p.xp + (p.buildRoto ? XP_CURE_BUILD : 0) }
  } else {
    p = { ...p, buildRoto: true }
  }
  p = { ...p, salud: deriveSalud(p) }

  const notices: Notice[] = []
  const before = stageIndex(prev)
  const after = stageIndex(p)
  if (before === 0 && after > 0) notices.push({ kind: 'nace', texto: `◯ → ${face(p, now)} nació ${p.nombre} en ${p.repo}` })
  else if (after > before) notices.push({ kind: 'etapa', texto: `${p.nombre} creció: ahora es ${STAGES[after].name} ${face(p, now)}` })
  if (RANK[p.salud] > RANK[prev.salud]) {
    const texto = p.salud === 'enferma' ? `${p.nombre} se enfermó: build roto ${face(p, now)}` : `${p.nombre} se resfrió: tests en rojo ${face(p, now)}`
    notices.push({ kind: 'enferma', texto })
    p = { ...p, eventos: pushEvent(p, now, p.salud === 'enferma' ? 'se enfermó: build roto' : 'se resfrió: tests en rojo') }
  } else if (p.salud === 'bien' && prev.salud !== 'bien') {
    notices.push({ kind: 'cura', texto: `${p.nombre} se curó ${face(p, now)}` })
    p = { ...p, eventos: pushEvent(p, now, 'se curó') }
  }
  return { pet: p, notices }
}

// ── Veredicto de un comando ─────────────────────────────────────────────

const TEST_RE = /^(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?::[\w-]+)?(?:\s|$)|vitest(?:\s|$)|jest(?:\s|$)|playwright\s+test(?:\s|$)|pytest(?:\s|$)|python3?\s+-m\s+pytest(?:\s|$)|go\s+test(?:\s|$)|cargo\s+test(?:\s|$)|node\s+--test(?:\s|$)|claude\s+plugin\s+test(?:\s|$)|dotnet\s+test(?:\s|$))/
const BUILD_RE = /^(?:(?:npm|pnpm|yarn|bun)\s+run\s+build(?::[\w-]+)?(?:\s|$)|(?:pnpm|yarn)\s+build(?:\s|$)|next\s+build(?:\s|$)|vite\s+build(?:\s|$)|tsc(?:\s|$)|cargo\s+build(?:\s|$)|go\s+build(?:\s|$)|dotnet\s+build(?:\s|$))/
const WATCH_RE = /(?:^|\s)(?:--watch|-w)(?:\s|$)/
// Invocaciones que no corren nada: no son un test ni un build.
const NO_RUN_RE = /(?:^|\s)(?:--version|--help|--init|--showConfig|--listTests|--list|--collect-only|--co|--no-run)(?:\s|=|$)/
const TSC_INFO_RE = /^tsc\s+(?:.*\s)?-[vh](?:\s|$)/
const PREFIX_RE = /^(?:(?:\w+=\S*\s+)*)(?:timeout\s+\d+[smhd]?\s+|time\s+)?(?:(?:npx(?:\s+--?[\w-]+)*|pnpm\s+(?:exec|dlx)|bunx|yarn\s+dlx)\s+)?/

const MARKS = {
  test: {
    fail: [/# fail [1-9]/, /\b[1-9]\d* (?:failed|failing)\b/i, /\b[1-9]\d* fail\b/, /Tests?:?\s+[1-9]\d* failed/i, /test result: FAILED/, /^FAIL\b/m,
      /\b[1-9]\d* errors? in [\d.]+m?s\b/, /Errors\s+[1-9]\d* errors?\b/], // pytest "1 error in 0.3s", vitest "Errors  1 error"
    pass: [/\b[1-9]\d* pass(?:ed|ing)?\b/i, /test result: ok/, /^ok\s/m],
  },
  build: {
    fail: [/error TS\d+/, /Failed to compile/i, /error during build/i, /Build failed/i],
    pass: [/Compiled successfully/i, /built in [\d.]+m?s/i, /✓ Built/],
  },
}

/** Separa el comando en segmentos (sin el contenido de las comillas) y el separador que sigue a cada uno. */
function segments(cmd: string): { segs: string[]; seps: string[] } {
  const masked = cmd.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
  const parts = masked.split(/(&&|\|\||;|\||\r?\n|\(|\)|\{|\})/)
  const segs: string[] = []
  const seps: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    segs.push(parts[i].trim())
    seps.push(parts[i + 1] ?? '')
  }
  return { segs, seps }
}

type Kind = { present: boolean; compound: boolean; andOnly: boolean }

/**
 * Por tipo: si aparece; si hay algo después (entonces el código de salida no es
 * solo del test/build); y si lo de después va solo con `&&` (entonces una salida 0
 * quiere decir que el test/build también pasó).
 */
function classify(cmd: string): Record<'test' | 'build', Kind> {
  const { segs, seps } = segments(cmd)
  const lastNonEmpty = segs.reduce((m, s, i) => (s ? i : m), -1)
  const none = { present: false, compound: false, andOnly: false }
  const out = { test: { ...none }, build: { ...none } }
  segs.forEach((s, i) => {
    const bare = s.replace(PREFIX_RE, '')
    if (NO_RUN_RE.test(bare) || TSC_INFO_RE.test(bare)) return
    const kind = TEST_RE.test(bare) ? 'test' : BUILD_RE.test(bare) && !(/^tsc\b/.test(bare) && WATCH_RE.test(bare)) ? 'build' : null
    if (!kind) return
    const after = seps.slice(i, lastNonEmpty)
    out[kind] = { present: true, compound: i < lastNonEmpty, andOnly: after.length > 0 && after.every(x => x === '&&') }
  })
  return out
}

/**
 * true = pasó, false = falló, ausente = no cuenta. Un comando simple se cree por
 * su código de salida (un fallo solo con marca del runner); uno compuesto, solo
 * por las marcas del texto.
 */
export function verdict(cmd: string, exitOk: boolean, text: string): { test?: boolean; build?: boolean } {
  const c = classify(cmd)
  const out: { test?: boolean; build?: boolean } = {}
  for (const kind of ['test', 'build'] as const) {
    if (!c[kind].present) continue
    const fail = MARKS[kind].fail.some(re => re.test(text))
    const pass = !fail && MARKS[kind].pass.some(re => re.test(text))
    if (!c[kind].compound) {
      if (exitOk) out[kind] = true
      else if (fail) out[kind] = false
    } else if (c[kind].andOnly) {
      // `test && git commit -m "fix 2 failing"`: con salida 0 corrió todo bien; no mirar el texto de lo de después
      if (exitOk) out[kind] = true
      else if (fail) out[kind] = false
    } else if (fail) out[kind] = false
    else if (pass) out[kind] = true
  }
  return out
}

// ── Carpeta donde corre un comando ─────────────────────────────────────

const LEADING_CD_RE = /^\s*(?:cd|Set-Location|sl|pushd)\s+(?:-(?:LiteralPath|Path)\s+)?(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))\s*(?:&&|;|\|\||$)/i

/**
 * La carpeta real de un comando: si empieza con `cd <ruta>` (o Set-Location), esa;
 * si no, la del evento. Hace falta porque el shell vuelve a la carpeta de la sesión
 * después de cada comando, y el `cwd` del evento es esa.
 */
export function commandDir(cmd: string, env: { cwd: string; home: string; isWindows: boolean }): string {
  const m = LEADING_CD_RE.exec(cmd)
  if (!m) return env.cwd
  let p = (m[1] ?? m[2] ?? m[3] ?? '').trim()
  if (!p) return env.cwd
  if (p === '~' || /^~[\\/]/.test(p)) p = `${env.home}${p.slice(1)}`
  if (env.isWindows) {
    const drive = /^\/([a-zA-Z])(\/|$)/.exec(p)
    if (drive) p = `${drive[1].toUpperCase()}:/${p.slice(3)}`
  }
  if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(p)) return p.replace(/[\\/]+$/, '') || p
  return `${env.cwd.replace(/[\\/]+$/, '')}/${p.replace(/^\.[\\/]/, '')}`
}
