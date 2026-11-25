# 플러그인·연결 서비스·개인 설정 목록

이 묶음의 `harness/settings.json`에는 훅과 금지 규칙만 들어 있습니다. 나머지는 읽기용으로 여기에 적습니다.

## 켜 둔 플러그인 (`claude plugin list`, 판은 2026-11-25 기준)

| 이름 | 판 |
|---|---|
| android-skills@android-skills | 1.0.21 |
| astryx@astryx | 0.1.0 |
| expo@claude-plugins-official | 1.13.9 |
| floorplan@floorplan | 0.11.0 |
| fluent-korean@fluent-korean | 1.0.0 |
| gptaku-core@gptaku-plugins | 0.2.4 |
| humanize-korean@im-not-ai | 2.4.8 |
| impeccable@impeccable | 4.10.0 |
| insane-search@gptaku-plugins | 0.17.6 |
| last30days@last30days-skill | 4.6.0 |
| mattpocock-skills@mattpocock | 1.2.0 |
| telegram@claude-plugins-official | 0.0.6 |

claude.ai에서 동기화된 것: pdf-viewer 0.2.0, figma 2.2.211, cowork-plugin-management 0.2.2.

## 추가 마켓플레이스 (`extraKnownMarketplaces`)

| 이름 | 출처 |
|---|---|
| impeccable | git https://github.com/pbakaus/impeccable.git |
| im-not-ai | github epoko77-ai/im-not-ai |
| fluent-korean | github snflkd/fluent-korean |
| android-skills | github android/skills |
| last30days-skill | github mvanhorn/last30days-skill |
| gptaku-plugins | git https://github.com/fivetaku/gptaku_plugins.git |
| floorplan | github haydenschmitty/floorplan |
| astryx | git https://github.com/meta/astryx.git |

## 스킬

- **pstack**: 남이 만든 MIT 스킬 묶음의 사본. 원본은 cursor/plugins의 `harness/pstack/claude-code`, 판 0.15.48. 뺀 6개: tdd, teach, architect, figure-it-out, interrogate, make-bot-ui. 이 묶음에는 넣지 않았습니다.
- **프로젝트 G의 디자인 가이드 스킬**: 프로젝트 G의 화면 규격을 적은 스킬. 이 묶음에는 넣지 않았습니다.
- **harness-upkeep**: 프로젝트 하네스를 전역에 맞춰 정리하는 스킬. 이 묶음에 들어 있습니다(`harness/skills/harness-upkeep`).

## 연결 서비스(커넥터)

Claude Docs, Gmail, Notion, Sentry, Figma, Google Drive, Supabase, Fireflies, Vercel, Slack.

## 개인 설정 (이름과 값, 비밀 값 없음)

| 설정 | 값 |
|---|---|
| model | opus[1m] |
| outputStyle | fluent-korean:fluent-korean |
| theme | auto |
| tui | fullscreen |
| prefersReducedMotion | true |
| spinnerTipsEnabled | false |
| enableWorkflows | true |
| skipWorkflowUsageWarning | true |
| inputNeededNotifEnabled | true |
| agentPushNotifEnabled | true |
| env.GPTAKU_ROUTER | off |
| statusLine | 명령형(터미널 도구 Orca의 상태 줄 스크립트를 부르는 한 줄, 내용 생략) |
| autoMode.environment | 기본값 + 설명 4줄(자기 저장소 신뢰, 로컬 보조 에이전트, 임시 폴더; 내용 생략) |
