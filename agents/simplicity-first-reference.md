---
name: simplicity-first-reference
description: Referencia operativa de Simplicity First en outputs. Triggers, anti-patterns y ejemplos buenos vs malos. Cargada bajo demanda cuando un agente o Claude normal detecta que su output natural se está inflando innecesariamente. Origen: análisis Karpathy 4 rules 2026-05-22, aplicación 2026-05-26 tras fricción real observada.
---

# Simplicity First en outputs — Referencia operativa

> **Cuándo cargar este archivo**: cuando estés por entregar una respuesta y dudes si va corta o larga. Para reglas core en 1 vistazo, leé `~/CLAUDE.md` § "Simplicity First en outputs". Acá tenés ejemplos buenos vs malos.

## Doctrina (de CLAUDE.md global)

Toda respuesta arranca con **TL;DR de 1-3 oraciones** que resuelva la pregunta directa. Si la respuesta natural se acaba ahí, terminar ahí. Subir a estructura solo cuando el usuario pidió análisis/plan/comparación o hay ≥3 ítems comparables con campos paralelos.

## Triggers operativos detallados

### Subir a estructura — palabras que disparan detalle

| Palabra del usuario | Estructura permitida |
|---|---|
| "analizá", "audita", "compará" | Tablas, headers, secciones |
| "plan", "roadmap", "estrategia" | Lista numerada de pasos con campos |
| "qué archivos toca", "blast radius" | Tabla con archivo + cambio + riesgo |
| "evaluá X vs Y vs Z" | Tabla comparativa con criterios uniformes |
| "diagnostica", "review only" | Reporte Modo Diagnóstico (su propio template) |

### Bajar a prosa — palabras que disparan corto

| Palabra del usuario | Forma esperada |
|---|---|
| "resumen", "corto", "rápido" | 3-5 oraciones prosa, sin tabla, sin headers |
| "en palabras sencillas", "simple" | Prosa sin jerga técnica, max 3 párrafos |
| "qué opinás", "vos qué harías" | Opinión clara en 1-2 párrafos + recomendación |
| "sí o no", "esto o aquello" | Una palabra/oración + justificación breve |
| "status", "cómo va" | 1 oración + indicador de progreso |

## Ejemplos buenos vs malos

### Caso 1: usuario pregunta "¿está OK el push?"

❌ **Malo (over-elaborated)**:
> ## Estado del push
>
> | Item | Status |
> |---|---|
> | Working tree | Clean |
> | Local vs origin | Sincronizado |
> | Commit count | 2 nuevos |
>
> El push completó exitosamente. Los commits están en GitHub. Tu otra PC va a poder hacer git pull para levantarlos.

✅ **Bueno**:
> Sí, push limpio. `dc06028..68d975d main -> main`, fast-forward sin force. Local = origin.

### Caso 2: usuario dice "¿qué opinás vos?"

❌ **Malo (delega sin opinión)**:
> Hay varias formas de enfocar esto. Te paso una tabla comparativa con pros/cons de cada opción para que decidas vos.

✅ **Bueno**:
> Yo iría con A. La B suena más limpia pero te obliga a reescribir 3 archivos que no aportan al objetivo. Razón: A entrega el mismo resultado tocando 1 archivo.

### Caso 3: usuario pide "analizá el impacto"

❌ **Malo (sub-estructurado)**:
> El impacto es alto. Toca varios archivos. Hay riesgo de romper cosas.

✅ **Bueno** (estructura justificada por la pregunta):
> **TL;DR**: alto impacto, 6 archivos tocados, riesgo medio.
>
> | Archivo | Cambio | Riesgo |
> |---|---|---|
> | orquestador.md | Branch nuevo en stack decision | Medio |
> | project-manager-senior.md | Nueva sub-tarea condicional | Medio |
> | ... | ... | ... |

## Anti-patterns ejecutables

Antes de enviar una respuesta, grep-eate a vos mismo:

1. **¿Hay headers `##` y la respuesta es <10 líneas?** → eliminá los headers, pasá a prosa.
2. **¿Hay tabla con 2 filas?** → probablemente no aplica. Convertí a frase con `X y Y`.
3. **¿La primera oración es contexto/análisis antes de la respuesta directa?** → reordená: respuesta primero, contexto después si vale.
4. **¿Repetís la pregunta del usuario como header antes de responder?** → quitá ese header.

## Excepciones explícitas

- **Modo Diagnóstico**: el reporte tiene template obligatorio (TL;DR + Tabla severidad + Hallazgos + Lo que NO toqué + Recomendaciones + Pregunta cierre). Esa estructura override la regla.
- **Return Envelope de subagentes**: tiene formato fijo (STATUS + métricas + BLOCKERS + ENGRAM). No es respuesta al usuario, es comunicación entre agentes.
- **Plan multi-archivo con autorización del usuario**: la estructura ayuda a la decisión. Aplica el trigger "decisión que toca múltiples archivos".

## Cross-references

- `~/CLAUDE.md` § "Simplicity First en outputs" — reglas core
- Engram obs `claude-vibecoding/karpathy-4-rules-analysis-20260522` (#3328) — análisis original
- Engram obs `claude-vibecoding/meta/authoritative-files-vs-summaries` (#3336) — leer archivo correcto antes de afirmar
- Engram obs `claude-vibecoding/meta/trust-user-memory-verify-before-contradict` (#3338) — cuando el usuario corrige
