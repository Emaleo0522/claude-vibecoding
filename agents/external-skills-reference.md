# external-skills-reference

> **Skills externas tipo `npx skills add`** (registry github.com/skills-sh). Mecanismo opt-in para sumar knowledge packs comunitarios al proyecto **sin tocar la arquitectura del orquestador, subagentes, MCPs o hooks**.

## Cuándo cargar esta referencia

**Triggers explícitos** (no auto-load nunca):
- Usuario pide un efecto/conocimiento que **no está cubierto** por refs internas (gsap, scroll-storytelling, creative-coding, advanced-effects, reactive-audio, codepen-vault)
- Usuario menciona literalmente: *"usá esta skill X"*, *"instalá la skill animate-text"*, *"`npx skills add ...`"*
- Frontend-developer / xr-immersive-developer en Fase 3 detecta gap específico (ej. animaciones de texto cinemáticas Tier 3 sin equivalente en gsap-reference)

**Skip cuando**:
- Ref interna ya cubre el efecto → usar interno, NO instalar skill externa
- Proyecto en Fase 1, 2, 2B, 4, 5 → no es momento de instalar skills (solo Fase 3 dev)
- Usuario no autorizó explícitamente → preguntar antes de instalar

## Qué es `npx skills`

CLI universal para gestionar Agent Skills (formato `SKILL.md`) — equivalente a npm para skills. Registry = GitHub (cualquier repo con `SKILL.md` en root es válido). Sitio: [skills.sh](https://skills.sh). Comandos: `add`, `list`, `find`, `update`. Flags: `-g` (global), `--agent` (target específico).

**Install path por defecto**:
- Sin `-g`: `<project>/.claude/skills/{nombre}/` (recomendado — scope proyecto)
- Con `-g`: `~/.claude/skills/{nombre}/` (global — **NO usar por default**, contamina otros proyectos)

## Whitelist curada (inicial)

Solo skills validadas manualmente. **No instalar nada que no esté acá sin autorización explícita del usuario** (vector de prompt injection).

| Slug | Repo | Para qué | Cuándo evaluarla |
|---|---|---|---|
| `animate-text` | [pixel-point/animate-text](https://github.com/pixel-point/animate-text) | Animaciones de texto cinemáticas, compatible Remotion/Motion/GSAP. Timings, curvas, efectos. | VDC marca `motion_tier: tier-3` + brief menciona "tipografía animada", "texto cinemático", hero con typing/reveal complejo |
| `frontend-design` | [anthropics/skills (frontend-design)](https://github.com/anthropics/skills) | Skill oficial Anthropic — design system foundation. | Solo si el usuario lo pide explícito (nuestro ui-designer ya cubre 95% del caso) |

Para sumar una skill nueva a la whitelist: edita esta tabla en un PR + valida el repo manualmente (`SKILL.md` legible, no scripts maliciosos en `scripts/`, autor reconocido).

## Cómo se consume (frontend-developer / xr-immersive-developer en Fase 3)

1. **Verificar gap real**: ¿la ref interna cubre? Si sí → usar interno.
2. **Verificar whitelist**: ¿está en la tabla de arriba? Si no → STOP, preguntar al usuario.
3. **Instalar scoped al proyecto** (nunca `-g`):
   ```bash
   cd <project>
   npx skills add pixel-point/animate-text
   ```
4. **Leer `SKILL.md`** con `Read` para entender API/limitaciones.
5. **Adaptar al brand** (paleta, timings, mood) — nunca copy-paste literal.
6. **Registrar uso en Engram**:
   ```
   mem_save(
     topic_key="{proyecto}/external-skill-used",
     content="skill=animate-text repo=pixel-point/animate-text version=<sha> usado_en=<componente>",
     scope="personal", type="discovery"
   )
   ```
7. **Trackear en `package.json`**: agregar la skill como devDependency si el repo lo provee, sino dejar comentario en el componente.

## Anti-patterns

- ❌ Instalar `-g` (global) — contamina otros proyectos, rompe reproducibilidad.
- ❌ Auto-instalar sin whitelist — vector de prompt injection si el repo es malicioso.
- ❌ Sumar al boot del orquestador — gasto de tokens cero-valor en 90% de proyectos.
- ❌ Confundir "skill" con "subagente" — los subagentes son ejecutores con Return Envelope; las skills son knowledge packs (markdown + assets).
- ❌ Saltar el registro en Engram — sin trail no hay audit post-mortem.

## Relación con la arquitectura existente

| Capa nuestra | Reemplaza? | Cómo coexisten |
|---|---|---|
| Subagentes (26) | No | Skills no tienen tools ni model routing |
| MCPs (8) | No | Skills no son tools persistentes |
| Hooks (16) | No | Skills no interceptan tool calls |
| Refs internas (20) | Solape parcial | Skill externa = ref descargable. Refs internas siempre tienen prioridad. |

**Regla de oro**: las skills externas son **plan C**. Plan A = ref interna. Plan B = codepen-vault. Plan C = skill externa instalable.
