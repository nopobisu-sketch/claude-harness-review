---
name: figma-bridge-tool
description: "Figma를 읽고 고칠 때는 전역 브릿지 ~/.claude/tools/figma-bridge(server.js·run.js·plugin/, 포트 8473) — MCP 월 20회·REST 쓰기 불가를 피하는 무료·무제한 길, 플러그인 들여오기는 사람 몫(숨은 폴더 ⌘⇧.), 탭 여러 개면 명령이 번갈아 감, 코드 캐시 함정, 시험은 bridge.test.sh"
metadata:
  type: reference
---

Figma 파일을 읽거나 고쳐야 하면 프로젝트마다 브릿지를 새로 만들지 말고 전역 한 벌을 쓴다: `~/.claude/tools/figma-bridge/` (쓰는 법은 그 폴더 README).

- 서버 `node ~/.claude/tools/figma-bridge/server.js`(백그라운드) → Figma에서 «Claude Figma 브릿지» 플러그인 실행 → `node ~/.claude/tools/figma-bridge/run.js 명령.js [--out 결과.json]`. 명령 파일은 async 함수 본문, `return`한 순수 데이터가 돌아온다. 바이트는 `b64(...)`.
- 포트 8473 하나. 프로젝트 E 거울 플러그인의 «브릿지 연결»도 같은 포트라 같은 서버에 붙는다. 플러그인 창은 하나만.
- **왜 이 길인가**: Figma MCP는 Starter × View 시트에서 월 20회라 6~7번 만에 끊긴다. REST에는 쓰기 스코프가 아예 없다(돈으로도 안 됨). Plugin API는 한도 없고 무료다.

**사람 몫(처음 한 번)**: Figma 데스크톱 → Plugins → Development → Import plugin from manifest → `~/.claude/tools/figma-bridge/plugin/manifest.json`. `.claude`가 숨은 폴더라 파일 고르기 창에서 ⌘ + Shift + . 을 눌러야 보인다.

**함정**
- 같은 플러그인이 Figma 파일 탭 여러 개에서 떠 있으면 명령이 탭끼리 번갈아 간다. 명령 앞에 `figma.root.name` 검사를 넣거나 다른 탭의 플러그인을 닫는다(프로젝트 G 작업 09-26에 겪음).
- Figma 개발 플러그인은 `code.js`·`ui.html`을 캐시한다. 플러그인 파일을 고쳤으면 manifest를 다시 들여와야 한다. 브릿지로 보내는 명령은 매번 새로 가므로 무관하다.
- 플러그인은 지금 열린 파일만 본다. 명령당 180초(`FIGMA_BRIDGE_TIMEOUT_MS`).

**내력**: 프로젝트 E `tools/figma-bridge`(#361, 09-11)와 프로젝트 G가 이식해 고친 판(포트 8474) 두 벌이 따로 있던 것을 2026-11-22에 전역 한 벌로 합쳤다. 프로젝트 G 사본은 그날 지웠고(프로젝트 G 커밋 4d82ba5), 프로젝트 E 사본은 이슈→PR로 지운다(전역 harness-report «프로젝트에 넘길 것»).

**시험**: `zsh ~/.claude/tools/figma-bridge/bridge.test.sh` — Figma 없이 진짜 `plugin/code.js`를 가짜 Figma 안에서 돌려 왕복 전체를 잰다(18건). 진짜 Figma 안에서는 들여온 뒤 `run.js --health`로만 확인된다.

관련: [[fix-and-test-without-asking]], [[verification-lessons]]
