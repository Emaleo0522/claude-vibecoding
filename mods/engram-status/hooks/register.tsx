import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { EngramStatusSnapshot } from '../types'
import { bandText, detailText, evaluate, hideKey, isWorse, showsBand, statusLine, type Level, type Status } from './parse'

const FIRST_CHECK_MS = 2_000
const POLL_MS = 60_000
const TAIL_LINES = 200
const RUN_TIMEOUT_MS = 10_000
const PANE = 'engram-status'

const current = atom({ plugin: 'engram-status', key: 'current' } as const, null)
const hiddenKey = atom({ plugin: 'engram-status', key: 'hiddenKey' } as const, null)
const detail = atom({ plugin: 'engram-status', key: 'detail' } as const, '')
/** Por sesión, no en $.store: dos sesiones con estados distintos se pisaban y repetían el toast. */
const lastLevel = atom({ plugin: 'engram-status', key: 'lastLevel' } as const, 'ok')

type Options = { project: string; engramPath: string; logPath: string }

// Estado del módulo: se reinicia con cada reload, y está bien
// (session.start vuelve a disparar y lo reconstruye).
const mod = {
  opts: { project: 'personal', engramPath: 'engram', logPath: '' } as Options,
  lines: [] as string[],
  lastMtime: null as number | null,
  lastTurnEnd: null as number | null,
  lastStatus: { level: 'unknown', reason: 'no-data' } as Status,
  running: false,
  detailBusy: false,
}

async function platform($: EngineInterface) {
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  // En Windows HOME puede venir en formato POSIX (/c/Users/...): primero USERPROFILE.
  const home = isWindows
    ? ((await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '')
    : ((await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? '')
  const logPath = mod.opts.logPath || `${home}/.claude/sessions/engram-cloud-sync.jsonl`
  return { isWindows, logPath }
}

function tailArgv(isWindows: boolean, logPath: string): string[] {
  if (isWindows) {
    const quoted = `'${logPath.replace(/'/g, "''")}'`
    return ['powershell', '-NoProfile', '-NonInteractive', '-Command', `Get-Content -LiteralPath ${quoted} -Tail ${TAIL_LINES} -Encoding UTF8`]
  }
  return ['tail', '-n', String(TAIL_LINES), logPath]
}

/** Relee la cola del log solo si cambió el mtime. */
async function refreshLines($: EngineInterface) {
  const { isWindows, logPath } = await platform($)
  const stat = await $.fs.stat(logPath).catch(() => null)
  if (!stat) {
    mod.lines = []
    mod.lastMtime = null
    return
  }
  if (stat.mtimeMs === mod.lastMtime) return
  const result = await $.process.run(tailArgv(isWindows, logPath), { timeoutMs: RUN_TIMEOUT_MS }).catch(() => null)
  if (!result || result.exitCode !== 0) {
    mod.lines = []
    mod.lastMtime = null
    return
  }
  mod.lines = result.stdout.split(/\r?\n/).filter(Boolean)
  mod.lastMtime = stat.mtimeMs
}

async function notifyIfWorse($: EngineInterface, s: Status, now: number) {
  // ⟳ es neutro: no avisa ni cambia el último nivel avisado (si no, ⚠ → ⟳ → ⚠ repetía el toast).
  if (s.level === 'syncing') return
  const prev: Level = await read($, lastLevel)
  if (isWorse(s.level, prev) && showsBand(s.level)) {
    $.ui.toast(`Engram: ${bandText(s, now)}`)
  }
  if (s.level !== prev) await update($, lastLevel, () => s.level)
}

/** Publica lo que leen la franja y el panel. "Ocultar" se olvida cuando el problema se va. */
async function publish($: EngineInterface, s: Status, now: number) {
  const snap: EngramStatusSnapshot = { level: s.level, band: bandText(s, now), hideKey: hideKey(s) }
  await update($, current, prev => (prev && prev.band === snap.band && prev.hideKey === snap.hideKey && prev.level === snap.level ? prev : snap))
  // Solo ✓ olvida "ocultar"; ⟳ es neutro (pasa en casi cada turno).
  if (s.level === 'ok') await update($, hiddenKey, prev => (prev === null ? prev : null))
}

async function check($: EngineInterface) {
  if (mod.running) return
  mod.running = true
  try {
    await refreshLines($)
    const now = await $.clock.now()
    const s = evaluate(mod.lines, now, mod.lastTurnEnd)
    mod.lastStatus = s
    $.ui.status(statusLine(s, now))
    await publish($, s, now)
    await notifyIfWorse($, s, now)
  } finally {
    mod.running = false
  }
}

/** Diagnóstico a pedido del usuario; nunca corre de fondo. */
async function runDoctor($: EngineInterface): Promise<string> {
  const argv = [mod.opts.engramPath, 'cloud', 'upgrade', 'doctor', '--project', mod.opts.project]
  const result = await $.process.run(argv, { timeoutMs: RUN_TIMEOUT_MS, env: { ENGRAM_NO_UPDATE_CHECK: '1' } }).catch((err: unknown) => String(err))
  if (typeof result === 'string') return `no se pudo correr engram (${result.slice(0, 120)})`
  return `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`
}

async function buildDetail($: EngineInterface): Promise<string> {
  mod.lastMtime = null // forzar relectura del log
  await check($)
  const { logPath } = await platform($)
  const doctor = await runDoctor($)
  const now = await $.clock.now()
  return detailText(mod.lastStatus, now, logPath, doctor)
}

async function openDetail($: EngineInterface) {
  if (mod.detailBusy) return // doble clic: un solo doctor
  mod.detailBusy = true
  try {
    // Abrir ya con "Cargando…": el doctor puede tardar hasta 10 s con el server caído.
    await update($, detail, () => '')
    await $.ui.open({ id: PANE, title: 'Engram' })
    const text = await buildDetail($)
    await update($, detail, () => text)
  } finally {
    mod.detailBusy = false
  }
}

export const register: Register = (on, options) => {
  mod.opts = { ...mod.opts, ...(options as unknown as Partial<Options>) }

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'engram-status', description: 'Estado del sync de Engram: detalle y diagnóstico' })
    $.clock.after(FIRST_CHECK_MS, () => void check($).catch(() => {}))
    $.clock.every(POLL_MS, () => void check($).catch(() => {}))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    // Solo el hilo principal: el hook Stop que sincroniza corre al final del turno de la sesión.
    // Y solo turnos que terminaron bien: con Esc ('aborted') o error de API el hook Stop no corre.
    if (!(e as { agentId?: string }).agentId && e.reason === 'answer') mod.lastTurnEnd = await $.clock.now()
    return next(e)
  })

  on('command.run', { command: 'engram-status' }, async $ => ({ text: await buildDetail($) }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const snap = await read($, current)
    if (!snap || !showsBand(snap.level)) return next(e)
    if ((await read($, hiddenKey)) === snap.hideKey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const color = snap.level === 'error' ? 'error' : 'warning'
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={color} inverse bold> ENGRAM </Text>
        <Text wrap="truncate-end">{snap.band}</Text>
        <Button key="detail" label="ver detalle" onPress={() => openDetail($)} />
        <Button key="hide" label="ocultar" onPress={() => update($, hiddenKey, () => snap.hideKey)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Button } = $.ui.resolve(e)
    const text = await read($, detail)
    return (
      <Box flexDirection="column" gap={1}>
        <Markdown key="detail-md" text={text || 'Cargando…'} />
        <Button key="close" label="cerrar" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
      </Box>
    )
  })
}
