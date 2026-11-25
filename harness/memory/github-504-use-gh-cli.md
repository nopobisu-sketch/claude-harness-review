---
name: github-504-use-gh-cli
description: github.com 웹·릴리스 다운로드가 504일 때 로그인된 gh(API·gh release download)는 된다 — 브라우저 찾지 말 것
metadata:
  node_type: memory
  type: reference
  originSessionId: 4d188947-fc82-40fb-9699-9e931eb0e11a
  modified: 2026-11-09T05:29:10.737Z
---

2026-11-09 github.com/trending·릴리스 다운로드(brew cask 포함)가 계속 504였는데, `gh api`와 `gh release download <태그> -R <저장소> -p '<파일>'`은 정상으로 됐다. 익명 웹 경로만 막히고 로그인된 API 경로는 살아 있었다.

**How to apply:** GitHub 504엔 브라우저 로그인 찾기 전에 gh로 받는다. 트렌딩 목록은 trendshift.io로 대신 읽는다. 받은 앱은 `codesign -dv`·`spctl -a -vv`로 서명·공증, 서명자 = 저장소 주 개발자인지 확인 후 설치.
같은 날 이 맥에 설치: ego lite 0.6.2.9(첫 실행 Chrome 데이터 이전 질문은 사용자 몫), Paseo 0.15.3([[grok-gemini-headless-call]]).
