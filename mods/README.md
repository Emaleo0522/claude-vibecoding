# mods/

Mods de Claude Code: plugins de *function hooks* que corren dentro de la sesión (línea de estado, franjas, paneles, comandos). Requieren Claude Code con mods (≥ 2.1.286 en la app de escritorio).

| Mod | Qué hace |
|---|---|
| [`engram-status`](engram-status/) | Estado del sync de Engram en la línea de estado; franja de color con "ver detalle" solo cuando algo falla; `/engram-status`. Spec y evidencia en [`SPEC.md`](engram-status/SPEC.md). |

## Instalar

1. Copiar la carpeta del mod a `~/.claude/mods/<mod>/` (sin `.claude-plugin/types/`, que lo genera el motor).
2. Agregar la ruta en el bloque `env` de `~/.claude/settings.json` (se acepta `~`; con varios mods, separar con `;` en Windows y `:` en Linux):
   ```json
   "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/engram-status" }
   ```
3. Reiniciar Claude Code / la app.

Opciones de cada mod (`userConfig` en su `plugin.json`): se cambian en `/config` o en `settings.json` → `pluginConfigs.<mod>.options`.

## Desarrollar y probar

```bash
claude plugin test mods/<mod>       # tests (*.test.ts) contra el motor real
claude plugin validate mods/<mod>   # qué hooks/llamadas usa y qué rechazaría el motor
```

Método: spec → revisión con contexto en blanco → decisión → TDD → prueba en vivo → revisión del código. Gotchas del motor aprendidas en `engram-status/SPEC.md` § Evidencia (T2/T3).
