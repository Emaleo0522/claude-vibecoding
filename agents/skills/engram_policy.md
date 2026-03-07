POLITICA OFICIAL DE ENGRAM

Solo el ORQUESTADOR puede guardar memoria.

## QUE SE GUARDA

1) PROJECT_CARD — al iniciar un proyecto nuevo
   (nombre, objetivo, stack elegido, directorio)

2) DECISION — cuando se toma una decisión de arquitectura o stack
   (qué se eligió y por qué)

3) STATE — al cerrar una fase
   (qué quedó listo, qué falta, archivos clave)

4) PROBLEM_SOLVED — cuando se resuelve un bug importante
   (qué falló, cómo se solucionó, dónde)

5) SESSION_SUMMARY — obligatorio al cerrar sesión
   (objetivo / decisiones / estado / próximo paso)

## QUE NO SE GUARDA

- Código fuente
- Conversaciones largas
- Micro cambios (renombrar variable, cambio de color, etc)
- Cosas que ya están en el código y se pueden leer
- Ruido o duplicados

## GIT — COMMITS OBLIGATORIOS

El orquestador llama al agente GIT (no a BUILDER) cuando:
- Se completa una feature o fase completa y QA aprobó
- Se resuelve un bug importante
- Se hace un deploy exitoso
- El usuario lo pide explícitamente

El agente GIT maneja todo: commit, push, crear repo, eliminar repo.
Formato de commit: feat/fix/deploy/chore + descripción corta en español.
Nunca commitear: .env, credenciales, node_modules, binarios grandes.

## FALLBACK: SI ENGRAM MCP NO ESTÁ DISPONIBLE

Si el MCP de Engram no responde o devuelve error, guardar la memoria como archivo `.md`:

```
~/.claude/projects/memory/<nombre-proyecto>.md
```

Formato del archivo:
```markdown
# <nombre-proyecto> — Memoria

## Objetivo
[qué se está construyendo]

## Stack
[tecnologías elegidas]

## Decisiones
- [decisión]: [por qué]

## Estado actual
[qué está listo, qué falta]

## Archivos clave
- <ruta>: <qué hace>

## Próximo paso
[qué hacer cuando se retome]

## Última actualización
[fecha]
```

El tilde (`~`) funciona en Linux y en Windows Git Bash.
Al retomar una sesión, leer este archivo antes de llamar al Engram MCP.

## OBJETIVO

Permitir retomar cualquier proyecto en menos de 2 minutos
sin leer código ni conversaciones anteriores.