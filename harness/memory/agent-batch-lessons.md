---
name: agent-batch-lessons
description: "티켓 여러 장을 백그라운드 에이전트로 병렬 실행·머지할 때의 운영 교훈: CI 대기 폴링, 충돌은 문서·import에서, git add 파일 명시, 스트림 정지 대비, worktree 레시피, 같은 모듈 티켓은 막힘 관계로"
metadata:
  node_type: memory
  type: feedback
  originSessionId: ac642aa0-15bf-47b5-93f1-c281ec8b963d
  modified: 2026-11-14T00:00:00.000Z
---

2026-09-20~21 프로젝트 E «깊게 배치»(티켓 9장)를 메인 세션(fable)이 조율하고 opus 에이전트가 worktree 격리로 구현·PR, 메인이 검토·머지하는 방식으로 돌렸다. 잘 된 것과 걸린 것:

- **결정은 스펙 이슈, 티켓은 경로 없이, 에이전트 프롬프트에만 파일:줄** — 티켓에 경로를 넣지 않는 규칙과 에이전트의 정확성을 둘 다 지켰다. 에이전트가 «결정과 다르게 한 것»을 PR 본문에 적게 하니 검토가 빨랐다(9건 중 전부 취지 안).
- **`gh pr checks --watch`는 required check가 없는 저장소에선 즉시 끝난다** — «no required checks reported». 기다리려면 `--json name,bucket`을 jq로 폴링하는 until 루프를 `run_in_background`로(포그라운드 sleep은 막힌다).
- **병렬 PR의 충돌은 코드가 아니라 문서·import 블록에서 난다** — 구조 문서의 이웃 불릿(두 PR이 같은 절을 고침), 훅 파일의 import 줄. 에이전트 worktree에서 `git merge origin/main` → 파이썬으로 블록 치환 → 시험 → push, CI 재통과 뒤 머지. 웨이브를 파일 겹침으로 나눠도 문서 충돌은 남는다 — 문서를 건드리는 티켓은 같은 웨이브에 하나만.
- **node_modules 심볼릭 링크는 gitignore(`node_modules/` 디렉터리 패턴)에 안 걸려 `??`로 뜬다** — 에이전트에게 `git add -A` 금지·파일 명시를 못 박을 것.
- **비용·시간**: 티켓당 15~20분, 에이전트 토큰 20만~33만. 8시간 안에 9장 머지.

**Why:** 같은 방식(스펙 → 티켓 → 병렬 에이전트 → 메인 머지)을 다시 쓸 때 같은 함정에 두 번 걸리지 않기 위해.

**How to apply:** 배치 시작 전 이 목록을 프롬프트 템플릿에 반영(`git add` 파일 명시). CI 대기는 jq 폴링 백그라운드. 문서 충돌 대비로 구조 문서·ADR을 고치는 티켓은 웨이브당 하나. 관련: [[bash-tool-traps]]

**10-03 배치(에이전트 8번) 교훈:**
- **스트림 정지로 2번 멈췄다**(«no progress for 600s»). 둘 다 거의 끝난 상태였다.
  - «단위마다 커밋·push, 첫 push 뒤 draft PR» 지시 뒤로는 핵심 커밋이 살아남았다.
  - 멈춘 에이전트의 커밋 안 된 수정은 메인이 이어받는다. 다른 worktree 파일은 Edit 훅이 막으니 `git diff`를 patch로 떠서 내 worktree에 apply한다.
  - 원격 브랜치에 `git push origin HEAD:<그 브랜치>`로 올리면 같은 PR을 이어 쓴다.
  - 지우기 전에 patch와 커밋 diff를 대조할 것.
- **백그라운드 Bash 한도**: 명령 30분, 서버는 1시간에 끊긴다 → 긴 비교 측정은 나눠 돌린다.
- **세션 스크래치는 열흘 안에 비워진다**(10-03 → 10-14에 스크립트 전부 사라짐). 다시 쓸 도구는 저장소 밖 영구 폴더로 옮겨 둔다.
- 에이전트가 띄운 측정 서버가 남는다 → 받은 뒤 `lsof -iTCP:<포트>`로 확인하고 끈다.

**배치 메모에서 옮겨 온 교훈 (09-24~10-03)**
- **에이전트 worktree 레시피**: `git fetch && git checkout -b claude/issue-N-slug origin/main` → 의존성은 자기 worktree에서 `npm ci`로 설치한다(다른 worktree를 가리키는 rm·ln은 11-12에 승인 창으로 128분 멈췄다 → [[supervisor-session]]) → `git add`는 파일 명시.
- **재개한 worktree 일꾼의 함정(11-12 실측)**: `isolation: worktree`로 띄웠어도 워크트리를 만들기 전에 끊긴 일꾼은 재개 때 띄운 세션의 작업 폴더에서 돈다(그 폴더의 브랜치를 바꿀 수 있다). 재개 뒤에는 전사의 model 칸과 `git worktree list`로 누가 어디서 도는지 보고, 감독 폴더가 점유됐으면 감독의 git 작업은 `gh -R <저장소>`와 scratchpad 임시 워크트리(`git worktree add <scratchpad>/... origin/main`)로만 한다.
- **병렬 PR이 CONFLICTING이면 CI가 아예 안 돈다** — until 폴링이 영원히 기다린다. `mergeable`부터 볼 것. 앞 PR 머지 뒤엔 `gh pr update-branch`로 다시 CI(충돌이면 거부 → worktree에서 merge).
- **다른 worktree 파일은 이 세션의 Edit/Write 훅이 막는다** — 에이전트에 SendMessage로 맡기거나 `git diff`를 patch로 떠서 내 worktree 새 브랜치에 apply. 에이전트엔 «단위마다 커밋·push»를 지시(스트림 와치독에 멈춰도 잃지 않게).
- 에이전트 프롬프트에 **«운영 DB 조회 금지, 필요하면 메인에 요청»** 한 줄(10-03 한 에이전트가 시키지 않은 운영 읽기를 했다), «main이 움직이면 스스로 rebase»도.
- **같은 뷰·같은 잠금 모듈을 고치는 티켓은 병렬로 적지 말고 막힘 관계로** (11-05) — 한 티켓이 만드는 줄이 다른 두 티켓의 버튼 자리였고, 그 둘은 폼·잠금을 같이 고쳐 «셋 병렬»이 틀렸다. 운영 시나리오는 시험 계정으로 좁히고 표에 임시 트리거를 만드는 항목은 뺀다(표 잠금).
- **«나중 티켓이 걷어낼 자리»라는 판단을 조심** — 걷어내는 범위가 진입점인지 표시 줄인지 확인하지 않아 덜 만든 표시가 프로덕션에 나갔다.

**11-09 교훈 — 기기 없는 일꾼의 짐작 수정은 빗나간다.** 1차 수정은 코드만 읽은 짐작이라 실기기에서 실패했다. 메인이 시간 순 캡처(누른 뒤 0.25초)로 «친 값이 한 번도 반영 안 됨»을 재서 넘기자, 짐작에 기대지 않는 설계로 한 번에 풀렸다. 일꾼에게는 증상만 주지 말고 **실측 타이밍과 «어느 경로에도 기대지 않는» 설계 방향**을 같이 준다.
