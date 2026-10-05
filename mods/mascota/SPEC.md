# Mod `mascota` (tamagotchi del repo) — spec v2

Estado: v2 tras la revisión con contexto en blanco (2026-10-05); falta la decisión de Ema sobre **qué repo muestra** (ver "Pendiente"). Decisiones de Ema (2026-10-04): estilo **A, criatura kaomoji**; **una mascota por repo**; **nunca muere ni molesta**.

## Objetivo
Una mascota chiquita en la línea de estado que crece con el trabajo real del repo (commits propios, tests en verde) y se enferma cuando algo se rompe (build roto, tests en rojo). Es un juego: no bloquea nada, no cambia ningún comando, no pide nada, y ante la duda **no cuenta** (prefiere perderse un evento a mentir).

## Qué se ve
- **Línea de estado** (`$.ui.status`), una línea:
  - normal: `(•ᴗ•) Bit · nv 3 ▰▰▰▱▱` (barra = avance a la próxima etapa, 5 segmentos)
  - enferma: `(×_×) Bit · build roto` · resfriada: `(•﹏•) Bit · tests en rojo`
  - dormida (más de 3 días sin actividad): `(-ᴗ-) zZ Bit`
  - huevo: `◯ Bit · nace con el primer commit`
- **Panel** `/mascota`: marco, cara grande (parpadea solo con el panel abierto), nombre · etapa · nivel · repo, corazones (4 bien, 2 resfriada, 1 enferma), contadores (commits, corridas de tests en verde) y últimos 3 eventos.
- **Toasts** solo en 4 momentos: nace, cambia de etapa, se enferma, se cura. Máximo uno por turno, prioridad nace > etapa > se enferma > se cura. El estado de "ya avisé" vive por sesión (`$.state`), no en el store: dos sesiones en el mismo repo no se pisan (lección de engram-status).
- `/mascota nombre <texto>`: 1-20 caracteres, una línea.

## Etapas y caras
| Etapa | XP desde | normal | resfriada | enferma | dormida |
|---|---|---|---|---|---|
| huevo | 0 | `◯` | — | — | `◯` |
| cría | 10 (primer commit) | `(•ᴗ•)` | `(•﹏•)` | `(×_×)` | `(-ᴗ-) zZ` |
| joven | 100 | `ʕ•ᴥ•ʔ` | `ʕ•﹏•ʔ` | `ʕ×ᴥ×ʔ` | `ʕ-ᴥ-ʔ zZ` |
| adulta | 400 | `ʕ•̀ω•́ʔ✧` | `ʕ•̀﹏•́ʔ` | `ʕ×ω×ʔ` | `ʕ-ω-ʔ zZ` |
| sabia | 1200 | `ʕ◕ω◕ʔ☆` | `ʕ◕﹏◕ʔ` | `ʕ×ω×ʔ` | `ʕ-ω-ʔ zZ` |

`nv` sube cada 50 XP (solo un número); la etapa cambia la cara. El huevo no se enferma.

## Qué repo (identidad)
- La clave de una mascota es `git rev-parse --path-format=absolute --git-common-dir` normalizada (barras `/`; en Windows, minúsculas). Así los **worktrees** del mismo repo comparten mascota.
- Resolución con `$.process.run` (sin shell, timeout 5 s), **cacheada por carpeta** durante la sesión.
- **Pendiente (decisión de Ema)**: qué mascota se muestra. Recomendada: **la del repo con la última actividad** (ver abajo).

## Fuentes de datos (todas observan, ninguna intercepta)
1. **Resultados de comandos**: `classic.PostToolUse` y `classic.PostToolUseFailure` para `Bash` y `PowerShell`. Traen `tool_input`, `tool_response` o `error`, `is_interrupt` y **`cwd`** (la carpeta real donde corrió, también en subagentes). El trabajo se hace sin demorar al motor (sin `await` largos en el hook).
   - Se ignoran: interrumpidos (`is_interrupt`), rechazados en el diálogo de permiso, y llamadas con `run_in_background: true` (solo devuelven el aviso de lanzamiento).
   - El repo al que se le acredita es el del `cwd` del evento. Fuera de un repo: no cuenta.
2. **Commits**: en `turn.complete` **del turno principal** (sin `agentId`), después de `next(e)` y sin bloquear, si pasaron ≥ 30 s desde el último chequeo de ese repo; y una vez al arrancar, sin `await`.
   - **Marca de agua por fecha de autor**: `git log --author=<email> --fixed-strings --format=%at` y se cuentan solo los commits con `%at` > `marca`. Después la marca pasa a la mayor vista. Así un cambio de rama, `bisect`, `checkout v1.0` o un rebase **no recuentan** nada (rebase, amend y cherry-pick conservan la fecha de autor).
   - Email: `git config user.email` del repo. **Sin email configurado, no se cuentan commits** (un `--author` vacío coincidiría con todo).
   - Primera vez en un repo: huevo, con la marca igual a la fecha del commit más nuevo propio (la historia vieja no cuenta). Repo sin commits: huevo, sin error.
   - Cada commit nuevo: **+10 XP**; se guarda el asunto del más nuevo (60 caracteres) para el panel. Límite: como mucho 20 commits por chequeo (si hay más, es una importación o una reescritura; se avanza la marca sin dar XP).
3. **Tests y builds** (clasificación del comando):
   - Se reconoce solo **en posición de comando**: al inicio, o después de `&&`, `||`, `;`, `|`, `(` o un salto de línea, admitiendo `npx`/`pnpm exec`/`bunx` delante, y **fuera de comillas**. `git commit -m "fix vitest"`, `grep -rn jest src`, `ls .bin/tsc` no cuentan.
   - Test: `npm|pnpm|yarn|bun (run )?test`, `vitest`, `jest`, `playwright test`, `pytest`, `go test`, `cargo test`, `node --test`, `claude plugin test`, `dotnet test`.
   - Build: `npm|pnpm|yarn|bun run build`, `next build`, `vite build`, `tsc` (incluido `--noEmit`; `--watch` no), `cargo build`, `go build`, `dotnet build`.
   - **Veredicto**:
     - Comando simple (solo el test o build, sin separadores después): salida 0 → pasó; salida ≠ 0 → falló **solo si el texto trae una marca del runner** (abajo). Sin marca (script inexistente, `no test specified`, comando no instalado, falso error de PowerShell por `2>&1`) → no cuenta.
     - Con **cualquier separador** después (`|`, `;`, `&&`, `||`, salto de línea): el código de salida no sirve; se decide **solo por las marcas** del texto. Sin marcas, no cuenta.
     - Si el mismo comando tiene test y build, cuenta solo el que deje marca.
   - Marcas de fallo: `# fail [1-9]`, `[1-9]\d* (failed|failing)`, `\b[1-9]\d* fail\b`, `Tests?:? +[1-9]\d* failed`, `test result: FAILED`, `^FAIL\b`, `error TS\d+`, `Failed to compile`, `error during build`, `Build failed`.
   - Marcas de éxito: `# fail 0` con `# pass [1-9]`, `\b[1-9]\d* pass(ed|ing)?\b` sin marcas de fallo, `test result: ok`, `^ok\b` (go), `Compiled successfully`, `built in [\d.]+m?s` (vite), `✓ Built`.
   - Efectos: test en verde **+2 XP** (máximo 10 corridas con XP por día; después solo el contador). Test en rojo → **resfriada** hasta un verde. Build roto → **enferma** hasta un build OK (+5 XP al curarse). Enferma tiene prioridad sobre resfriada.

## Estado guardado (`$.store`, un objeto por repo)
`{ nombre, xp, commits, testsVerdes, xpTestsHoy: {dia, n}, salud, motivo, marcaAutor, ultimaActividad, nacio, eventos: [10] }`. Nunca comandos ni salidas: solo contadores y textos cortos. Cada cambio se aplica como incremento sobre el estado recién leído, en una cola por sesión. Entre dos sesiones simultáneas puede perderse un evento en una carrera exacta (aceptado; es un juego).

## Qué NO hace
- No bloquea, demora ni cambia herramientas (no usa `tool.call`).
- No usa red ni corre nada fuera de `git` en los momentos de arriba.
- No muere, no baja de nivel, no pide atención.

## Casuísticas (cada una con test)
1. Evento fuera de un repo → nada.
2. Primer evento en un repo → huevo, nombre por defecto estable (derivado del nombre del repo), marca = último commit propio.
3. Repo sin commits o sin `user.email` → huevo, sin errores, sin contar commits.
4. Un commit propio nuevo → +10 XP; si era huevo, nace (toast).
5. Varios propios → +10 cada uno, un solo toast si cambia de etapa; más de 20 → avanza la marca sin XP.
6. Pull con commits ajenos → 0 XP.
7. Cambio de rama ida y vuelta, `bisect`, `checkout v1.0`, rebase, amend → 0 XP extra.
8. Email con `+` o caracteres de regex → coincide igual (`--fixed-strings`).
9. Test simple en verde → +2 XP; el 11.º del día solo suma al contador.
10. Test simple en rojo **con marca** → resfriada + toast; otro rojo no repite el toast; un verde cura (toast).
11. Salida ≠ 0 **sin marca** (`no test specified`, `Missing script`, `pytest: command not found`, PowerShell `2>&1` con salida 0 marcada como error) → nada.
12. Build roto con marca → enferma + toast; build OK → cura + 5 XP; un test rojo no la baja a resfriada.
13. `tsc --noEmit` cuenta como build; `tsc --watch` no.
14. Con pipe o `;` o `&&` después (`npm test 2>&1 | tail -5`, `npm test; echo $?`) → solo por marcas; sin marcas, nada.
15. `npm run build && npm test` con el build roto → enferma (marca de build), no resfriada.
16. Patrón dentro de comillas o como argumento (`git commit -m "fix vitest"`, `grep -rn jest`, `ls .bin/tsc`) → nada.
17. Interrumpido (Esc o timeout), rechazado en el permiso, o `run_in_background` → nada.
18. Comando en otro repo (por `cwd` del evento, incluido un `cd` previo o un subagente) → se acredita a **ese** repo, no al mostrado.
19. Subagentes: sus comandos cuentan (por su `cwd`); su `turn.complete` no dispara chequeo de commits ni toasts.
20. Dos sesiones en el mismo repo → sin toasts duplicados (estado de avisos por sesión).
21. Más de 3 días sin actividad → dormida; el próximo evento la despierta sin toast.
22. `/mascota` abre/cierra; `/mascota nombre X` valida.
23. Error interno en un hook → no afecta nada visible; la línea queda como estaba.
24. Store vacío o de forma vieja → valores por defecto.
25. Caras con acentos combinados (`•̀`) → se verifican en la app; si se ven mal, se cambian.

## Qué mascota se ve (decidido por Ema 2026-10-05: la del último repo con actividad)
Las sesiones de Ema arrancan en `Desktop\claude`, que no es un repo; los proyectos son subcarpetas. Con "la del repo donde arranca la sesión", la mascota casi nunca aparecería.
- **Recomendada: la del último repo con actividad en la sesión** (un comando o commit ahí). Si la sesión todavía no tocó ningún repo, se muestra la del repo con actividad más reciente de cualquier sesión, con su nombre de repo (`(•ᴗ•) Bit@x-digest · nv 3`). Si nunca hubo ninguna, la línea queda vacía.
- Alternativa: fija por configuración (un repo "de casa"), o solo si la sesión arranca dentro de un repo.

## Plan (TDD)
- [x] T0a Revisión de la spec con contexto en blanco (opus, consigna con evidencia): veredicto "construir con cambios"; 12 hallazgos incorporados en esta v2.
- [x] T0b Decisión de Ema: la del último repo con actividad; construir con TDD.
- [x] T1 `pet.ts` puro: etapas, XP, salud, caras, línea, clasificación de comandos y salidas, marca de agua (casuísticas 5-16, 21, 24, 25).
- [x] T2 `register.tsx`: hooks PostToolUse, commits vía git, store, toasts por sesión, panel, comando (1-4, 17-20, 22, 23).
- [x] T3 Prueba en vivo en un repo real (x-digest).
- [x] T4a Revisión del código con contexto en blanco (opus) + jev-review (en sombra) + arreglos con TDD.
- [ ] T4b Repo `claude-vibecoding/mods/mascota` + instalación.

## Evidencia

**T1 y T2 (2026-10-05)**
- Tests escritos primero, en rojo por la causa esperada (falta `./pet`; después, la mascota no reacciona).
- `claude plugin test .`: **47 pass, 0 fail** (31 de lógica pura, 16 de hooks con git, store y repos simulados). `claude plugin validate .`: pasa. Hooks: `session.start`, `classic.PostToolUse`, `classic.PostToolUseFailure`, `turn.complete`, `command.run{mascota}`, `ui.render{Pane}`. Variables de entorno leídas: HOME, OS, USERPROFILE.
- Formas del motor aprendidas:
  - en las pruebas no existe `$.store`; se simula atendiendo los eventos `store.get`, `store.set`, `store.delete` y `store.keys`;
  - `claude plugin validate` exige declarar cada atom de `$.state` en `types/index.d.ts`;
  - `$.env.get` solo acepta nombres literales, porque el motor los analiza para reportar qué variables lee el mod;
  - el estado de sesión va en atoms, no en variables del módulo, para que no se filtre entre pruebas ni entre sesiones;
  - el store real está en `~/.claude/plugins/store/mascota_inline-<hash>.json`.

**T3, prueba en vivo (2026-10-05)**
- Nació un huevo, **Coma@x-digest**, con 1 test en verde. Ema lo ve en la línea de estado y `/mascota` abre el panel.
- Dos comandos con `| tail` y `; echo` después del test **no contaron**, que es lo que corresponde: ahí el código de salida no es el del test.
- **Defecto encontrado en vivo** (ni las pruebas ni la revisión lo vieron): en este entorno el shell vuelve a la carpeta de la sesión después de cada comando, así que el `cwd` del evento era `Desktop\claude`, que no es un repo, y no se contaba nada. Arreglado con `commandDir`: un `cd`, `Set-Location` o `pushd` al inicio del comando manda. Se expanden `~` y las rutas `/c/...` de Git Bash, y las relativas se resuelven contra el `cwd`. Tiene 4 tests nuevos.
- Recarga en caliente: la carpeta de mods ya estaba habilitada en la sesión (desde x-digest-tool), por eso no apareció la pregunta. Cada edición se carga al terminar el turno.

**T4a, revisión del código (2026-10-05)**
- jev-review: 0 hallazgos en 3 archivos. Veredicto `disagree`: se le pasaron dos problemas de severidad alta.
- Revisión con contexto en blanco (opus), veredicto "listo con arreglos menores". Todo lo aplicado tiene prueba primero en rojo:
  - [alta] Un comando que pasaba a segundo plano (timeout, Ctrl+B o un mensaje en el medio) llegaba como éxito con salida parcial y contaba como verde. Ahora se descartan `backgroundTaskId`, `backgroundedByUser` y `timedOutAfterMs`.
  - [alta] `npm test && git commit -m "fix 2 failing tests"` resfriaba por el texto de git. Ahora, si lo de después va solo con `&&`, una salida 0 cuenta como que pasó, sin mirar las marcas.
  - [media] `--author=a@b.com` busca una subcadena, así que aceptaba a `ana@b.com`. Ahora es `--author=<a@b.com>`. El mock de git ahora filtra por autor como git real, y la casuística 6 tiene prueba.
  - [media] `tsc --version`, `jest --listTests`, `playwright test --list`, `pytest --collect-only`, `cargo test --no-run`, `--help` y `tsc --init` contaban como test o build. Ahora no cuentan, salvo `pytest -v`, que es "verbose" y sí corre.
  - [baja] Nuevas marcas de fallo: "1 error in 0.3s" de pytest y "Errors  1 error" de vitest.
  - [baja] `turn.complete` ya no espera a git, corre en diferido. `touched` se vacía después de cada chequeo. El parpadeo corre solo con el panel abierto. Un hook `ui.close` hace que cerrar con Esc no obligue a escribir `/mascota` dos veces. `git log` corre en la carpeta principal del repo, no en el worktree.
  - Encontrado al usarlo: `timeout 150 claude plugin test .` y `time npm test` no se reconocían, porque el prefijo tapaba al test. Ahora `timeout N` y `time` se ignoran, como `npx`.
  - Prueba corregida: la casuística 3 usaba `ls`, que nunca llegaba a chequear commits, así que pasaba por otra razón.
- `claude plugin test .`: **55 pass, 0 fail**. `validate`: pasa.
- No se puede probar en el kit: el kit de pruebas no expone `ui.close`, así que el cierre con Esc se verifica en vivo.
- **Nota de diseño**: cada PC tiene su propio store, así que los commits propios hechos en pc004 y traídos con `pull` también alimentan a la mascota de casa. Es aceptable: cada PC tiene su mascota, y la de casa come todos tus commits de ese repo.
