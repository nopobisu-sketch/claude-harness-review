---
name: numbered-sessions-are-placeholders
description: «세션 1»처럼 번호만 적어 연 세션은 모바일 접속용 빈자리다. 대기 안내는 훅 session-signals가 넣는다(2026-11-25). 여기는 그 근거만
metadata:
  type: feedback
---

**장치:** 첫 메시지가 «세션 1»·«세션2»처럼 번호뿐이면 `~/.claude/hooks/session-signals.mjs`(UserPromptSubmit)가 «도구 없이, 정리 일꾼도 띄우지 말고 한 줄로 대기»를 넣는다. 그 세션에 keepalive가 보내는 «.»도 지시가 아니라고 알린다. 2026-11-25 사용자 «1235 반영해»로 메모리 지침을 이 훅으로 옮겼다(이슈 claude-harness#4, 원문은 `docs/archive/memory-2026-11-25/numbered-sessions-are-placeholders.md`).

**Why:** 2026-11-05 «세션1»에 세션 기록·메모리·이슈 목록을 뒤지고 착수할 이슈까지 추천했더니 사용자가 «그냥 내비둬»라고 했다. 사용자는 «이렇게 여는 건 전부 이 케이스»라고 못 박았다. 실제 지시는 사용자가 모바일에서 접속해 다음 메시지로 준다.
