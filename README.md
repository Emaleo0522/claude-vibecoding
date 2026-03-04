# Claude Code — Agentes y configuración

Sistema de agentes para Claude Code, portado desde OpenCode.

## Estructura

```
agents/          → Definiciones de subagentes (~/.claude/agents/)
skills/          → Políticas y protocolos
  engram_policy  → Protocolo de memoria persistente
```

## Agentes

| Agente | Rol |
|--------|-----|
| `orquestador` | Principal: recibe pedidos, divide en fases, delega |
| `techlead` | Arquitectura y decisiones técnicas |
| `builder` | Implementación de código |
| `qa` | Testing y checklists |
| `task-planner` | Convierte ideas en tareas con DoD |
| `diagrammer` | Diagramas de arquitectura/UI/ERD |
| `librarian` | Documentación técnica (usa Context7) |
| `git-manager` | Git/GitHub: commits, repos, push |
| `ops` | Servicios locales (Engram, etc.) |

## Instalación

Copiar la carpeta `agents/` a `~/.claude/agents/`.

Para Engram:
```bash
engram setup claude-code
```

## Políticas

- **Context7**: solo `librarian` lo usa. Todos los demás tienen bloqueado.
- **Engram**: solo `orquestador` guarda memoria. Los demás incluyen sección `PARA MEMORIA` en su respuesta.
