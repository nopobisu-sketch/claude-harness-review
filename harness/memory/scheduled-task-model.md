---
name: scheduled-task-model
description: "예약 작업은 모델을 지정하지 않으면 앱 기본 모델(지금은 Fable)로 돈다 — 모델은 사용자가 앱 편집 화면에서만 바꿀 수 있고, 확인하는 법"
metadata:
  node_type: memory
  type: reference
  originSessionId: 4a77f8aa-1f84-4d96-b729-25ef5da75272
  modified: 2026-11-13T13:14:14.947Z
---

예약 작업(`~/.claude/scheduled-tasks/`)은 작업별 모델이 비어 있으면 그때의 앱 기본 모델을 따라간다. 2026-11-10 실행은 Opus 5.5였고, Fable 5.2가 나온 뒤인 11-13 실행은 Fable 5.2였다.

- **에이전트는 못 바꾼다.** `update_scheduled_task`·`create_scheduled_task`에 모델 칸이 없고, `set_session_model`은 자기 세션에 대해 거절된다. 앱 내부 기록 파일을 직접 고치지 않는다(앱이 켜진 채 덮어쓰면 목록이 깨질 수 있다). 사용자가 데스크탑 앱의 예약 작업 편집 화면에서 모델을 고른다.
- **확인하는 법(읽기만)**: `~/Library/Application Support/Claude/claude-code-sessions/*/*/scheduled-tasks.json`의 작업별 `model` 값, 또는 `list_task_runs` → `get_session`의 `model`.
- **2026-11-13 상태**: 사용자가 `proj-e-iphone-night-check`와 `proj-d-dashboard-weekly`를 `claude-opus-5-5`로 바꿨다. `harness-docs-refresh`는 비워 두었다(기본 모델을 따라감, 사용자 선택). `proj-e-workflow-patrol`은 11-15 하네스 최신화에 합쳐 멈췄다.
- **스킬 승인 함정(Claude Code 2.1.325, 2026-11-13부터)**: 예약 작업과 `/loop`은 frontmatter에 `allowed-tools`나 `hooks`를 선언한 스킬을 실행하기 전에 승인을 묻는다. 무인으로 돌리려면 settings의 `permissions.allow`에 `Skill(이름)`을 넣어야 한다. 11-15에 확인한 결과, 직접 만든 스킬 중에는 그런 선언이 없었다. 스킬에 이 두 칸을 넣게 되면 allow도 같이 넣자고 제안한다.
- 요금제는 Max이고 추가 요금(extra usage)은 꺼져 있다. 예약 작업이 Fable로 돌아도 돈이 따로 나가지 않고 Fable 주간 한도만 쓴다.

관련: [[parallel-work-and-models]]
