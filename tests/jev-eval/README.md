# jev-eval — evaluación de Jev como pre-gate del pipeline

Reproduce el eval del 2026-09-21 (93% routing de agente sobre 117 tareas reales, $0.005).

```bash
cd tests/jev-eval
node extract-tasks.js        # tareas etiquetadas por el PM: Engram SQLite local (~/.engram/engram.db) + ~/*/.pipeline/tareas.{md,yaml} → dataset.json
TYPESAFE_API_KEY=... node run-eval.js [--limit=N]   # → results.json + resumen (accuracy agente/tipo, calibración, seguridad vs regex)
```

`extract-tasks.js` usa el binario `sqlite3` del Android SDK (`~/development/android-sdk/platform-tools/sqlite3`); en otra PC ajustar `SQ` a un `sqlite3` disponible. `dataset.json` y `results.json` contienen descripciones de tareas de proyectos privados: no se versionan.
