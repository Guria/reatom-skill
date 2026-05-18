# Upstream checklist for `reatom/reusables`

Use this after you find a promising local extension candidate.

## Minimum bar

A candidate is usually worth proposing upstream only if it is:

- generic across multiple apps or features
- centered on one Reatom primitive
- small enough to explain in a short README example
- valuable even as copied source, not a published package abstraction
- stable enough that its API will not churn with one product decision

## Good signals

- repeated across unrelated features in the same codebase
- easy to rename without losing meaning
- small options surface
- no hard dependency on one page, entity, or route tree
- no hidden requirement for a specific UI library unless that coupling is the point

## Weak signals

- only one current call site
- heavy domain vocabulary in the API
- mixes several unrelated concerns in one helper
- mostly hides long code instead of clarifying a primitive boundary
- awkward typing that outweighs the duplication removed

## Suggested issue note structure

- **Problem**: what repeated primitive-shaped code exists today
- **Proposed reusable**: item name + tiny API sketch
- **Why not core**: this is a common pattern, not a fundamental primitive
- **Why not app-local only**: it appears generic across features/apps
- **Open questions**: edge cases, coupling, naming, version constraints

## Recommendation labels

- **High** — strong candidate for local extraction and plausible upstream follow-up
- **Medium** — good local extension first; upstream only after more reuse evidence
- **Low** — keep local or inline
