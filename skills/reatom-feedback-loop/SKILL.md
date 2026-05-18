---
name: reatom-feedback-loop
description: >
  Follow-up correction and skill-improvement workflow for Reatom guidance. Use
  when the user says earlier Reatom advice was wrong, asks why the work
  deviated from the expected process, requests a course correction, or when a
  scaffold/bootstrap run should end with a pitfall summary and reusable skill
  feedback.
allowed-tools: read Bash edit write
---

# Reatom feedback loop

Use this skill after a correction request, process deviation, or completed scaffold run when the work should produce reusable feedback for the skill itself.

This skill exists because "I will follow it next time" is not a reliable fix for an LLM. The durable fix is to identify what instruction shape failed and turn the lesson into clearer skill text, gates, examples, or evaluation prompts.

## Read first

- Read [`references/feedback-loop.md`](references/feedback-loop.md).

## Scope

This skill is for:
- user follow-up that reveals wrong or incomplete Reatom guidance
- comparing expected process vs actual process
- explaining why the work went off track
- distilling reusable lessons after a scaffold/bootstrap run

## Working style

- Fix the user's immediate issue first.
- If that immediate issue is active runtime/test debugging, pull in the sibling `reatom-debug` workflow before distilling lessons.
- If the failure was scaffold-order or bootstrap-gate drift, re-check the sibling `reatom-scaffold` workflow before proposing preventive edits.
- Then extract the reusable lesson.
- If the user says the skill was ignored, do not answer only with an apology or a future promise. Analyze why the existing wording failed as an execution mechanism.
- Prefer preventive changes: move critical gates into always-loaded `SKILL.md`, add artifact checks, add phase names, or add an out-of-order recovery rule.
- Keep feedback general and skill-oriented, not tied to one project's incidental details unless they are necessary evidence.
- Verify unfamiliar or fast-moving claims against the local or upstream Reatom source before turning them into guidance.
