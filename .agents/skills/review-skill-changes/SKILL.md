---
name: review-skill-changes
description: >
  Review uncommitted changes in this reatom-skill repo when the task is to
  inspect modified skill docs, references, evals, or README text for skill
  quality. Use for requests to review local changes, align them with skill best
  practices, validate Reatom-specific claims against ~/ghq/github.com/reatom/reatom,
  and rewrite edits so they read naturally in the target document without
  session-specific leakage or stray project-only details.
metadata:
  internal: true
allowed-tools: read Bash edit write
---

# Review local skill changes

Use this local-only skill when the user asks to review uncommitted changes in this repository, tighten skill wording, validate technical claims, or make edits feel native to the surrounding text.

This skill is intentionally stored under `.agents/skills/` so it helps maintain this repo without being shipped as part of the public skill package.

## Repository safety

Git is read-only exploration here.

Allowed git commands:
- `git status --short`
- `git diff`, `git diff --stat`, `git diff -- <path>`
- `git log`, `git show`

Forbidden git commands:
- `git add`
- `git commit`
- `git reset`
- `git restore`
- `git checkout`
- `git stash`
- `git apply --cached`
- any command that changes the index, staged area, branches, commits, or working tree through git

If staged changes already exist, treat them as user state. Inspect only. Never stage, unstage, discard, or commit on the user's behalf.

## Review goals

For every review pass, check these in order:

1. **What changed**
   - inspect `git status --short`
   - inspect the relevant diffs
   - focus on changed skill docs, references, evals, package docs, and internal maintenance files

2. **Does it fit skill best practices**
   - frontmatter is valid and the name matches the directory
   - description says both what the skill does and when it should trigger
   - always-loaded `SKILL.md` stays focused; heavy detail belongs in references
   - references are clearly routed from `SKILL.md`
   - evals are realistic and generic enough to catch regressions
   - new wording strengthens execution, not just explanation

3. **Does the text sound native to the target file**
   - rewrite anything that reads like session spillover, pasted analysis, or current-context contamination
   - keep wording consistent with neighboring files in tone and abstraction level
   - avoid random local paths, model names, temporary examples, or one-off transcript residue in distributed docs
   - avoid naming unrelated libraries or project-only specifics unless they are genuinely part of the skill topic

4. **Are technical claims actually supported**
   - validate Reatom-specific claims against `~/ghq/github.com/reatom/reatom`
   - prefer local source inspection first, then pinned upstream links if the target doc needs citations
   - if a claim cannot be validated quickly, soften or remove it instead of leaving speculative guidance

5. **Did the edit stay internally consistent**
   - README summaries, skill descriptions, references, and evals should not contradict each other
   - if a new skill is added, update package overview/counts and any nearby lists that describe the repo structure
   - validate JSON after editing

## Working method

### 1. Read the diff before rewriting

Do not start by rewriting entire files. First understand:
- which files changed
- what new behavior or guidance is being introduced
- whether there are nearby canonical files to borrow tone from

For new skills, read sibling skills in this repo before editing so the new file matches the package voice.

### 2. Validate claims at the smallest useful boundary

When a changed line makes a concrete Reatom claim, inspect the nearest source location that proves or disproves it. Common targets:
- `packages/core/src` for core behavior and exported methods
- `packages/react/src` and `packages/react/README.md` for adapter/provider/setup behavior
- existing repo references under `skills/reatom/references/` for already-preserved guidance that should be reused rather than re-invented

Do not cite broad memory when a source file can answer the question.

### 3. Rewrite for native fit

A good maintenance edit should read as if it always belonged in the document.

Preferred moves:
- replace over-specific session phrasing with stable repo language
- lift one-off examples into reusable categories
- keep trigger descriptions broad enough to fire, but not stuffed with procedural details
- move low-level implementation detail out of frontmatter and into body/reference text when possible

Avoid:
- "based on the current conversation"
- stray references to tools, libraries, or app details that are not actually part of the skill's scope
- text that sounds like review notes pasted into user-facing docs

### 4. Edit precisely

Use `edit` for targeted fixes. Use `write` only for new files or full rewrites.

After editing:
- re-read the touched sections
- confirm the wording still flows in context
- validate any changed JSON files

## Review checklist

Use this checklist before reporting back:

- [ ] changed files inspected
- [ ] neighboring files read for style when needed
- [ ] trigger/description quality checked
- [ ] progressive disclosure respected
- [ ] claim validation done against local Reatom source when needed
- [ ] wording cleaned of session-specific leakage
- [ ] no unrelated library/project-only details left behind
- [ ] JSON parsed if edited
- [ ] no git-mutating commands run

## Reporting format

Use a concise report:

```md
Updated:
- `<path>` — <what changed and why>

Validated:
- <claims checked against source>
- JSON parse: <ok / not applicable>
- Git safety: no mutating git commands run

Open questions:
- <only if something still looks ambiguous>
```

If the user asked for an actual cleanup pass, make the edits first and then report the touched paths.
