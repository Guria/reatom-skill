# Reatom Skill for pi (and other Agent Skills runtimes)

A pi [skill](https://agentskills.io/specification) bundling expert guidance for [Reatom](https://github.com/reatom/reatom) v1000+ state management. It steers an LLM-powered coding agent (pi, Claude Code, etc.) toward production-ready Reatom patterns and away from common footguns.

## What's in here

```
reatom/
├── SKILL.md                          # Always-loaded orientation: routing, quick APIs, priority warnings
└── references/                       # Loaded on demand via the read tool
    ├── core/
    │   ├── extensions.md             # withAsyncData, withAbort, withChangeHook, …
    │   ├── writing-extensions.md     # Authoring custom .extend() helpers
    │   ├── sampling.md               # debounce/throttle, take, onEvent, race, abortVar
    │   ├── testing.md                # context.reset, clearStack/context.start, mock
    │   └── patterns.md               # Atomization, scoped factories, file org
    ├── features/
    │   ├── forms.md                  # reatomForm, bindField, validation
    │   ├── persistence.md            # withLocalStorage, withIndexedDb, withCookie, …
    │   └── routing/
    │       ├── routes.md             # Routes, layouts, codecs, urlAtom
    │       └── loaders.md            # Loader patterns, guards, collisions
    ├── integrations/
    │   ├── react.md                  # @reatom/react, StrictMode, hooks
    │   └── jsx.md                    # @reatom/jsx native runtime
    ├── meta/
    │   ├── packages.md               # Package index, deprecated v3 list
    │   ├── reusables.md              # jsrepo catalog (form helpers, undo, logger, test, tweakpane…)
    │   ├── migration.md              # v3 → v1000+ API mapping
    │   └── v1001.md                  # Delta vs v1000 (API gating)
    └── setup/
        └── start-from-scratch.md     # Bootstrap a new TS+Vite+Reatom project
```

**High-priority reference:** `references/setup/start-from-scratch.md` should be read first for full greenfield apps, project bootstraps, package/tooling choices, TS/Vite setup, lint/format/test pipelines, or production skeleton requests. For minimal examples or existing-app additions, answer narrowly and point to the setup guide as the production checklist.

Reference files link back to canonical source on `github.com/reatom/reatom@v1001` so the agent can verify behavior against upstream code, not just docs. SKILL.md stays mostly citation-light by design and points to those source-backed references for details.

## Design principles

1. **Progressive disclosure.** SKILL.md stays under ~500 lines and covers orientation plus highest-priority warnings; deep topics live in `references/` and are read on demand.
2. **Validate against source.** API claims, defaults, and gotchas should be checked against `github.com/reatom/reatom` at the v1001 branch tip used during authoring.
3. **Opinionated setup defaults.** The setup guide suggests a verifiable production toolchain (`oxlint` + `oxfmt` + `fallow`, TypeScript, Vite, browser smoke tests) and an optional `no-restricted-imports` rule to discourage React-owned app state. These are defaults, not Reatom requirements.
4. **Version-sensitive.** Routing, action subscription shape, and `reatomComponent` defaults differ between v1000 and v1001; the skill flags every such API explicitly.

## Installation

### As a local pi skill (project-scoped)

```bash
mkdir -p .pi/skills
git clone <this-repo> .pi/skills/reatom
```

### As a global pi skill

```bash
mkdir -p ~/.pi/agent/skills
git clone <this-repo> ~/.pi/agent/skills/reatom
```

### Via `skills.sh` / `npx skills`

This repository is a **single-skill repo** with `SKILL.md` at the repository root. That layout is intentionally compatible with `skills.sh` discovery.

```bash
# Local path
npx skills add /path/to/reatom-skill

# Git URL
npx skills add https://gitlab.com/workhuman/reatom-skill.git

# Explicit skill selection (optional because this repo contains one skill)
npx skills add https://gitlab.com/workhuman/reatom-skill.git --skill reatom
```

Validated locally with:

```bash
npx skills add . --list
```

which discovers the root `reatom` skill correctly.

### Via pi package manager

If you publish this as an npm or git pi-package:

```bash
pi install git:github.com/<owner>/reatom-skill
# or
pi install npm:@<scope>/reatom-skill
```

The `package.json` already declares `keywords: ["pi-package"]` and `pi.skills` so it's discoverable.

### Other Agent-Skills-compliant runtimes

Place the directory at any of:

- `~/.agents/skills/reatom/`
- `.agents/skills/reatom/`

The format follows the [Agent Skills standard](https://agentskills.io/specification) and is portable. `skills.sh` also discovers root-level `SKILL.md` files, so a dedicated `skills/reatom/` wrapper directory is not required for this repository.

## When the skill triggers

Pi loads the skill based on its `description` field. It triggers on:

- Any file importing from `@reatom/*`
- Explicit Reatom API usage (`atom`/`computed`/`action` imported from `@reatom/core`, `reatomComponent`, `reatomRoute`, `reatomForm`, `withAsyncData`, `withChangeHook`, `wrap()` in Reatom context)
- Errors mentioning `ReatomError` or "missing async stack"
- Direct questions about Reatom, migrating from v3, choosing adapters, etc.

The description is anchored to Reatom-specific imports, APIs, adapters, and errors to avoid triggering on unrelated atom libraries such as Jotai or Nanostores.

## Validating / contributing

If you change SKILL.md or any reference, **re-validate against the upstream repo**. The intended workflow:

```bash
# Clone reatom alongside this skill
git clone https://github.com/reatom/reatom ../reatom
cd ../reatom && git checkout v1001

# When editing the skill, grep the upstream source for anything you're claiming
grep -rn 'export.*<symbol>' packages/core/src
```

Pin GitHub source links to a specific branch (`v1001`) or commit SHA. Avoid `main`/`master` — Reatom doesn't use those branch names for active development.

## Versioning

This skill targets the `v1001` branch of Reatom. When v1001 ships as the new `latest` on npm:

1. Bump the `compatibility` field in SKILL.md frontmatter.
2. Move `references/meta/v1001.md` content into the main flow and create a fresh `vNext.md` for the next pre-release.
3. Re-spot-check all source links against the new branch.

## License

MIT — see `LICENSE`.

## Credits

- [Reatom](https://github.com/reatom/reatom) by [@artalar](https://github.com/artalar) and contributors.
- [Agent Skills](https://agentskills.io/specification) standard.
- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) by mariozechner.
