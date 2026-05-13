# reatom-skill evals

Two parallel eval tracks for the `reatom` skill, following the
[skill-creator schema](https://github.com/S1M0N38/pi-skill-creator/blob/main/skills/skill-creator/references/schemas.md).

## Files

| File | Purpose |
|---|---|
| `evals.json` | 10 outcome evals — does the skill produce production-quality Reatom code? |
| `trigger-evals.json` | 20 description-optimization queries — does pi load this skill when it should (and not when it shouldn't)? |
| `fixtures/` | Input project skeletons referenced from `evals.json` `files` arrays |

## Running outcome evals

`skill-creator` runs each prompt twice — once **with** the skill loaded, once **without** — then grades each `expectations[]` entry against the produced output.

```bash
SKILL=$HOME/.pi/agent/skills/reatom
WS=$HOME/.pi/skill-workspaces/reatom/iteration-1

# Per skill-creator workflow: run each eval inline, save to:
#   $WS/eval-<id>/with_skill/outputs/
#   $WS/eval-<id>/without_skill/outputs/
# then grade against expectations into grading.json,
# then aggregate:
cd /path/to/skill-creator/skills/skill-creator
uv run scripts/aggregate_benchmark.py "$WS" --skill-name reatom

uv run eval-viewer/generate_review.py "$WS" \
  --skill-name reatom \
  --benchmark "$WS/benchmark.json" \
  --static "$WS/review.html"
open "$WS/review.html"
```

## Running trigger evals (description optimization)

```bash
cd /path/to/skill-creator/skills/skill-creator
uv run scripts/run_loop.py \
  --eval-set $HOME/.pi/agent/skills/reatom/evals/trigger-evals.json \
  --skill-path $HOME/.pi/agent/skills/reatom \
  --max-iterations 5 \
  --verbose
```

The script splits 60/40 train/test, runs each query 3× per iteration, proposes
description rewrites, and reports the `best_description` selected by test
score. Apply it back to the SKILL.md frontmatter only after reviewing the
diff.

## Assertion philosophy

Every `expectations[]` item is **objectively grep-able** against the produced
file — no subjective LLM judgment needed for the deterministic subset. The
grader can be reduced to a shell script if you prefer:

```bash
# Pseudo-grader for eval #5
file=outputs/src/theme.ts
grep -q 'withLocalStorage' "$file"           # passed
! grep -q 'localStorage\.\(get\|set\)Item' "$file"  # passed
```

Reserve subjective judgment for **architectural quality** items
("scoped factory pattern", "component-as-rendering-adapter") that grep can't
catch — those go in the human review pass after `review.html` is generated.

## Adding a new eval

1. Write the prompt as a real user would phrase it (no "use the skill to …").
2. Pick or create a fixture under `fixtures/` if the prompt needs starter files.
3. List `expectations[]` as **independently checkable** statements — at least 3,
   ideally 5–7.
4. Bump the next `id`.
5. Re-run the iteration; compare `iteration-N/benchmark.json` to the previous one.

## Fixtures

| Path | Used by | Purpose |
|---|---|---|
| `fixtures/react-app/` | evals 1, 2, 3 | Minimal v1000+ React + Reatom skeleton (post-bootstrap state) |
| `fixtures/v3-codebase/src/store/cart.ts` | eval 7 | A pre-migration v3 file using `@reatom/hooks`, `@reatom/async`, `@reatom/persist-web-storage` |

Fixtures are deliberately tiny — the eval is about what the agent **adds**, not navigating a large repo.
