# Claude Vibecoding

> *There are people with brilliant ideas that never come to life — not because they lack talent, but because the distance between imagining something and having it online is too wide.*
>
> *If you've ever let an idea die because you didn't know where to start, this system is for you. The technical knowledge was already out there — what was missing was a bridge to reach it.*

---

A multi-agent system to build software end-to-end with Claude. From a simple landing to an app with auth + database. **It walks with you through every key decision, without asking permission for every comma.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-stable-success)
![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20Windows-lightgrey)

> Lee esto en Español: [README.md](README.md)

> **Important note on language**: the system's internal prompts and agent communication run in **Spanish** (that's how the orchestrator is wired). Generated projects can be in any language — variable names, comments and commits are in English (standard programming convention). If you don't speak Spanish, you can still use it — agents will respond in your language if you ask, but the canonical triggers (`modo orquestador --`, `retomar X --`, `modo diagnóstico`) are Spanish phrases.

---

## Is this for me?

Two typical profiles get value from this system. If you identify with either, keep reading.

**If you've never programmed** and have an idea you want to see built (your startup's landing, an app for your team, a game to give your niece), this system takes you from idea to deploy. You describe what you want in natural language; the system asks what it needs to know with multiple-choice options, and at the end you have a project online. You don't need to learn programming to start using it.

**If you're a developer** tired of doing the same repetitive tasks (setup, scaffolding, visual QA, security headers, SEO, deploy), this system gets them off your plate. You keep the decisions that matter; the rest is done by 25 specialized agents that coordinate with each other.

In both cases, **the system asks when there are interpretable decisions** (visual, multi-option, irreversible) and **decides on its own when there's only one valid answer**. It doesn't burn you with a "are you sure?" on every commit, but it also doesn't leave you out of what matters.

---

## What you can build

| Project type | Concrete example | Stack the system uses |
|---|---|---|
| **Landing / public site** | Restaurant page, portfolio, product launch | **Astro** (content-heavy, 0 JS by default) or Vite + React + Tailwind |
| **Web app with auth** | Dashboard, CRM, SaaS MVP, admin panel | Next.js + Better Auth + Drizzle + PostgreSQL |
| **iOS + Android mobile app** | Delivery, fitness tracker, your business app | React Native + Expo SDK 52+ |
| **Browser game** | 2D platformer, puzzle, arcade | Phaser.js or PixiJS |
| **API / backend** | REST/tRPC endpoints, webhooks, jobs | Hono + Drizzle + PostgreSQL |
| **Complete full-stack** | Whole product with frontend + backend + auth + DB | Combination based on needs |

The stack is not fixed: the orchestrator decides in the first phase based on what you ask for. For a simple landing it doesn't build a microservices architecture; for a multi-tenant app it doesn't hand you an HTML page.

---

## Installation

### Prerequisites

| Platform | What you need first | Where to get it |
|---|---|---|
| **Linux + Claude Code** | Claude Code CLI, git, Node.js | [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) |
| **Windows + Claude Desktop** | Claude Desktop, Git for Windows (includes Git Bash), Node.js | [Claude Desktop](https://claude.ai/download) · [Git](https://git-scm.com/download/win) · [Node.js](https://nodejs.org) |

> **Important:** this system *extends* Claude — it does not replace it. If you don't have Claude Code (Linux) or Claude Desktop (Windows) installed, the agents and hooks don't run anywhere.

### Linux (Claude Code) — 30 seconds

Open a terminal and run:
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
bash install/linux.sh
```

The script installs the 25 agents + 15 technical references + 1 central index (`AGENTS.md`), the 16 hooks, the global `CLAUDE.md`, and configures git/GitHub/Vercel. It asks you for the data it needs (your name, email, GitHub username). **Restart Claude Code** when done and you're ready.

### Windows (Claude Desktop) — 20-30 guided minutes

Open **Git Bash** (installed with Git for Windows) and run:
```bash
git clone https://github.com/Emaleo0522/claude-vibecoding.git
cd claude-vibecoding
```

Then follow the step-by-step guide in [`install/windows.md`](install/windows.md). It takes you from zero to everything running, including downloading the Engram binary (the system's persistent memory) which on Windows requires an extra step.

### Other environments (Cursor, Aider, Codex CLI, direct Claude API, other LLMs)

The system **is formally supported on Claude Code (Linux) and Claude Desktop (Windows)**. If you want to use it with another runtime or IDE (Cursor, Aider, Codex CLI, direct calls to Claude API, other models), you need to adapt it:

- The **hooks** (tool call interceptors) are specific to the Claude Code/Desktop runtime. In other environments you'll need another equivalent mechanism (IDE extension, CLI wrapper, etc.) or disable the reactive part.
- **Engram** (persistent memory) runs as MCP, which requires your runtime to support MCPs. If not, you could substitute it with JSON files on disk with lower robustness.
- **Agents** are `.md` files with YAML frontmatter. The subagent syntax is specific to Claude Code. To use them as prompts in another runtime, you'll need to adapt the format.

If you want to port it, open an issue or PR explaining which runtime you're using — the idea is to build a collaborative portability guide. **No official support is promised outside Claude Code/Desktop**, but the architecture is modular enough to make it viable.

### Post-install verification

```bash
# Agents (should be 48: 25 agents + 21 technical references + agent-protocol.md + AGENTS.md index)
ls ~/.claude/agents/*.md | wc -l

# Hooks (should be 16)
ls ~/.claude/hooks/ | wc -l

# CLAUDE.md present at ~
head -3 ~/CLAUDE.md

# Full health check (recommended)
node ~/.claude/hooks/audit-system.js
```

---

## Your first project in 5 minutes

Open Claude Code and type:

```
modo orquestador — quiero crear una landing para mi cafetería de especialidad
```

(`modo orquestador` = "orchestrator mode". The trigger phrase is in Spanish but the orchestrator parses your intent regardless.)

What happens next:

1. **The system asks 6 multiple-choice questions** (project type, industry, visual style, optional reference, originality, audience). Takes 1-2 minutes. **You cannot skip with "you decide"** — question 3 (visual style) and 5 (originality) are mandatory. This prevents generic outputs.
2. **Generates the plan**: list of tasks with acceptance criteria, in Spanish.
3. **Designs the architecture** (CSS tokens, palette, typography, layout) and shows you a **visual checkpoint** with 8 interpretable decisions (hero, navigation, mood, animations, effects). You choose or accept the recommendations.
4. **Generates visual assets** (brand palette, SVG logo, hero image, optional background video) — with your approval before spending credits on AI APIs.
5. **Implements each task** with a dev → visual QA (Playwright at 3 viewports) → retry if failed loop. Up to 3 attempts per task.
6. **Certifies** SEO, performance (Core Web Vitals), accessibility, security headers, before declaring "done".
7. **Shows you the result**, and if you give OK, does commit + push + deploy to Vercel.

In the end you have a GitHub repo, a public Vercel URL, and a project that already went through 4 layers of QA. The full process takes between 20 minutes (simple landing) and 4-6 hours (full-stack web app with auth).

### Other useful prompts

```
retomar mi-cafeteria — agrega un blog con markdown
retomar mi-cafeteria — cambia la paleta a tonos más oscuros
modo orquestador — app mobile de delivery con React Native
modo orquestador — juego 2D tipo plataformas en el navegador
```

---

## How it works (summary)

The system has **one central orchestrator** coordinating **24 specialized sub-agents**, each with a bounded responsibility. The orchestrator never does real work — only delegates and joins results.

### 5-phase pipeline

```
Phase 1  Planning       →  Intent Clarifier (6 questions) + project-manager-senior
Phase 2  Architecture   →  ux-architect (CSS tokens) + ui-designer + security-engineer
                           ↳ Visual Direction Checkpoint (you decide style)
Phase 2B Visual assets  →  brand-agent + logo-agent + image-agent + video-agent
Phase 3  Dev ↔ QA      →  frontend-developer, backend-architect, etc. ↔ evidence-collector
Phase 4  Certification  →  seo-discovery + api-tester + performance-benchmarker + reality-checker
                           ↳ Step 4.5 No-JS Render Audit: validates the initial HTML without JS is usable by Bing, LLM scrapers and social previews
Phase 5  Publishing     →  git (with your confirmation) + deployer (with your confirmation)
```

To **modify a project already built**, the system enters modification mode: it runs a *Step 0 audit* on the inherited code (detects problematic defaults before touching anything), then only executes the agents affected by the change.

### What protects you along the way

- **16 hooks** block dangerous things in real time: `git --no-verify`, `git push --force`, `rm -rf`, `DROP TABLE`, `chmod 777`, edits to secret files (`.env`, private keys), use of `--no-gpg-sign`. Others warn: `debugger` or `console.log` in production code, `@ts-ignore`, excessive animations, CSS container with "SaaS feel" cap, declared fonts not loaded, mobile navigation without hamburger. Others run in background: cost tracking, session logging, Engram sync local→GitHub and local→cloud at session close, pre-compact snapshot.
- **Pre-return AUTO_AUDIT**: before returning code, the `frontend-developer` runs 5 executable grep rules (no default teal palette, no Inter as heading in bold moods, hero with coherent media, motion matching dial, shadow matching mood). If fails → regenerates. If passes → marks change as `VISUAL_IMPACT: high|medium|low`.
- **Automatic human checkpoint**: when a change has `VISUAL_IMPACT: high`, the orchestrator shows you the result before marking the task complete. Doctrine: the agent decides on its own when there's ONE correct answer; for everything else (visual, multi-option, irreversible, iterated 2+ times) it asks you with its recommendation included.
- **12 layers of anti-false-positive defense** in QA: LLM-as-judge visual fidelity (5 dimensions against reference), network inspection (Mixed Content, status 0, localhost leaks), mandatory E2E flows in auth/CRUD, reality-checker re-runs 2-3 PASS at random, **opt-in TDD evidence trail** (RED→GREEN→TRIANGULATE→REFACTOR when `test_commands` exist), **file cache hash on retries** (skip QA if all touched files have hash identical to last PASS, saves ~80% of tokens on retries without real change), **No-JS Render Audit in Phase 4** (Playwright with JS disabled measures what content survives — blocks landings/blogs/ecommerce that would be invisible to Bing/LLM scrapers/social previews).
- **Quantified Delegation Stop Rules**: explicit thresholds to escalate (5+ consecutive files read → delegate to `Explore`, 20+ tool calls without spawn → pause, 2+ non-trivial files in one task → fresh review). Adapted from [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai).

---

## Configuration

### Engram MCP (persistent memory) — mandatory

Engram is what makes the system *remember* between sessions. Without it, every conversation starts from zero. It installs automatically with the Linux script and with the Windows guide.

### Engram Cloud (cross-machine memory) — recommended

If you work from multiple computers and want memories to cross between PCs in real time (not at session end), Engram has a self-hosted **cloud** mode. The official instance runs on the author's own Oracle Cloud VPS with project allowlist.

The `engram-cloud-sync-on-stop` hook (included) pushes to the cloud at session close, and the local Engram client pulls automatically at the next session's start. The server holds the source of truth.

**To self-host your own cloud** (recommended for real use):

1. Provision a VPS (Oracle Always Free Tier suffices).
2. Clone [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) and bring up `docker compose up -d cloud`.
3. In `/opt/engram-cloud/.env` set `ENGRAM_CLOUD_ALLOWED_PROJECTS=my-project,personal,…` (explicit allowlist to avoid bucket explosion).
4. Point the local client to your URL: `engram cloud configure --url https://YOUR-VPS:PORT`.
5. For each project you want to sync: `engram cloud enroll <project-name>`.

**Key rules** (validated in production 2026-05-15):
- All cross-PC `mem_save` must use `scope="personal"` + explicit `project=`. The MCP auto-detect routes to different buckets depending on the client's cwd and breaks the cross. See the complete "save in engram" protocol in [`CLAUDE.md`](CLAUDE.md).
- To add a new bucket to the cloud: SSH the server, edit `.env`, `docker compose up -d cloud`. Without explicit allowlist the server returns 403.

### Cross-Claude Mailbox Protocol — opt-in for multi-PC use

If you work on 2+ PCs with separate Claude instances (typically Linux + Windows), you can activate an asynchronous channel between them via a dedicated Engram cloud bucket (`cross-claude-mailbox`). One instance leaves a message (`mailbox/from-{origin}/to-{destination}/{ts}-{slug}`), the other reads it the next time you wake it up.

**It's opt-in**: not checked by default on every turn (saves ~3-5k tokens/day on sessions that don't coordinate cross-PC). To activate in a session, tell Claude *"chequeá el mailbox"* or *"¿hay mensajes de pc004?"*. Complete design (query/reply schemas, checks vs edits-with-confirmation flow, anti-patterns): see **Cross-Claude Mailbox Protocol** section in [`CLAUDE.md`](CLAUDE.md).

**Key rules**:
- Reads/greps/doctor → the destination Claude auto-processes and responds.
- Edits/Bash mutating/SSH → DO NOT auto-apply, escalate to user first.
- SSH to production server requires LITERAL EXPLICIT user authorization ("yes do the SSH"), not a generic "OK go ahead".

### Engram Sync (legacy, git) — optional

Before Engram Cloud, cross-PC sync was done by pushing `~/.engram/` to a private GitHub repo. Still works if you prefer a simpler setup without VPS, but it's **eventually consistent** (only crosses at session close) and requires resolving conflicts by hand if two PCs write in parallel.

```bash
# 1. Create a private GitHub repo (e.g. my-engram-sync)
# 2. Initialize it in ~/.engram/:
cd ~/.engram && git init && git remote add origin https://github.com/YOUR_USER/my-engram-sync.git
# The engram-sync hook (already installed) does the rest
```

### Environment variables for generative assets — free-first policy

> 🆕 **Updated 2026-05-18** — free-first policy verified with real curl against primary sources, NOT marketing blogs recycling dates. With just `HF_TOKEN` you can generate images and logos without a credit card.

The system prioritizes **FREE top-tier paths that don't require a card**. Paid options are opt-in.

There's a [`.env.example`](.env.example) file at the repo root with all fields commented and signup links.

#### Real free stack (no provider requires a card)

| Variable | Service | Free quota | How to get it |
|---|---|---|---|
| **`HF_TOKEN`** ⭐ primary | HuggingFace Inference | $0.10/month (~150 FLUX-schnell imgs), monthly reset | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → `Read` role token |
| **`CLOUDFLARE_ACCOUNT_ID`** + **`CLOUDFLARE_AI_TOKEN`** secondary | Cloudflare Workers AI | **10,000 neurons/day** no card (hundreds of imgs/day) | 3-step setup below ⬇️ |
| _no variable_ | Pollinations.ai | **FLUX unlimited free** (official FAQ) | No key required — automatic fallback |

With just `HF_TOKEN` the system works. If you add Cloudflare, you multiply the free quota. Pollinations is the automatic safety net when everything else runs out.

#### Cloudflare Workers AI Setup (3 minutes, no card)

1. **Signup**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — the Workers Free plan **does NOT ask for a card** ([official source](https://developers.cloudflare.com/workers-ai/platform/pricing/))
2. **Account ID**: in the dashboard, scroll the right sidebar to "API" section — copy it (32 hex chars)
3. **API Token**: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → "Create Custom Token" → permission `Account → Workers AI → Read` → "Continue to summary" → "Create Token" (copy it, shown only once)

#### Paid opt-in (only if you have billing enabled)

| Variable | Service | Cost | When to use |
|---|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | $0.02-0.04/img + billing | Better LLM-native prompt understanding. Requires [billing enabled](https://aistudio.google.com/apikey) in Google Cloud |
| `REPLICATE_API_TOKEN` | Replicate | $0.03-0.10/video | Only for real video (LTX-Video 2.3). Without this variable, `video-agent` returns animated CSS fallback as valid output ([replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)) |
| `RECRAFT_API_KEY` | Recraft V4 Vector | $0.08/img + $5 free/month via Vercel AI Gateway | **Native** SVG logos (no raster→vector loss). Only if you want premium vector logos |

#### Where to place variables

- **Linux/macOS**: add them to `~/.bashrc` or `~/.zshrc` with `export VAR=value`, or create them in `~/.claude/.env` (one per line: `VAR=value`)
- **Windows**: `setx VAR "value"` in PowerShell (user-level persistence), or Control Panel → System Environment Variables. **Close and reopen Claude Desktop** for it to pick them up.

### Pixel Bridge — optional, decorative

A pixel art office where agents walk to their desks when assigned a task, report to the orchestrator, and rest when there's no work. **Purely visual**, doesn't affect the pipeline. The installer offers it to you.

---

## The 4 work modes

| Mode | When to use it | How to activate |
|---|---|---|
| **Normal Claude** | Questions, point fixes, code review, technical chat | Default — just talk |
| **Orchestrator** | Complete project end-to-end | Say: *"modo orquestador — [your idea]"* or *"activa el pipeline"* |
| **Modification** | Changes to a project already completed by the pipeline | Auto-detected when you say *"retomar [project] — [change]"* |
| **Diagnostic** | Audit existing code without touching it (due diligence, third-party project audits) | Say: *"modo diagnóstico"*, *"audita este código"*, *"evalúa sin tocar"* |

In **normal mode**, Claude responds as always but has access to hooks, AUTO_AUDIT and memory. In **orchestrator mode**, it takes the coordinator role and delegates to the 24 sub-agents. In **modification mode**, it runs a mini-pipeline (Step 0 audit → light planning → dev+QA only of affected agents). In **diagnostic mode** it's read-only by doctrine: only reads and returns a structured report with findings by severity — useful for auditing projects not generated by this system (due diligence, code review of external repos).

---

## Full technical documentation

For developers who want to go deeper:

| File | What for |
|---|---|
| [`agents/AGENTS.md`](agents/AGENTS.md) | Central index of the 15 technical references with load triggers. The orchestrator consults it in Phase 1 Step 0b to decide which refs apply per project (avoids indiscriminate loading) |
| [`agents/orquestador.md`](agents/orquestador.md) | Complete orchestrator behavior: mode detection, detailed pipeline, DAG State, fallbacks |
| [`agents/agent-protocol.md`](agents/agent-protocol.md) | Shared protocol between sub-agents: Engram (2 steps), Return Envelope, VISUAL_IMPACT, Delegation Stop Rules, universal rules |
| [`agents/pipeline-reference.md`](agents/pipeline-reference.md) | Details of each phase, tools per agent, adaptive stack, Design Intelligence Engine |
| [`CLAUDE.md`](CLAUDE.md) | The `CLAUDE.md` that gets installed — all system doctrine (Human Checkpoint, Engram, hooks, mod mode) |
| [`agents/ux-architect.md`](agents/ux-architect.md) | Design tokens, container strategy, anchor scroll with sticky |
| [`agents/ui-designer.md`](agents/ui-designer.md) | Design system, SaaS Teal Default Detector (T1-T7), accessibility |
| [`agents/frontend-developer.md`](agents/frontend-developer.md) | Frontend implementation, pre-return AUTO_AUDIT, design decision tree |
| [`agents/evidence-collector.md`](agents/evidence-collector.md) | Visual QA with Playwright, 9 anti-false-positive layers |
| [`hooks/`](hooks/) | The 16 hooks: blocks, warnings, audits, tracking, Engram sync (local+cloud) |
| [`design-data/`](design-data/) | Design Intelligence Engine: 8 CSVs with 161 industries indexed via BM25 |

---

## Architecture on disk

```
~/.claude/
├── agents/            # 25 agents + 15 technical references + AGENTS.md index = 41 .md files
├── design-data/       # Design Intelligence Engine (search.js + 8 CSVs)
├── hooks/             # 16 hooks (blocks, warnings, background sync)
├── settings.json      # hooks config + Engram MCP
├── settings.local.json # agent permissions
├── codepen-vault/     # approved CodePen effects (decorative)
└── pixel-bridge/      # optional visual system

~/CLAUDE.md            # global system instructions (auto-read by Claude)
```

### Model routing

| Model | Agents | Why |
|---|---|---|
| **Opus** | orchestrator, project-manager-senior, security-engineer, game-designer, reality-checker | Complex architectural decisions, planning, threat modeling, final certification |
| **Sonnet** | The other 20 agents | Defined task execution, QA, utilities, creative |

---

## Adaptive stack

The orchestrator picks the stack in Phase 1 based on the project. **There is no fixed stack.** These are the preferred defaults:

| Layer | Options | Default |
|---|---|---|
| Frontend | Next.js, SvelteKit, Astro, Vite+React | Next.js (apps), **Astro** (content-heavy landings) or Vite+React (app-like landings). The orchestrator asks first when there is >1 valid alternative |
| Backend | Hono, Express, Fastify | Hono (edge-ready) |
| Database | PostgreSQL, SQLite, Supabase | PostgreSQL (prod), Supabase (MVP) |
| ORM | Drizzle, Prisma | Drizzle |
| Auth | Better Auth | Always (unless pre-existing auth in project) |
| Mobile | React Native + Expo SDK 52+ | Expo |
| 2D Games | Phaser.js, PixiJS, Canvas | Phaser.js |
| 3D Games | Three.js, Babylon.js | Three.js |
| Animation | CSS (T1), Framer Motion (T2), GSAP (T3) | Scales with `motion_intensity` |
| Reactive audio | Tone.js, Web Audio API | Tone.js |

---

## Troubleshooting

**The `bash install/linux.sh` command fails.** Verify you have `git`, `curl`, `node` and `gh` installed. The script tries to detect the package manager (apt, dnf, pacman, brew) but sometimes fails on less common distros. Install manually what's missing and re-run.

**Claude doesn't find agents after installing.** Restart Claude Code (Linux) or Claude Desktop (Windows). Agents load at client startup.

**Engram doesn't respond / "MCP not found".** Verify `~/.claude/settings.json` has the `enabledPlugins.engram@engram: true` section and that you restarted Claude. On Windows, you also need to have installed the Engram binary (see `install/windows.md`).

**The orchestrator won't let me say "decidí vos" in the Intent Clarifier.** It's intentional. Questions 3 (visual style) and 5 (originality) block the bypass to avoid generic outputs. If you really have no preference, pick "balanced" in originality and "minimalist" in style — safe defaults.

**The `pre-return-audit` hook's AUTO_AUDIT blocks legitimate changes.** The hook is **fail-open** (warns but doesn't block). If it warns of a recurring false positive, you can adjust rules in `~/.claude/hooks/pre-return-audit.sh` or disable the entry in `~/.claude/settings.json`.

**I want to use the system with another runtime (Cursor, Aider, etc.).** See [Other environments](#other-environments-cursor-aider-codex-cli-direct-claude-api-other-llms) section above. No official support — the architecture is portable but requires adaptation of hooks and MCP.

---

## Quick FAQ

**Is it safe for production?** Generated projects go through 4 certification layers (SEO + API testing + performance + reality check) before deploy. Security headers, OWASP Top 10 validations and configured cache come out of the box.

**How much does it cost to use?** The system itself is free and open source. Costs are: 1) your Claude subscription (Pro/Max or API), 2) optionally AI APIs for images (Gemini ~$0.04/img, HuggingFace free) and videos (Replicate ~$0.05/video), 3) hosting if you don't use Vercel's free tier.

**Does it work with the direct Anthropic API, without Claude Code?** Not directly. The system depends on Claude Code's sub-agents and the hooks. To port it to the direct API you'd need to reimplement coordination yourself (viable but not trivial).

**Can I modify the agents to customize them?** Yes. Agents are `.md` files in `~/.claude/agents/`. You can edit the behavior of any one. If you want to preserve your changes when updating the system, fork the repo and apply your modifications to your fork.

**How do I update the system when a new version comes out?** Do `git pull` in the cloned repo and re-run `bash install/linux.sh` (or follow Windows steps). The installer backs up your files before overwriting (`*.bak` files).

**Does the system write in Spanish or English?** The agents communicate among themselves in Spanish, talk to you in Spanish, but **the code they generate is in the standard programming language (English)** — variable names, comments, commits, etc. This is important so your project is internationally readable.

---

## Contributing

Pull requests welcome. Before sending one:

1. If it's a change in agents, hooks or architecture rules, run `node ~/.claude/hooks/audit-system.js` to validate you didn't break anything.
2. If you add a new hook, add it to the table in `CLAUDE.md` (repo root, single source of truth since 2026-05-26) and the `install/linux.sh` script.
3. If you modify the README or documentation, keep the accessible tone — the system is also used by non-programmers.

To report bugs or discuss features, [open an issue](https://github.com/Emaleo0522/claude-vibecoding/issues).

---

## Credits

- **Engram MCP** — [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram) (persistent memory)
- **Design Intelligence Engine** — based on [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), ported to Node.js
- **Pixel Bridge** — based on [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) (optional visualization)
- **Nothing Design System** — reference from [dominikmartn/nothing-design-skill](https://github.com/dominikmartn/nothing-design-skill) v3.0.0

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built to walk with you, not to replace your judgment. The system decides what has ONE correct answer and asks you what has many. That's the line.*
