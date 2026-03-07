# Claude Vibecoding — Sistema Multi-Agente

Sistema de 9 agentes para crear apps, webs y juegos indie sin saber programar.
Compatible con **Windows (Claude Desktop)** y **Linux (Claude Code)**.

---

## Instalación en 2 pasos

### Linux — Claude Code

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

Reiniciá Claude Code cuando termine.

### Windows — Claude Desktop

```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
```

Abrí Claude Desktop, abrí la carpeta del repo y decile:

> "Instalate el sistema de este repo"

Claude va a leer `CLAUDE.md` y seguir los pasos de `install/windows.md` automáticamente.

---

## Cómo usarlo

Una vez instalado y reiniciado Claude, simplemente decile:

> "Quiero crear [tu idea]"

El sistema se encarga del resto: planificación, código, preview local, y deploy en Vercel.

---

## Agentes incluidos

| Agente | Rol |
|---|---|
| `orquestador` | Principal: recibe pedidos, coordina fases y mantiene memoria |
| `task-planner` | Convierte ideas en tareas concretas con Definition of Done |
| `techlead` | Define arquitectura y stack antes de escribir código |
| `librarian` | Busca documentación técnica actualizada con Context7 |
| `builder` | Implementa el código y levanta preview local |
| `ops` | Verifica y levanta servicios locales |
| `qa` | Prueba que todo funcione antes de publicar |
| `git` | Maneja repositorios: crear, commitear, pushear |
| `deployer` | Publica en Vercel y devuelve la URL live |

## Flujo de trabajo

```
Tu idea
  → orquestador (coordina todo)
    → task-planner (lista de tareas)
    → techlead (arquitectura)
    → librarian (docs si hacen falta)
    → builder (código + preview local)
    → ops (verifica servidor)
    → qa (prueba que funcione)
    → git (commit + push)
    → deployer (URL live en Vercel)
```

---

## Servicios que se configuran

| Servicio | Para qué | Activación |
|---|---|---|
| **Engram** | Memoria entre sesiones | MCP automático |
| **Context7** | Docs técnicas actualizadas | MCP automático |
| **Vercel CLI** | Deploy a producción | `vercel login` |
| **GitHub CLI** | Crear repos, pushear | `gh auth login` |

---

## Estructura del repositorio

```
agents/
├── *.md              → definiciones de agentes (cross-platform)
└── skills/
    └── engram_policy.md
install/
├── linux.sh          → instalación automática para Linux
└── windows.md        → guía paso a paso para Windows
templates/
└── global-claude.md  → instrucciones globales del orquestador
CLAUDE.md             → auto-instalación (Claude lo lee automáticamente)
README.md             → esta guía
```

---

## Requisitos

**Linux:** Ubuntu/Debian recomendado, Claude Code instalado.
El script instala lo que falte: Node.js, Vercel CLI, gh CLI, Engram.

**Windows:** Git for Windows (Git Bash), Claude Desktop instalado.
Ver `install/windows.md` para los pasos detallados.
