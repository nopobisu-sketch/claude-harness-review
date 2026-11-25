---
name: rea-reverse-engineering-tool
description: rea(리버스 엔지니어링 도구)와 jadx·apktool 설치 상태, 폰 앱을 분석할 때 실제로 통한 순서
metadata:
  type: reference
---

2026-11-15 사용자 요청으로 설치했다.

- `rea` 6.7.0: `npm install --global rea-agents`, Claude Code에 MCP(`rea mcp`)와 스킬 `reverse-engineer-anything`으로 등록(`rea setup --client claude_code --yes`, 클라이언트 이름은 밑줄 표기). `~/.claude.json` 백업은 `.rea.backup`. 네이티브 분석 엔진(Ghidra·Hopper·IDA)과 jadx MCP JAR은 설정하지 않았다 — 필요하면 따로 설치하고 환경 변수로 알려 줘야 한다.

- **11-23 MCP 등록을 뗐다**(사용자 «필요하면 그때그때 붙일게», 30일 호출 1회·도구 207개). `rea` 프로그램과 스킬은 그대로 있다. 다시 붙이기: `claude mcp add -s user rea -- ~/.npm-global/bin/rea mcp`(원래 설정 백업 `~/.claude/backups/mcp-removed-2026-11-23.json`). 붙인 뒤 새 세션부터 도구가 보인다.
- `jadx` 1.5.6, `apktool`: brew로 설치(무료).

안드로이드 앱 분석에서 통한 순서:
1. `adb shell pm path <패키지>`로 경로를 얻어 `adb pull` (분할 APK는 base와 split 모두)
2. `apktool d -s`로 매니페스트와 리소스 먼저 — 권한·서비스 타입·리시버 목록만으로도 구조의 절반이 나온다
3. `jadx -d`로 코드 복원(큰 앱은 10분 이상, 백그라운드로) 뒤 매니페스트에 이름이 남은 부품에서 시작해 참조를 따라간다
4. 복원 폴더는 수 GB라 하위 에이전트에게 읽히고 결론만 받는다

아이폰: App Store 앱은 암호화가 걸려 있어 직접 분석하지 않는다(공개 자료로). 시스템 앱·프레임워크는 시뮬레이터 런타임(`/Library/Developer/CoreSimulator/Volumes/iOS_*/…/RuntimeRoot`)에 암호화되지 않은 채 있어 strings·nm·otool로 읽을 수 있다. 공개 인터페이스는 Xcode SDK의 `.swiftinterface`.
