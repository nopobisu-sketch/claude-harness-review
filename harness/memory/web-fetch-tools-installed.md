---
name: web-fetch-tools-installed
description: 2026-11-18에 깐 웹 수집 도구 셋(Scrapling·last30days·insane-search)의 설치 위치, 꺼 둔 자동 연결, 실행 함정
metadata:
  type: reference
---

2026-11-18에 사용자가 유튜브 댓글에 적힌 세 가지를 깔아 달라고 해서 전역으로 설치했다.

| 도구 | 설치 방식 | 부르는 법 |
|---|---|---|
| Scrapling 0.5.1 | `uv tool install "scrapling[all]"`, 스킬은 `~/.claude/skills/scrapling-official`(저장소의 zip을 풀어 복사) | 스킬 `scrapling-official`, 명령 `scrapling extract get\|fetch <주소> <파일.md> --ai-targeted` |
| last30days 4.3.2 | 플러그인 `last30days@last30days-skill` | `/last30days <주제>` |
| insane-search 0.17.6 | 플러그인 `insane-search@gptaku-plugins`, 의존 플러그인 gptaku-core 0.2.4가 함께 깔림 | 스킬 `insane-search:insane-search` |

**꺼 둔 것 (내 판단, 사용자 결정 전까지 켜지 말 것)**
- gptaku-core는 훅 넷(세션 시작·프롬프트마다·WebFetch 뒤)으로 모든 세션에 «웹 조회 전에 gptaku 스킬 먼저» 규칙을 넣는다. 감독·일꾼 세션 전부와 기존 조사 순서([[research-sources]])에 영향을 주므로 `~/.claude/settings.json`의 `env.GPTAKU_ROUTER=off`로 껐다. 새 세션의 훅 프로세스가 이 값을 보는 것까지 실측했다.
- insane-search의 첫 실행 스크립트(setup.sh)는 settings.json에 업데이트 확인 훅을 넣고 GitHub 별표를 묻는다. `~/.gptaku-setup/insane-search.json`과 `insane-search.star.json`(no)을 미리 만들어 둘 다 건너뛰게 했다. 이 파일을 지우면 다시 시도한다.
- Scrapling의 MCP 서버(`scrapling-mcp`)는 등록하지 않았다.

**실행 함정**
- 이 맥의 `python3`은 3.9.6이라 insane-search 엔진이 `dataclass(slots=True)`에서 죽는다. `python3.12 -m engine <주소> --trace`로 돌린다(스킬 폴더에서).
- `scrapling install`은 playwright용 chromium만 받는다. patchright가 다른 빌드를 찾아 실패하면 `~/.local/share/uv/tools/scrapling/bin/python -m patchright install chromium`.
- last30days는 `--preflight`로 쿠키를 읽지 않고 상태만 볼 수 있다. 브라우저 쿠키 읽기는 사용자 동의가 있을 때만 켜진다.

**한계**
- 봇 차단·CAPTCHA를 속여서 넘는 단계(TLS 지문 위장, 스텔스 브라우저, Cloudflare 풀이)는 Claude가 실행하지 않는다. 공개 API·RSS·일반 요청·자막 추출 같은 경로만 쓴다.

**last30days를 사람 없이 돌리기(11-19 실측):** 스킬로 부르면 첫 실행 질문이 떠서 멈추므로 엔진을 직접 돌린다. 명령은 `scheduled-tasks/harness-docs-refresh-global/SKILL.md` §4가 정본이다(`LAST30DAYS_ALLOW_ENGINE_PLAN=1`이 없으면 «LAW 7: no --plan»으로 검색 전에 멈춘다).

**11-23:** 레딧 검색이 이 네트워크에서 403, 키 없는 웹 검색은 throttled라 결과가 빈약했다. 기술 주제는 결과가 비었으면 바로 researcher 에이전트로 공식 문서를 보충한다.
