---
name: vercel-static-repo-exposes-all-files
description: 빌드 설정이 없는 저장소를 Vercel에 연결하면 저장소의 모든 파일이 대표 주소에서 로그인 없이 열린다 — 연결 직후 public/만 내보내게 하고 404를 확인
metadata:
  type: feedback
---

프레임워크와 빌드 설정이 없는 저장소를 Vercel에 연결하면, 저장소의 모든 파일이 그대로 정적 파일로 배포된다. 배포마다 생기는 개별 주소와 `-git-main-` 주소는 Vercel 로그인을 요구하지만(팀 기본 보호 `all_except_custom_domains`), 대표 주소 `<프로젝트>-<접미사>.vercel.app`는 로그인 없이 누구나 열 수 있다.

**Why:** 2026-11-23 프로젝트 I에서 빈 저장소를 Vercel에 연결한 뒤 `docs/`에 내부 기획 문서를 올렸고, 몇 시간 동안 그 문서가 대표 주소에서 열렸다. 개별 주소만 curl로 확인해서 «보호되어 있다»고 판단할 뻔했다. 사용자가 «링크로 공유»를 고른 뒤에야 대표 주소를 확인하다가 발견했다.

**How to apply:**
- 저장소를 Vercel에 연결하는 그 자리에서 `vercel.json`에 `"outputDirectory": "public"`을 넣고 `public/`을 만든다. 문서·메모·설정은 `public/` 밖에 둔다.
- 공개 범위는 `get_project`의 `domains` 목록에 있는 주소를 전부 curl로 확인한다. 개별 배포 주소 하나만 보고 판단하지 않는다.
- 확인은 «내부 파일이 404인가»로 한다(`/AGENTS.md`, `/docs/...`, `/.claude/...`).
- 비슷한 이름의 `<프로젝트>.vercel.app`는 남의 프로젝트일 수 있다. `domains` 목록에 없는 주소는 우리 것이 아니다.
