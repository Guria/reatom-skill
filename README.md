# Reatom skills for pi (and other Agent Skills runtimes)

A multi-skill package for [Reatom](https://github.com/reatom/reatom) v1000+ guidance.

It currently follows **approach A**:
- `reatom` — the main expert skill for existing codebases, API usage, architecture, debugging, and migration
- `reatom-scaffold` — ordered bootstrap workflow for new projects
- `reatom-feedback-loop` — correction / pitfall distillation workflow after wrong guidance or completed bootstrap

## Package layout

```text
skills/
├── reatom/
│   ├── SKILL.md
│   └── references/
│       ├── core/
│       ├── features/
│       ├── integrations/
│       └── meta/
├── reatom-scaffold/
│   ├── SKILL.md
│   └── references/
│       ├── overview.md
│       └── scaffold.md
└── reatom-feedback-loop/
    ├── SKILL.md
    └── references/
        └── feedback-loop.md
```

## Why this split

This package keeps one broad `reatom` skill for everyday Reatom work, while extracting two workflow-heavy areas that do not need to load for ordinary debugging or code review:

- **Scaffold** is a strict ordered process, not just background knowledge.
- **Feedback loop** is a follow-up correction workflow, not a default concern for every task.

This keeps the main skill broad and useful without carrying bootstrap/process instructions into every Reatom task.

## Installation

The exact install location is chosen by the user at install time.

### Via pi package manager

```bash
pi install git:github.com/<owner>/reatom-skill
# or
pi install npm:@<scope>/reatom-skill
```

### Via `skills.sh` / `npx skills`

```bash
# Local path
npx skills add /path/to/reatom-skill

# Git URL
npx skills add https://github.com/guria/reatom-skill.git

# List discovered skills
npx skills add . --list
```

### Other Agent-Skills-compliant runtimes

Install the package, then place or expose the contained `skills/` directory through the runtime's normal skill search locations.

The `package.json` declares:

```json
{
  "keywords": ["pi-package"],
  "pi": { "skills": ["./skills"] }
}
```

so pi can discover all bundled skills.

## Skills overview

### `reatom`

Use for:
- existing Reatom codebases
- `@reatom/*` APIs
- routing, forms, persistence, React integration
- architecture and code review
- migration and version-sensitive guidance
- runtime errors like `ReatomError` or missing async stack

This skill keeps the main source-backed references.

### `reatom-scaffold`

Use for:
- brand-new Reatom apps
- demos, examples, and prototypes that still need a proper bootstrap order
- scaffolding a Reatom package/app inside another repo
- validation pipeline setup before feature work

It uses progressive disclosure:
- `skills/reatom-scaffold/references/overview.md` for scope and reading depth
- `skills/reatom-scaffold/references/scaffold.md` for the full ordered workflow

### `reatom-feedback-loop`

Use for:
- user follow-up that says earlier Reatom guidance was wrong
- explaining process deviation
- course correction after a wrong turn
- bootstrap pitfall summaries that should improve the skill itself

It contains the correction workflow in `skills/reatom-feedback-loop/references/feedback-loop.md`.

## Validating / contributing

If you change any skill or reference, re-validate claims against the upstream repo:

```bash
git clone https://github.com/reatom/reatom ../reatom
cd ../reatom && git checkout v1001

grep -rn 'export.*<symbol>' packages/core/src
```

Prefer links pinned to `v1001` or a commit SHA, not floating default branches.

## Future evolution: possible move to approach B

This repo intentionally stops at approach A for now.

A later **approach B** could split the broad `reatom` skill further into narrower specialist skills such as:
- `reatom-routing`
- `reatom-forms`
- `reatom-react`
- `reatom-migration`

### Pros of moving later
- smaller per-skill context
- more precise triggering for narrow tasks
- easier topic-specific evals and description tuning

### Cons of moving later
- more trigger overlap
- more maintenance and reference duplication
- greater risk that vague prompts undertrigger or choose the wrong specialist

For now, the package prefers one broad expert skill plus two focused workflow skills.

## License

MIT — see `LICENSE`.
