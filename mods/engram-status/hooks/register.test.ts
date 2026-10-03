import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, On } from 'claude-code/testing'

const T0 = Date.parse('2026-10-03T12:00:00Z')
const MIN = 60_000
const at = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
const row = (ms: number, level: string, msg: string) => JSON.stringify({ ts: at(ms), level, msg })
const okLog = (doneAt: number) => [row(doneAt - MIN, 'info', 'starting cloud sync on session stop'), row(doneAt, 'info', 'done synced=47 failed=0 skipped_empty=0')]
const failLog = (doneAt: number) => [
  row(doneAt - MIN, 'info', 'starting cloud sync on session stop'),
  row(doneAt - 30_000, 'error', 'sync failed for a: engram: cloud: status 403: forbidden'),
  row(doneAt, 'info', 'done synced=46 failed=1 skipped_empty=0'),
]

type World = {
  log: string[] | null // null = el archivo no existe
  mtime: number
  runExit: number
  runs: string[][]
  statuses: (string | undefined)[]
  toasts: string[]
  opened: string[]
  doctorRuns: number
}

/** Engine simulado debajo del mod: fs.stat, process.run, ui.status, ui.toast y los eventos de sesión. */
function world(on: On, env: Record<string, string>, store: Record<string, unknown> = {}): World & { clock: ReturnType<typeof mock.clock> } {
  const w: World = { log: [], mtime: 1, runExit: 0, runs: [], statuses: [], toasts: [], opened: [], doctorRuns: 0 }
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, env)
  mock.store(on, store)
  on('fs.stat', () => {
    if (w.log === null) return { deny: 'ENOENT' } as never
    return { value: { kind: 'file', size: 100, mtimeMs: w.mtime, isLink: false } } as never
  })
  on('process.run', ($, e) => {
    if (e.argv[0] !== 'tail' && e.argv[0] !== 'powershell') {
      w.doctorRuns += 1
      return { value: { exitCode: 0, stdout: 'status: ready\nreason_code: upgrade_ready\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
    }
    w.runs.push([...e.argv])
    return { value: { exitCode: w.runExit, stdout: w.runExit === 0 ? (w.log ?? []).join('\n') : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('ui.status', ($, e) => { w.statuses.push(e.text); return { value: undefined } as never })
  on('ui.toast', ($, e) => { w.toasts.push(e.text); return { value: undefined } as never })
  on('session.start', () => ({ cwd: '/tmp', startedAt: T0 }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('ui.open', ($, e) => { w.opened.push(e.id); return { value: { isPlaced: true } } as never })
  on('ui.close', () => ({ value: undefined }) as never)
  // Lo que el motor dibuja cuando el mod pasa: nada (una caja vacía).
  on('ui.render', ($, e) => $.ui.resolve(e as never).Box({}) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  return Object.assign(w, { clock })
}

const LINUX = { HOME: '/home/x' }
const WINDOWS = { OS: 'Windows_NT', USERPROFILE: 'C:\\Users\\x' }
const start = ($: Engine) => $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
const last = (w: World) => w.statuses[w.statuses.length - 1]

describe('engram-status en la sesión', () => {
  test('arranca sin demorar la sesión y a los 2 s muestra el estado', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - 12 * MIN)
    await start($)
    expect(w.statuses).toHaveLength(0)
    await w.clock.advance(2_000)
    expect(last(w)).toBe('◉ engram · sync 12 min')
  })

  test('Linux usa tail -n 200 sobre <HOME>/.claude/sessions/engram-cloud-sync.jsonl', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0)
    await start($)
    await w.clock.advance(2_000)
    expect(w.runs[0]).toEqual(['tail', '-n', '200', '/home/x/.claude/sessions/engram-cloud-sync.jsonl'])
  })

  test('Windows usa PowerShell con -LiteralPath y USERPROFILE', async ($, on) => {
    const w = world(on, WINDOWS)
    w.log = okLog(T0)
    await start($)
    await w.clock.advance(2_000)
    expect(w.runs[0][0]).toBe('powershell')
    expect(w.runs[0].join(' ')).toContain("-LiteralPath 'C:\\Users\\x/.claude/sessions/engram-cloud-sync.jsonl'")
    expect(w.runs[0].join(' ')).toContain('-Tail 200')
  })

  test('11. si el log no cambió no relee, pero actualiza la antigüedad', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - 12 * MIN)
    await start($)
    await w.clock.advance(2_000)
    await w.clock.advance(60_000)
    expect(w.runs).toHaveLength(1)
    expect(last(w)).toBe('◉ engram · sync 13 min')
    w.mtime = 2
    w.log = okLog(T0 + MIN)
    await w.clock.advance(60_000)
    expect(w.runs).toHaveLength(2)
    // reloj en T0+122 s, done en T0+60 s → 62 s
    expect(last(w)).toBe('◉ engram · sync 1 min')
  })

  test('12. process.run falla → ? sin romper', async ($, on) => {
    const w = world(on, LINUX)
    w.runExit = 1
    await start($)
    await w.clock.advance(2_000)
    expect(last(w)).toBe('◉ engram ? sin datos')
  })

  test('8. log inexistente → ? sin datos y sin correr tail', async ($, on) => {
    const w = world(on, LINUX)
    w.log = null
    await start($)
    await w.clock.advance(2_000)
    expect(w.runs).toHaveLength(0)
    expect(last(w)).toBe('◉ engram ? sin datos')
  })

  test('13. toast solo al empeorar, una vez', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - MIN)
    await start($)
    await w.clock.advance(2_000)
    expect(w.toasts).toHaveLength(0)
    w.mtime = 2
    w.log = failLog(T0 + 30_000)
    await w.clock.advance(60_000)
    expect(w.toasts).toEqual(['Engram: 1 proyecto no sincronizó · hace <1 min'])
    w.mtime = 3
    await w.clock.advance(60_000)
    expect(w.toasts).toHaveLength(1)
  })

  test('13b. ⚠ → ⟳ → ⚠ (otro turno con el mismo fallo) no repite el toast', async ($, on) => {
    const w = world(on, LINUX)
    w.log = failLog(T0 - MIN)
    await start($)
    await w.clock.advance(2_000)
    expect(w.toasts).toHaveLength(1)
    // arranca otro sync (⟳) ...
    w.mtime = 2
    w.log = [...failLog(T0 - MIN), row(T0 + 50_000, 'info', 'starting cloud sync on session stop')]
    await w.clock.advance(60_000)
    expect(last(w)).toBe('◉ engram · sincronizando…')
    // ... y termina con el mismo fallo
    w.mtime = 3
    w.log = [...w.log, row(T0 + 100_000, 'error', 'sync failed for a: engram: cloud: status 403: forbidden'), row(T0 + 110_000, 'info', 'done synced=46 failed=1 skipped_empty=0')]
    await w.clock.advance(60_000)
    expect(last(w)).toBe('◉ engram ⚠ 1 proyecto no sincronizó')
    expect(w.toasts).toHaveLength(1)
  })

  test('13c. el aviso no depende del store compartido (dos sesiones no se pisan)', async ($, on) => {
    const w = world(on, LINUX, { lastLevel: 'ok' })
    w.log = failLog(T0 - MIN)
    await start($)
    await w.clock.advance(2_000)
    await w.clock.advance(60_000)
    await w.clock.advance(60_000)
    expect(w.toasts).toHaveLength(1)
  })

  test('7f. un turno interrumpido (Esc) o con error de API no genera "el sync no corrió"', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - 30 * MIN)
    await start($)
    await w.clock.advance(2_000)
    await $.turn.complete({ reason: 'aborted', answer: '', durationMs: 1000, isAborted: true, turnId: 't3' } as never)
    await $.turn.complete({ reason: 'error', answer: '', durationMs: 1000, isAborted: false, turnId: 't4' } as never)
    await w.clock.advance(6 * 60_000)
    expect(last(w)).toBe('◉ engram · sync 36 min')
  })

  test('7. turno terminado sin sync posterior → a los 5 min avisa', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - 30 * MIN)
    await start($)
    await w.clock.advance(2_000)
    await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 't1' } as never)
    await w.clock.advance(6 * 60_000)
    expect(last(w)).toBe('◉ engram ⚠ el sync no corrió al terminar el turno')
  })

  test('7e. el fin de turno de un subagente no cuenta', async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0 - 30 * MIN)
    await start($)
    await w.clock.advance(2_000)
    await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 't2', agentId: 'sub-1' } as never)
    await w.clock.advance(6 * 60_000)
    expect(last(w)).toBe('◉ engram · sync 36 min')
  })

  test('opción logPath reemplaza la ruta por defecto', { options: { logPath: '/var/log/sync.jsonl' } }, async ($, on) => {
    const w = world(on, LINUX)
    w.log = okLog(T0)
    await start($)
    await w.clock.advance(2_000)
    expect(w.runs[0]).toEqual(['tail', '-n', '200', '/var/log/sync.jsonl'])
  })
})

const serverDownLog = (doneAt: number) => [
  row(doneAt - MIN, 'info', 'starting cloud sync on session stop'),
  row(doneAt - 30_000, 'error', 'sync failed for a: engram: cloud: fetch manifest: dial tcp 1.2.3.4:443: connectex: timeout'),
  row(doneAt, 'info', 'done synced=46 failed=1 skipped_empty=0'),
]
const BAND = { plugin: 'engram-status', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 120 } } as const
const SURFACES = ['terminal', 'desktop'] as const

async function ready($: Engine, w: ReturnType<typeof world>, log: string[]) {
  w.log = log
  await start($)
  await w.clock.advance(2_000)
}

describe('franja y detalle (T3)', () => {
  test('14. con ✓ no hay franja; con ⚠ sí, en ámbar (warning)', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, okLog(T0 - MIN))
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...BAND, surface } as never)
      expect(await ui.find({ type: 'Text', text: /ENGRAM/ })).toBeUndefined()
      await ui.unmount()
    }
    w.mtime = 2
    w.log = failLog(T0 + 30_000)
    await w.clock.advance(60_000)
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...BAND, surface } as never)
      const chip = await ui.find({ type: 'Text', text: /ENGRAM/ })
      expect(chip?.props.color).toBe('warning')
      expect((await ui.findAll({ type: 'Text' })).map(x => x.text).join(' ')).toContain('1 proyecto no sincronizó')
      await ui.unmount()
    }
  })

  test('14b. server caído → franja en rojo (error)', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, serverDownLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
    expect((await ui.find({ type: 'Text', text: /ENGRAM/ }))?.props.color).toBe('error')
    expect((await ui.findAll({ type: 'Text' })).map(x => x.text).join(' ')).toContain('el server no responde · desde')
  })

  test('15b. ocultar sobrevive a un ⟳ en el medio', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, failLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
    await ui.press({ key: 'hide' })
    w.mtime = 2
    w.log = [...failLog(T0 - MIN), row(T0 + 50_000, 'info', 'starting cloud sync on session stop')]
    await w.clock.advance(60_000)
    w.mtime = 3
    w.log = [...w.log, row(T0 + 100_000, 'error', 'sync failed for a: engram: cloud: status 403: forbidden'), row(T0 + 110_000, 'info', 'done synced=46 failed=1 skipped_empty=0')]
    await w.clock.advance(60_000)
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: /ENGRAM/ })).toBeUndefined()
  })

  test('15c. "ocultar" se olvida cuando el problema se resuelve (vuelve a ✓)', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, failLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
    await ui.press({ key: 'hide' })
    w.mtime = 2
    w.log = okLog(T0 + 30_000)
    await w.clock.advance(60_000)
    w.mtime = 3
    w.log = failLog(T0 + 100_000)
    await w.clock.advance(60_000)
    await ui.redraw()
    expect((await ui.find({ type: 'Text', text: /ENGRAM/ }))?.props.color).toBe('warning')
  })

  test('15. ocultar dura hasta que cambia el tipo de problema', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, failLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
    await ui.press({ key: 'hide' })
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: /ENGRAM/ })).toBeUndefined()
    // otro sync con fallos del mismo tipo: sigue oculta
    w.mtime = 2
    w.log = [...failLog(T0 - MIN), ...failLog(T0 + MIN)]
    await w.clock.advance(60_000)
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: /ENGRAM/ })).toBeUndefined()
    // ahora el server se cae: otro motivo, vuelve a aparecer
    w.mtime = 3
    w.log = serverDownLog(T0 + 2 * MIN)
    await w.clock.advance(60_000)
    await ui.redraw()
    expect((await ui.find({ type: 'Text', text: /ENGRAM/ }))?.props.color).toBe('error')
  })

  test('17. con encuesta activa la franja no se dibuja', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, failLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'desktop' } as never)
    expect(await ui.find({ type: 'Text', text: /ENGRAM/ })).toBeUndefined()
  })

  test('16. ver detalle abre el panel con el mismo texto que /engram-status (y corre el doctor)', async ($, on) => {
    const w = world(on, LINUX)
    await ready($, w, failLog(T0 - MIN))
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
    await ui.press({ key: 'detail' })
    expect(w.opened).toEqual(['engram-status'])
    expect(w.doctorRuns).toBe(1)
    const pane = await $.ui.mount({ plugin: 'engram-status', component: 'Pane', requestId: 'engram-status', surface: 'desktop', props: {} } as never)
    const md = await pane.find({ key: 'detail-md' })
    const fromPane = String(md?.props.text)
    expect(fromPane).toContain('1 proyecto no sincronizó')
    expect(fromPane).toContain('status: ready')
    const cmd = (await $.command.run({ command: 'engram-status', args: '' } as never)) as { text: string }
    expect(cmd.text).toBe(fromPane)
  })
})
