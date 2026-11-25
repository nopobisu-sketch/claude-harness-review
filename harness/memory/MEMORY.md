# 전역 메모리 — 모든 프로젝트에 통하는 업무 방식과 도구 사용법

> 전역 CLAUDE.md가 이 목차를 불러온다. 한 항목 한 줄, 자세한 건 주제 파일로. 프로젝트 고유 사실은 각 프로젝트 메모리에 둔다.

## 사용자·업무 방식
- [아이디어는 받아적기만](brainstorm-dictation-mode.md) — 사용자가 아이디어를 연달아 던질 때 열기
- [layout은 시안 먼저](layout-changes-need-mockup-first.md) — 화면 배치를 바꾸기 전에 열기
- [세션 마감 의례](session-close-ritual.md) — 마감 신호의 근거·실측(절차는 훅 session-signals)
- [사용자가 치는 스킬](user-typed-skills.md) — Skill 도구가 거절하는 /to-spec·/pstack:이름 스킬을 안내할 때
- [사용량 제한 뒤 이어가기](usage-limit-resume.md) — 한도에 걸렸거나 «이어서»가 올 때
- [무료 소리·그림 기준](free-asset-license-ok.md) — 무료·저작권 없는 소리·그림을 쓸 때
- [번호 세션은 빈자리](numbered-sessions-are-placeholders.md) — «세션 N» 빈자리의 근거(대기는 훅 session-signals)
- [묻지 말고 고치고 시험](fix-and-test-without-asking.md) — 버그를 고치거나 손 확인을 부탁하기 전에
- [메인 세션 = 오케스트레이터](main-session-is-orchestrator.md) — 이슈를 받아 자식 세션에 나눌 때
- [감독 세션](supervisor-session.md) — 감독·지휘자 역할, watch.sh, 감독 교대를 할 때
- [병렬 작업 + 모델 선택](parallel-work-and-models.md) — researcher 실측, 모델 바꾸기, 병렬로 나눌 때
- [병렬 세션 확인](parallel-session-check.md) — 다른 세션의 상태·전사를 읽을 때
- [폰 원격이 기본](phone-remote-no-approval-tools.md) — 승인 창이 뜨는 도구를 고르기 전에
- [Remote Control 항상 켜기](remote-control-always-on.md) — start_session으로 세션을 연 뒤
- [예약 작업 모델](scheduled-task-model.md) — 예약 작업의 모델·승인 창을 다룰 때
- [한국어 AI 티 없애기](korean-writing-humanize.md) — 화면 문구·긴 보고서를 쓸 때(humanize-korean)
- [지시문은 모델 쪽에 맞춰](instruction-files-for-model.md) — 새 규칙·지시문을 쓸 때(영어·짧게)
- [워크플로 개선 고리](workflow-artifact-loop.md) — 하네스 지도·조사 방식에 관한 사용자 결정
- [리서치 출처 목록](research-sources.md) — 조사할 때의 출처 등급·도구 순서·금 등급 영상
- [검증 교훈](verification-lessons.md) — 결과를 검증하거나 보고하기 전에
- [에이전트 배치 교훈](agent-batch-lessons.md) — 일꾼을 여럿 돌릴 때의 CI·충돌·worktree 함정

## 도구 사용법·함정
- [Bash 도구 함정](bash-tool-traps.md) — zsh 배열·변수, heredoc, 병렬 호출 cwd
- [폴더 개명 → 메모리 고아](folder-rename-orphans-memory.md) — 저장소 폴더 이름을 바꿀 때
- [Blender 먹선·물감 삽화](blender-painted-illustration.md) — Blender 삽화 패스·EXR 후처리를 할 때
- [Blender 튕김 예방](blender-crash-prevention.md) — Blender를 쓰기 전에, 튕겼을 때(사례 표)
- [GitHub 별 증가 재기](github-star-growth-measure.md) — 별·커밋 증가를 잴 때
- [GitHub 504면 gh로](github-504-use-gh-cli.md) — 웹·brew 다운로드가 504일 때
- [회의 전사 도구](meeting-transcribe-tool.md) — 회의 녹음을 전사할 때
- [헤드리스 Chrome 폰 폭](headless-chrome-phone-width.md) — 폰 폭 화면을 굽거나 폰용 그림을 만들 때
- [Slack 캔버스·리스트 함정](slack-canvas-list-traps.md) — Slack 캔버스·리스트를 고칠 때
- [Pixelorama CLI](pixelorama-cli-export.md) — 픽셀 그림을 헤드리스로 내보낼 때
- [PDF → 구글 드라이브](pdf-to-google-drive-recipe.md) — HTML·PPTX를 PDF로 뽑아 드라이브에 올릴 때
- [조사 도구·Grok·Gemini·Codex 호출](grok-gemini-headless-call.md) — 외부 모델·yt-dlp를 부르거나 Paseo 울타리를 확인할 때
- [아티팩트 페이지 발행 전 확인](artifact-page-checks.md) — 아티팩트를 만들 때: U+2028 사례·커넥터 함정(문법 검사는 훅)
- [rea·jadx 앱 분석](rea-reverse-engineering-tool.md) — 앱을 역공학해 분석할 때
- [adb 갤럭시 폴드 함정](adb-galaxy-fold-traps.md) — adb로 폴드 화면을 찍거나 터치할 때
- [웹 수집 도구 셋](web-fetch-tools-installed.md) — Scrapling·last30days·insane-search를 쓸 때
- [Figma 브릿지](figma-bridge-tool.md) — Figma를 읽고 쓸 때(MCP 월 20회 우회)
- [금지 규칙 문법 함정](permission-deny-syntax.md) — settings.json deny 규칙을 쓸 때
- [Vercel 정적 저장소 노출](vercel-static-repo-exposes-all-files.md) — Vercel에 저장소를 연결한 직후
- [하이쿠 대량 분류](haiku-batch-classify.md) — 글 수천 개를 분류할 때
- [꺼 둔 MCP](mcp-turned-off.md) — MCP·커넥터를 다시 붙이거나 정리할 때(Gmail 유지, Pinky 삭제 포함)
