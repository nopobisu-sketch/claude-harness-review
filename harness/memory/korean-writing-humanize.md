---
name: korean-writing-humanize
description: "한국어는 AI 티 없이 쓴다. 답은 fluent-korean 출력 스타일(장치)이 맡고, 긴 보고서·이슈 본문·덱 문구·앱 화면 문구는 humanize-korean 윤문을 거친다 (11-12 사용자 지시)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7821a492-2902-4813-aa9b-19389cb9adaf
  modified: 2026-11-14T00:00:00.000Z
---

2026-11-12 사용자 지시: «앞으로 너가 한국말을 쓸 때는 한국어 윤문 스킬을 써서 자연스러운 표현으로. 지금 이미 한글 적힌 것들은 자연스럽지 않을 때가 많아. AI가 쓴 것 같은 느낌을 잡아야 돼.» 적용 범위는 «둘 다»(Claude 앱에 쓰는 답 + 만드는 앱의 화면 문구)로 정했다.

**Why:** 내 답에서 «~해요. ~했어요.»가 기계적으로 이어지고 번역투가 섞여 AI가 쓴 글처럼 읽혔다.

**How to apply:** 내 답은 settings.json의 `outputStyle: fluent-korean:fluent-korean`이 맡는다(장치). 그 밖에는:
- 새로 쓰거나 고치는 앱 화면 문구는 PR 전에 `humanize-korean` 스킬로 윤문한다(뜻은 그대로).
- 사용자가 읽을 긴 보고서·이슈 본문·덱 문구도 `humanize-korean`을 거친다. 짧은 답·커밋 메시지·코드 주석에는 쓰지 않는다.
- 자식 세션 브리프에 «화면 문구를 바꾸면 humanize-korean으로 윤문»을 넣는다. 이미 적힌 문구는 humanize-scan으로 화면별 점수를 재고 심한 곳부터 고친다.

관련: [[main-session-is-orchestrator]]
