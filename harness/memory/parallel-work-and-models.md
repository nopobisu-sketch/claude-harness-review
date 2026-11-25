---
name: parallel-work-and-models
description: "병렬 작업 선호와 작업 경중에 따른 모델 선택(판단 없는 일 Haiku, 작은 일 Sonnet, 판단·검증 Opus, 감독·결정 대화 Fable), 조사는 researcher 정의, 새 세션은 start_session의 model로, 열린 세션은 set_session_model로 바꾼다"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-11-14T00:00:00.000Z
---


일회성은 백그라운드 `Agent`, 맥락을 이어 갈 일은 새 세션(`start_session`)이라는 기준(2026-11-23 사용자 «일회성은 백그라운드 모델, 맥락 저장 필요한 건 새 세션»)은 core-brief의 «Supervisor by default»가 정본이다. 가르는 질문: «이 일꾼에게 나중에 "아까 그거 이어서"라고 말할 일이 있는가». `Agent` 일꾼은 부른 세션과 함께 죽으므로 부른 세션보다 오래 걸릴 일은 새 세션으로 연다([[supervisor-session]]). Agent 호출에 model을 적는 것은 hooks/require-agent-model.mjs가 강제한다.

작업을 시작할 때 «병렬로 돌릴 수 있는 것»과 «사용자 시간이 필요한 것»을 나눈 진행 리스트를 먼저 달라고 요청한다. 조사·기계적 수정 같은 독립 작업은 백그라운드로 띄우고, 사용자와의 대화가 필요한 결정(grill 등)은 메인 세션에서 동시에 진행하는 방식을 승인했다.

**Why:** 혼자 결정해야 하는 항목이 병목이라, 그 시간을 놀리지 않고 쓰고 싶어 한다. 단순 작업에 큰 모델을 쓰는 것은 낭비라고 본다 — 결정 세션에서 칩을 뿌리면 구현이 전부 최상위 모델로 돌아 비용이 샌다.

**How to apply:**
1. 여러 이슈를 다룰 때 먼저 의존관계를 분석해 3분류(병렬 가능 / 사용자 시간 필요 / 결정 대기로 차단됨)로 제시하고, 겹치는 파일 영역이 있으면 머지 순서를 함께 제안한다.
2. 자리별 모델은 `~/.claude/rules/pstack-models.md`와 프로젝트의 자리별 표가 정본이다(감독 Fable은 [[supervisor-session]] «감독 모델», 검증 Opus, 판단 없는 일 Haiku).
3. **조사는 정의된 `researcher` 에이전트(sonnet·도구 제한·MCP와 CLAUDE.md 뺌)에 맡긴다** — 11-14 같은 과제 비교에서 기본 general-purpose(sonnet) 363,391 토큰·$0.316 대 researcher 90,119 토큰·$0.130(−75%, 결과 질은 같거나 나음). **함정:** 데스크톱 앱 세션은 `.claude/agents/` 폴더가 세션 시작 때 없었으면 정의를 못 읽는다(«researcher not found», 같은 폴더에서 새로 띄운 세션도 못 읽음). 새 CLI 세션(`claude -p`)은 바로 읽는다. 못 읽는 세션에서는 general-purpose에 `model: sonnet`으로 대신한다. 하위 에이전트 몫만 따로 재려면 지휘를 `claude -p --model haiku`로, 하위만 sonnet으로 돌리고 `--output-format json`의 `modelUsage`를 본다.
4. **사용자와 대화하며 내리는 결정(grill, 설계 논의, 트레이드오프 판단)은 `fable`로 진행한다.** 메인 세션 모델은 내가 바꿀 수 없으므로, 결정 단계로 들어갈 때 사용자에게 앱의 모델 메뉴에서 fable로 바꾸라고 알린다.
5. 이미 열린 세션의 모델은 `list_sessions`로 찾아 `set_session_model`(예: `claude-sonnet-5-5`, `claude-opus-5-5`)로 바꾼다 — 다음 턴부터 적용. 에이전트는 자기 세션 모델을 못 바꾼다(self 거부).
