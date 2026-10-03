// Lógica pura de engram-status: del log de sync a un estado y sus textos.
// Sin `$`: se prueba sola (parse.test.ts).

export type Level = 'ok' | 'syncing' | 'warn' | 'unknown' | 'error'
export type Reason = 'ok' | 'syncing' | 'failures' | 'server-down' | 'stalled' | 'not-run' | 'no-data'

export type Status = {
  level: Level
  reason: Reason
  /** Desde cuándo vale el motivo (último done, inicio colgado, primer error de conexión). */
  sinceMs?: number
  lastDoneMs?: number
  synced?: number
  failed?: number
  /** Hasta 3 errores del último sync, recortados, para el detalle. */
  errors?: string[]
}

const MIN = 60_000
/** Un sync tarda ~55 s; más de 3 min sin `done` es que quedó colgado o cortado. */
export const STALLED_MS = 3 * MIN
/** Tiempo de gracia después de un turno para que arranque el sync del hook Stop. */
export const NOT_RUN_MS = 5 * MIN

const RANK: Record<Level, number> = { ok: 0, syncing: 1, warn: 2, unknown: 3, error: 4 }

export const isWorse = (a: Level, b: Level): boolean => RANK[a] > RANK[b]

export const hideKey = (s: Status): string => `${s.level}:${s.reason}`

type Event =
  | { kind: 'start'; ts: number }
  | { kind: 'done'; ts: number; synced: number; failed: number }
  | { kind: 'error'; ts: number; msg: string }

const DONE_RE = /^done synced=(\d+) failed=(\d+)/
const CONN_RE = /dial tcp|connectex|connection refused|no such host|i\/o timeout|timed out|deadline exceeded/i

function toEvent(raw: string): Event | null {
  let row: unknown
  try {
    row = JSON.parse(raw)
  } catch {
    return null
  }
  if (!row || typeof row !== 'object') return null
  const { ts, level, msg } = row as { ts?: unknown; level?: unknown; msg?: unknown }
  if (typeof ts !== 'string' || typeof msg !== 'string') return null
  const t = Date.parse(ts)
  if (Number.isNaN(t)) return null
  if (msg.startsWith('starting cloud sync')) return { kind: 'start', ts: t }
  const d = DONE_RE.exec(msg)
  if (d) return { kind: 'done', ts: t, synced: Number(d[1]), failed: Number(d[2]) }
  if (level === 'error') return { kind: 'error', ts: t, msg }
  return null
}

const latest = <T extends Event>(events: T[]): T | undefined =>
  events.reduce<T | undefined>((best, e) => (!best || e.ts >= best.ts ? e : best), undefined)

/** Evalúa las últimas líneas del log. `lastTurnEndMs`: cuándo terminó el último turno de esta sesión. */
export function evaluate(lines: readonly string[], nowMs: number, lastTurnEndMs: number | null): Status {
  const events = lines.map(toEvent).filter((e): e is Event => e !== null)
  const starts = events.filter((e): e is Extract<Event, { kind: 'start' }> => e.kind === 'start')
  const dones = events.filter((e): e is Extract<Event, { kind: 'done' }> => e.kind === 'done')
  const lastStart = latest(starts)
  const lastDone = latest(dones)

  let base: Status
  if (!lastDone) {
    base = lastStart && nowMs - lastStart.ts < STALLED_MS
      ? { level: 'syncing', reason: 'syncing', sinceMs: lastStart.ts }
      : { level: 'unknown', reason: 'no-data' }
  } else if (lastStart && lastStart.ts > lastDone.ts) {
    base = nowMs - lastStart.ts < STALLED_MS
      ? { level: 'syncing', reason: 'syncing', sinceMs: lastStart.ts, lastDoneMs: lastDone.ts }
      : { level: 'warn', reason: 'stalled', sinceMs: lastStart.ts, lastDoneMs: lastDone.ts }
  } else {
    base = fromDone(lastDone, starts, events)
  }

  if (lastTurnEndMs !== null && nowMs - lastTurnEndMs > NOT_RUN_MS) {
    const ranAfter = events.some(e => (e.kind === 'start' || e.kind === 'done') && e.ts >= lastTurnEndMs)
    if (!ranAfter && isWorse('warn', base.level)) {
      return { level: 'warn', reason: 'not-run', sinceMs: lastTurnEndMs, lastDoneMs: base.lastDoneMs }
    }
  }
  return base
}

function fromDone(done: Extract<Event, { kind: 'done' }>, starts: Extract<Event, { kind: 'start' }>[], events: Event[]): Status {
  const common = { lastDoneMs: done.ts, synced: done.synced, failed: done.failed }
  if (done.failed === 0) return { level: 'ok', reason: 'ok', sinceMs: done.ts, ...common }

  const runStart = latest(starts.filter(s => s.ts <= done.ts))
  const from = runStart ? runStart.ts : done.ts - 10 * MIN
  const errors = events.filter((e): e is Extract<Event, { kind: 'error' }> => e.kind === 'error' && e.ts >= from && e.ts <= done.ts)
  const samples = errors.slice(0, 3).map(e => e.msg.slice(0, 160))

  if (errors.length > 0 && errors.every(e => CONN_RE.test(e.msg))) {
    const first = errors.reduce((a, b) => (b.ts < a.ts ? b : a))
    return { level: 'error', reason: 'server-down', sinceMs: first.ts, errors: samples, ...common }
  }
  return { level: 'warn', reason: 'failures', sinceMs: done.ts, errors: samples, ...common }
}

export function ago(ms: number): string {
  const m = Math.floor(ms / MIN)
  if (m < 1) return '<1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

export function hhmm(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function failuresText(n: number): string {
  return n === 1 ? '1 proyecto no sincronizó' : `${n} proyectos no sincronizaron`
}

/** Mensaje corto del motivo, compartido por la línea y la franja. */
function message(s: Status): string {
  switch (s.reason) {
    case 'failures': return failuresText(s.failed ?? 0)
    case 'server-down': return 'el server no responde'
    case 'stalled': return 'un sync quedó sin terminar'
    case 'not-run': return 'el sync no corrió al terminar el turno'
    case 'no-data': return 'sin datos'
    case 'syncing': return 'sincronizando…'
    case 'ok': return 'sync'
  }
}

const MARK: Record<Level, string> = { ok: '', syncing: '', warn: '⚠', unknown: '?', error: '✗' }

export function statusLine(s: Status, nowMs: number): string {
  if (s.level === 'ok') return `◉ engram · sync ${ago(nowMs - (s.sinceMs ?? nowMs))}`
  if (s.level === 'syncing') return '◉ engram · sincronizando…'
  return `◉ engram ${MARK[s.level]} ${message(s)}`
}

/** ¿Se dibuja la franja? Solo con problemas: ⚠, ? y ✗. */
export const showsBand = (level: Level): boolean => isWorse(level, 'syncing')

/** Detalle en Markdown para el panel y para /engram-status. */
export function detailText(s: Status, nowMs: number, logPath: string, doctor: string | null): string {
  const out: string[] = [`**${statusLine(s, nowMs).replace(/^◉ /, '')}**`, '']
  if (s.lastDoneMs !== undefined) {
    const f = s.failed ?? 0
    const counts = s.synced !== undefined ? ` (${s.synced} proyectos, ${f === 1 ? '1 falló' : `${f} fallaron`})` : ''
    out.push(`- Último sync completo: hace ${ago(nowMs - s.lastDoneMs)} · ${hhmm(s.lastDoneMs)}${counts}`)
  } else {
    out.push('- Último sync completo: no hay ninguno en el final del log')
  }
  if (s.reason === 'stalled' && s.sinceMs !== undefined) out.push(`- Hay un sync que arrancó a las ${hhmm(s.sinceMs)} y no terminó`)
  if (s.reason === 'not-run' && s.sinceMs !== undefined) out.push(`- El turno terminó a las ${hhmm(s.sinceMs)} y el hook de sync no arrancó`)
  if (s.errors && s.errors.length > 0) {
    out.push('- Errores del último sync (hasta 3):')
    for (const e of s.errors) out.push(`  - \`${e.replace(/`/g, "'")}\``)
  }
  out.push(`- Log: \`${logPath}\``)
  if (doctor !== null) out.push('', '**Diagnóstico** (`engram cloud upgrade doctor`)', '```text', doctor.trim() || '(sin salida)', '```')
  return out.join('\n')
}

/** Texto de la franja (sin el chip). Solo tiene sentido en warn, error y unknown. */
export function bandText(s: Status, nowMs: number): string {
  const msg = message(s)
  if (s.reason === 'server-down' && s.sinceMs !== undefined) return `${msg} · desde ${hhmm(s.sinceMs)}`
  if ((s.reason === 'failures' || s.reason === 'stalled') && s.sinceMs !== undefined) return `${msg} · hace ${ago(nowMs - s.sinceMs)}`
  return msg
}
