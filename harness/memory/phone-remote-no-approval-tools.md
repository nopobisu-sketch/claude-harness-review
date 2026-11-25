---
name: phone-remote-no-approval-tools
description: 사용자는 기본적으로 휴대폰 원격으로 일한다 — 폰에서 처리하기 어려운 권한·승인 창이 뜨는 길은 처음부터 고르지 않는다. 모든 세션·자식 브리프에 적용
metadata:
  node_type: memory
  type: feedback
  originSessionId: 39a71f09-94c2-43c8-8e43-68f05a2ee668
  modified: 2026-11-13T04:59:01.710Z
---

2026-11-12 사용자 지시: «기본적으로 휴대폰에서 나는 업무를 하니까 휴대폰에서 원격으로 처리하기 어려운 권한들이나 그런 것들은 배제해 줬으면 좋겠어.»

**Why:** 승인 창은 맥 화면에 뜨는데 사용자는 폰(Remote Control)으로 보고 있어서 누르지 못한다.

같은 일을 하는 길이 둘이면 승인 창이 뜨지 않는 길을 고른다. 브라우저 창(`mcp__Claude_Browser__*`)·Chrome 확장·computer-use 대신 헤드리스 Chrome·RN-web 하네스·단위 시험·소스 읽기를 쓴다. 그림은 위젯이 아니라 PNG 파일로 보낸다. 일꾼의 승인 요청은 hooks/deny-unattended-prompt.mjs가 거절하고, 폰에서 한 줄로 답하는 질문 모양과 «사람에게 넘기는 것은 진짜 못 하는 것만»은 전역 CLAUDE.md가 정한다. 사용자 세션의 승인 창은 훅으로 못 막는다.
