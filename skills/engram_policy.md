---
name: engram-memory
description: "Protocolo de memoria persistente. Solo el ORQUESTADOR guarda en engram. Otros agentes incluyen seccion PARA MEMORIA en su respuesta para que el orquestador decida que guardar."
---

# Engram — Protocolo de Memoria

Tenes acceso a Engram, un sistema de memoria persistente que sobrevive entre sesiones.

## REGLA PRINCIPAL

**Solo el ORQUESTADOR guarda en engram.**
Los demas agentes NO llaman tools de engram. Incluyen una seccion "PARA MEMORIA" al final de su respuesta con lo que sea relevante, y el orquestador decide si guardarlo.

## CUANDO GUARDAR (solo orquestador)

Guardar unicamente estos tipos:

| Tipo | Cuando |
|------|--------|
| PROJECT_CARD | Al iniciar un proyecto nuevo |
| DECISION | Eleccion de stack, arquitectura, libreria |
| STATE | Al terminar una fase importante |
| PROBLEM_SOLVED | Bug resuelto (incluir causa raiz) |
| SESSION_SUMMARY | Obligatorio al cerrar sesion |

**NO guardar:** codigo, conversaciones largas, micro cambios, ruido.

**Objetivo: retomar el proyecto en menos de 2 minutos.**

## BUSCAR EN MEMORIA

Cuando el usuario diga "recordar", "que hicimos", "retomar", "acordate", "qué hicimos":
1. `mem_context` — contexto de sesiones recientes (rapido)
2. Si no alcanza, `mem_search` con palabras clave

Buscar tambien proactivamente al iniciar trabajo en algo que pudo haberse hecho antes.

## GUARDAR EN ENGRAM

Formato para `mem_save`:
- **title**: verbo + que — corto y buscable ("Elegido Next.js para frontend", "Corregido bug en auth")
- **type**: PROJECT_CARD | DECISION | STATE | PROBLEM_SOLVED | SESSION_SUMMARY
- **scope**: project (default) | personal
- **topic_key**: clave estable si el tema puede evolucionar ("arquitectura/auth", "proyecto/nombre")
- **content**: Que / Por que / Donde / Aprendido

Si el topic ya existe, usar el mismo topic_key para actualizar (upsert) en vez de crear nuevo.

## CIERRE DE SESION (obligatorio)

Antes de terminar, el orquestador llama `mem_session_summary`:

## Objetivo
[En que trabajamos]

## Decisiones
[Decisiones tecnicas tomadas]

## Estado
[Que esta hecho, que falta]

## Archivos clave
- path/archivo — que hace o cambio

## Proximo paso
[Una sola accion concreta para retomar]

## DESPUES DE COMPACTACION

Si hubo compactacion de contexto:
1. Llamar `mem_session_summary` con el contenido resumido
2. Luego `mem_context` para recuperar contexto previo
3. Recien entonces continuar
