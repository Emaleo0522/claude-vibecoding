# Instalación en Windows — Claude Desktop

Esta guía te lleva paso a paso desde cero hasta tener el sistema completo funcionando en Windows con Claude Desktop.

---

## Lo que vas a instalar

- **Agentes de Claude**: los "ayudantes" especializados (builder, qa, git, etc.)
- **CLAUDE.md global**: le dice a Claude cómo comportarse en todos los proyectos
- **Node.js + npm**: para levantar previews locales de tus proyectos
- **Git + GitHub CLI**: para guardar y publicar tu código
- **Vercel CLI**: para publicar en internet

Tiempo estimado: 20–30 minutos.

---

## Paso 1: Instalar Git para Windows (incluye Git Bash)

1. Ir a [git-scm.com/download/win](https://git-scm.com/download/win)
2. Descargar el instalador (64-bit)
3. Instalarlo con las opciones por defecto
4. Verificar: abrí **Git Bash** y escribí `git --version` → debe mostrar la versión

> **Git Bash** es la terminal que vas a usar. Buscala en el menú Inicio como "Git Bash".

---

## Paso 2: Instalar Node.js

1. Ir a [nodejs.org](https://nodejs.org)
2. Descargar la versión **LTS** (la recomendada)
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
   - Elegir: **GitHub.com** → **HTTPS** → **Login with a web browser**
   - Se abrirá el navegador, seguir los pasos

---

## Paso 4: Instalar Vercel CLI

En Git Bash:
```bash
npm install -g vercel
vercel login
```
Seguir los pasos en el navegador para autenticarte.

---

## Paso 5: Configurar git con tu información

En Git Bash:
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
git config --global init.defaultBranch main
```

---

## Paso 6: Copiar los agentes

En Git Bash, desde la carpeta donde clonaste este repo:
```bash
# Crear la carpeta de agentes
mkdir -p ~/.claude/agents/skills

# Copiar los agentes
cp agents/*.md ~/.claude/agents/
cp agents/skills/*.md ~/.claude/agents/skills/

# Verificar
ls ~/.claude/agents/
```

Deberías ver los archivos: `orquestador.md`, `builder.md`, `qa.md`, etc.

---

## Paso 7: Instalar CLAUDE.md global

Este archivo le dice a Claude que sea el orquestador en todos tus proyectos.

```bash
# Reemplazá "TuNombre" con cómo querés que Claude te llame
cp templates/global-claude.md ~/.claude/CLAUDE.md
```

Luego abrí `~/.claude/CLAUDE.md` con el Bloc de notas y reemplazá `{{NOMBRE_USUARIO}}` con tu nombre.

---

## Paso 8: Configurar Engram (memoria persistente)

Engram le da a Claude memoria entre sesiones.

1. Abrí Claude Desktop
2. Ir a **Settings → Extensions**
3. Buscar **Engram** e instalarlo
4. Reiniciar Claude Desktop

> Si no encontrás Engram, podés saltear este paso. El sistema funciona igual, pero Claude no recordará proyectos anteriores entre sesiones.

---

## Paso 9: Configurar Context7 (documentación de librerías)

Context7 le da a Claude acceso a docs actualizadas de librerías.

Agregarlo como MCP en Claude Desktop:
1. Ir a **Settings → Developer → Edit Config**
2. Agregar en `mcpServers`:
   ```json
   "context7": {
     "command": "npx",
     "args": ["-y", "@upstash/context7-mcp"]
   }
   ```
3. Guardar y reiniciar Claude Desktop

---

## Paso 10: Configurar Playwright MCP (testing en browser real)

Playwright le permite a Claude abrir el navegador y probar tus apps directamente,
incluyendo webs, apps y juegos Phaser.

Agregarlo como MCP en Claude Desktop:
1. Ir a **Settings → Developer → Edit Config**
2. Agregar en `mcpServers` (junto a Context7):
   ```json
   "playwright": {
     "command": "npx",
     "args": ["-y", "@playwright/mcp@latest"]
   }
   ```
3. El bloque `mcpServers` completo debería quedar así:
   ```json
   "mcpServers": {
     "context7": {
       "command": "npx",
       "args": ["-y", "@upstash/context7-mcp"]
     },
     "playwright": {
       "command": "npx",
       "args": ["-y", "@playwright/mcp@latest"]
     }
   }
   ```
4. Guardar y reiniciar Claude Desktop

> **Nota**: Playwright descarga Chromium la primera vez que Claude lo usa (~150MB).
> Esto ocurre automáticamente, no requiere acción de tu parte.

---

## Paso 11: Verificar la instalación

En Git Bash:
```bash
# Agentes instalados
ls ~/.claude/agents/

# CLAUDE.md global
cat ~/.claude/CLAUDE.md | head -5

# Herramientas disponibles
git --version
node --version
gh --version
vercel --version
```

---

## ¡Listo! Primer uso

Abrí Claude Desktop y escribí:

```
Quiero crear [tu idea, ej: una app de lista de tareas]
```

Claude va a:
1. Entender tu idea
2. Dividirla en pasos
3. Construir el código
4. Mostrarte el resultado en http://localhost:3000
5. Publicarlo en internet con una URL

---

## Problemas frecuentes

**Claude no reconoce los agentes**
→ Reiniciá Claude Desktop. Los agentes se cargan al iniciar.

**`npx serve` abre en puerto diferente a 3000**
→ Es un bug conocido. El sistema lo detecta automáticamente.

**`gh auth login` falla**
→ Probá con: `gh auth login --web`

**`vercel login` no abre el navegador**
→ Probá: `vercel login --github`

---

## Estructura instalada

```
~/.claude/
├── CLAUDE.md              ← prompt del orquestador (auto-leído)
├── agents/
│   ├── orquestador.md
│   ├── builder.md
│   ├── qa.md
│   ├── git.md
│   ├── deployer.md
│   ├── ops.md
│   ├── techlead.md
│   ├── librarian.md
│   ├── task-planner.md
│   └── skills/
│       └── engram_policy.md
└── projects/
    └── memory/            ← memoria de proyectos (auto-creada)
```
