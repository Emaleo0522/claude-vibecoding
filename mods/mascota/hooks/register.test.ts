import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, On } from 'claude-code/testing'

const T0 = Date.parse('2026-10-05T12:00:00Z')
const S = Math.floor(T0 / 1000) // segundos, como %at

type Repo = { common: string; top: string; email: string | null; log: Array<{ at: number; s: string; author?: string }> }
type World = {
  repos: Repo[]
  runs: string[][]
  statuses: (string | undefined)[]
  toasts: string[]
  opened: string[]
  closed: string[]
  revParseFails: boolean
}

const XD: Repo = { common: '/w/x-digest/.git', top: '/w/x-digest', email: 'ema+x@mail.com', log: [{ at: S - 100, s: 'viejo' }] }
const XD_WT: Repo = { ...XD, top: '/w/x-digest-wt' } // worktree del mismo repo
const OTRO: Repo = { common: '/w/otro/.git', top: '/w/otro', email: 'ema+x@mail.com', log: [] }
const KEY_XD = 'repo:/w/x-digest/.git'

const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never
const fail = (code = 128) => ({ value: { exitCode: code, stdout: '', stderr: 'fatal', isStdoutTruncated: false, isStderrTruncated: false } }) as never

function world(on: On, store: Record<string, unknown> = {}) {
  const w: World = { repos: [XD, XD_WT, OTRO], runs: [], statuses: [], toasts: [], opened: [], closed: [], revParseFails: false }
  const clock = mock.clock(on, { now: T0 })
  const data: Record<string, unknown> = JSON.parse(JSON.stringify(store))
  on('store.get', ($, e) => ({ value: data[(e as { key: string }).key] }) as never)
  on('store.set', ($, e) => { const { key, value } = e as { key: string; value: unknown }; data[key] = JSON.parse(JSON.stringify(value)); return { value: undefined } as never })
  on('store.delete', ($, e) => { delete data[(e as { key: string }).key]; return { value: undefined } as never })
  on('store.keys', () => ({ value: Object.keys(data) }) as never)
  on('process.run', ($, e) => {
    const argv = [...e.argv]
    w.runs.push(argv)
    if (argv[0] !== 'git' || argv[1] !== '-C') return fail(1)
    const dir = argv[2]
    const repo = w.repos.find(r => dir === r.top || dir.startsWith(`${r.top}/`))
    if (argv[3] === 'rev-parse') {
      if (w.revParseFails) return { deny: 'boom' } as never
      return repo ? ok(`${repo.common}\n${repo.top}\n`) : fail(128)
    }
    if (!repo) return fail(128)
    if (argv[3] === 'config') return repo.email ? ok(`${repo.email}\n`) : fail(1)
    if (argv[3] === 'log') {
      const pat = (argv.find(a => a.startsWith('--author=')) ?? '--author=').slice('--author='.length)
      const mine = repo.log.filter(l => `Ema <${l.author ?? repo.email}>`.includes(pat))
      return ok(mine.map(l => `${l.at}\t${l.s}`).join('\n'))
    }
    return fail(1)
  })
  on('ui.status', ($, e) => { w.statuses.push(e.text); return { value: undefined } as never })
  on('ui.toast', ($, e) => { w.toasts.push(e.text); return { value: undefined } as never })
  on('session.start', () => ({ cwd: '/w', startedAt: T0 }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('ui.open', ($, e) => { w.opened.push(e.id); return { value: { isPlaced: true } } as never })
  on('ui.close', ($, e) => { w.closed.push((e as { id: string }).id); return { value: undefined } as never })
  on('ui.render', ($, e) => $.ui.resolve(e as never).Box({}) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('classic.PostToolUse', () => ({}) as never)
  on('classic.PostToolUseFailure', () => ({}) as never)
  on('command.run', () => ({ text: 'core' }) as never)
  return Object.assign(w, { clock, data })
}

const finish = async ($: Engine, w: { clock: { advance: (ms: number) => Promise<unknown> } }, agentId?: string) => { await endTurn($, agentId); await w.clock.advance(1) }
const start = ($: Engine) => $.session.start({ cwd: '/w', surface: 'terminal', isInteractive: true } as never)
const bash = ($: Engine, cwd: string, command: string, stdout = '', extra: Record<string, unknown> = {}) =>
  $.classic.PostToolUse({ tool_name: 'Bash', tool_input: { command, ...extra }, tool_response: { stdout, stderr: '', interrupted: false }, tool_use_id: 't1', cwd } as never)
const bashFail = ($: Engine, cwd: string, command: string, error: string, isInterrupt = false) =>
  $.classic.PostToolUseFailure({ tool_name: 'Bash', tool_input: { command }, error, is_interrupt: isInterrupt, tool_use_id: 't2', cwd } as never)
const endTurn = ($: Engine, agentId?: string) =>
  $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 'x', reason: 'answer', ...(agentId ? { agentId } : {}) } as never)
const last = (w: World) => w.statuses[w.statuses.length - 1]
const petIn = async (w: { data: Record<string, unknown> }, _$?: Engine) => w.data[KEY_XD] as Record<string, unknown> | undefined
const cria = { nombre: 'Tito', xp: 10, commits: 1, marcaAutor: S - 100, ultimaActividad: T0 }

describe('mascota en la sesión', () => {
  test('1. evento fuera de un repo → nada', async ($, on) => {
    const w = world(on)
    await start($)
    await bash($, '/tmp/suelto', 'npm test')
    await finish($, w)
    expect(w.statuses.filter(Boolean)).toEqual([])
    expect(Object.keys(w.data)).toEqual([])
  })

  test('2. primer evento en un repo → huevo; la historia vieja no cuenta', async ($, on) => {
    const w = world(on)
    await start($)
    await bash($, '/w/x-digest/mod', 'npm test')
    expect(last(w)).toMatch(/^◯ \S+@x-digest · nace con el primer commit$/)
    await finish($, w)
    const p = await petIn(w, $)
    expect(p?.xp).toBe(0)
    expect(p?.marcaAutor).toBe(S - 100)
    expect(w.toasts).toEqual([])
  })

  test('4/8. commit propio nuevo → nace (+10) con un toast al terminar el turno; --author con --fixed-strings', async ($, on) => {
    const w = world(on, { [KEY_XD]: { nombre: 'Tito', marcaAutor: S - 100, ultimaActividad: T0 }, ultimo: '/w/x-digest/.git' })
    XD.log = [{ at: S - 100, s: 'viejo' }, { at: S - 5, s: 'feat: mascota' }]
    try {
      await start($)
      await bash($, '/w/x-digest', 'git commit -m "feat: mascota"')
      await finish($, w)
      const p = await petIn(w, $)
      expect(p?.xp).toBe(10)
      expect(w.toasts).toHaveLength(1)
      expect(w.toasts[0]).toContain('nació Tito')
      expect(last(w)).toMatch(/^\(•ᴗ•\) Tito@x-digest · nv 1/)
      const log = w.runs.find(r => r[3] === 'log')!
      expect(log).toContain('--author=<ema+x@mail.com>')
      expect(log).toContain('--fixed-strings')
      // otro turno a los pocos segundos: no vuelve a correr git log
      const before = w.runs.filter(r => r[3] === 'log').length
      await finish($, w)
      expect(w.runs.filter(r => r[3] === 'log').length).toBe(before)
    } finally {
      XD.log = [{ at: S - 100, s: 'viejo' }]
    }
  })

  test('3. sin user.email no cuenta commits', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    w.repos[0] = { ...XD, email: null, log: [{ at: S - 1, s: 'nuevo' }] }
    await start($)
    await bash($, '/w/x-digest', 'git status')
    await finish($, w)
    expect(w.runs.some(r => r[3] === 'config')).toBe(true)
    expect((await petIn(w, $))?.xp).toBe(10)
    expect(w.runs.some(r => r[3] === 'log')).toBe(false)
  })

  test('6. pull con commits de otra persona con email parecido → 0 XP', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    w.repos[0] = { ...XD, email: 'a@b.com', log: [{ at: S - 100, s: 'viejo', author: 'a@b.com' }, { at: S - 1, s: 'de ana', author: 'ana@b.com' }] }
    await start($)
    await bash($, '/w/x-digest', 'git pull')
    await finish($, w)
    expect((await petIn(w, $))?.xp).toBe(10)
  })

  test('17b. comando que pasó a segundo plano (timeout, Ctrl+B o mensaje) → nada', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria, testsRojos: true } })
    await start($)
    for (const extra of [{ backgroundTaskId: 'b1' }, { timedOutAfterMs: 120000, backgroundTaskId: 'b2' }, { backgroundedByUser: true, backgroundTaskId: 'b3' }]) {
      await $.classic.PostToolUse({ tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: { stdout: 'RUN v2', stderr: '', interrupted: false, ...extra }, tool_use_id: 'bg', cwd: '/w/x-digest' } as never)
    }
    const p = await petIn(w, $)
    expect(p?.testsVerdes ?? 0).toBe(0)
    expect(p?.testsRojos).toBe(true)
  })

  test('el chequeo de commits no frena el fin del turno y los repos tocados se olvidan después de chequear', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bash($, '/w/x-digest', 'git status')
    await bash($, '/w/otro', 'npm test')
    await endTurn($)
    expect(w.runs.filter(r => r[3] === 'log')).toHaveLength(0) // todavía no: corre después
    await w.clock.advance(1)
    expect(w.runs.filter(r => r[3] === 'log').map(r => r[2]).sort()).toEqual(['/w/otro', '/w/x-digest'])
    await w.clock.advance(31_000)
    await finish($, w)
    // solo la mostrada (otro); x-digest ya no está "tocada"
    expect(w.runs.filter(r => r[3] === 'log').map(r => r[2]).sort()).toEqual(['/w/otro', '/w/otro', '/w/x-digest'])
  })

  test('worktree: git log corre en la carpeta principal del repo, no en la del worktree', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bash($, '/w/x-digest-wt', 'git status')
    await finish($, w)
    expect(w.runs.find(r => r[3] === 'log')?.[2]).toBe('/w/x-digest')
  })

  test('10/19. test rojo con marca → resfriada; el toast sale al final del turno principal, no en el de un subagente', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bashFail($, '/w/x-digest', 'npm test', 'Exit code 1\nTests  2 failed | 8 passed')
    expect(last(w)).toContain('tests en rojo')
    await finish($, w, 'agent-1')
    expect(w.toasts).toEqual([])
    await finish($, w)
    expect(w.toasts).toHaveLength(1)
    expect(w.toasts[0]).toContain('se resfrió')
    await finish($, w)
    expect(w.toasts).toHaveLength(1)
  })

  test('19. dos avisos en el mismo turno → solo el de mayor prioridad', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria, xp: 98 } })
    await start($)
    await bashFail($, '/w/x-digest', 'npm test', 'Tests  1 failed')
    await bash($, '/w/x-digest', 'npm test', '', {}) // verde: +2 → 100 XP, joven, y se cura
    await finish($, w)
    expect(w.toasts).toHaveLength(1)
    expect(w.toasts[0]).toContain('creció')
  })

  test('17. interrumpido, rechazado o en segundo plano → nada', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bashFail($, '/w/x-digest', 'npm test', 'Interrupted · 3 failed', true)
    await bashFail($, '/w/x-digest', 'npm test', "The user doesn't want to proceed with this tool use.")
    await bash($, '/w/x-digest', 'npm test', 'Command running in background with ID: b1', { run_in_background: true })
    await finish($, w)
    const p = await petIn(w, $)
    expect(p?.testsVerdes ?? 0).toBe(0)
    expect(p?.testsRojos ?? false).toBe(false)
    expect(w.toasts).toEqual([])
  })

  test('18. el crédito va al repo del cwd del evento; un worktree comparte mascota; se muestra el último con actividad', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bash($, '/w/x-digest-wt', 'npm test')
    expect((await petIn(w, $))?.testsVerdes).toBe(1)
    expect(last(w)).toContain('Tito@x-digest')
    await bash($, '/w/otro/src', 'npm test')
    expect(last(w)).toMatch(/@otro/)
    expect((await petIn(w, $))?.testsVerdes).toBe(1)
  })

  test('18b. el cd inicial del comando manda sobre el cwd del evento', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await bash($, '/w/sesion', 'cd /w/x-digest && npm test')
    expect((await petIn(w, $))?.testsVerdes).toBe(1)
  })

  test('PowerShell también cuenta', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await $.classic.PostToolUse({ tool_name: 'PowerShell', tool_input: { command: 'npm test' }, tool_response: { stdout: 'ok', stderr: '' }, tool_use_id: 'p', cwd: '/w/x-digest' } as never)
    expect((await petIn(w, $))?.testsVerdes).toBe(1)
  })

  test('otras herramientas no cuentan', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria } })
    await start($)
    await $.classic.PostToolUse({ tool_name: 'Read', tool_input: { file_path: 'npm test' }, tool_response: {}, tool_use_id: 'r', cwd: '/w/x-digest' } as never)
    expect((await petIn(w, $))?.testsVerdes ?? 0).toBe(0)
  })

  test('23. si git explota por dentro, el resultado de la herramienta pasa igual y no se ve nada', async ($, on) => {
    const w = world(on)
    w.revParseFails = true
    await start($)
    const r = await bash($, '/w/x-digest', 'npm test')
    expect(r).toEqual({})
    expect(w.statuses.filter(Boolean)).toEqual([])
  })

  test('al arrancar, sin esperar, muestra la mascota del último repo con actividad', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria }, ultimo: '/w/x-digest/.git' })
    await start($)
    expect(w.statuses.filter(Boolean)).toEqual([])
    await w.clock.advance(2_000)
    expect(last(w)).toMatch(/^\(•ᴗ•\) Tito@x-digest/)
  })

  test('sin mascotas guardadas, al arrancar no muestra nada', async ($, on) => {
    const w = world(on)
    await start($)
    await w.clock.advance(2_000)
    expect(w.statuses.filter(Boolean)).toEqual([])
  })

  test('22. /mascota abre y cierra el panel; /mascota nombre valida y renombra', async ($, on) => {
    const w = world(on, { [KEY_XD]: { ...cria }, ultimo: '/w/x-digest/.git' })
    await start($)
    await $.command.run({ command: 'mascota', args: '', origin: { kind: 'composer' } } as never)
    expect(w.opened).toEqual(['mascota'])
    await $.command.run({ command: 'mascota', args: '', origin: { kind: 'composer' } } as never)
    expect(w.closed).toEqual(['mascota'])
    const r = await $.command.run({ command: 'mascota', args: 'nombre  Pochi ', origin: { kind: 'composer' } } as never)
    expect(JSON.stringify(r)).toContain('Pochi')
    expect((await petIn(w, $))?.nombre).toBe('Pochi')
    expect(last(w)).toContain('Pochi@x-digest')
    const bad = await $.command.run({ command: 'mascota', args: `nombre ${'x'.repeat(30)}`, origin: { kind: 'composer' } } as never)
    expect(JSON.stringify(bad)).toContain('1 y 20')
  })

  test('/mascota sin ninguna mascota todavía → explica cómo nace', async ($, on) => {
    world(on)
    await start($)
    const r = await $.command.run({ command: 'mascota', args: '', origin: { kind: 'composer' } } as never)
    expect(JSON.stringify(r)).toContain('repo')
  })

  test('Windows: la clave del repo va en minúsculas y con /', async ($, on) => {
    const w = world(on)
    w.repos = [{ common: 'C:/Users/Ema/Proj/.git', top: 'C:/Users/Ema/Proj', email: 'e@x', log: [] }]
    await start($)
    await bash($, 'C:/Users/Ema/Proj', 'npm test')
    expect(Object.keys(w.data)).toContain('repo:c:/users/ema/proj/.git')
  })
})
