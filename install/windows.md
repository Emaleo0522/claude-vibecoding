# Instalacion en Windows — Claude Desktop

Esta guia te lleva paso a paso desde cero hasta tener el sistema completo funcionando en Windows con Claude Desktop.

---

## Lo que vas a instalar

- **22 agentes de Claude + 1 referencia**: los especialistas del sistema (orquestador, PM, arquitectos, devs, QA, SEO, agentes creativos, etc.) + `better-auth-reference.md` (guia de autenticacion)
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

## Paso 6: Copiar los 22 agentes

En Git Bash, desde la carpeta donde clonaste este repo:
```bash
# Crear la carpeta de agentes
mkdir -p ~/.claude/agents/skills

# Copiar los 22 agentes
cp agents/*.md ~/.claude/agents/

# Copiar skills si hay
cp agents/skills/*.md ~/.claude/agents/skills/ 2>/dev/null

# Verificar
ls ~/.claude/agents/
```

Deberias ver **23 archivos .md**: los 22 agentes (`orquestador.md`, `project-manager-senior.md`, `mobile-developer.md`, `frontend-developer.md`, etc.) + `better-auth-reference.md`.

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
      "command": "C:\\Users\\{TU_USUARIO}\\bin\\engram.exe",
      "args": ["mcp", "--tools=agent"]
    },
    "context7": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
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
# Agentes instalados (deben ser 23: 22 agentes + better-auth-reference)
ls ~/.claude/agents/*.md | wc -l

# CLAUDE.md global
head -5 ~/CLAUDE.md

# Herramientas disponibles
git --version
node --version
gh --version
vercel --version
```

En Claude Desktop: abri una nueva conversacion y escribi `modo orquestador — hola` — si responde describiendo el pipeline de 5 fases, todo funciona.

---

## Listo! Primer uso

El sistema tiene dos modos. Elegis explicitamente cuál usar:

**Modo normal** (preguntas, fixes, chat técnico) — simplemente habla con Claude.

**Modo orquestador** (proyecto completo con pipeline de 5 fases):

```
modo orquestador — quiero crear [tu idea, ej: una app de lista de tareas]
```

Otras frases que también activan el pipeline:
```
activa el pipeline — [tu idea]
nuevo proyecto completo: [tu idea]
```

El sistema se encarga del resto:
1. Planifica las tareas (project-manager-senior)
2. Crea la arquitectura (ux-architect + ui-designer + security-engineer)
3. Implementa con QA visual (dev-agents + evidence-collector)
4. Certifica (seo-discovery + api-tester + performance-benchmarker + reality-checker)
5. Publica (git + deployer) — con tu confirmacion

---

## Problemas frecuentes

**Claude no reconoce los agentes**
-> Reinicia Claude Desktop. Los agentes se cargan al iniciar.

**No aparecen los 22 agentes**
-> Verifica con `ls ~/.claude/agents/*.md | wc -l`. Debe dar **23** (22 agentes + better-auth-reference.md).

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
|   |-- ... (21 agentes)
|   |-- better-auth-reference.md
%APPDATA%\Claude\
|-- claude_desktop_config.json                   <- MCPs (Engram, Context7, Playwright)
~/bin/
|-- engram.exe                                   <- binario de Engram MCP
```

---

## Paso Opcional: Sistema Visual de Agentes (Pixel Art)

Una oficina en pixel art donde los 22 agentes se mueven en tiempo real. Cuando uno recibe una tarea, camina a su escritorio y se pone a trabajar. Cuando termina, camina a reportarle al orquestador con una burbuja de chat, y vuelve a deambular.

> **100% opcional.** El sistema de vibecoding funciona perfectamente sin esto.

**Lo que necesita el sistema visual:**
- Node.js (ya instalado en Paso 2)
- Assets de sprites/tiles/furniture del repo [pixel-agents](https://github.com/pablodelucca/pixel-agents)
- Un servidor local en `http://localhost:3456` (se instala automáticamente)

**Cómo instalar:** En Claude Desktop, en una nueva conversación, pegá este mensaje:

```
Instala el sistema visual de pixel art para Claude Desktop.
Creá un servidor standalone Node.js+Express en ~/.claude/pixel-bridge/standalone/
que lea ~/.claude/projects/*.jsonl en tiempo real y sirva la UI en http://localhost:3456.
Los 22 agentes del sistema de vibecoding deben estar siempre presentes
en la oficina aunque estén inactivos.
Bajá los assets (sprites, tiles, furniture, fonts) de la carpeta assets/
de https://github.com/pablodelucca/pixel-agents
```

Claude va a:
1. Crear el servidor Node.js+TypeScript con WebSocket
2. Crear la UI React+Canvas con los personajes pixel art
3. Descargar los assets (sprites, tiles, fuentes) del repo original
4. Compilar todo y dejarlo listo

Una vez instalado, para ver la oficina: abrí `http://localhost:3456` en el navegador.
Para que arranque automáticamente, Claude puede configurar un entry en `~/.claude/launch.json`.

**Troubleshooting:**

**El servidor no arranca**
→ Verificá que Node.js esté instalado: `node --version`
→ Desde Git Bash: `cd ~/.claude/pixel-bridge/standalone && node dist/server/index.js`

**No se ven los sprites / pantalla en negro**
→ Los assets no se descargaron correctamente. Decile a Claude: `"Volvé a descargar los assets de pixel-bridge desde https://github.com/pablodelucca/pixel-agents"`

**¿Qué es el proyecto original?**
→ [pixel-agents](https://github.com/pablodelucca/pixel-agents) de [@pablodelucca](https://github.com/pablodelucca), diseñado como extensión de VS Code. Esta versión es una adaptación standalone que funciona en el navegador sin VS Code.
