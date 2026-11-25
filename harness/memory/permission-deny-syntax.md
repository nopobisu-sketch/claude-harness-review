---
name: permission-deny-syntax
description: "settings.json 금지 규칙(permissions.deny) 함정 — 쓰기 금지는 Edit(경로)로만 걸리고 Write(경로)는 아무것도 막지 않음, 파이프가 든 Bash 패턴은 안 걸리니 받는 쪽 Bash(sh)를 막음, 어느 폴더에서나는 //**/, 전역에 .env·sudo·파이프 셸 금지가 있음(11-22 실측)"
metadata:
  type: reference
---

전역 `~/.claude/settings.json`의 `permissions.deny`에 2026-11-22부터 이 규칙들이 있다: `.env`·`.env.local`·`.env.*.local` 읽기·고치기 금지, `sudo` 금지, 파이프로 셸에 넘기기(`… | sh`·`| bash`·`| zsh`) 금지. 장치가 막으므로 따로 글 규칙을 두지 않는다. `.env.example`은 열려 있다.

금지 규칙을 새로 쓰거나 고칠 때 아래 함정을 피한다. 전부 11-22에 이 맥에서 실제로 걸어 보고 확인한 것이다.

- **쓰기 금지는 `Edit(경로)`로 적는다.** `Write(경로)`는 파일 권한 검사에 쓰이지 않아 아무것도 막지 않는다(update-config 스킬 문법 설명). `Edit(...)` 하나가 Write·Edit 도구와 셸의 `>` 쓰기까지 막는다.
- **`Read(경로)` 금지는 셸의 `cat`도 막는다.**
- **어느 폴더에서나 걸리게 하려면 `//**/이름`.** 앞이 `//`면 파일 시스템 뿌리부터다. 그냥 `.env*`나 `**/.env`는 지금 폴더 기준이라 다른 저장소의 파일에는 안 걸린다.
- **파이프가 든 Bash 패턴은 안 걸린다.** Claude Code가 명령을 파이프에서 잘라 조각마다 따로 대 보므로 `Bash(curl * | sh)`는 한 번도 맞지 않는다(실측: 그대로 실행됨). 받는 쪽 조각인 `Bash(sh)`·`Bash(bash)`·`Bash(zsh)`를 막는다. 정확히 그 낱말만인 명령에만 맞아서 `bash -c '…'`·`zsh 대본.sh`는 그대로 돈다.
- 규칙이 걸리는지는 같은 세션에서 바로 시험할 수 있다(설정을 저장하면 곧장 반영됨). 시험 파일은 임시 폴더에 가짜 값으로 만든다 — 진짜 `.env`로 시험하지 않는다.

관련: [[bash-tool-traps]], [[verification-lessons]]
