import { describe, expect, test } from 'claude-code/testing'

import { applyEvent, commandDir, defaultName, defaultPet, face, newCommits, normalizePet, paneLines, pickNotice, statusLine, validName, verdict, type Pet } from './pet'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 9, 5, 12)
const fresh = (): Pet => defaultPet('x-digest', 'C:/Users/Ema/.claude/x-digest', T0)
/** Una cría con 1 commit (10 XP). */
const cria = (): Pet => applyEvent(fresh(), { type: 'commits', n: 1, subject: 'primero' }, T0).pet

describe('nacimiento y etapas', () => {
  test('2. un repo nuevo es un huevo con nombre estable', () => {
    const p = fresh()
    expect(p.xp).toBe(0)
    expect(p.nombre).toBe(defaultName('x-digest'))
    expect(defaultName('x-digest')).toBe(defaultName('x-digest'))
    expect(statusLine(p, T0)).toBe(`◯ ${p.nombre}@x-digest · nace con el primer commit`)
  })

  test('4. el primer commit la hace nacer (+10 XP) y avisa', () => {
    const { pet, notices } = applyEvent(fresh(), { type: 'commits', n: 1, subject: 'fix(x-post): links' }, T0)
    expect(pet.xp).toBe(10)
    expect(pet.commits).toBe(1)
    expect(face(pet, T0)).toBe('(•ᴗ•)')
    expect(notices.map(n => n.kind)).toEqual(['nace'])
    expect(pet.eventos[0].texto).toContain('fix(x-post): links')
  })

  test('5. varios commits suman 10 c/u y un solo aviso de etapa', () => {
    const { pet, notices } = applyEvent(cria(), { type: 'commits', n: 9, subject: 'x' }, T0)
    expect(pet.xp).toBe(100)
    expect(face(pet, T0)).toBe('ʕ•ᴥ•ʔ')
    expect(notices.map(n => n.kind)).toEqual(['etapa'])
  })

  test('nivel y barra en la línea de estado', () => {
    const p = applyEvent(cria(), { type: 'commits', n: 4, subject: 'x' }, T0).pet // 50 XP
    expect(statusLine(p, T0)).toBe(`(•ᴗ•) ${p.nombre}@x-digest · nv 2 ▰▰▱▱▱`)
  })

  test('sabia: barra llena', () => {
    const p = { ...cria(), xp: 5000 }
    expect(statusLine(p, T0)).toContain('ʕ◕ω◕ʔ☆')
    expect(statusLine(p, T0)).toContain('▰▰▰▰▰')
  })
})

describe('marca de agua de commits', () => {
  test('primera vez: no cuenta la historia, la marca queda en el más nuevo', () => {
    expect(newCommits([100, 300, 200], null)).toEqual({ n: 0, marca: 300 })
    expect(newCommits([], null)).toEqual({ n: 0, marca: 0 })
  })
  test('cuenta solo los posteriores a la marca', () => {
    expect(newCommits([100, 300, 400, 500], 300)).toEqual({ n: 2, marca: 500 })
  })
  test('7. cambio de rama, bisect, rebase: nada nuevo por fecha de autor → 0', () => {
    expect(newCommits([100, 200, 300], 300)).toEqual({ n: 0, marca: 300 })
  })
  test('5b. más de 20 de golpe: avanza la marca sin XP', () => {
    const ats = Array.from({ length: 25 }, (_, i) => 1000 + i)
    expect(newCommits(ats, 999)).toEqual({ n: 0, marca: 1024 })
  })
})

describe('salud', () => {
  test('9. test en verde +2 XP; el 11.º del día solo cuenta', () => {
    let p = cria()
    for (let i = 0; i < 11; i++) p = applyEvent(p, { type: 'test', ok: true }, T0).pet
    expect(p.testsVerdes).toBe(11)
    expect(p.xp).toBe(10 + 20)
    p = applyEvent(p, { type: 'test', ok: true }, T0 + DAY).pet
    expect(p.xp).toBe(32)
  })

  test('10. test en rojo resfría y avisa una vez; un verde cura', () => {
    const a = applyEvent(cria(), { type: 'test', ok: false }, T0)
    expect(a.pet.salud).toBe('resfriada')
    expect(a.notices.map(n => n.kind)).toEqual(['enferma'])
    expect(statusLine(a.pet, T0)).toContain('(•﹏•)')
    expect(statusLine(a.pet, T0)).toContain('tests en rojo')
    const b = applyEvent(a.pet, { type: 'test', ok: false }, T0)
    expect(b.notices).toEqual([])
    const c = applyEvent(b.pet, { type: 'test', ok: true }, T0)
    expect(c.pet.salud).toBe('bien')
    expect(c.notices.map(n => n.kind)).toEqual(['cura'])
  })

  test('12. build roto enferma; un test rojo no la baja; build OK cura con +5', () => {
    const a = applyEvent(cria(), { type: 'build', ok: false }, T0)
    expect(a.pet.salud).toBe('enferma')
    expect(statusLine(a.pet, T0)).toContain('(×_×)')
    expect(statusLine(a.pet, T0)).toContain('build roto')
    const b = applyEvent(a.pet, { type: 'test', ok: false }, T0)
    expect(b.pet.salud).toBe('enferma')
    expect(b.notices).toEqual([])
    // con el build arreglado vuelve a resfriada (los tests siguen rojos), sin aviso de cura
    const c = applyEvent(b.pet, { type: 'build', ok: true }, T0)
    expect(c.pet.salud).toBe('resfriada')
    expect(c.pet.xp).toBe(15)
    const d = applyEvent(applyEvent(cria(), { type: 'build', ok: false }, T0).pet, { type: 'build', ok: true }, T0)
    expect(d.pet.salud).toBe('bien')
    expect(d.notices.map(n => n.kind)).toEqual(['cura'])
  })

  test('el huevo no se enferma ni gana XP por tests', () => {
    const a = applyEvent(fresh(), { type: 'build', ok: false }, T0)
    expect(a.pet.salud).toBe('bien')
    const b = applyEvent(fresh(), { type: 'test', ok: true }, T0)
    expect(b.pet.xp).toBe(0)
  })

  test('21. más de 3 días sin actividad: dormida; el próximo evento la despierta sin aviso', () => {
    const p = cria()
    expect(statusLine(p, T0 + 4 * DAY)).toBe(`(-ᴗ-) zZ ${p.nombre}@x-digest`)
    const { pet, notices } = applyEvent(p, { type: 'test', ok: true }, T0 + 4 * DAY)
    expect(notices).toEqual([])
    expect(statusLine(pet, T0 + 4 * DAY)).toContain('(•ᴗ•)')
  })

  test('19. un solo aviso por turno, por prioridad', () => {
    const k = (kind: 'nace' | 'etapa' | 'enferma' | 'cura') => ({ kind, texto: kind })
    expect(pickNotice([k('cura'), k('etapa'), k('enferma')])?.kind).toBe('etapa')
    expect(pickNotice([k('cura'), k('nace')])?.kind).toBe('nace')
    expect(pickNotice([])).toBeNull()
  })
})

describe('veredicto de comandos', () => {
  test('9. test simple con salida 0 → verde; build simple → OK', () => {
    expect(verdict('npm test', true, '')).toEqual({ test: true })
    expect(verdict('npx vitest run', true, '')).toEqual({ test: true })
    expect(verdict('cd "C:/x" && node --test limpiar-url.test.js', true, '')).toEqual({ test: true })
    expect(verdict('claude plugin test .', true, '')).toEqual({ test: true })
    expect(verdict('npm run build', true, '')).toEqual({ build: true })
    expect(verdict('pnpm run test:unit', true, '')).toEqual({ test: true })
  })

  test('10/12. salida ≠ 0 con marca del runner → rojo', () => {
    expect(verdict('npm test', false, 'Tests  2 failed | 10 passed')).toEqual({ test: false })
    expect(verdict('node --test', false, '# pass 4\n# fail 1')).toEqual({ test: false })
    expect(verdict('npx tsc --noEmit', false, "src/a.ts(3,1): error TS2322: Type 'x'")).toEqual({ build: false })
    expect(verdict('next build', false, 'Failed to compile.')).toEqual({ build: false })
  })

  test('11. salida ≠ 0 sin marca → no cuenta', () => {
    expect(verdict('npm test', false, 'Error: no test specified')).toEqual({})
    expect(verdict('npm run build', false, 'npm ERR! Missing script: "build"')).toEqual({})
    expect(verdict('pytest', false, 'pytest: command not found')).toEqual({})
  })

  test('13. tsc --noEmit es build; tsc --watch no', () => {
    expect(verdict('tsc --noEmit', true, '')).toEqual({ build: true })
    expect(verdict('tsc --watch', true, '')).toEqual({})
    expect(verdict('npx tsc -w', true, '')).toEqual({})
  })

  test('14. con pipe, ; o && después: solo por marcas', () => {
    expect(verdict('npm test 2>&1 | tail -5', true, ' 43 pass\n 0 fail')).toEqual({ test: true })
    expect(verdict('npm test 2>&1 | tail -5', true, ' 42 pass\n 1 fail')).toEqual({ test: false })
    expect(verdict('npm test 2>&1 | tail -5', true, 'algo sin marcas')).toEqual({})
    expect(verdict('npm test; echo EXIT=$?', true, 'EXIT=1')).toEqual({})
    expect(verdict('npm test; Write-Output listo', true, 'listo')).toEqual({})
    expect(verdict('claude plugin test . 2>&1 | grep -E "pass$|fail$"', true, ' 31 pass\n 0 fail')).toEqual({ test: true })
  })

  test('14b. seguido solo por && y salida 0: pasó, aunque lo que viene después imprima "failing"', () => {
    expect(verdict('npm test && git commit -m "fix 2 failing tests"', true, '10 passed\n[main abc] fix 2 failing tests')).toEqual({ test: true })
    expect(verdict('npm run build && git log --oneline -3', true, 'abc fix error TS2322 en x')).toEqual({ build: true })
    // && con salida ≠ 0 y sin marca de fallo (falló lo de después): no cuenta
    expect(verdict('npm test && git push', false, 'Tests  10 passed\nrejected')).toEqual({})
  })

  test('prefijos timeout/time no esconden el test', () => {
    expect(verdict('timeout 150 claude plugin test .', true, '')).toEqual({ test: true })
    expect(verdict('time npm test', true, '')).toEqual({ test: true })
    expect(verdict('timeout 5m npx vitest run', true, '')).toEqual({ test: true })
  })

  test('14c. flags que no corren nada no cuentan', () => {
    expect(verdict('npx tsc --version', true, 'Version 5.9')).toEqual({})
    expect(verdict('tsc -v', true, '')).toEqual({})
    expect(verdict('tsc --init', true, '')).toEqual({})
    expect(verdict('npx jest --listTests', true, '')).toEqual({})
    expect(verdict('npx playwright test --list', true, '')).toEqual({})
    expect(verdict('pytest --collect-only', true, '')).toEqual({})
    expect(verdict('cargo test --no-run', true, '')).toEqual({})
    expect(verdict('vitest --help', true, '')).toEqual({})
    // -v de pytest es "verbose": sí corre
    expect(verdict('pytest -v', true, '')).toEqual({ test: true })
  })

  test('14d. "N error(s)" de pytest/vitest cuenta como fallo', () => {
    expect(verdict('pytest 2>&1 | tail -3', true, '5 passed, 1 error in 0.3s')).toEqual({ test: false })
    expect(verdict('npx vitest run | tail', true, ' Errors  1 error')).toEqual({ test: false })
  })

  test('15. build && test con el build roto → solo build rojo', () => {
    expect(verdict('npm run build && npm test', false, "error TS2304: Cannot find name 'x'")).toEqual({ build: false })
  })

  test('16. el patrón dentro de comillas o como argumento no cuenta', () => {
    expect(verdict('git commit -m "fix vitest config"', true, '')).toEqual({})
    expect(verdict('grep -rn jest src', false, '')).toEqual({})
    expect(verdict('ls node_modules/.bin/tsc', true, '')).toEqual({})
    expect(verdict("echo 'npm test'", true, '')).toEqual({})
    expect(verdict('git status', true, '')).toEqual({})
  })

  test('PowerShell: ; y bloques también son separadores', () => {
    expect(verdict('npm test; if ($?) { Write-Output ok }', true, 'ok')).toEqual({})
    expect(verdict('Set-Location C:\\x; npm test', true, '')).toEqual({ test: true })
  })
})

describe('estado guardado y panel', () => {
  test('24. store vacío o de forma vieja → valores por defecto', () => {
    expect(normalizePet(undefined, 'r', '/r', T0).xp).toBe(0)
    expect(normalizePet({ xp: 'mucho', eventos: 'x' }, 'r', '/r', T0).xp).toBe(0)
    const p = normalizePet({ xp: 120, commits: 5, nombre: 'Tito' }, 'r', '/r', T0)
    expect(p.xp).toBe(120)
    expect(p.nombre).toBe('Tito')
    expect(Array.isArray(p.eventos)).toBe(true)
  })

  test('22. nombre: 1-20 caracteres, una línea', () => {
    expect(validName('  Tito ')).toBe('Tito')
    expect(validName('')).toBeNull()
    expect(validName('a'.repeat(21))).toBeNull()
    expect(validName('a\nb')).toBeNull()
  })

  test('eventos: los 10 más nuevos primero', () => {
    let p = cria()
    for (let i = 0; i < 12; i++) p = applyEvent(p, { type: 'commits', n: 1, subject: `c${i}` }, T0 + i).pet
    expect(p.eventos).toHaveLength(10)
    expect(p.eventos[0].texto).toContain('c11')
  })

  test('panel: cara grande, corazones, contadores y últimos eventos', () => {
    const p = applyEvent(cria(), { type: 'test', ok: false }, T0).pet
    const lines = paneLines(p, T0, false).join('\n')
    expect(lines).toContain('(•﹏•)')
    expect(lines).toContain('♥♥♡♡')
    expect(lines).toContain('1 commits')
    expect(lines).toContain('x-digest')
    expect(paneLines(p, T0, true).join('\n')).toContain('(-﹏-)')
  })
})

describe('carpeta donde corre el comando', () => {
  const W = { cwd: 'C:/Users/Ema/Desktop/claude', home: 'C:/Users/Ema', isWindows: true }
  test('18b. un cd inicial manda (el shell vuelve a la carpeta de la sesión después de cada comando)', () => {
    expect(commandDir('cd ~/.claude/x-digest && node --test x.test.js', W)).toBe('C:/Users/Ema/.claude/x-digest')
    expect(commandDir('cd "C:/Users/Ema/dev/claude-vibecoding" && npm test', W)).toBe('C:/Users/Ema/dev/claude-vibecoding')
    expect(commandDir("cd '/c/Users/Ema/dev/x'; npm test", W)).toBe('C:/Users/Ema/dev/x')
    expect(commandDir('cd mods/x && npm test', W)).toBe('C:/Users/Ema/Desktop/claude/mods/x')
    expect(commandDir('Set-Location -LiteralPath "D:\\proj"; npm test', W)).toBe('D:\\proj')
  })
  test('sin cd inicial: la carpeta del evento', () => {
    expect(commandDir('npm test', W)).toBe('C:/Users/Ema/Desktop/claude')
    expect(commandDir('echo cd /x && npm test', W)).toBe('C:/Users/Ema/Desktop/claude')
  })
  test('Linux: /c/ no se traduce', () => {
    expect(commandDir('cd /c/x && npm test', { cwd: '/home/e', home: '/home/e', isWindows: false })).toBe('/c/x')
  })
})
