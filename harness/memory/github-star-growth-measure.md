---
name: github-star-growth-measure
description: "GitHub 저장소의 «최근 별 증가»를 재는 법 — 별 누른 사람 목록 API는 막혔고 OSS Insight도 못 냄, 남은 건 Trending 페이지"
metadata:
  node_type: memory
  type: reference
  originSessionId: 36c2d3fb-599c-4437-8463-649294cd36a3
  modified: 2026-11-10T12:22:33.686Z
---

2026-11-10 «앱 빌딩 저장소 100» 순위를 만들며 확인한 사실.

- GitHub REST `repos/{o}/{r}/stargazers`는 404, GraphQL `stargazers` 연결은 빈 배열 — 누가 언제 별을 눌렀는지 셀 수 없다.
- OSS Insight `/v1/trends/repos`는 2026-03-01부터 «GitHub 공개 이벤트 수집이 평소의 0.3%로 떨어져 순위를 낼 수 없다»고 빈 값을 준다. GH Archive 기반 도구도 같은 처지일 것.
- 남은 공식 출처는 github.com/trending(전체·언어별, `?since=weekly|monthly`)의 «N stars this week/month». 페이지당 약 25개라 언어 15개를 돌려야 400개 남짓. 트렌딩 밖 = 값 없음(0 아님).
- 총 별·최근 커밋 수는 GraphQL 한 번에 15개씩: `stargazerCount`, `defaultBranchRef.target.history(since:)totalCount`.
- 결과물: 아티팩트 «앱 빌딩 저장소 100»((아티팩트 주소)), 측정 스크립트는 그날 세션 scratchpad에만 있었다.
