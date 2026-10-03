import { describe, expect, test } from 'claude-code/testing'

import { bandText, evaluate, hhmm, hideKey, isWorse, statusLine } from './parse'

// Reloj fijo: 2026-10-03 12:00:00Z
const NOW = Date.parse('2026-10-03T12:00:00Z')
const MIN = 60_000

const at = (minutesAgo: number) => new Date(NOW - minutesAgo * MIN).toISOString().replace(/\.\d{3}Z$/, 'Z')
const line = (minutesAgo: number, level: string, msg: string) =>
  JSON.stringify({ ts: at(minutesAgo), level, msg })
const start = (m: number) => line(m, 'info', 'starting cloud sync on session stop')
const done = (m: number, synced: number, failed: number) =>
  line(m, 'info', `done synced=${synced} failed=${failed} skipped_empty=0`)
const connErr = (m: number, project: string) =>
  line(m, 'error', `sync failed for ${project}: engram: cloud: fetch manifest: Get "https://x/sync/pull?project=${project}": dial tcp 1.2.3.4:443: connectex: Se produjo un error`)
const otherErr = (m: number, project: string) =>
  line(m, 'error', `sync failed for ${project}: engram: cloud: status 403: forbidden: project "${project}" is not allowed`)

const run = (lines: string[], lastTurnEndMs: number | null = null) => evaluate(lines, NOW, lastTurnEndMs)

describe('estado a partir del log', () => {
  test('1. último done sin fallos → ok con antigüedad', () => {
    const s = run([start(13), done(12, 47, 0)])
    expect(s.level).toBe('ok')
    expect(s.reason).toBe('ok')
    expect(statusLine(s, NOW)).toBe('◉ engram · sync 12 min')
  })

  test('2. done con fallos de tipos mezclados → aviso con la cantidad', () => {
    const s = run([start(130), otherErr(129, 'a'), connErr(129, 'b'), otherErr(128, 'c'), done(120, 44, 3)])
    expect(s.level).toBe('warn')
    expect(s.reason).toBe('failures')
    expect(s.failed).toBe(3)
    expect(statusLine(s, NOW)).toBe('◉ engram ⚠ 3 proyectos no sincronizaron')
    expect(bandText(s, NOW)).toBe('3 proyectos no sincronizaron · hace 2 h')
  })

  test('2b. un solo fallo → singular', () => {
    const s = run([start(10), otherErr(9, 'a'), done(8, 46, 1)])
    expect(statusLine(s, NOW)).toBe('◉ engram ⚠ 1 proyecto no sincronizó')
  })

  test('3. todos los errores son de conexión → error server caído desde el primero', () => {
    const s = run([start(30), connErr(29, 'a'), connErr(28, 'b'), done(27, 45, 2)])
    expect(s.level).toBe('error')
    expect(s.reason).toBe('server-down')
    expect(statusLine(s, NOW)).toBe('◉ engram ✗ el server no responde')
    expect(bandText(s, NOW)).toBe(`el server no responde · desde ${hhmm(NOW - 29 * MIN)}`)
  })

  test('4. starting más nuevo que el último done y reciente → sincronizando', () => {
    const s = run([start(20), done(19, 47, 0), start(1)])
    expect(s.level).toBe('syncing')
    expect(statusLine(s, NOW)).toBe('◉ engram · sincronizando…')
  })

  test('5. starting más nuevo que el último done y viejo → sync sin terminar', () => {
    const s = run([start(20), done(19, 47, 0), start(10)])
    expect(s.level).toBe('warn')
    expect(s.reason).toBe('stalled')
    expect(statusLine(s, NOW)).toBe('◉ engram ⚠ un sync quedó sin terminar')
    expect(bandText(s, NOW)).toBe('un sync quedó sin terminar · hace 10 min')
  })

  test('6. sesiones concurrentes intercaladas → manda el done más reciente', () => {
    const s = run([start(5), start(4), start(3), done(2, 47, 0), done(1, 47, 0)])
    expect(s.level).toBe('ok')
    expect(statusLine(s, NOW)).toBe('◉ engram · sync 1 min')
  })

  test('7. turno terminado hace más de 5 min sin sync posterior → el sync no corrió', () => {
    const s = run([start(30), done(29, 47, 0)], NOW - 8 * MIN)
    expect(s.level).toBe('warn')
    expect(s.reason).toBe('not-run')
    expect(statusLine(s, NOW)).toBe('◉ engram ⚠ el sync no corrió al terminar el turno')
  })

  test('7b. turno terminado hace menos de 5 min → todavía no es alarma', () => {
    const s = run([start(30), done(29, 47, 0)], NOW - 2 * MIN)
    expect(s.level).toBe('ok')
  })

  test('7c. turno terminado y sync posterior → ok', () => {
    const s = run([start(7), done(6, 47, 0)], NOW - 8 * MIN)
    expect(s.level).toBe('ok')
  })

  test('7d. el sync no corrió no tapa un error más grave', () => {
    const s = run([start(30), connErr(29, 'a'), done(28, 46, 1)], NOW - 8 * MIN)
    expect(s.level).toBe('error')
  })

  test('8. log vacío o sin done → sin datos', () => {
    expect(run([]).level).toBe('unknown')
    expect(run([start(50)]).reason).toBe('no-data')
    expect(statusLine(run([]), NOW)).toBe('◉ engram ? sin datos')
  })

  test('9. líneas ilegibles o desconocidas se ignoran', () => {
    const s = run(['no es json', '{"ts":"x"}', line(3, 'info', 'throttled: skipping'), start(13), done(12, 47, 0), '{"roto'])
    expect(s.level).toBe('ok')
  })

  test('10. 47 errores antes del done → se encuentra igual', () => {
    const errs = Array.from({ length: 47 }, (_, i) => connErr(10, `p${i}`))
    const s = run([start(11), ...errs, done(9, 0, 47)])
    expect(s.level).toBe('error')
    expect(s.failed).toBe(47)
  })
})

describe('escala y ocultar', () => {
  test('escala ✗ > ? > ⚠ > ⟳ > ✓', () => {
    expect(isWorse('error', 'unknown')).toBe(true)
    expect(isWorse('unknown', 'warn')).toBe(true)
    expect(isWorse('warn', 'syncing')).toBe(true)
    expect(isWorse('syncing', 'ok')).toBe(true)
    expect(isWorse('ok', 'warn')).toBe(false)
    expect(isWorse('warn', 'warn')).toBe(false)
  })

  test('la clave de ocultar es nivel + tipo de motivo, no cantidad ni hora', () => {
    const a = run([start(30), otherErr(29, 'a'), done(28, 46, 1)])
    const b = run([start(3), otherErr(2, 'a'), otherErr(2, 'b'), done(1, 45, 2)])
    expect(hideKey(a)).toBe(hideKey(b))
    const c = run([start(30), connErr(29, 'a'), done(28, 46, 1)])
    expect(hideKey(c)).not.toBe(hideKey(a))
  })
})
