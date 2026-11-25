---
name: grok-gemini-headless-call
description: "Claude 세션에서 Grok·Gemini·Codex를 Paseo·명령줄로 부르는 법과 Gemini 울타리(fence-bin)·agy 함정, 조사 도구(yt-dlp·agent-browser), 조사 방식 사용자 지시"
metadata:
  node_type: memory
  type: reference
  originSessionId: ba4dc455-b40d-416f-9b04-e71349f233a8
  modified: 2026-11-14T00:00:00.000Z
---

2026-11-13 사용자: «이 데스크탑 앱에서 말로 명령하면 Grok·Gemini가 찾아 주는 방식», «X에 최신 정보가 많다», «이런 use case들을 조사하길 바란다», «토큰 아끼게 앞으로는 조사할 때 에이전트 브라우저 써».

## 부르는 법 (둘 다 한 단어 시험은 응답함, 로그인돼 있음)
- Grok: `~/.grok/bin/grok -p "<질문>"` 또는 `--prompt-file <파일>`. 빈 폴더로 `cd`한 뒤 부른다(저장소에서 부르지 않는다). 승인이 필요한 도구는 사람 없는 실행에서 거절되므로 `--allow "WebSearch" --allow "WebFetch"`처럼 허용 규칙을 붙인다.
- Gemini: `cd ~/gemini-room && ~/.paseo/fence-bin/agy -p "<질문>" --print-timeout 240s`. 울타리(sandbox-exec) 안에서만 돈다(→ 아래 «Paseo 운용·울타리»).
- Codex(무료 ChatGPT 계정, 11-14 연결): Paseo로만 부른다(아래). 옛 기본 모델 gpt-5.6-sol은 무료 계정에서 400 거절 → config를 gpt-5.6-luna로 바꿈(백업 config.toml.bak-20261114). 모델 목록 명령은 없고 `~/.codex/models_cache.json`의 visibility=list가 근거.
- paseo CLI는 PATH에 없다(`/Applications/Paseo.app/Contents/Resources/bin/paseo`).

## 역할 분담 (11-14 사용자 «추천대로», 실측)
- Codex는 코드를 읽기 전용으로 검수·QA할 수 있다. 쓰기는 안 맡긴다(Claude 훅이 안 걸림). 프로젝트별 허락은 프로젝트 메모리에 있다.
- Codex 이미지 생성: 명령줄 exec에는 이미지 도구가 안 붙는다(features엔 image_generation 켜짐인데도). 대안으로 유료 OPENAI_API_KEY를 쓰자고 함 → 쓰지 말 것. 이미지는 ChatGPT 앱에 붙여 넣을 요청문으로.
- Gemini(agy) 검색: plan 모드로 웹 검색이 됨(Expo 최신 58.0.25, npm과 일치, 약 1만 7천 토큰). 유튜브는 아래 yt-dlp 방식.
- 구글 워크스페이스 올리기: agy에 MCP·플러그인 0개라 안 됨 → Claude의 구글 드라이브 커넥터로.

## Paseo 경유 (11-14 실측, paseo 0.15.3) — 기본 경로
- **11-14 사용자 결정: «wrapper 방식은 쓰지 말자, paseo가 낫네».** Codex·안티그래비티는 Paseo로만 부른다. 시험 에이전트는 끝나면 `paseo archive <id>`로 보관(정확한 ID로만).
- Paseo 코덱스엔 읽기 전용이 없으니 검수는 `--mode auto`로 맡기고, 끝난 뒤 `git status`로 변경 0건을 확인한다. 고친 게 있으면 되돌리지 말고 사용자에게 보고.
- 데몬이 꺼져 있으면 `env -i HOME=… PATH="$HOME/.paseo/fence-bin:…" paseo start`로 켠다(울타리를 PATH 맨 앞에). `paseo run --provider codex|antigravity --cwd … --wait-timeout 60s -q "<질문>"` → `paseo logs <id>`로 답, `paseo inspect <id> --json`의 LastUsage로 토큰.
- 같은 일 4가지(한 문장·검색·커밋 검수·울타리) 모두 됨. 안티그래비티는 Paseo에서도 울타리 안(문서 폴더 «막힘» 실측). Paseo 기본 Gemini 모델은 flash-high라 `--model gemini-3.8-flash-low`를 붙인다.
- 안티그래비티는 Paseo에서 full-access뿐이라 승인 없이 셸을 돌린다(울타리가 막아 줌).
- Paseo만의 장점: `paseo usage ls --refresh`로 남은 한도(코덱스 30일 2%, 11-14). 안티그래비티는 그 보고에 안 나옴.

## 사용자 지시 (11-13)
- 조사는 일반론보다 실제 사례(누가 무엇을 만들었고 에이전트 몇 개가 어떤 역할로 일했는지)를 찾는다. 예: 구글 `/swarm` 에펠탑.
- «도구는 너 맘대로 해. 원하는 건 ① x.com 원문과 유튜브 영상 내용을 전사해서 디테일까지 확인 ② 토큰을 아끼는 방향.» Grok·Gemini는 원문이 안 열릴 때의 대안으로 말한 것이다.

## 조사 도구 (11-13 설치·실측, 둘 다 무료, 받는 데 모델 토큰 0)
- **유튜브 전사**: `yt-dlp`(brew, /opt/homebrew/bin). 검색은 `yt-dlp "ytsearch10:<검색어>" --skip-download --print "%(upload_date)s | %(id)s | %(duration_string)s | %(channel)s | %(title)s"`(날짜순 검색어 `ytsearchdate`는 안 됨 → 받아서 sort). 자막은 `yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en,en-orig" --sub-format vtt -o "%(id)s" <주소>` 뒤 vtt에서 시간 줄·태그·중복 줄을 지워 txt로. 22분 영상이 약 2만 4천 자.
- **X 원문**: `agent-browser`(npm 전역 0.40.0, ~/.npm-global/bin). `agent-browser read https://x.com/<핸들>`이 로그인 없이 최근 글 5~8개를 약 3KB 글로 준다. 더 옛 글·X 안 검색은 로그인이 필요하다(사용자가 한 번). WebFetch는 x.com에서 403이다.
- **긴 영상은 Gemini에게 읽힌다** (11-13 사용자 «그래도 해», 16분 영상으로 실측): `cd ~/gemini-room && PATH="/opt/homebrew/bin:$PATH" ~/.paseo/fence-bin/agy -p "<할 일: yt-dlp로 자막 받고 .vtt를 읽어 시간순 디테일 정리>" --settings '{"permissions":{"allow":["command(yt-dlp)"]}}' --print-timeout 280s --output-format json`. 규칙 글자는 `command(yt-dlp)`여야 하고 `command(yt-dlp *)`는 거절된다. 그 실행에만 붙는 설정이라 Gemini 설정 파일은 안 바뀐다. 자막 읽는 토큰(약 20만)은 Gemini 무료 한도에서 나가고 정리본(약 7천 자)만 돌아온다. 모든 명령을 푸는 `--dangerously-skip-permissions`는 쓰지 않는다(울타리가 인터넷은 열어 둠). **영상 주소는 `https://youtu.be/<id>` 꼴로 준다**(11-23 실측, agy 1.5.3): `watch?v=` 주소는 `?` 때문에 `command(yt-dlp)` 허용에 안 걸려 «denied_actions: RunCommand»로 빈 답이 온다. `--version`은 통과하고 youtu.be 주소로 바꾸자 실행됐다. 자막 429는 같은 맥에서 나가는 요청이라 Gemini 쪽도 똑같이 막힌다 → 그때는 같은 내용의 공식 문서를 원문으로 쓴다. 웹 검색만으로 영상 요지를 찾게 하면 4분 50초 제한에 걸려 빈 답이 왔다(11-23).
- **예약 작업 만들기는 사용자가 대화에서 직접 «만들어 줘»라고 해야 통과한다** (11-13: «추천대로»만으로는 auto 모드가 두 번 막았고, «너가 예약 만들어줘» 뒤에는 만들어졌다).

관련: [[workflow-artifact-loop]]

- **Gemini 채널 추천은 대조가 필요하다** (11-17 실측, Paseo antigravity flash-low, 검색 12회): 유튜버 12곳을 물었더니 채널 이름은 대체로 실재했지만 «대표 영상» 제목은 전부 지어낸 것이었고, 핸들 2개는 없는 주소, 1곳은 2019년 이후 멈춘 채널, 3곳은 주제가 바뀐 채널이었다. `yt-dlp --playlist-end 4 --print "%(upload_date)s | %(title)s" https://www.youtube.com/@핸들/videos`로 최근 영상을 대조하고, `ytsearch12:`로 직접 찾은 목록과 합친다.

## Paseo 운용·울타리 (paseo-gemini-grok-plan에서 합침)
2026-11-09 사용자: «제미나이와 그록은 paseo로 관리할 예정», 둘 다 무료 사용량까지만(카드 등록 금지). Gemini는 Antigravity CLI `agy`, Grok은 `grok login --device-auth`로 연결. Paseo 설정 백업 `~/.paseo/config.json.bak-20261109`, 프로필 5개(주 작업 Opus auto·결정 Fable plan·빠른 일 Sonnet·검토 Gemini·X 검색 Grok). 터미널용 claude(npm)는 데스크톱 앱과 로그인·버전이 따로다.
- 함정: 저장소의 장치가 Claude Code 훅이면 Gemini·Grok에는 안 걸린다. 다른 에이전트가 같은 저장소를 쓰면 글 규칙도 장치도 없이 main에 바로 push할 수 있다. 저장소 쓰기를 맡기자는 말이 나오면 그 저장소의 장치(AGENTS.md·pre-push 등)부터 확인한다. 읽기·의견 역할이면 괜찮다.
- 11-09 사용자 지시: Gemini는 전용 폴더 ~/gemini-room(Paseo 프로젝트 «gemini-room»)에서 유튜브 검색·요약 등 읽기·소통만. **울타리**: `~/.paseo/fence-bin/agy` → `sandbox-exec -f ~/.paseo/bin/gemini-room.sb ~/.local/bin/agy` — 쓰기는 gemini-room·~/.gemini·캐시만, Documents·.ssh·.claude·.paseo·gh·.grok·paseo-scratch는 읽기도 막힌다(Paseo 안 시험 5회로 실측). ~/.zshrc 맨 끝의 `export PATH="$HOME/.paseo/fence-bin:$PATH"`(사용자 허락 «a»)가 울타리를 진짜 agy보다 앞에 둔다.
- 울타리 확인법: 설치 프로그램이 .zshrc 끝에 PATH 줄을 또 붙이면 울타리가 풀린다. 설치 뒤엔 `zsh -lic 'which agy'`가 fence-bin인지 보고, Paseo는 완전히 다시 켠다(worker restart로는 PATH가 안 바뀐다). 이 세션에서 켤 땐 `env -i … open -a Paseo`로(CLAUDE_CODE_* 환경이 섞이면 터미널 claude 기록 저장이 꺼진다).
- 함정: agy --sandbox는 아무것도 안 막는다 / Paseo config의 antigravity command 덮어쓰기는 내장 플러그인이 무시한다(PATH의 "agy"만 찾음) / agy 프로필은 «Full access»뿐이라 읽기 전용을 장치로 못 막는다.
- macOS가 Paseo의 Documents 접근을 막는다. Documents 아래 저장소를 Paseo 프로젝트로 넣으면 daemon이 멈춘다(git getcwd EINTR). 넣으려면 사용자가 맥에서 Paseo에 문서 폴더 권한을 줘야 한다.
