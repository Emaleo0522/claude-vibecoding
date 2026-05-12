# Linux VPS Hardening — Referencia (curada de imthenachoman/How-To-Secure-A-Linux-Server)

Referencia técnica para hardening de servidores Linux cuando el deploy NO es PaaS.
**Solo cargar cuando** el proyecto se deploya en VPS propio (Oracle Free Tier, DigitalOcean, Hetzner, AWS EC2, on-prem). NO cargar en proyectos Vercel/Netlify/Cloudflare Pages/EAS Build/Render/Railway managed — el provider gestiona el OS.

> **Atribución**: Snippets curados y adaptados de [imthenachoman/How-To-Secure-A-Linux-Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server) (CC-BY-SA-4.0). Esta reference NO reemplaza el repo upstream — es el mínimo viable accionable. Para deep-dive (PSAD, AIDE, OSSEC, ClamAV, FireJail, panic-passwords) ir al repo original.

## Cuándo se carga esta reference (trigger)

Otro agente (security-engineer, deployer, reality-checker) carga esta reference cuando:
- `intent.deploy_target` ∈ {`vps`, `oracle-cloud`, `digitalocean`, `hetzner`, `aws-ec2`, `self-hosted`, `on-prem`}
- O usuario menciona explícitamente: "mi servidor", "mi VM", "mi VPS", "self-hosted"
- O stack incluye PocketBase/n8n/Plausible/Mastodon/etc. self-hosted

Si el deploy es Vercel/Netlify/EAS/Render/Railway/Supabase managed → NO cargar. Esta reference no aplica.

## Distros target

- **Debian / Ubuntu** (LTS) — comandos `apt` directos
- **Otras distros** (RHEL/Fedora/Arch) — los conceptos aplican, traducir comandos (`dnf`, `pacman`)

---

## 1. SSH baseline (la primera puerta — siempre primero)

### Generar key Ed25519 (NO usar RSA <4096)
```bash
ssh-keygen -t ed25519 -a 100 -C "ema@host"
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server
```

### `/etc/ssh/sshd_config` — bloque mínimo de seguridad
```
Port 22                              # cambiar a puerto >1024 reduce ruido de bots (no es seguridad real)
PermitRootLogin no
PasswordAuthentication no            # CRÍTICO — solo keys
PubkeyAuthentication yes
ChallengeResponseAuthentication no
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
AllowGroups ssh-users                # crear grupo y agregar usuarios habilitados
Protocol 2
```

### Crear grupo de acceso SSH
```bash
sudo groupadd ssh-users
sudo usermod -aG ssh-users $USER
sudo systemctl restart ssh
```

> **GOTCHA**: ANTES de cerrar sesión, abrir una segunda terminal SSH y verificar que entra. Si `sshd_config` rompe el acceso, perdés el server (especialmente Oracle Cloud sin consola serial fácil).

### Remover Diffie-Hellman keys cortos (KEX hardening)
```bash
sudo awk '$5 >= 3071' /etc/ssh/moduli > /tmp/moduli && sudo mv /tmp/moduli /etc/ssh/moduli
```

---

## 2. UFW — Firewall baseline

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit 22/tcp                # rate-limit SSH (6 conexiones / 30s)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

> **Oracle Cloud GOTCHA**: hay DOS firewalls (UFW dentro de la VM + VCN Security List a nivel de red). Ver `devops-vps-reference.md` para detalles. UFW solo no alcanza.

---

## 3. Fail2Ban — Brute-force protection

```bash
sudo apt install -y fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

`/etc/fail2ban/jail.local` — bloque mínimo:
```ini
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = 22
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true
```

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

> **Alternativa moderna**: CrowdSec (community-driven, threat intel compartido). Más potente pero más configuración. Para MVPs Fail2Ban alcanza.

---

## 4. Unattended security upgrades

```bash
sudo apt install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

`/etc/apt/apt.conf.d/50unattended-upgrades` — habilitar solo security:
```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
};
Unattended-Upgrade::Automatic-Reboot "false";    # true si el server tolera reboot
Unattended-Upgrade::Mail "alerts@dominio.com";
```

Verificar dry-run:
```bash
sudo unattended-upgrades --dry-run --debug
```

---

## 5. sysctl — Kernel hardening

`/etc/sysctl.d/99-hardening.conf`:
```
# Network
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv6.conf.all.accept_redirects = 0

# Kernel
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
kernel.yama.ptrace_scope = 2
kernel.kexec_load_disabled = 1
kernel.unprivileged_bpf_disabled = 1

# FS
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.suid_dumpable = 0
```

Aplicar:
```bash
sudo sysctl --system
```

---

## 6. Limitar `sudo` y `su`

```bash
sudo groupadd sudo-users
sudo usermod -aG sudo-users $USER

# /etc/sudoers.d/00-restrict (visudo)
%sudo-users ALL=(ALL:ALL) ALL
Defaults    use_pty                    # cada sudo en pty separado
Defaults    logfile="/var/log/sudo.log"
Defaults    timestamp_timeout=5        # re-prompt de password cada 5 min
```

`su` solo para `wheel`:
```bash
sudo dpkg-statoverride --update --add root sudo 4750 /bin/su
```

---

## 7. Lynis — Audit automatizable (gate de certificación)

```bash
sudo apt install -y lynis
sudo lynis audit system --quick
```

**Threshold para certificación VPS**: hardening index ≥ **70/100**. Lynis genera `/var/log/lynis-report.dat` parseable.

Extraer score programáticamente:
```bash
grep "hardening_index" /var/log/lynis-report.dat | cut -d= -f2
```

---

## 8. Smoke test post-hardening (5 checks ejecutables)

Script idempotente que reality-checker / deployer pueden correr vía SSH:

```bash
#!/bin/bash
# vps-smoke-test.sh — devuelve PASS/FAIL por check
set -u
PASS=0; FAIL=0

check() { if eval "$2" >/dev/null 2>&1; then echo "PASS $1"; PASS=$((PASS+1)); else echo "FAIL $1"; FAIL=$((FAIL+1)); fi; }

check "ssh-no-password-auth"   "sudo grep -q '^PasswordAuthentication no' /etc/ssh/sshd_config"
check "ssh-no-root-login"      "sudo grep -q '^PermitRootLogin no' /etc/ssh/sshd_config"
check "ufw-active"             "sudo ufw status | grep -q 'Status: active'"
check "fail2ban-sshd-enabled"  "sudo fail2ban-client status sshd | grep -q 'Currently banned'"
check "unattended-upgrades"    "systemctl is-enabled unattended-upgrades"

echo "---"
echo "RESULT: $PASS PASS / $FAIL FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

Threshold para certificación: ≥ **4/5 PASS** (Lynis ≥70 cuenta como check 6 si está disponible).

---

## 9. Threat model adicional — componente "Linux host" (STRIDE)

Cuando security-engineer carga esta reference, agrega este bloque al threat model del proyecto:

| STRIDE | Amenaza específica del host | Mitigación |
|---|---|---|
| **S**poofing | SSH brute-force / credential stuffing | Key-only auth + Fail2Ban + AllowGroups |
| **T**ampering | Modificación de binarios/configs | AIDE (file integrity) — opt-in si compliance lo pide |
| **R**epudiation | Sin trail de quién hizo qué | `sudo` con `logfile` + `auditd` (opt-in) |
| **I**nfo Disclosure | Listado de procesos/puertos por usuarios no privilegiados | `/proc` con `hidepid=2`, `kernel.kptr_restrict=2` |
| **D**oS | Flood de conexiones, exhaustión de fds | UFW rate-limit + `sysctl` syncookies + `ulimit` |
| **E**levation | Local privilege escalation (kernel exploits, sudo CVE) | unattended-upgrades + `kexec_load_disabled` + sudo restringido |

---

## 10. Lo que NO está en esta reference (ir al repo upstream)

Para los siguientes temas, cargar la reference NO basta — el agente debe leer el repo upstream o pedir al usuario decisión:

- **AIDE** (file integrity baseline) — requiere setup interactivo + reruns programados
- **OSSEC / Wazuh** (HIDS completo) — agente + servidor central, scope grande
- **ClamAV** (anti-virus) — útil en file servers / mail; raro en API backends
- **Rkhunter / chkrootkit** — bajo ROI vs Lynis para MVPs
- **PSAD** (port-scan detection) — capa extra sobre UFW
- **PAM-duress** (panic password) — escenarios de coerción específicos
- **FireJail** (sandbox de apps) — útil si corremos binarios untrusted
- **MSMTP / Exim4** para alertas — depende del stack de monitoring

URL canónica: https://github.com/imthenachoman/How-To-Secure-A-Linux-Server

---

## Cross-refs en el sistema vibecoding

- **Mixed Content / nginx + Let's Encrypt / Oracle VCN**: ver `devops-vps-reference.md`
- **App-level OWASP / headers / CSP / lockfile-lint**: ver `security-engineer.md`
- **Secret scan + lockfile integrity en certificación**: ver `reality-checker.md` Paso 6
- **PocketBase self-hosted en VPS** (combinar ambas references): ver `pocketbase-reference.md`

## Engram — topic_keys que esta reference produce

Cuando un agente aplica este hardening en un proyecto, guarda evidencia en:
- `{proyecto}/vps-hardening` — checklist aplicado + Lynis score + smoke-test output
- `{proyecto}/discovery-vps-{descripcion}` — gotchas específicos del provider/setup encontrados (proactive save por agent-protocol § 4)

NO duplicar contenido de esta reference en Engram. Solo guardar el resultado de la aplicación + descubrimientos no obvios.
