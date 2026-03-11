# Instalacion en Windows — Claude Desktop

Esta guia te lleva paso a paso desde cero hasta tener el sistema completo funcionando en Windows con Claude Desktop.

---

## Lo que vas a instalar

- **20 agentes de Claude + 1 referencia**: los especialistas del sistema (orquestador, PM, arquitectos, devs, QA, agentes creativos, etc.) + `better-auth-reference.md` (guia de autenticacion)
- **CLAUDE.md global**: le dice a Claude como coordinar el pipeline de 5 fases
- **MCPs**: Engram (memoria), Context7 (docs), Playwright (QA visual)
- **Node.js + npm**: para levantar previews locales
- **Git + GitHub CLI**: para guardar y publicar codigo
- **Vercel CLI**: para publicar en internet

Tiempo estimado: 20-30 minutos.

---

## Paso 1: Instalar Git para Windows (incluye Git Bash)

1. Ir a [git-scm.com/download/win](https://git-scm.com/download/win)
2. Descargar el instalador (64-bit)
3. Instalarlo con las opciones por defecto
4. Verificar: abri **Git Bash** y escribi `git --version`

> **Git Bash** es la terminal que vas a usar. Buscala en el menu Inicio como "Git Bash".

---

## Paso 2: Instalar Node.js

1. Ir a [nodejs.org](https://nodejs.org)
2. Descargar la version **LTS** (la recomendada)
3. Instalarlo con opciones por defecto
4. Verificar en Git Bash: `node --version` y `npm --version`

---

## Paso 3: Instalar GitHub CLI

1. Ir a [cli.github.com](https://cli.github.com)
2. Descargar el instalador para Windows
3. Instalarlo
4. En Git Bash, autenticarte:
   ```bash
   gh auth login
   ```
   - Elegir: **GitHub.com** -> **HTTPS** -> **Login with a web browser**

---

## Paso 4: Instalar Vercel CLI

En Git Bash:
```bash
npm install -g vercel
vercel login
```

---

## Paso 5: Configurar git

En Git Bash:
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
git config --global init.defaultBranch main
```

---

## Paso 6: Copiar los 16 agentes

En Git Bash, desde la carpeta donde clonaste este repo:
```bash
# Crear la carpeta de agentes
mkdir -p ~/.claude/agents/skills

# Copiar los 16 agentes
cp agents/*.md ~/.claude/agents/

# Copiar skills si hay
cp agents/skills/*.md ~/.claude/agents/skills/ 2>/dev/null

# Verificar
ls ~/.claude/agents/
```

Deberias ver 21 archivos .md: los 20 agentes (`orquestador.md`, `project-manager-senior.md`, `frontend-developer.md`, etc.) + `better-auth-reference.md`.

---

## Paso 7: Instalar CLAUDE.md global (versión Windows)

```bash
cp templates/windows-claude.md ~/CLAUDE.md
```

> Esta version incluye las reglas especificas de Windows: Better Auth criticas y configuracion de preview servers.

---

## Paso 8: Configurar MCPs para Claude Desktop

En Windows, los MCPs se configuran en un archivo especifico de Claude Desktop — **diferente** al de Linux.

### Paso 8a: Instalar Engram

Engram requiere descargar el ejecutable:

1. Ir a [github.com/Gentleman-Programming/engram/releases](https://github.com/Gentleman-Programming/engram/releases)
2. Descargar `engram-windows-amd64.exe` (o el que corresponda a tu arquitectura)
3. Crear la carpeta y mover el ejecutable:
   ```bash
   mkdir -p ~/bin
   mv ~/Downloads/engram-windows-amd64.exe ~/bin/engram.exe
   ```

### Paso 8b: Configurar claude_desktop_config.json

Abri el archivo de configuracion de Claude Desktop:
```
%APPDATA%\Claude\claude_desktop_config.json
```

En Git Bash:
```bash
# Crear o editar el archivo
code "$APPDATA/Claude/claude_desktop_config.json"
# Si no tenes VS Code: notepad "$APPDATA/Claude/claude_desktop_config.json"
```

Pega este contenido (reemplaza `{TU_USUARIO}` con tu nombre de usuario de Windows):

```json
{
  "mcpServers": {
    "engram": {
      "command": "C:\Users\{TU_USUARIO}\bin\engram.exe",
      "args": ["mcp", "--tools=agent"]
    },
    "context7": {
      "command": "C:\Program Files\nodejs\npx.cmd",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "C:\Program Files\nodejs\npx.cmd",
      "args": ["playwright-mcp"]
    }
  }
}
```

> Template disponible en `templates/windows-mcp-config.json`

> **Nota sobre rutas**: Si Node.js esta en una ubicacion diferente, buscala con `where npx` en CMD.

### Paso 8c: Reiniciar Claude Desktop

Cerrar y volver a abrir Claude Desktop para que cargue los MCPs.

### MCPs opcionales (via Claude Desktop Extensions)

Dentro de Claude Desktop puedes instalar MCPs adicionales desde **Settings → Extensions**:
- **Vercel MCP** — gestionar deployments
- **Netlify MCP** — alternativa de deploy
- **Gmail / Google Calendar** — integraciones de productividad

---

## Paso 9: Configurar preview servers (launch.json)

Para que `preview_start` funcione correctamente en Windows:

```bash
mkdir -p ~/.claude
cp templates/windows-launch.json ~/.claude/launch.json
```

Edita `~/.claude/launch.json` y cambia `"mi-proyecto"` por el nombre de tu proyecto cuando lo necesites.

---

## Paso 10: Verificar la instalacion

En Git Bash:
```bash
# Agentes instalados (deben ser 17)
ls ~/.claude/agents/*.md | wc -l

# CLAUDE.md global
head -5 ~/CLAUDE.md

# Herramientas disponibles
git --version
node --version
gh --version
vercel --version
```

En Claude Desktop: abri una nueva conversacion y escribi `@orquestador hola` — si responde, todo funciona.

---

## Listo! Primer uso

Abri Claude Desktop y escribi:

```
Quiero crear [tu idea, ej: una app de lista de tareas]
```

O invoca al orquestador:

```
@orquestador quiero crear [tu idea]
```

El sistema se encarga del resto:
1. Planifica las tareas (project-manager-senior)
2. Crea la arquitectura (ux-architect + ui-designer + security-engineer)
3. Implementa con QA visual (dev-agents + evidence-collector)
4. Certifica (api-tester + performance-benchmarker + reality-checker)
5. Publica (git + deployer) — con tu confirmacion

---

## Problemas frecuentes

**Claude no reconoce los agentes**
-> Reinicia Claude Desktop. Los agentes se cargan al iniciar.

**No aparecen los 20 agentes**
-> Verifica con `ls ~/.claude/agents/*.md | wc -l`. Debe ser 21.

**MCPs no aparecen en Claude Desktop**
-> Verifica que `claude_desktop_config.json` tenga JSON valido y reinicia. Verificar rutas absolutas.

**`gh auth login` falla**
-> Proba con: `gh auth login --web`

**`vercel login` no abre el navegador**
-> Proba: `vercel login --github`

**`preview_start` falla con ENOENT**
-> Verificar que `launch.json` usa `"runtimeExecutable": "cmd"` con `"runtimeArgs": ["/c", "cd proyecto && npm run dev"]`

---

## Estructura instalada

```
~/CLAUDE.md                                      <- instrucciones globales del sistema (Windows)
~/.claude/
|-- launch.json                                  <- configuracion de preview servers
|-- agents/
|   |-- orquestador.md
|   |-- project-manager-senior.md
|   |-- ... (16 agentes)
|   |-- better-auth-reference.md
%APPDATA%\Claude\
|-- claude_desktop_config.json                   <- MCPs (Engram, Context7, Playwright)
~/bin/
|-- engram.exe                                   <- binario de Engram MCP
```
