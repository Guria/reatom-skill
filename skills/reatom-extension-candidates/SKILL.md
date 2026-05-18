---
name: reatom-extension-candidates
description: >
  Find reusable Reatom extension candidates in an existing codebase. Use when
  auditing repeated @reatom/core / reatomForm / reatomRoute patterns, deciding
  between core, reatom/reusables, custom `.extend()` helpers, or local
  `reatom*` factories, or when evaluating whether a pattern is generic enough
  to propose upstream to reatom/reusables.
allowed-tools: read Bash
---

# Reatom extension candidates

Use this skill for **existing codebases** when the job is to find repeated Reatom patterns and decide whether they should stay inline, become a local helper, become a custom extension, become a local `reatom*` factory, or be proposed to [`reatom/reusables`](https://github.com/reatom/reusables).

This skill is about **discovery and triage**, not blind abstraction. The goal is to reduce duplication without over-generalizing.

If the task is active bug fixing, runtime/test debugging, or bootstrap order, use the sibling `reatom-debug` or `reatom-scaffold` workflow instead. If the user is correcting earlier bad guidance, use `reatom-feedback-loop` after the immediate code issue is understood.

## First read

Before analyzing the target codebase, read these sibling references:

1. `../reatom/SKILL.md`
2. `../reatom/references/meta/reusables.md`
3. `../reatom/references/core/writing-extensions.md`
4. `references/upstream-checklist.md`

Use the general Reatom guidance above as the source of truth for API behavior. This skill layers a search-and-triage workflow on top of it.

## What to look for

Search for repeated patterns around:

- form host wiring (`onSubmit`, submit wrappers, focus-on-error, first-error projections)
- action success/error hooks
- route retry / loading / error wrappers
- reset / history / undo helpers
- repeated lifecycle glue around external instances or subscriptions
- repeated computed helpers that belong to the primitive more than the component

The repetition should be **primitive-shaped**, not business-shaped. A good candidate usually enriches an existing atom/action/form/route instead of creating a whole feature workflow.

## Decision ladder

For each candidate, classify it in this order:

1. **Already in core**
   - The behavior is already covered by `@reatom/core` primitives or built-in extensions.
   - Recommendation: use core directly; do not invent a wrapper.

2. **Already in reusables**
   - The pattern is generic and already catalog-shaped.
   - Recommendation: use or adapt the existing reusable, but verify the live catalog before claiming a match.

3. **Local custom extension**
   - There is an existing primitive to enrich and the behavior is narrow.
   - Recommendation: attach a `.extend(...)` helper.

4. **Local `reatom*` factory**
   - The pattern creates several related primitives or is feature/domain-specific.
   - Recommendation: extract a local factory instead of a generic extension.

5. **Leave inline**
   - The pattern appears only once, or abstraction cost is higher than the duplication.

## How to inspect

1. Find repeated code in the current project.
2. Group repeats by shape, not by feature name.
3. Check whether the pattern matches a built-in API or a reusable.
4. Validate any Reatom-specific claim against the referenced upstream docs/source before recommending an abstraction.
5. If not, decide whether the repetition belongs to:
   - the primitive itself → extension candidate
   - the feature boundary → `reatom*` factory candidate
   - the view only → possibly a tiny computed/helper extension, but be skeptical
6. Score whether the candidate is local-only or reusable-catalog material.

## Upstream-to-reusables signals

A candidate is stronger for `reatom/reusables` when most of these are true:

- it appears across multiple unrelated features
- it is not tied to business vocabulary
- it enriches one existing primitive cleanly
- it has a small, memorable API
- its options are few and easy to explain
- it has minimal product coupling, or any library coupling is explicit and reusable across apps that use that integration
- it is useful even after being copied into another app with renamed domains

A candidate is weaker for `reatom/reusables` when:

- it hard-codes business entities or route structure
- it bundles multiple concerns together
- it depends on one app's private infrastructure or hard-coded product conventions
- it is mostly a page/model decomposition cleanup rather than a primitive enhancement

## Report format

Use this structure:

# Reatom extension candidates

## Quick triage

Provide a compact table with:
- candidate
- repeated shape
- key evidence (file paths)
- recommendation (`core` / `reusable` / `local extension` / `reatom* factory` / `leave inline`)
- reusable potential (`low` / `medium` / `high`)

## Detailed findings

For each worthwhile candidate include:
- **Pattern** — one-sentence shape
- **Evidence** — concrete files / repeated snippets
- **Why it repeats** — what the current code is manually doing
- **Best abstraction** — core, reusable, extension, factory, or none
- **API sketch** — only if recommending extraction
- **Reusable-catalog potential** — why or why not

## Existing reusable matches

List any current `reatom/reusables` items that already cover part of the problem.

## Best upstream candidate

If any candidate is strong enough, provide:
- proposed item name
- tiny API sketch
- why it belongs in `reatom/reusables` instead of core
- what local validation should happen before proposing it upstream

## Non-candidates / over-abstraction risks

Call out patterns that should stay local or inline.

## Working style

- Prefer concrete evidence over taste.
- Quote file paths clearly.
- Be conservative: repeated code is not automatically a reusable.
- Start with the narrowest useful abstraction.
- When recommending a reusable, explicitly say whether the existing catalog already has it.
- When recommending an upstream proposal, frame it as **candidate after local validation**, not as a guaranteed catalog addition.
