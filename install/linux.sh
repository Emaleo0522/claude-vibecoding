#!/bin/bash
# ============================================================
# Claude Code — Vibecoding Agent System v2
# 22 agentes + 1 referencia (Better Auth) | Pipeline de 5 fases
# Instalacion automatica para Linux / Claude Code
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[X]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Claude Code — Vibecoding Agent System v2${NC}"
echo -e "${CYAN}  22 agentes + Better Auth ref | Pipeline de 5 fases${NC}"
echo -e "${CYAN}  Instalacion automatica (Linux)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# -- 0. Detectar directorio raiz del repo --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# -- 1. Verificar dependencias basicas --
for cmd in git python3 curl; do
  command -v $cmd &>/dev/null || error "$cmd no esta instalado. Instalalo con: sudo apt-get install $cmd"
done
info "Dependencias basicas: git, python3, curl"

# -- 2. Instalar Node.js si no esta --
if ! command -v node &>/dev/null; then
  warn "Node.js no encontrado. Instalando via NodeSource (LTS)..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  info "Node.js: $(node --version)"
else
  info "Node.js: $(node --version)"
fi

# -- 3. Instalar Vercel CLI --
if ! command -v vercel &>/dev/null; then
  warn "Vercel CLI no encontrado. Instalando..."
  npm install -g vercel
  info "Vercel CLI instalado"
else
  info "Vercel CLI: $(vercel --version 2>/dev/null | head -1)"
fi

# -- 4. Instalar gh CLI si no esta --
if ! command -v gh &>/dev/null; then
  warn "gh CLI no encontrado. Instalando..."
  sudo apt-get update -qq && sudo apt-get install -y gh
  info "gh CLI instalado"
else
  info "gh CLI: $(gh --version | head -1)"
fi

# -- 5. Pedir datos del usuario --
echo ""
echo "Necesito algunos datos para configurar git y GitHub."
echo ""

read -p "  Tu nombre (aparece en los commits, ej: Ana): " GIT_NAME
while [[ -z "$GIT_NAME" ]]; do
  read -p "  Nombre no puede estar vacio: " GIT_NAME
done

read -p "  Tu email de GitHub (ej: usuario@gmail.com): " GIT_EMAIL
while [[ -z "$GIT_EMAIL" ]]; do
  read -p "  Email no puede estar vacio: " GIT_EMAIL
done

read -p "  Tu usuario de GitHub (ej: MiUsuario): " GH_USER
while [[ -z "$GH_USER" ]]; do
  read -p "  Usuario no puede estar vacio: " GH_USER
done

# -- 6. Configurar git global --
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
git config --global init.defaultBranch main
info "Git configurado: $GIT_NAME <$GIT_EMAIL>"

# -- 7. Generar clave SSH si no existe --
SSH_KEY="$HOME/.ssh/id_ed25519"
if [[ ! -f "$SSH_KEY" ]]; then
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  ssh-keygen -t ed25519 -C "$GIT_EMAIL" -f "$SSH_KEY" -N ""
  info "Clave SSH generada: $SSH_KEY"
else
  info "Clave SSH existente: $SSH_KEY"
fi

# -- 8. Instalar 22 agentes + better-auth-reference en ~/.claude/agents/ --
CLAUDE_AGENTS="$HOME/.claude/agents"
mkdir -p "$CLAUDE_AGENTS/skills"

cp "$REPO_ROOT/agents/"*.md "$CLAUDE_AGENTS/"
# Copiar skills si existen
if ls "$REPO_ROOT/agents/skills/"*.md &>/dev/null; then
  cp "$REPO_ROOT/agents/skills/"*.md "$CLAUDE_AGENTS/skills/"
fi

AGENT_COUNT=$(ls "$CLAUDE_AGENTS/"*.md 2>/dev/null | wc -l)
info "Agentes instalados en $CLAUDE_AGENTS ($AGENT_COUNT agentes)"

# -- 9. Instalar CLAUDE.md global (instrucciones del sistema) --
GLOBAL_CLAUDE="$HOME/CLAUDE.md"
TEMPLATE="$REPO_ROOT/templates/global-claude.md"

if [[ -f "$TEMPLATE" ]]; then
  if [[ -f "$GLOBAL_CLAUDE" ]]; then
    cp "$GLOBAL_CLAUDE" "$GLOBAL_CLAUDE.bak"
    warn "CLAUDE.md existente respaldado en $GLOBAL_CLAUDE.bak"
  fi
  cp "$TEMPLATE" "$GLOBAL_CLAUDE"
  info "CLAUDE.md global instalado en $GLOBAL_CLAUDE"
else
  warn "No se encontro templates/global-claude.md — saltando"
fi

# -- 10. Actualizar usuario de GitHub en agente git --
sed -i "s|<usuario>|$GH_USER|g" "$CLAUDE_AGENTS/git.md" 2>/dev/null || true

# -- 11. Instalar settings.json (MCPs: Engram) --
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
SETTINGS_TEMPLATE="$REPO_ROOT/templates/settings.json"

if [[ -f "$SETTINGS_TEMPLATE" ]]; then
  if [[ -f "$CLAUDE_SETTINGS" ]]; then
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.bak"
    warn "settings.json existente respaldado en $CLAUDE_SETTINGS.bak"
  fi
  cp "$SETTINGS_TEMPLATE" "$CLAUDE_SETTINGS"
  info "settings.json instalado (Engram MCP configurado)"
else
  # Fallback: configurar via python
  if [[ ! -f "$CLAUDE_SETTINGS" ]]; then
    echo '{}' > "$CLAUDE_SETTINGS"
  fi
  python3 - <<'PYEOF'
import json, os
settings_path = os.path.expanduser("~/.claude/settings.json")
with open(settings_path) as f:
    s = json.load(f)
s.setdefault("enabledPlugins", {})
s["enabledPlugins"]["engram@engram"] = True
s.setdefault("extraKnownMarketplaces", {})
s["extraKnownMarketplaces"]["engram"] = {
    "source": {"source": "github", "repo": "Gentleman-Programming/engram"}
}
with open(settings_path, "w") as f:
    json.dump(s, f, indent=2)
PYEOF
  info "settings.json configurado via fallback"
fi

# -- 12. Instalar settings.local.json (permisos) --
CLAUDE_LOCAL="$HOME/.claude/settings.local.json"
LOCAL_TEMPLATE="$REPO_ROOT/templates/settings.local.json"

if [[ -f "$LOCAL_TEMPLATE" ]]; then
  if [[ -f "$CLAUDE_LOCAL" ]]; then
    cp "$CLAUDE_LOCAL" "$CLAUDE_LOCAL.bak"
    warn "settings.local.json existente respaldado en $CLAUDE_LOCAL.bak"
  fi
  cp "$LOCAL_TEMPLATE" "$CLAUDE_LOCAL"
  info "settings.local.json instalado (permisos para 22 agentes)"
else
  warn "No se encontro templates/settings.local.json — saltando"
fi

# -- 13. Autenticar gh CLI --
echo ""
warn "Necesitas autenticar GitHub CLI. Se abrira el navegador."
read -p "  Presiona Enter para continuar..."
gh auth login --web -p ssh || warn "Autenticacion saltada. Podes correr 'gh auth login --web -p ssh' despues."

# -- 14. Autenticar Vercel --
echo ""
warn "Necesitas autenticar Vercel para poder publicar proyectos."
read -p "  Presiona Enter para continuar (o Ctrl+C para saltar)..."
vercel login || warn "Autenticacion de Vercel saltada. Podes correr 'vercel login' despues."

# -- 15. Instrucciones para SSH --
echo ""
echo "============================================"
echo "  ACCION REQUERIDA — Agregar clave SSH"
echo "============================================"
echo ""
echo "Copia esta clave y pegala en GitHub:"
echo ""
cat "$SSH_KEY.pub"
echo ""
echo "Pasos:"
echo "  1. Ir a github.com -> tu foto -> Settings"
echo "  2. SSH and GPG keys -> New SSH key"
echo "  3. Titulo: 'Mi PC Linux'"
echo "  4. Pegar la clave -> Add SSH key"
echo ""
warn "Si ya la agregaste antes, podes ignorar este paso."
read -p "  Presiona Enter cuando hayas agregado la clave..."

# -- 16. Verificar conexion SSH --
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
  info "Conexion SSH con GitHub: OK"
else
  warn "No se pudo verificar SSH. Verifica manualmente con: ssh -T git@github.com"
fi

# -- 17. Opcional: Sistema visual de agentes (Pixel Bridge) --
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Opcional: Sistema Visual de Agentes${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo "  Muestra los 22 agentes como personajes en una oficina"
echo "  pixel art en tiempo real (http://localhost:3456)."
echo "  Cuando un agente trabaja, se sienta en su escritorio."
echo "  Cuando termina, camina a reportarle al orquestador."
echo "  Completamente opcional — el sistema funciona sin esto."
echo ""
read -p "  ¿Querés instalar el sistema visual de pixel art? (s/N): " INSTALL_PIXEL
if [[ "$INSTALL_PIXEL" =~ ^[sS]$ ]]; then
  echo ""
  warn "Para instalar, reinicia Claude Code y en una nueva conversacion escribi:"
  echo ""
  echo '  "Instala el sistema visual de pixel art para Claude Code.'
  echo '   Configuralo como servidor standalone Node.js+Express en'
  echo '   ~/.claude/pixel-bridge/standalone/ (NO como extension de VS Code).'
  echo '   El servidor debe leer ~/.claude/projects/*.jsonl en tiempo real'
  echo '   y servir la UI en http://localhost:3456.'
  echo '   Los 22 agentes del sistema de vibecoding deben estar siempre'
  echo '   presentes en la oficina aunque esten inactivos.'
  echo '   Basate en https://github.com/pablodelucca/pixel-agents para la'
  echo '   arquitectura y descarga los assets (sprites, tiles, furniture,'
  echo '   fonts) desde la carpeta assets/ de ese repo."'
  echo ""
  info "Instruccion lista. Pegala en Claude Code cuando reinicies."
else
  info "Sistema visual omitido. Podes instalarlo después — ver README.md para instrucciones."
fi

# -- Resumen --
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Instalacion completada${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
info "Git:       $GIT_NAME <$GIT_EMAIL>"
info "GitHub:    $GH_USER"
info "Agentes:   $CLAUDE_AGENTS ($AGENT_COUNT agentes)"
info "MCPs:      Engram (memoria) configurado en settings.json"
info "Permisos:  settings.local.json con permisos para todos los agentes"
info "CLAUDE.md: $GLOBAL_CLAUDE (instrucciones del sistema)"
echo ""
echo -e "${YELLOW}IMPORTANTE: Reinicia Claude Code para activar los MCPs.${NC}"
echo ""
echo "Para empezar, abri Claude Code y escribi:"
echo "  modo orquestador — quiero crear [tu idea]"
echo ""
echo "O para uso normal sin pipeline completo, simplemente habla con Claude."
echo ""
echo "Agentes disponibles (22 + better-auth-reference):"
echo "  Fase 1: project-manager-senior"
echo "  Fase 2: ux-architect, ui-designer, security-engineer"
echo "  Fase 2B: brand-agent, image-agent, logo-agent, video-agent"
echo "  Fase 3: frontend-developer, mobile-developer, backend-architect,"
echo "          rapid-prototyper, game-designer, xr-immersive-developer"
echo "  Fase 3 QA: evidence-collector"
echo "  Fase 4: seo-discovery, api-tester, performance-benchmarker, reality-checker"
echo "  Fase 5: git, deployer"
echo ""
