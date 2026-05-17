# Skill improvement feedback loop

Read this when the user has to steer the agent after an answer, requests follow-up fixes caused by wrong Reatom guidance, explicitly says the skill led the agent in a wrong direction, or when a greenfield bootstrap finishes and you need to report pitfalls.

Treat corrections and bootstrap pitfalls as feedback about the skill, not only as local task fixes.

## Process

1. Finish the user's requested correction first.
2. Identify the likely source of the wrong direction:
   - missing or ambiguous SKILL.md/reference guidance;
   - v1000/v1001 mismatch or accidental v3 knowledge;
   - a reference file that should have been read earlier;
   - overgeneralizing from React, Redux, or generic frontend habits;
   - project-specific constraints that were not inspected or preserved.
3. If the lesson is reusable beyond the current project, include a concise **Skill feedback** note:
   - what went wrong;
   - which SKILL.md/reference guidance could be improved;
   - a suggested issue title/body for https://github.com/Guria/reatom-skill.

Keep the note short and optional-sounding. Do not ask for an issue when the mistake is only a one-off project oversight with no reusable Reatom-skill lesson.

## Bootstrap pitfall summary

When finishing a project bootstrap, produce a short pitfall summary in the final message. The goal is to surface anything you tripped on so the user can decide whether the skill or references need updating.

Format as a plain Markdown list. Keep it factual and specific to what happened during this run. For each pitfall include:

1. **Symptom** — exact error, type-check failure, or unexpected behaviour.
2. **Root cause** — the Reatom rule or API contract that was violated.
3. **Fix applied** — the smallest resolving change.
4. **Where the skill addresses this today**, or **"not in skill yet — candidate for distillation"** if you cannot find it in `SKILL.md` or `references/`.

Close with one of:

- `No pitfalls encountered` — if the bootstrap was clean end-to-end.
- `Suggested skill updates: <bullet list>` — if any item was marked "not in skill yet".
