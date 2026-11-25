---
name: folder-rename-orphans-memory
description: 저장소 폴더 이름을 바꾸면 메모리 디렉터리(절대경로 키)가 고아가 된다 — 2026-08-17 `<옛 폴더 이름>`→`프로젝트 E` 개명 때 실제로 발생. 다시 바꿀 땐 메모리 dir·워크트리 gitdir 포인터를 같이 옮길 것
metadata:
  type: project
---

Claude Code의 메모리 디렉터리는 **저장소 절대경로를 키로** 만들어진다(`~/.claude/projects/<경로의 /·공백을 대시로 바꾼 이름>/memory/`). 2026-08-17 폴더를 `<옛 폴더 이름>` → `프로젝트 E`으로 바꾸면서 옛 메모리(user_profile·project_프로젝트 E)가 `~/.claude/projects/-Users-user-Documents-GitHub-<옛 폴더 이름>/memory/`에 고아로 남았고, 2026-08-22 세션에서 발견해 유효한 내용만 이관했다(·[[user-typed-skills]]). 옛 프로젝트 메모리의 나머지(옛 설정과 목표)는 낡았거나 이슈에 이미 있다 — 현재 사실은 프로젝트 메모리 «프로젝트 E-prod-endpoints».

**Why:** 지난 개명 때 메모리 단절을 아무도 몰랐고 닷새 뒤에야 발견됐다. 옛 폴더 자리에는 `.next/` 빌드 캐시 하나가 빈 껍데기로 남아 있다.

**How to apply:** 폴더 이름을 다시 바꿀 땐 (1) 메모리 디렉터리를 새 경로명으로 먼저 복사/이동, (2) 워크트리는 `.claude/worktrees/*/.git`과 `.git/worktrees/*/gitdir`이 절대경로라 깨진다 — 개명 전에 `git worktree remove`로 정리하거나 개명 후 포인터를 수정, (3) `~/.claude.json`의 `projects` 옛 경로 키(08-17 개명 뒤 8개 잔존)와 스크래치패드는 무해하니 방치 가능. 저장소 안 코드·빌드 설정엔 절대경로가 없다(2026-08-22 실측 — 리포 `.claude/settings.local.json`의 권한 항목 2건만 해당).
