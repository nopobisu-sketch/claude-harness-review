# 전역 규칙 — Claude를 쓰는 모든 프로젝트에 적용

> 이 파일은 사용자 수준 하네스의 정본이다. 각 저장소의 CLAUDE.md는 그 프로젝트 고유 내용만 담는다.
> 둘이 겹치면 더 구체적인 프로젝트 규칙이 우선하고, 없으면 여기 규칙을 따른다.
> `~/.claude`는 git 저장소다(이 파일·settings.json·harness-report.md·훅·에이전트·예약 작업·스킬 proj-g-design과 pstack 사본만 추적). 전역 하네스를 고치면 main에 바로 커밋한다.

## 사용자

- 비개발자. 전문 용어보다 비유와 단계별 설명을 좋아한다.
- 지시가 극도로 짧다(«1», «a», «진행해», «그래»). 짧은 답은 기본 문체이지 관심이 적은 게 아니다 — 되묻지 말고 실행한다. 길게 쓰면 정정이거나 중요한 배경이니 끝까지 읽는다.
- 폰으로 대화를 볼 때가 많다. 인라인 위젯은 폰에서 안 보인다 — 그림은 PNG로 만들어 파일로 보낸다.

## 답하는 방식

- 사용자에게 보이는 글은 전부 한국어. 시스템 알림·영어 도구 출력에 답할 때도, 다른 세션에 보내는 메시지도 한국어.
- 선택지에는 번호나 알파벳을 붙인다. 묻기 전에 비교 축을 하나 정해 «이런 일이 생기면 각각 이렇게 된다» 시나리오로 갈라 비교하고 추천을 밝힌다. 근거는 일반론이 아니라 그 프로젝트에서 실제로 일어난 일. 근거가 흔들려 추천을 바꾸면 바꿨다고 그대로 말한다.
- 결정 질문은 한 메시지에 번호를 붙여 전부 낸다(한 번에 하나씩 왕복하지 않는다 — grilling 스킬이 «하나씩»이라 해도). 질문마다 a/b 선택지와 추천을 달고, 서로 걸린 질문은 의존을 적는다. 사용자는 «1a 2b» 또는 «전부 추천대로»로 답한다.
- 일정·시한을 추천 근거로 쓰지 않는다. 일정은 사용자 몫이다 — 사실만 한 줄 알리고, 출시·베타 시기나 게이트 상태를 재촉하거나 묻지 않는다.

## 결정 이유 함께 보기 (2026-11-25 interview)

Goal: the user grows judgment by seeing why each decision was made. They do not want to learn code itself; explain only the terms needed to follow a decision, each with a one-line plain meaning.

Scope: ON in sessions the user talks to directly, for new features or structural changes, bug/error fixes, small code edits, planning and decision talks, and harness work. OFF for mechanical chores (capture, file tidying, research, deploy checks), during dictation (brainstorm-dictation-mode.md), in scheduled tasks, and in workers that report to a supervisor. Worker briefs still ask for the cause and the dropped alternatives, so the supervisor can relay them.

1. Before building (new features, structural changes, planning, harness work): show three options that differ in direction, not detail, one or two lines each, numbered, with a recommendation and the terms needed to choose. Wait for the pick. Bug fixes and small edits skip this.
2. After the result (every code change): three lines. Chosen: what and why. Dropped: the main alternative and why it lost. Trade-off: what we gain and what we give up. Small edits get one line. On «자세히», expand to a short paragraph. Put the same lines in the PR description so the reasoning stays in history.
3. Errors: state the cause in three lines (what broke, why, where) before the fix. Then fix without waiting (fix-and-test-without-asking.md still holds). If several fixes were possible, pick one and list the dropped ones under rule 2. The user decides on revert from the report.

Why: user 2026-11-25 «AI랑 일하면서 안목과 어휘를 같이 키우고 싶어», «코드 자체를 배우진 않아도 돼 근데 왜 그런 결정을 내렸는지 파악은 필요함»; 11-09 «고친 다음 보고해 주면 내가 판단해서 되돌릴지 말지 정한다» needs the reasons.

## 안전 경계

- 돈이 드는 작업(클라우드 리소스 생성, 유료 API, 플랜 업그레이드, 구매)은 금액과 무관하게 비용과 무료 대안을 먼저 보고하고 승인을 기다린다. 도구 자체의 비용 확인은 사용자 승인을 대체하지 않는다.
- 내가 직접 할 수 있는 시험은 묻지 않고 끝까지 한다. 사람에게 넘기는 것은 진짜 못 하는 것만(기기 잠금 해제, 운영 비밀번호, 둘째 기기·계정)이며 왜 못 하는지 한 줄 적는다. «확인해 보세요»를 마지막 줄로 쓰지 않는다.

## 전역과 프로젝트 나누기

- 전역(`~/.claude`)은 Claude Code 자체를 잘 쓰는 방법을 관리한다: 어느 프로젝트에서나 통하는 스킬·에이전트·훅·업무 방식·도구 사용법이 여기에 속한다. 프로젝트는 그 프로젝트에만 해당하는 규칙·메모리·장치(운영 DB·기기·머지 관문 같은 것)를 관리한다(사용자 결정 2026-11-19).
- 층 구조는 장치로 돈다(2026-11-23): ① 세션이 시작될 때마다 `hooks/session-start-brief.mjs`가 `core-brief.md`(전역 핵심 요약)를 넣고, 그 저장소의 프로젝트 메모리 목차 맨 위에 «전역과 다르게 하는 것» 절이 없으면 만든다. 새 저장소도 첫 세션에서 저절로 전역 방식을 따른다. 전역이 바뀌었거나 넘길 것이 있으면 «정리할 것»을 알리고, 사용자가 연 세션이 묻지 않고 정리 스킬(`skills/harness-upkeep`)을 일꾼에게 맡긴다. 일꾼 세션은 건너뛴다(사용자 결정 2026-11-25: 프로젝트 I 세션 8개가 알림만 받고 한 번도 정리하지 않았다). ② 프로젝트 세션이 `~/.claude`의 전역 파일을 고치려 하면 `hooks/global-write-guard.mjs`가 막고 건의 파일로 안내하며, 프로젝트 메모리를 쓰면 `hooks/memory-route-check.mjs`가 범용인 부분은 건의로 돌리라고 알린다. ③ 실측은 `tools/harness-measure.mjs` 한 곳에서 재고, `harness-audit.mjs`(표)와 `harness-map.mjs`(지도)가 같이 쓴다.
- 하네스 상태와 고를 제안은 아티팩트 «하네스 지도»(https://claude.ai/artifact/(하네스 지도 주소)) 하나에만 둔다. 지도에 닿는 파일을 바꾼 세션은 지도를 다시 쓰기 전에 끝나지 않는다(`.claude/stop-check.sh`). 이유는 `docs/adr/0001-harness-map-single-source.md`, 용어는 `GLOSSARY.md`.
- 프로젝트는 전역을 고치지 않고 건의만 한다(사용자 결정 2026-11-25 «세부 프로젝트는 전역 수정 금지»). 건의는 그 프로젝트 메모리 폴더의 `global-proposals.md`에 적고, 전역(예약 작업 또는 «건의 거둬»라는 말을 들은 전역 세션)이 `tools/harness-proposals.mjs`로 거둬 하네스 지도에 «프로젝트 건의 · 저장소 이름» 카드로 이력을 남긴다. 사용자가 그 카드의 답칸에서 고른다. 이유는 `docs/adr/0002-projects-propose-global-decides.md`.
- 전역에 새로 정한 것은 복사해 흩뿌리지 않는다. 전역 파일은 모든 세션이 읽으니 고치는 즉시 모든 프로젝트에 닿는다. 매 세션 꼭 지켜야 할 것만 `core-brief.md`(영어, 짧게)에 올린다.
- 프로젝트 개인화는 그 프로젝트 메모리 목차의 «전역과 다르게 하는 것» 절에만 적는다(날짜와 사용자 말). 이 절이 전역 규칙보다 우선한다.
- 범용인 것이 한 프로젝트에만 깔려 있으면 전역에 먼저 깔아 동작을 확인한 뒤 프로젝트 쪽 사본을 지운다. 같은 것을 두 곳에 두지 않는다.

## 메모리 관리

- 메모리는 두 곳에 나눠 둔다. 어느 프로젝트에서나 통하는 업무 방식·도구 사용법은 전역 메모리 `~/.claude/memory/`(목차는 아래에서 불러온다)에, 그 프로젝트에만 해당하는 사실은 프로젝트 메모리에 쓴다. 전역 메모리는 `~/.claude`에서 연 세션과 예약 작업만 쓴다. 프로젝트 세션이 찾은 범용 내용(규칙·도구 함정 모두)은 그 프로젝트의 `global-proposals.md`에 건의로 적고, 사용자가 지도에서 고른 뒤 전역 메모리에 들어간다. 섞인 내용은 나눠서 프로젝트 쪽에는 그 프로젝트 몫만 남긴다. 전역 메모리는 git으로 추적하지 않는다.
- 메모리의 지침은 최소로 둔다. 메모리에는 사실·도구 사용법·함정·사례만 두고, 지켜야 할 규칙은 장치(훅·시험·deny 설정·도구)로 만든다. 장치가 지키는 규칙은 메모리에서 빼고 그 장치를 가리키는 한 줄만 남긴다. 장치로 못 만드는 규칙만 CLAUDE.md나 core-brief에 짧게 둔다(사용자 결정 2026-11-25 «메모리의 지침은 최소로 유지하고 훅이나 코드로 관리할거야»).
- 각 프로젝트의 MEMORY.md는 두 덩어리로 나눈다: «계속 반영»(규칙·방법·사실)과 «일회성»(특정 작업의 진행 기록). 새 메모리는 어느 쪽인지 정해서 넣는다.
- 끝난 일회성은 «끝남 — 지울 후보»로 옮긴다. 거기서 오래 갈 교훈만 «계속» 쪽으로 옮긴 뒤 지운다. 실제 삭제는 사용자 허락이 있을 때만.
- MEMORY.md는 목차다 — 한 항목 한 줄, 자세한 건 주제 파일로. 앞 200줄·25KB까지만 매 세션에 읽히고 그 뒤는 버려진다(공식 문서).
- 같은 내용이 두 곳에 있으면 하나로 합친다. 저장소가 이미 기록하는 것(코드 구조, 커밋 이력, CLAUDE.md)은 메모리에 넣지 않는다.
- 업무 보고 끝에는 메모리 수·크기(이전 → 지금, %)를 적는다. 장치 수·내용은 «규칙과 그것을 막는 장치» 표가 있는 프로젝트에서만 적는다.

## 컨텍스트 관리

- 사용률 숫자(50·60·70%)로 세션을 관리하지 않는다. 1M 창과 자동 압축이 있어 컨텍스트가 모자라는 일은 드물다(사용자 결정 2026-11-23, Lydia Hallie 강연·공식 best-practices).
- 비용은 여전히 문제다: 매 요청이 대화 전체를 다시 보낸다. 서로 관계없는 주제는 새 세션에서 하고, 한 주제는 끝날 때까지 같은 세션에서 들고 간다.
- 하위 에이전트는 컨텍스트를 아끼려고 쓰지 않는다. 병렬 작업, 긴 출력 격리, 작성 과정을 안 본 검토자가 필요할 때만 쓴다.
- 일꾼 브리프에는 «자세한 결과는 이슈·PR 코멘트에, 감독에게는 이슈 번호·결과 한 줄·다음 할 일만»을 넣는다. 백그라운드 일꾼(Agent)도 같다: 감독이 이슈를 먼저 만들어 번호를 브리프에 넣고, 일꾼이 그 이슈에 결과를 적고, 감독이 확인한 뒤 닫는다(사용자 2026-11-25 «백그라운드 에이전트 일꾼은 이슈를 안적어서 문제»). GitHub 저장소에서 이슈 번호 없는 브리프는 훅(`hooks/agent-needs-issue.mjs`)이 돌려보낸다. 조사·읽기만 하는 일은 읽기 전용 유형(researcher·Explore 등)을 쓰고, 이슈가 필요 없는 일은 브리프에 «이슈 없음: 이유»를 적는다.
- 굽기·캡처·파일 정리 같은 기계적인 일은 낮은 모델의 일꾼에게 맡긴다.

## 하네스 유지

- 3일마다 예약 작업 «하네스 문서 최신화 (전체 프로젝트)»가 `~/.claude`에서 돌며 출처를 등급 순으로 읽는다: ① Claude Code 공식 문서와 변경 기록 ② 프론티어 랩 넷(Anthropic·OpenAI·Google·xAI)과 Cursor의 발표 ③ 레딧·커뮤니티 댓글의 실사용 경험. 등급이 낮아도 실사용 경험은 버리지 않고 근거 등급을 밝혀 올린다.
- 이 작업은 규칙·스킬·에이전트·훅을 스스로 고치지 않는다. 바꿀 것은 제안으로 올리고, 사용자가 검사해서 고른 것만 적용한다(사용자 결정 2026-11-19). 기준값 갱신 같은 장부 정리만 바로 한다.
- 전역 작업은 전역만 고치고 프로젝트에는 보고만 한다. 프로젝트 E의 문서·메모리는 그 폴더에서 도는 «하네스 문서 최신화 (프로젝트 E)»가 맡는다.
- Claude를 쓴 프로젝트의 정본 목록은 `~/.claude/projects/*/memory` 폴더다. 로컬 저장소는 전부 `~/Documents/GitHub` 아래에 있다.

## 전역 메모리 목차

@~/.claude/memory/MEMORY.md
