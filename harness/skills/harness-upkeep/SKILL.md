---
name: harness-upkeep
description: Bring this project's own harness (개별 하네스) in line with the global harness after the global one changed. Use when the session-start brief says "Upkeep due" / «정리할 것», or when the user asks to tidy this project's harness, memory or instructions against the global rules.
---

# 정리 (project upkeep)

One procedure for every project. Project-specific differences live only in the "전역과 다르게 하는 것" section at the top of this project's MEMORY.md; follow those lines where they add to or change a step below. Terms are defined in `~/.claude/GLOSSARY.md`.

A supervisor session hands this to a background worker on a cheaper model: it is one-off work. The worker reports one line back. The brief says «이슈 없음: 하네스 정리 — 기록은 .harness-upkeep.json과 하네스 지도» (the agent-needs-issue hook returns briefs without an issue number or that line); a handoff that needs a PR still follows this repo's own issue rule.

## Steps

1. **List what is due.** `node ~/.claude/tools/harness-upkeep.mjs status`. Items are: first upkeep, global harness changed, and handoff lines `[nMMDD-NN → scope]` from the «프로젝트에 넘길 것» section of `~/.claude/harness-report.md`.
1b. **New repo checks (only when "first upkeep" is due).** Report each in one line; change nothing in repo settings unasked.
   - GitHub remote: `gh repo view --json hasIssuesEnabled`. Workers here need an issue number in their brief (agent-needs-issue hook), so issues must be on. If they are off, tell the user.
   - Tests without a gate: if the repo has tests but no `.claude/stop-check.sh`, add one the way handoff n1123-01 describes (only changed files, the repo's own commit rule).
   - Location: a repo outside `~/Documents/GitHub` does not appear on the 하네스 지도; say so.
2. **Apply handoffs.** For each pending handoff, read its full line in `harness-report.md` and do what it asks in this repo. Commit the way this repo's own CLAUDE.md/AGENTS.md says (some repos require issue → branch → PR; never push to a protected main). A change to this repo's hooks or settings is shown to the user before it lands.
3. **Remove what global already covers.** Read the global layer (`~/.claude/CLAUDE.md`, `~/.claude/core-brief.md`, `~/.claude/memory/MEMORY.md` and the files its lines point to). For each project memory file or instruction line that says the same thing, move its index line to «끝남 — 지울 후보». Deleting files needs the user's yes; moving to the candidate list does not.
4. **Propose what is general.** A project memory fact that would hold in any project is not written to `~/.claude` (project sessions never edit the global harness; a hook blocks it, user decision 2026-11-25). Add it as a 건의 to `global-proposals.md` in this project memory folder ("## 건의 N (YYYY-MM-DD): 제목" with "- 내용:", "- 근거:", "- 전역에서 고칠 후보:"); the global side puts it on the 하네스 지도. The project keeps its own part.
5. **Check the overrides.** Each line in "전역과 다르게 하는 것" must still differ from the current global rule. If global now says the same, move the line to «끝남 — 지울 후보». If an override rule appears in two or more projects, say so in the report: it is a candidate for a global change.
6. **Instructions length.** If CLAUDE.md + AGENTS.md exceed 200 lines, do not rewrite them unasked; mention it in the report.
7. **Record and update the map, in this order.**
   1. `node ~/.claude/tools/harness-upkeep.mjs done`
   2. `node ~/.claude/tools/harness-map.mjs repo .` and write the printed `repos/<slug>` document to the 하네스 지도 with ArtifactData (read its version first, then `set` with `if_version`). If it says the repo is not on the map (outside `~/Documents/GitHub`), write nothing.
8. **Report** in Korean, short: what was applied, what moved to «지울 후보», which 건의 were filed for global, and project memory count/size before → after.
