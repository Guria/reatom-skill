# Skill improvement feedback loop

Read this when the user has to steer the agent after an answer, requests follow-up fixes caused by wrong Reatom guidance, or explicitly says the skill led the agent in a wrong direction.

Treat the correction as feedback about the skill, not only as a local task fix.

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
