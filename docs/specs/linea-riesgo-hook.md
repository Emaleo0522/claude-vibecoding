# Hook de la línea de riesgo (solo registro)

Objetivo: medir si cada turno con cambios cierra con su línea `Riesgo:` del Método con red, y si los ítems de riesgo llevan verificador, sin bloquear nada.
Estado: aprobado 2026-11-03

## Specs

- S1. Pedido de Ema (2026-11-03): "Sí, paso 4" sobre la propuesta revisada: hook de la línea de riesgo en modo solo-registro 3 días; después se decide si bloquea.
- S2. Dado un trabajo (uno o más turnos hasta que no queden subagentes en segundo plano) donde se editó un archivo de código (Edit/Write/MultiEdit/NotebookEdit, también dentro de un subagente), cuando termina el trabajo (Stop sin agentes pendientes), entonces se registra una línea en `~/.claude/logs/riesgo-line.jsonl` con: si el último mensaje trae `Riesgo: ninguno` o `Riesgo: ítem N`, qué ítems, y si se lanzó algún agente revisor después del cambio.
- S3. Dado un trabajo con una operación por Bash/PowerShell (ssh, scp, rsync, git push, deploy de vercel, migraciones, docker compose up, systemctl, npm publish), cuando termina, entonces se registra igual que S2 marcando `ops`.
- S4. Dado un trabajo sin cambios de código ni operaciones, cuando termina, entonces no se registra nada.
- S5. Dado un archivo en una carpeta temporal o scratchpad, o en la memoria de Claude, o con extensión de texto (.md, .txt), cuando se edita, entonces no cuenta como código.
- S6. Dado cualquier error interno (JSON roto, disco, campo faltante), cuando corre el hook, entonces sale con código 0, sin stdout ni stderr, y la sesión sigue igual (fail-open).
- S7. Dado un Stop con subagentes, workflows o teammates todavía en segundo plano (`background_tasks`), entonces el trabajo no se cierra: los cambios se acumulan hasta el Stop sin trabajo pendiente. Un shell en segundo plano (dev server) no frena el cierre. Los avisos de subagentes llegan como UserPromptSubmit y no limpian nada. Eventos de más de 12 h se descartan (turnos interrumpidos, donde Stop no corre).
- S8. `node risk-line.js --report` resume: trabajos con cambios, % con línea de riesgo, distribución de ítems, % de ítems con revisor.
- S9. Dadas varias herramientas en paralelo, cuando disparan PostToolUse a la vez, entonces no se pierde ningún evento ni se corrompe el estado (archivo de eventos con append, una línea por evento; una línea rota se saltea).
- S10. La línea de riesgo es la última "Riesgo:" que empieza una línea u oración (markdown y viñetas aparte); acepta "ítem/ítems", varios números ("2 y 5", "2, 5"), y no cuenta números entre paréntesis.
- Supuesto: "revisor lanzado" = un `Agent` lanzado después del primer cambio cuyo prompt trae la consigna de evidencia del método ("no encontré problemas", "contexto limpio", "consigna de evidencia" o "veredicto"). Un agente de implementación que "verifica con tests" no cuenta.

## Tareas

- T1 (S2-S7, S9, S10): funciones puras + tests con fixtures por stdin y procesos reales en paralelo. Estado: hecho, 62 tests, 24/24 mutantes muertos.
- T2 (S8): `--report`. Estado: hecho.
- T3: cablear en `settings.json` (PostToolUse, PreToolUse Agent y Stop, `timeout: 5`, sin async) y probar en vivo. Estado: en curso.

## Log

- L1. Pedido original: "Sí, paso 4" (2026-11-03), sobre propuesta-final.md (hook H1 ajustado tras la revisión de contexto limpio; H2 spec-gate descartado).
- L2. Restricción verificada en docs (code.claude.com/docs/en/hooks, 2026-11-03): Stop trae `last_assistant_message`; tools dentro de subagente traen `agent_id`; exit 0 sin stdout no se muestra. Engram #3893: stderr con exit 0 nunca llega al modelo, por eso el modo bloqueo futuro usará JSON (`decision: "block"`).
- L3. Límites conocidos: ediciones hechas por Bash (sed -i, redirecciones) no se detectan como código; deploys y migraciones por MCP (Vercel, Supabase `apply_migration`) no pasan por el matcher; un comando después de un heredoc sin comillas en el mismo Bash no se analiza (se corta en el primer `<<`).
- L4. Verificador de contexto limpio (opus, consigna de evidencia), veredicto "listo con ajustes", 8 ajustes, todos aplicados: (1) subagentes en segundo plano borraban o partían el trabajo: ahora no se limpia en UserPromptSubmit y Stop no cierra con `background_tasks` de agentes (doc: Stop input); (2) carrera reproducida con 16 procesos (marcas perdidas, JSON ilegible): estado como eventos con append; (3) parser: última línea, plural, listas; (4) revisor solo con la consigna de evidencia, test negativo; (5) ops: comillas, heredoc, `git -C "..."`, `npm run migrate/deploy`, `gh pr merge`; (6) `.ipynb`; (7) tests de stderr vacío, stdin vacío, estado escrito; (8) `timeout: 5` al cablear. Se sacó el `cd` muerto.
- L6. Re-verificación del mismo agente: "listo para cablear"; 16/16 eventos en 10 corridas de carrera. Menores aplicados: encabezados y tablas, números sueltos fuera de la cadena de ítems (65 tests, mutantes muertos).
- L5. Duda abierta para la prueba en vivo: si `last_assistant_message` incluye solo el texto final después de la última herramienta. La línea de riesgo va en el mensaje final.
