---
name: haiku-batch-classify
description: 글 수천 개를 하이쿠에게 분류시킬 때는 Agent 일꾼 대신 claude -p --model haiku를 스크립트로 묶음 호출한다(플래그·속도·검증 방법)
metadata:
  type: feedback
---

글·파일 수천 개를 하이쿠에게 분류시키는 일은 `Agent` 일꾼 수십 개보다 `claude -p`를 파이썬 스크립트에서 병렬로 부르는 편이 낫다(2026-11-23 프로젝트 X, 글 2,751개).

```
claude -p --model haiku --tools "" --strict-mcp-config --disable-slash-commands \
  --setting-sources "" --no-session-persistence --system-prompt "<분류 지시>" --output-format json < 묶음.txt
```

- 위 플래그면 훅·MCP·CLAUDE.md 없이 지시문과 입력만 간다. 로그인은 그대로 통한다(`--bare`는 쓰지 않았다). 결과 JSON의 `modelUsage`로 실제 모델을, `total_cost_usd`로 API 환산액을 확인한다.
- 실측: 글 40개(제목 + 본문 앞 700자·뒤 200자) 한 묶음이 약 4만 토큰·8초. 6개 병렬로 69묶음이 2분 안에 끝났다.
- 출력은 «ID<TAB>라벨<TAB>…» 한 줄씩 받게 하고, 스크립트가 정규식으로 줄을 걸러 빠진 ID만 다시 보낸다(3회까지). 2,751개에서 빠진 것 0.
- 발췌로 1차를 돌리고, 뺄 후보·애매한 것만 전문으로 다시 묻는 2단계가 싸고 정확했다. 1차에서 뺀 242개 중 122개가 전문 확인에서 뒤집혔다 → 발췌만으로 «뺌»을 확정하지 않는다.
- 같은 주제인데 판정이 갈리는 글(연재·A/S 글)이 나온다. 주된 주제를 따로 붙여 판정과 교차하면 어긋난 묶음을 찾을 수 있다.

**Why:** 입력이 정해져 있고 결과를 기계로 검사할 수 있는 일이라, 일꾼마다 요약을 받아 합치는 방식보다 빠짐·중복을 잡기 쉽고 감독 세션의 컨텍스트도 늘지 않는다.
**How to apply:** 사용자가 «하이쿠 시켜서 분류»처럼 대량 판정을 맡기면 이 방식으로 한다. 스크립트 원본은 프로젝트 X의 `분류결과/scripts/`에 있다.
