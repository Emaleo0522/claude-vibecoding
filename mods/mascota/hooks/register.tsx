import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { applyEvent, commandDir, newCommits, normalizePet, paneLines, pickNotice, statusLine, validName, verdict, type Notice, type Pet } from './pet'

const PANE = 'mascota'
const GIT_TIMEOUT_MS = 3_000
const CHECK_EVERY_MS = 30_000
const STARTUP_DELAY_MS = 2_000
const REFRESH_MS = 10 * 60_000
const BLINK_MS = 700
const LOG_LIMIT = '50'

type Repo = { key: string; label: string; top: string }

// Todo lo de la sesión vive en atoms: nada se comparte entre sesiones (ni entre pruebas).
const shown = atom({ plugin: 'mascota', key: 'shown' } as const, null as string | null)
const pending = atom({ plugin: 'mascota', key: 'pending' } as const, null as Notice | null)
const touched = atom({ plugin: 'mascota', key: 'touched' } as const, [] as string[])
const repos = atom({ plugin: 'mascota', key: 'repos' } as const, {} as Record<string, Repo>) // por clave
const dirs = atom({ plugin: 'mascota', key: 'dirs' } as const, {} as Record<string, string | null>) // carpeta → clave
const checked = atom({ plugin: 'mascota', key: 'checked' } as const, {} as Record<string, number>)
const paneOpen = atom({ plugin: 'mascota', key: 'paneOpen' } as const, false)
const frame = atom({ plugin: 'mascota', key: 'frame' } as const, 0)

// Cola: los cambios al store se aplican de a uno (subagentes en paralelo no se pisan).
const mod = {
  queue: Promise.resolve() as Promise<void>,
  /** Cancela el timer de parpadeo del panel (solo existe con el panel abierto). */
  stopBlink: null as (() => void) | null,
}

const norm = (p: string) => {
  const f = p.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  return /^[A-Za-z]:/.test(f) ? f.toLowerCase() : f
}
function labelOf(common: string): string {
  const f = common.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  const parts = f.split('/')
  const lastPart = parts[parts.length - 1] ?? ''
  if (lastPart === '.git') return parts[parts.length - 2] || 'repo'
  return lastPart.replace(/\.git$/, '') || 'repo'
}
const storeKey = (key: string) => `repo:${key}`

async function git($: EngineInterface, argv: string[]): Promise<string | null> {
  const r = await $.process.run(['git', ...argv], { timeoutMs: GIT_TIMEOUT_MS }).catch(() => null)
  return r && r.exitCode === 0 ? r.stdout : null
}

const safe = (p: Promise<string | undefined>) => p.catch(() => undefined)

/** Sin variables de entorno no se rompe nada: solo no se expande `~`. */
async function homeOf($: EngineInterface): Promise<{ home: string; isWindows: boolean }> {
  const isWindows = (await safe($.env.get('OS'))) === 'Windows_NT'
  // En Windows HOME puede venir en formato POSIX (/c/Users/...): primero USERPROFILE.
  const home = isWindows
    ? ((await safe($.env.get('USERPROFILE'))) ?? (await safe($.env.get('HOME'))) ?? '')
    : ((await safe($.env.get('HOME'))) ?? (await safe($.env.get('USERPROFILE'))) ?? '')
  return { home: home.replace(/\\/g, '/'), isWindows }
}

/** La carpeta → su repo (clave = git-common-dir, así un worktree comparte mascota). */
async function resolveRepo($: EngineInterface, cwd: string): Promise<Repo | null> {
  const dir = norm(cwd)
  const known = (await read($, dirs))[dir]
  if (known === null) return null
  if (known !== undefined) return (await read($, repos))[known] ?? null
  const out = await $.process.run(['git', '-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir', '--show-toplevel'], { timeoutMs: GIT_TIMEOUT_MS }).catch(() => undefined)
  if (out === undefined) return null // error del motor: no se cachea
  if (out.exitCode !== 0) {
    await update($, dirs, d => ({ ...d, [dir]: null }))
    return null
  }
  const [common, top] = out.stdout.split(/\r?\n/).map(s => s.trim())
  if (!common || !top) return null
  // La carpeta principal del repo (no la de un worktree, que puede ser temporal de un subagente).
  const main = common.replace(/\\/g, '/').replace(/\/+$/, '')
  const repo: Repo = { key: norm(common), label: labelOf(common), top: main.endsWith('/.git') ? main.slice(0, -5) : top }
  await update($, repos, r => ({ ...r, [repo.key]: repo }))
  await update($, dirs, d => ({ ...d, [dir]: repo.key }))
  return repo
}

/** Repo por clave: de la sesión, o del store (la mascota guarda su nombre de repo y ruta). */
async function repoForKey($: EngineInterface, key: string): Promise<Repo | null> {
  const r = (await read($, repos))[key]
  if (r) return r
  const raw = (await $.store.get(storeKey(key))) as { repo?: unknown; ruta?: unknown } | undefined
  if (!raw) return null
  return { key, label: typeof raw.repo === 'string' ? raw.repo : labelOf(key), top: typeof raw.ruta === 'string' ? raw.ruta : '' }
}

async function loadPet($: EngineInterface, repo: Repo, now: number): Promise<Pet> {
  return normalizePet(await $.store.get(storeKey(repo.key)), repo.label, repo.top, now)
}

type Change = (p: Pet, now: number) => { pet: Pet; notices: Notice[]; activity?: boolean }

/** Lee, aplica y guarda, de a un cambio por vez. `activity`: pasa a ser la mascota mostrada. */
async function mutate($: EngineInterface, repo: Repo, change: Change, activity: boolean) {
  const prev = mod.queue
  let release = () => {}
  mod.queue = new Promise<void>(r => { release = r })
  await prev
  try {
    const now = await $.clock.now()
    const { pet, notices, activity: found } = change(await loadPet($, repo, now), now)
    await $.store.set(storeKey(repo.key), pet)
    if (activity || found) {
      await $.store.set('ultimo', repo.key)
      await update($, shown, () => repo.key)
    }
    if (notices.length) await update($, pending, cur => pickNotice(cur ? [cur, ...notices] : notices))
    if ((await read($, shown)) === repo.key) $.ui.status(statusLine(pet, now))
  } finally {
    release()
  }
}

function responseText(resp: unknown): string {
  if (typeof resp === 'string') return resp
  if (!resp || typeof resp !== 'object') return ''
  const r = resp as Record<string, unknown>
  return ['stdout', 'stderr', 'output'].map(k => r[k]).filter((v): v is string => typeof v === 'string').join('\n')
}

type ToolEvent = { tool_name?: string; tool_input?: unknown; tool_response?: unknown; error?: unknown; is_interrupt?: boolean; cwd?: string }

/** Un resultado de Bash/PowerShell: ¿fue un test o un build, y cómo salió? */
async function onToolResult($: EngineInterface, e: ToolEvent, failed: boolean) {
  if (e.tool_name !== 'Bash' && e.tool_name !== 'PowerShell') return
  const input = (e.tool_input ?? {}) as { command?: unknown; run_in_background?: unknown }
  if (typeof input.command !== 'string' || input.run_in_background === true) return
  if (failed && e.is_interrupt) return
  const resp = (e.tool_response ?? {}) as { interrupted?: unknown; backgroundTaskId?: unknown; backgroundedByUser?: unknown; timedOutAfterMs?: unknown }
  // Interrumpido, o pasó a segundo plano (timeout, Ctrl+B, un mensaje): la salida es parcial.
  if (!failed && (resp.interrupted === true || resp.backgroundTaskId || resp.backgroundedByUser === true || resp.timedOutAfterMs)) return
  const v = verdict(input.command, !failed, failed ? String(e.error ?? '') : responseText(e.tool_response))
  const counts = v.test !== undefined || v.build !== undefined
  if (!counts && !/\bgit\b/.test(input.command)) return
  if (!e.cwd) return
  const repo = await resolveRepo($, commandDir(input.command, { cwd: e.cwd, ...(await homeOf($)) }))
  if (!repo) return
  await update($, touched, t => (t.includes(repo.key) ? t : [...t, repo.key]))
  if (!counts) return
  await mutate($, repo, (p, now) => {
    let pet = p
    const notices: Notice[] = []
    for (const kind of ['build', 'test'] as const) {
      const ok = v[kind]
      if (ok === undefined) continue
      const r = applyEvent(pet, { type: kind, ok }, now)
      pet = r.pet
      notices.push(...r.notices)
    }
    return { pet, notices }
  }, true)
}

/** Commits propios nuevos de un repo (marca de agua por fecha de autor). */
async function checkCommits($: EngineInterface, repo: Repo) {
  if (!repo.top) return
  const now = await $.clock.now()
  const lastAt = (await read($, checked))[repo.key]
  if (lastAt !== undefined && now - lastAt < CHECK_EVERY_MS) return
  await update($, checked, c => ({ ...c, [repo.key]: now }))
  const email = (await git($, ['-C', repo.top, 'config', 'user.email']))?.trim()
  if (!email) return // sin email no se cuenta: un --author vacío coincidiría con todo
  // <email> completo: --author busca una subcadena en "Nombre <email>" (a@b.com coincidiría con ana@b.com).
  const out = await git($, ['-C', repo.top, 'log', '-n', LOG_LIMIT, `--author=<${email}>`, '--fixed-strings', '--format=%at%x09%s'])
  if (out === null) return
  const commits = out.split(/\r?\n/).map(l => /^(\d+)\t(.*)$/.exec(l)).filter((m): m is RegExpExecArray => !!m).map(m => ({ at: Number(m[1]), s: m[2] }))
  await mutate($, repo, (p, t) => {
    const { n, marca } = newCommits(commits.map(c => c.at), p.marcaAutor)
    const base = { ...p, marcaAutor: marca }
    if (n === 0) return { pet: base, notices: [] }
    const newest = commits.filter(c => c.at > (p.marcaAutor ?? 0)).sort((a, b) => b.at - a.at)[0]
    return { ...applyEvent(base, { type: 'commits', n, subject: newest?.s }, t), activity: true }
  }, false)
}

async function endOfTurn($: EngineInterface) {
  const keys = new Set(await read($, touched))
  // Los tocados se chequean una vez; después solo la mostrada (si no, cada turno corre git en todos).
  await update($, touched, () => [])
  const s = await read($, shown)
  if (s) keys.add(s)
  for (const key of keys) {
    const repo = await repoForKey($, key)
    if (repo) await checkCommits($, repo).catch(() => {})
  }
  const n = await read($, pending)
  if (n) {
    $.ui.toast(n.texto)
    await update($, pending, () => null)
  }
}

async function refreshStatus($: EngineInterface) {
  const key = await read($, shown)
  if (!key) return
  const repo = await repoForKey($, key)
  if (!repo) return
  const now = await $.clock.now()
  $.ui.status(statusLine(await loadPet($, repo, now), now))
}

/** Al arrancar (sin demorar la sesión): la mascota del último repo con actividad. */
async function startup($: EngineInterface) {
  if (await read($, shown)) return
  const ultimo = await $.store.get('ultimo')
  if (typeof ultimo !== 'string') return
  const repo = await repoForKey($, ultimo)
  if (!repo) return
  await update($, repos, r => ({ ...r, [repo.key]: repo }))
  await update($, shown, () => repo.key)
  await refreshStatus($)
  await checkCommits($, repo).catch(() => {})
}

async function currentRepo($: EngineInterface): Promise<Repo | null> {
  const key = (await read($, shown)) ?? (await $.store.get('ultimo'))
  return typeof key === 'string' ? repoForKey($, key) : null
}

async function closePane($: EngineInterface) {
  paneClosed()
  await update($, paneOpen, () => false)
  await $.ui.close({ id: PANE })
}

/** El parpadeo corre solo con el panel abierto. */
function paneClosed() {
  const stop = mod.stopBlink
  mod.stopBlink = null
  if (typeof stop === 'function') {
    try {
      stop()
    } catch {
      // un timer ya cancelado (p. ej. por un hot reload) no importa
    }
  }
}

async function runCommand($: EngineInterface, args: string) {
  const repo = await currentRepo($)
  if (!repo) return { text: 'Todavía no hay mascota: nace en el primer repo donde corras tests o hagas un commit.' }
  const m = /^nombre(?:\s+([\s\S]*))?$/.exec(args.trim())
  if (m) {
    const name = validName(m[1] ?? '')
    if (!name) return { text: 'El nombre tiene que tener entre 1 y 20 caracteres, en una sola línea.' }
    await mutate($, repo, p => ({ pet: { ...p, nombre: name }, notices: [] }), true)
    return { text: `Ahora se llama ${name}.` }
  }
  if (await read($, paneOpen)) {
    await closePane($)
  } else {
    await update($, paneOpen, () => true)
    paneClosed()
    mod.stopBlink = $.clock.every(BLINK_MS, () => void blinkTick($).catch(() => {}))
    await $.ui.open({ id: PANE, title: 'Mascota' })
  }
  return {}
}

async function blinkTick($: EngineInterface) {
  if (await read($, paneOpen)) await update($, frame, f => (f + 1) % 4)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'mascota', description: 'Tu mascota del repo: /mascota abre el panel, /mascota nombre <nuevo> la renombra' })
    $.clock.after(STARTUP_DELAY_MS, () => void startup($).catch(() => {}))
    $.clock.every(REFRESH_MS, () => void refreshStatus($).catch(() => {}))
    return result
  })

  // Ema cerró el panel (Esc, la cruz) o se descargó el mod: el próximo /mascota lo abre.
  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if ((e as { id?: string }).id === PANE) {
      paneClosed()
      await update($, paneOpen, () => false).catch(() => {})
    }
    return r
  })

  // Solo observan: el resultado de la herramienta pasa intacto, aunque algo falle acá.
  on('classic.PostToolUse', async ($, e, next) => {
    const r = await next(e)
    await onToolResult($, e as ToolEvent, false).catch(() => {})
    return r
  })
  on('classic.PostToolUseFailure', async ($, e, next) => {
    const r = await next(e)
    await onToolResult($, e as ToolEvent, true).catch(() => {})
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    // Solo el turno principal: los de subagentes no chequean commits ni avisan.
    // En diferido: git puede tardar y el turno ya terminó.
    if (!(e as { agentId?: string }).agentId) $.clock.after(0, () => void endOfTurn($).catch(() => {}))
    return r
  })

  on('command.run', { command: 'mascota' }, async ($, e) => runCommand($, e.args))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const repo = await currentRepo($)
    const now = await $.clock.now()
    const lines = repo ? paneLines(await loadPet($, repo, now), now, (await read($, frame)) === 3) : ['Todavía no hay mascota.']
    return (
      <Box flexDirection="column">
        {lines.map((l, i) => <Text key={`l${i}`}>{l}</Text>)}
        <Button key="close" label="cerrar" role="dismiss" onPress={() => closePane($)} />
      </Box>
    )
  })
}
