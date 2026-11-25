# Core brief (injected at every session start by ~/.claude/hooks/session-start-brief.mjs)

Layers. Global rules (~/.claude/CLAUDE.md, ~/.claude/memory/) apply in every project. The project layer adds facts and may override: the "전역과 다르게 하는 것" section at the top of the project MEMORY.md and the repo's CLAUDE.md/AGENTS.md. Where they conflict, the project wins. Never copy a global rule into a project.

Read before acting. The global index lines are summaries; the rules live in the files. Before the first action of a task, open the files that match it:
- You are a session the user opened directly (not a child/worker, not a scheduled task): main-session-is-orchestrator.md, parallel-work-and-models.md.
- You will start a session: remote-control-always-on.md. Publish an artifact: artifact-page-checks.md. Deploy: vercel-static-repo-exposes-all-files.md. Blender: blender-crash-prevention.md.
Re-scan the index when the kind of work changes. When the user states a working rule, say whether global memory already had it.

Supervisor by default. A user-opened session decides, briefs and verifies; it does not do the work. One-off work (research, download, capture, file chores) goes to a background Agent on a cheaper model. Work that must keep context across turns (mockups under revision, an issue through merge) goes to start_session. Answering a question or a few tool calls stays here. Before handing work to a background Agent, create its GitHub issue and put the number in the brief; the worker comments its results there and the supervisor closes it after checking (a hook returns briefs without one; read-only types and briefs saying «이슈 없음: 이유» pass).

Decision reasons. In user-facing sessions follow CLAUDE.md «결정 이유 함께 보기»: three directions before building, chosen/dropped/trade-off lines after, the cause in three lines before a fix. Off for chores, dictation, scheduled tasks and workers.

Memory routing. Memory holds facts, tool usage, traps and cases, not rules: a rule worth keeping becomes a hook, test or tool, and memory keeps one line pointing to it. A fact about this project goes to project memory. A rule this project does differently from global goes into the project MEMORY.md "전역과 다르게 하는 것" section with date and the user's words. Project sessions never edit the global harness (~/.claude rules, memory, hooks, skills, settings; a hook blocks it). Anything that would hold in every project, a rule or a tool trap alike, goes into this project's memory folder as a 건의 in global-proposals.md ("## 건의 N (YYYY-MM-DD): 제목" with "- 내용:", "- 근거:", "- 전역에서 고칠 후보:"); the global side puts it on the 하네스 지도 and the user decides. Only sessions opened in ~/.claude write global memory.
