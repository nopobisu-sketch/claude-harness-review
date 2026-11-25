---
name: layout-changes-need-mockup-first
description: 화면 배치(layout)를 바꾸는 작업은 시안을 먼저 보여 주고 승인받은 뒤 코드에 넣는다 (09-28 사용자 지시)
metadata:
  node_type: memory
  type: feedback
  originSessionId: b18df0c0-e2d5-455a-82ab-7e287b42bde1
  modified: 2026-09-28T11:56:15.101Z
---

09-28 사용자: «layout 도 한번 확인해줘 — layout의 경우엔 나한테 시안 보여주고 진행해».
**배치(간격·순서·묶음·위계)를 바꾸는 건
눈으로 먼저 확인하고 싶어 한다.**

**Why:** 비개발자라 코드 diff로는 결과를 못 그린다. 배치는 되돌리기보다 미리 보는 게 싸다.

**How to apply:**
- `/impeccable layout`은 진단(두 평가) → **전후 시안** → 사용자 승인 → 이슈·PR 순서로.
- 시안은 실제 부품에 가깝게: 폰 실화면 캡처(전) + 제안안(후)을 나란히. RN-web 부품 하네스로
  실제 컴포넌트를 렌더하면 가장 정확하다. HTML 목업이면 토큰 값(색·간격)을 DESIGN.md 그대로 쓸 것.
- 안이 여럿이면 비교 후 추천까지 붙인다(→ 전역 CLAUDE.md «답하는 방식»).
