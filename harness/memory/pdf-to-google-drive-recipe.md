---
name: pdf-to-google-drive-recipe
description: "문서(HTML·PPTX)를 PDF로 뽑아 구글 드라이브에 올리는 절차 — 드라이브 커넥터는 경로를 못 받고, Chrome 확장은 세션 작업 폴더만 읽으며, Drive 웹은 클릭 순간에만 입력칸을 만든다"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f3d605df-4a66-43c1-a939-f0a969261076
  modified: 2026-09-06T15:12:47.394Z
---

2026-09-05에 실제로 뚫은 경로. 아티팩트 → PDF → 드라이브 폴더까지.

**Why**: 세 군데서 각각 막혔고 셋 다 «되는 줄 알았는데 안 되는» 종류라, 모르면 매번 같은 시간을 쓴다.

**How to apply:**

**1. PDF는 headless Chrome으로.** `wkhtmltopdf`·`weasyprint`·`gs`·`qpdf` 다 없다.
`--headless --no-pdf-header-footer --virtual-time-budget=20000 --print-to-pdf=<out> file://<html>`
+ `--user-data-dir`를 임시 폴더로 줘야 사용자 Chrome 프로필을 안 건드린다.
**프로세스가 PDF를 다 쓰고도 안 죽는다** — 파일 크기가 안정될 때까지 폴링하다 kill하는 파이썬 래퍼로 감쌀 것(그냥 실행하면 180초 타임아웃에 걸린다).
한글 문서는 **웹폰트 버전이 시스템 폰트보다 3배 작다**(150KB vs 488KB) — `--disable-remote-fonts`는 역효과.
인쇄용 CSS에 `.sec-head { break-inside: avoid; break-after: avoid }`를 안 주면 섹션 번호와 제목이 페이지 경계에서 갈린다.

**2. 구글 드라이브 커넥터로는 못 올린다.** `create_file`이 로컬 경로를 못 받고 base64 인라인만 받는데, 150KB PDF = 20만 자라 한 번에 못 내보낸다. 툴 출력도 49KB에서 잘려 조립 자체가 안 된다. **커넥터는 검색·읽기·검증용**이고 바이너리 업로드용이 아니다.

**3. 업로드는 Claude in Chrome 확장으로.**
- 확장은 **설치만으로는 안 잡힌다** — 사이드 패널에서 같은 계정으로 로그인해야 `list_connected_browsers`에 뜬다.
- `file_upload`의 `paths`는 **세션 작업 폴더 안의 파일만** 읽는다. `~/Downloads`도 `/private/tmp` 스크래치패드도 거부된다 → 작업 폴더로 복사했다가 끝나고 지운다.
- **Drive 웹에는 평소 `input[type=file]`이 없다.** 「신규 → 파일 업로드」를 누르는 순간 만들어지고 즉시 네이티브 선택창이 열린다(그 창은 조작 불가).
  해법: 미리 `HTMLInputElement.prototype.click`을 file 타입일 때 no-op으로 바꿔 두고(잡은 element는 배열에 저장) 메뉴를 클릭 → 창은 안 열리고 입력칸만 DOM에 남는다 → `aria-label` 붙여 `find`로 ref를 얻고 `file_upload` → **change 이벤트는 툴이 알아서 쏜다**(직접 dispatch하면 두 번 올라갈 수 있다) → 끝나면 프로토타입 복원.
- **합성 drop 이벤트는 Drive가 무시한다.** `DataTransfer`로 만들어 `[role=main]`에 던지면 `preventDefault`까지 되는데 업로드는 안 된다(isTrusted 검사로 보임). 시간 낭비하지 말 것.

**4. 검증은 드라이브 커넥터로.** `search_files`에 `parentId = '<폴더id>'`로 조회해 `fileSize`가 로컬 바이트와 일치하는지 본다. 화면 토스트만 믿지 말 것.

폴더 하나 = `<폴더 아이디>` (내 드라이브 루트).

관련: 전역 CLAUDE.md «답하는 방식», 전역 CLAUDE.md «안전 경계»

**4. PPTX→PDF는 PowerPoint AppleScript로 (2026-10-22 프로젝트 H).** LibreOffice는 없다(`/opt/homebrew/bin/soffice`는 깨진 shim). `save p in (POSIX file …) as save as PDF`가 동작한다. 처음 쓰는 폴더면 PowerPoint 샌드박스가 «파일 접근 허용» 창을 띄우고, 사용자가 허용하기 전까지 AppleEvent가 -1712 시간 초과로 끝난다. 재시도하지 말고 사용자에게 허용을 부탁한다. 다른 앱 컨테이너(`~/Library/Containers/com.microsoft.Powerpoint`)에 Bash로 복사하는 길은 macOS가 막는다. HTML→PDF는 위 1번이고, grid 레이아웃은 인쇄에서 페이지 경계에 겹치므로 print CSS에서 block으로 바꾼다.
