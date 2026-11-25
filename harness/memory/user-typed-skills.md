---
name: user-typed-skills
description: "Skill 도구가 거절하는 스킬은 사용자가 입력창에 직접 친다 — mattpocock 워크플로(/to-spec·/implement 등, disable-model-invocation)와 pstack(~/.claude/skills/pstack, 겹치는 5개+Cursor 전용 1개 뺀 사본, 자동 업데이트 없음). «켜라» 안내 금지, bash 칸에 적지 말 것, 애디 오스마니 agent-skills 다시 권하지 말 것"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-11-15T00:00:00.000Z
---

## mattpocock 워크플로 스킬

CLAUDE.md가 지시하는 워크플로(`/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`, 그 외 `/triage`·`/grill-me`·`/handoff` 등)는 mattpocock-skills 플러그인의 스킬이지만 SKILL.md에 `disable-model-invocation: true`가 박혀 있어 **내 자동 스킬 목록에는 나타나지 않는다**. 사용자가 슬래시로 직접 입력하면 정상 동작한다. 옛 메모리(08-16)에 «비활성이니 켜라고 안내하지 말 것»으로 기록됐고, 08-22 플러그인 디렉터리에서 재검증했다(숨김 21개 / 노출 19개 — tdd·code-review·grilling·diagnosing-bugs·research 등은 노출).

- **«사용자가 나에게 돌려달라고 부탁해도» 내가 호출할 수 없다** (09-20 실측). Skill 툴로 `mattpocock-skills:to-spec`을 부르면 거부되며, 거부문이 두 가지를 못박는다 — (1) 사용자가 직접 치게 안내할 것, (2) **다른 수단으로 그 워크플로를 흉내내지 말 것**. 그러니 «제가 대신 돌리겠습니다»라고 하지 말고, 바로 칠 슬래시 명령을 알려준다.
- **11-05 갱신:** 사용자가 메시지에 슬래시 이름을 적으면(«너가 직접 시작해줘 /mattpocock-skills:grill-with-docs») Skill 툴 호출이 통과했다(ask-matt·grill-with-docs 둘 다). 사용자가 이름을 적었으면 «직접 치세요»라고 하기 전에 한 번 불러 본다. 이름을 적지 않은 스킬은 위 규칙 그대로다.
- **11-15 실측:** 사용자가 이름을 적은 메시지가 «앞선 턴»이면 통하지 않는다. 첫 메시지에 `/mattpocock-skills:improve-codebase-architecture`를 적었어도, 두 턴 뒤에 «자는 동안 해 줘»라는 메시지를 받고 불렀더니 거절됐다. 무인 실행을 부탁받으면 «자기 전에 슬래시 한 줄을 직접 보내 달라»고 그 자리에서 먼저 말한다.
- **슬래시 명령을 `bash` 코드 칸에 적지 말 것 (11-05, #887):** 이 앱은 bash 칸에 실행 버튼을 붙인다. `/to-spec #887`을 그렇게 적었더니 사용자가 눌러서 터미널로 들어갔고 «no such file or directory»가 났다. 슬래시 명령은 본문 안의 짧은 코드로 적고 «채팅 입력창에 보내 주세요»라고 말한다. 이름도 전체 이름(`/mattpocock-skills:to-spec`)으로 적는다. 터미널로 들어간 명령은 «사용자가 메시지에 적은 것»으로 치지 않아 Skill 호출이 거부됐다.
- **다른 세션이 보낸 슬래시도 안 된다 (11-09):** 메인 세션이 SendMessage로 자식 세션에 `/mattpocock-skills:implement #969`를 보냈더니 자식이 «사용자 입력이 아니다»로 거부했다. 이 스킬들은 사용자가 그 세션 입력창에 직접 쳐야 한다 — «대신 보내 드릴게요»라고 하지 말고 어느 세션 입력창에 칠지 링크와 함께 알려라.
- 사용자가 직접 치면 스킬 본문이 내 턴에 주입되고 그때는 내가 그 절차를 수행한다 — 막히는 것은 «내가 시작하는 것»뿐이다.

## pstack (11-09 설치)

사용자 요청(«맵폭콕이랑 겹치지 않는 선에서 피스텍 깔아줘»)으로 설치. 위치 `~/.claude/skills/pstack`(사용자 범위, 새 세션부터 로드), 원본 cursor/plugins `harness/pstack/claude-code`(MIT). 버전 이력은 `skills/pstack`의 git 로그가 정본(지금 v0.15.48 @41e4009, 11-25).
- 뺀 것(겹침): tdd·teach·architect·figure-it-out·interrogate·make-bot-ui(Cursor 전용). 공식 설치는 전부 아니면 전무라 일부만 못 고른다 — 그래서 사본. 상시 비용 약 3.2k 토큰/세션.
- setup-pstack만 모델이 부를 수 있고 나머지는 사용자 입력 전용 — Skill 도구가 거절하니 사용자에게 `/pstack:이름`을 치라고 안내한다.
- 업데이트는 저절로 안 따라온다: 새 sparse checkout → 같은 제외로 rsync(`--delete`) → `skills/pstack`만 커밋. 버전 비교는 `gh api repos/cursor/plugins/contents/harness/pstack/claude-code/plugin.json`. 11-18 실측: «확인»만 말했을 때 자동 모드가 덮어쓰기를 막았고 «올려 줘» 뒤에는 통과 — 확인 요청에는 비교까지만 하고 올릴지 한 번 묻는다.
- 함정: `/pstack:recall`은 현재 작업 폴더의 대화만 읽어 워크트리마다 따로 본다(앱 세션 검색 도구로 대신). 모델 설정 파일 `~/.claude/rules/pstack-models.md`가 기본값을 덮는다. reflect·arena·swarm은 모델을 여럿 띄운다.
- **11-09 사용자 결정: 애디 오스마니 agent-skills는 설치 안 함**(25개 대부분이 매트 포콕·CLAUDE.md·훅과 겹침). 다시 권하지 말 것.

**Why:** 목록에 없다고 «설치/활성화가 필요하다»고 말하거나 대신 돌리려다 실패하는 툴 호출 한 번과 사용자 왕복을 아낀다.
**How to apply:** 그 단계가 필요하면 전체 슬래시 이름을 본문 짧은 코드로 알려 주고 «채팅 입력창에 보내 주세요». 사용자가 이름을 메시지에 적었으면 한 번 불러 본다.
