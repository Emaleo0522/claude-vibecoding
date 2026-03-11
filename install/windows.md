# Instalacion en Windows — Claude Desktop

Esta guia te lleva paso a paso desde cero hasta tener el sistema completo funcionando en Windows con Claude Desktop.

---

## Lo que vas a instalar

- **16 agentes de Claude + 1 referencia**: los especialistas del sistema (orquestador, PM, arquitectos, devs, QA, etc.) + `better-auth-reference.md` (guia de autenticacion)
- **CLAUDE.md global**: le dice a Claude como coordinar el pipeline de 5 fases
- **settings.json + settings.local.json**: configuracion de MCPs y permisos
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

Deberias ver 17 archivos .md: los 16 agentes (`orquestador.md`, `project-manager-senior.md`, `frontend-developer.md`, etc.) + `better-auth-reference.md`.

---

## Paso 7: Instalar CLAUDE.md global (versión Windows)

```bash
cp templates/windows-claude.md ~/CLAUDE.md
```

> Esta versión incluye las reglas específicas de Windows: Better Auth críticas y configuración de preview servers.

---

## Paso 8: Instalar configuracion de MCPs y permisos

```bash
# Respaldar si ya existen
cp ~/.claude/settings.json ~/.claude/settings.json.bak 2>/dev/null
cp ~/.claude/settings.local.json ~/.claude/settings.local.json.bak 2>/dev/null

# Instalar nuevos
cp templates/settings.json ~/.claude/settings.json
cp templates/settings.local.json ~/.claude/settings.local.json
```

---

## Paso 8b: Configurar preview servers (launch.json)

Para que `preview_start` funcione correctamente en Windows:

```bash
mkdir -p ~/.claude
cp templates/windows-launch.json ~/.claude/launch.json
```

Edita `~/.claude/launch.json` y cambia `"mi-proyecto"` por el nombre de tu proyecto cuando lo necesites.

---

## Paso 9: Configurar Engram (memoria persistente)

Engram le da a Claude memoria entre sesiones.

1. Abri Claude Desktop
2. Ir a **Settings -> Extensions**
3. Buscar **Engram** e instalarlo
4. Reiniciar Claude Desktop

> Si no encontras Engram, podes saltear este paso. El sistema funciona igual, pero Claude no recordara proyectos anteriores entre sesiones.

---

## Paso 10: Verificar la instalacion

En Git Bash:
```bash
# Agentes instalados (deben ser 16)
ls ~/.claude/agents/*.md | wc -l

# CLAUDE.md global
cat ~/CLAUDE.md | head -5

# Settings
cat ~/.claude/settings.json

# Herramientas disponibles
git --version
node --version
gh --version
vercel --version
```

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

**No aparecen los 16 agentes**
-> Verifica con `ls ~/.claude/agents/*.md | wc -l`. Debe ser 17.

**`gh auth login` falla**
-> Proba con: `gh auth login --web`

**`vercel login` no abre el navegador**
-> Proba: `vercel login --github`

---

## Estructura instalada

```
~/CLAUDE.md                    <- instrucciones globales del sistema
~/.claude/
|-- settings.json              <- MCPs (Engram)
|-- settings.local.json        <- permisos para agentes
|-- agents/
|   |-- orquestador.md
|   |-- project-manager-senior.md
|   |-- ux-architect.md
|   |-- ui-designer.md
|   |-- security-engineer.md
|   |-- frontend-developer.md
|   |-- backend-architect.md
|   |-- rapid-prototyper.md
|   |-- game-designer.md
|   |-- xr-immersive-developer.md
|   |-- evidence-collector.md
|   |-- reality-checker.md
|   |-- api-tester.md
|   |-- performance-benchmarker.md
|   |-- git.md
|   |-- deployer.md
|   |-- better-auth-reference.md
|   |-- skills/
```
