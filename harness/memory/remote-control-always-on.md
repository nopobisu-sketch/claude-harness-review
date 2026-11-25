---
name: remote-control-always-on
description: "모든 세션은 Remote Control을 켠 채로 둔다(11-14 사용자 지시) — 앱 기본값은 이미 켜짐, 에이전트가 start_session으로 연 세션은 첫 턴이 끝나면 set_remote_control로 직접 켠다"
metadata:
  node_type: memory
  type: feedback
  originSessionId: bb4aba6a-07d7-4d5f-aaec-3ff87f7ad51b
  modified: 2026-11-14T00:49:15.916Z
---

2026-11-14 사용자: «메모리에 넣어둬 모든 세션은 항상 remote control 기본으로 켜». 바로 앞에서 감독이 연 «기능 스펙» 세션이 폰에서 안 보여 사용자가 «켜 줘»라고 해야 했다.

**Why:** 사용자는 폰(claude.ai/code·Claude 앱)으로 세션을 오가며 일한다([[phone-remote-no-approval-tools]]). 원격 연결이 꺼진 세션은 폰에서 열 수 없어서, 사용자가 답하거나 `/grill-with-docs` 같은 명령을 칠 수 없다.

**How to apply:**
- 앱 설정 `connect_new_sessions_to_remote_control`은 11-14에 이미 켜져 있었다(사용자가 직접 연 새 세션에 적용). 바꿀 것 없음.
- 그런데 에이전트가 `start_session`으로 연 세션은 이 기본값으로 연결되지 않았다(11-14 실측). 그래서 세션을 연 쪽이 그 세션의 첫 턴이 끝난 알림을 받으면 바로 `set_remote_control`(session_id, enabled true)을 부른다. 첫 턴 전에는 거절된다.
- auto 모드에서 «훅이 입력을 바꿨다»며 판정 없이 거절되면, 거절문이 준 `session` 값을 그대로 넣어 한 번 더 부른다(11-14 이렇게 통과).
- 클라우드 세션(`target: "cloud"`)은 앱 창이 화면에 떠 있어야 만들어진다(`not_on_screen`, 11-14 #1223 실패). 사용자가 원격으로만 일할 때는 클라우드 대신 로컬 세션을 연다.
