# Mod 1: engram-status (Engram en la línea de estado)

Estado: **SPEC v2** (2026-10-02). La v1 pasó una revisión con contexto en blanco (consigna con evidencia: "listo con ajustes") y todos los ajustes están aplicados abajo. Pendiente: decisión de Ema para construir. Es el primer mod de la lista elegida (Engram #4023).

## Objetivo
Que un fallo del sync de Engram **no pase en silencio**. Hoy los fallos quedan en un log de 4,47 MB que nadie mira. El 01/10 hubo `failed=13`, el 02/10 un error de conexión al server, y el log tiene syncs que arrancaron y nunca terminaron (3121 "starting" contra 3046 "done").

## Qué se ve (diseño aprobado por Ema 2026-10-02)
Dos niveles: discreto cuando todo anda bien, llamativo solo cuando hay algo que mirar.

**Nivel 1, línea de estado** (`$.ui.status(text)`). Es texto plano, porque la API no permite estilos ahí, y está siempre presente:

| Estado | Texto |
|---|---|
| ✓ ok | `◉ engram · sync 12 min` |
| ⟳ sincronizando | `◉ engram · sincronizando…` |
| ⚠ aviso | `◉ engram ⚠ 3 proyectos no sincronizaron` |
| ✗ error | `◉ engram ✗ el server no responde` |
| ? desconocido | `◉ engram ? sin datos` |

**Nivel 2, franja arriba del prompt** (`ui.render` sobre `{ component: 'AbovePrompt' }`). Solo aparece en ⚠, ✗ o ?:
```
 ▌ENGRAM  3 proyectos no sincronizaron · hace 2 h      [ver detalle]  [ocultar]
 ▌ENGRAM  el server no responde · desde 18:39            [ver detalle]  [ocultar]
```
- **Chip** "▌ENGRAM" con `backgroundColor` del **tema**: `warning` para ⚠ y ?, `error` para ✗. La API acepta "a theme key or a raw color", así que se adapta solo a claro y oscuro. El resto del texto usa el color normal.
- Una línea, truncada a `e.props.bodyColumns`.
- Botón `ver detalle`: abre un **Pane** (panel lateral; al abrirlo el usuario con un clic, se ubica a cualquier ancho) con el mismo texto que `/engram-status` en Markdown y un botón para cerrarlo. Un toast no sirve: dura 4 s y es una sola línea.
- Botón `ocultar`: la esconde hasta que cambie el **nivel** (⚠/✗/?) o el **tipo de motivo** (fallos, server caído, sync sin terminar, sync que no corrió, sin datos). No cuentan los cambios de cantidad ni de hora, porque si no reaparecería en cada sync. Se guarda en `$.state`, que es por sesión: una sesión nueva la vuelve a mostrar, y es aceptable. Además, la banda se puede colapsar con ctrl+x ctrl+a.
- Desaparece sola al resolverse. Si hay encuesta (`e.props.hasSurvey`) devuelve `next(e)`.
- Sin animaciones. Existe en terminal y desktop; en otras superficies queda solo la línea.

**Aviso (toast):** una vez, solo cuando el estado empeora según la escala `✗ > ? > ⚠ > ⟳ > ✓`. El último estado avisado se guarda en `$.store`, así no se repite con hot reloads ni al reabrir la sesión.

**Comando `/engram-status`:** chequeo ahora y detalle en texto: último `done`, cuántos fallaron, último error resumido y ruta del log. Este comando sí corre `engram cloud upgrade doctor --project <proyecto>` para dar diagnóstico, porque lo pide el usuario y no corre de fondo.

## De dónde sale el estado (todo local, solo lectura)
La única fuente de fondo es el log `engram-cloud-sync.jsonl`, que escribe el hook `engram-cloud-sync-on-stop`. Ese hook corre en cada Stop (fin de turno) y tarda ~55 s. Ya incluye el doctor de todos los proyectos y cuenta los bloqueos como `failed`. Por eso el mod no corre comandos de engram de fondo.

**Cómo se lee:**
1. Cada 60 s: `$.fs.stat(log).mtimeMs`. Si no cambió desde la última lectura, no se hace nada más.
2. Si cambió, se leen las últimas **200** líneas con `$.process.run`:
   - Windows: `powershell -NoProfile -Command "Get-Content -LiteralPath '<ruta>' -Tail 200"` (una sola cadena, ruta entre comillas simples).
   - Linux: `tail -n 200 <ruta>`.
   - La plataforma se decide una vez con `$.env` (`OS`/`USERPROFILE`), sin probar y fallar.
3. `$.fs.read` no sirve, porque el log pasa los 4 MiB.

**Cómo se interpreta** (funciones puras en `parse.ts`):
- **Último resultado** = el `done synced=N failed=M` más reciente, buscando hacia atrás. Sus errores son los `level:error` entre el `starting` anterior y ese `done`.
- `failed=0` → ✓ "sync hace X".
- `failed>0` → ⚠ "M proyectos no sincronizaron". Si todos los errores son de conexión (`dial tcp`, `connectex`, timeout), es ✗ "el server no responde · desde HH:MM".
- **Sync en curso**: hay un `starting` más nuevo que el último `done` y tiene menos de 3 min → ⟳. Si tiene más de 3 min → ⚠ "un sync quedó sin terminar".
- **Sync que no corrió**: se terminó un turno (`turn.complete` de esta sesión) hace más de 5 min y no hay ningún `starting` ni `done` posterior → ⚠ "el sync no corrió al terminar el turno".
- **No hay alarma por antigüedad sola**: sin sesiones no hay nada que sincronizar, así que la regla de 24 h se eliminó.
- Log inexistente, vacío o sin ningún `done` reconocible → ? "sin datos".
- Las líneas "throttled" y cualquier otra que no sea `starting`, `done` o `level:error` se ignoran.
- El doctor de `/engram-status` puede consultar el server: con el server caído espera hasta su timeout (10 s) y el detalle lo informa así. Nunca corre de fondo.

## Cuándo chequea
- Al iniciar la sesión, sin demorar el arranque (`$.clock.after(2000, ...)`).
- Cada 60 s con `$.clock.every`. Sale barato porque solo es `fs.stat`; el tail corre únicamente si el log cambió.
- En `turn.complete` (main thread, sin `agentId`): anota la hora para la regla "el sync no corrió".
- Con `/engram-status` o el botón `ver detalle`.

## Opciones (`userConfig`)
- `project` (default `personal`, solo para el doctor de `/engram-status`).
- `engramPath` (default `engram`; en casa también funciona `C:\Users\Ema\bin\engram.exe`).
- `logPath` (default `<home>/.claude/sessions/engram-cloud-sync.jsonl`, con `home` = `HOME` o, si no existe, `USERPROFILE`).

## Casuísticas (cada una con test)
1. Último `done` con `failed=0` → ✓ con antigüedad.
2. `failed>0` con errores mixtos → ⚠ con la cantidad.
3. Todos los errores de conexión → ✗ "el server no responde · desde HH:MM".
4. `starting` más nuevo que el último `done` y de menos de 3 min → ⟳.
5. `starting` más nuevo que el último `done` y de más de 3 min → ⚠ "sync sin terminar".
6. Líneas intercaladas de sesiones concurrentes (start, start, done, done) → manda el `done` más reciente, sin falsos ⟳.
7. Turno terminado hace más de 5 min sin `starting`/`done` posterior → ⚠ "el sync no corrió".
8. Log inexistente, vacío o sin `done` → ?.
9. Línea con formato desconocido (cambio de versión) → se ignora; si no queda ningún `done` reconocible → ?.
10. 47 líneas de error antes del `done` → el tail de 200 las cubre y el `done` se encuentra.
11. `mtimeMs` sin cambios → no se corre el tail (verificar que `process.run` no se llamó).
12. `process.run` falla, timeout de 10 s o exit ≠ 0 → ? sin romper nada.
13. Toast solo al empeorar según la escala, con el último avisado en `$.store`; volver a ✓ no avisa; un reload no repite el aviso.
14. Franja: con ✓ o ⟳ no se dibuja; con ⚠, ✗ o ? sí, con `warning` o `error` según corresponda.
15. `ocultar` dura hasta que cambien el estado o el motivo.
16. `ver detalle` y `/engram-status` muestran el mismo texto.
17. Con `hasSurvey` la franja no se dibuja.
18. El mismo árbol valida en `terminal` y `desktop`.
19. Windows (PowerShell con `-LiteralPath`, `USERPROFILE`) y Linux (`tail`, `HOME`) elegidos por `$.env`, sin intentar `tail` en Windows.
20. Hot reload: los timers viejos caen solos y `session.start` vuelve a agendar.

## Límites del motor que respeta (verificados contra la API, d.ts del build 2.1.286)
- `process.run` no descuenta del budget del hook; solo lo hace `clock.sleep`. El callback del timer no es un hook. Se usa timeout de 10 s.
- `fs.read` tiene tope de 4 MiB y no lee por rango, de ahí el tail.
- En `claude plugin test`, `process.run` se simula con `on("process.run", ...)` y el mock trae clock, store y env.
- Nada en `session.end`.

## Riesgos conocidos
- **Motor 2.1.286 en la app de escritorio** (la terminal dice 2.1.288). El skill y los tipos existen en 2.1.286. Si el mod no carga, probar con `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` o actualizar la app. Se verifica en T4.
- Cómo se dibuja `$.ui.status` en desktop: se verifica en T4.
- Que `process.run` encuentre `engram`/`powershell` por PATH sin shell en Windows no está documentado. Se prueba en T4; si falla, se usa la ruta absoluta vía `engramPath`.
- Las claves de tema `warning`/`error` no están listadas en la doc (solo aparece `warning` en un ejemplo). En T4 se revisa a ojo en tema claro y oscuro; los tests no miden contraste.
- El log crece sin rotación (25 mil líneas). Va aparte, en el backlog.

## Cambios respecto de la v1 (por la revisión)
- Se lee el último `done`, no la última línea. Antes daba ⟳ falso con syncs intercalados o colgados.
- Se eliminó la alarma de 24 h (falsa alarma por diseño) y se reemplazó por "el sync no corrió después de un turno".
- Escala de severidad explícita, con el último avisado en `$.store`.
- Tail de 200 líneas y PowerShell con `-LiteralPath`.
- Se eliminó la cache compartida entre sesiones (sobreingeniería) y se reemplazó por `fs.stat` + `mtimeMs`.
- El doctor sale del chequeo de fondo y queda solo en `/engram-status`. El fondo ya no corre comandos de engram ni toca la red.
- Colores por clave de tema.

## Estructura
```
~/.claude/dev-mods/<sesión>/engram-status/   (desarrollo, con hot reload)
  .claude-plugin/plugin.json   (userConfig, types)
  types/index.d.ts             (contrato de $.state)
  hooks/hooks.json
  hooks/parse.ts               (funciones puras)
  hooks/register.tsx           (eventos, timers, status, franja, comando)
  hooks/*.test.ts(x)           (claude plugin test)
```
Una vez aprobado: decidir si va al repo claude-vibecoding o a un repo propio de mods, para instalarlo también en pc004.

## Plan de trabajo (TDD)
- [x] T1 `parse.ts` + tests (casos 1-10), en rojo y después verde.
- [x] T2 `register.tsx`: timers, mtime, status, toast con escala (casos 11-13, 19, 20). Falta ver en vivo.
- [x] T3 Franja AbovePrompt + `/engram-status` (casos 14-18). **32 pass, 0 fail**; `validate` pasa. Nota honesta: en T3 el código se escribió antes que los tests de UI (el patrón de mount/find no estaba claro); los tests se escribieron después y se verificaron contra el árbol dibujado. Aprendido: `Text` no conserva `key`, así que se busca con `find({ type: 'Text', text: /.../ })`, y cuando el mod deja pasar el render, la caída de `ui.render` necesita una respuesta del test.
- [x] T4 `claude plugin validate` + carga con hot reload en esta sesión + prueba real en desktop. Ema confirmó (2026-10-03):
  - La línea de estado aparece con el log real.
  - Con `logPath` apuntando a un log falso con 1 fallo, aparece la franja y "ver detalle" abre el panel.
  - `/engram-status` respondió el detalle completo y el doctor real (`status: ready`). Eso confirma que en Windows, sin shell, `process.run` encuentra `engram` y `powershell` por PATH.
  - Se volvió al log real (se sacó `pluginConfigs` de settings.json; backup en `~/.claude/backups/2026-10-02-pre-merge-e497859/settings.pre-mod-test.json`).
  - Ajuste menor: "1 fallaron" pasó a "1 falló". Tests 32/32.
- [x] T5 Revisión del código con contexto en blanco ("listo con ajustes", 2026-10-03) + decisión de Ema: va al repo `claude-vibecoding/mods/`. Ajustes aplicados con test primero (rojo reproducido y después verde), **36 pass**:
  1. ⟳ ya no reinicia "ocultar" ni repite el toast: es neutro. "Ocultar" solo se olvida en ✓. Tests 13b y 15b.
  2. Un turno con Esc (`aborted`) o con error de API no cuenta para "el sync no corrió", porque el hook Stop no corre en esos casos. Test 7f.
  3. El último nivel avisado pasó de `$.store` (compartido entre sesiones, que se pisaban y repetían el toast) a `$.state` por sesión, que sobrevive al hot reload. **Cambio de criterio:** una sesión nueva abierta con un problema activo avisa una vez. Test 13c.
  4. "ver detalle" abre el panel al instante con "Cargando…" y un doble clic no corre dos doctors.
  5. En Windows se usa primero `USERPROFILE` (HOME puede venir en formato POSIX), y `check` no deja rechazos sin manejar.
  - Queda señalado sin cambio: `/engram-status` deja en el transcript los nombres de proyectos con error y la salida del doctor (lo lee el modelo). Es aceptable: lo pide el usuario y no contiene secretos.

## Evidencia
(se completa por tarea con el formato `comando: resultado`)

**T1 (2026-10-02)**
- `claude plugin test .` antes de escribir parse.ts: 1 fail ("cannot import ./parse"). Rojo esperado.
- `claude plugin test .` con parse.ts: **16 pass, 0 fail** (casos 1-10, más 2b, 7b, 7c y 7d, escala y clave de ocultar).
- Prueba sobre el log real (`npx tsx scratchpad/real.mts`, cortando el log en momentos pasados):
  - hoy → `◉ engram · sync 6 min`, sin franja.
  - 2026-10-02 18:40:30Z (server caído) → `◉ engram ✗ el server no responde` y franja "desde 15:39" (hora local).
  - 2026-10-01 14:26Z → `sincronizando…`. Es correcto: después del `failed=13` de 14:25:00 arrancó otro sync a 14:25:44 que terminó con `failed=0` a 14:27:32.

**T2 (2026-10-03)**
- Tests escritos primero. Rojos por motivos esperados: `register` vacío, y después el formato del motor simulado.
- Restricción del motor aprendida: una función que recibe `$` tiene que estar declarada en el nivel superior del archivo (el motor rastrea el uso de `$` de forma estática). Por eso el estado del módulo vive en un objeto `mod` de nivel superior.
- Formato del kit de pruebas: las respuestas simuladas a llamadas `$` van como `{ value }` o `{ deny }`, y `turn.complete` lleva `answer`, `durationMs`, `isAborted` y `turnId`.
- `claude plugin test .`: **27 pass, 0 fail** (16 de T1 más 11 de T2: arranque a los 2 s, tail en Linux, PowerShell + `-LiteralPath` en Windows, sin relectura si el mtime no cambió, process.run fallido, log inexistente, toast solo al empeorar, sin toast repetido después de un reload, el sync no corrió, turno de subagente ignorado, opción `logPath`).
- `claude plugin validate .`: pasa sin advertencias (se agregó el autor). Hooks: `session.start` y `turn.complete`. Variables de entorno: lee `HOME`, `OS` y `USERPROFILE`; no escribe ninguna.
