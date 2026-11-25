---
name: pixelorama-cli-export
description: Pixelorama v1.2.1 /Applications 설치됨(2026-09-05). 헤드리스 CLI export 동작 확인 — 단 --output의 파일명은 무시되고 .pxo 이름이 쓰인다(디렉터리·확장자만 먹힘). webp+알파 직접 출력 가능. 애플 공증 없음(격리 플래그 없어 실행은 됨)
metadata: 
  node_type: memory
  type: reference
  modified: 2026-09-05T05:36:53.022Z
  originSessionId: 29766fdf-cf11-41c4-bc7d-af9529e4bf90
---

에셋 파이프라인(Blender → 렌더 → 사람 픽셀 손질 → export)의 4번째 칸.

**설치**: `/Applications/Pixelorama.app`, v1.2.1(Godot 4.7.1), universal(x86_64+arm64). 공식 릴리스 `Pixelorama-Mac.dmg`(71,015,188 B, sha256 `0999c265…`)에서 설치. homebrew cask는 2026-09-01자로 Gatekeeper 문제로 비활성 — 직접 받아야 한다.

**서명 주의**: adhoc 서명이고 TeamIdentifier 없음 → `spctl`은 **rejected**. `gh release download`로 받으면 `com.apple.quarantine`이 안 붙어 그냥 실행된다. 브라우저로 다시 받으면 격리 플래그가 붙어 차단되고, 그때는 시스템 설정 → 개인정보 보호 및 보안 → «그래도 열기»가 필요하다.

**CLI 호출 형태** (헤드리스 동작 확인됨):

```
/Applications/Pixelorama.app/Contents/MacOS/Pixelorama --headless --quit -- \
  --export --output <디렉터리>/<무시됨>.<확장자> <프로젝트>.pxo
```

**가장 큰 함정 — `--output`의 파일명은 무시된다.** `set_output`이 `project.file_name`을 설정하지만 그 뒤 덮어써져서, 실제 출력 파일명은 **`.pxo` 파일 이름**이 된다. `--output`이 실제로 정하는 것은 **디렉터리**와 **확장자(포맷)** 둘뿐이다. `--output out.png foo.pxo` → `foo.png`가 나온다.
→ **규약: .pxo 이름을 목표 에셋 이름과 똑같이 짓는다** (`asset-name.pxo` → `asset-name.webp`). 이름 일치가 강제되니 오히려 좋다.

**실패가 조용하다**: 디렉터리가 없거나 파일명이 유효하지 않으면 `export_processed_images`가 GUI 경고 팝업을 띄우고 false를 반환하는데, 헤드리스엔 팝업이 없어 **에러 한 줄 없이 아무 일도 안 일어난다.** 출력이 없으면 경로부터 의심할 것.

- `--output`에 디렉터리 없이 `out.png`만 주면 `directory_path`가 빈 문자열이 돼 실패한다 → **항상 절대경로**로 준다.
- 확장자 `.webp`를 주면 **알파 살린 WebP를 직접 출력**한다 — cwebp 없이도 최종 파일이 나온다. 다만 저장소 계약은 `cwebp -q 90 -m 6 -alpha_q 100`이므로 품질 통제가 필요하면 PNG로 뽑고 cwebp를 거친다.
- PNG를 프로젝트로 열 수도 있다(`--size`가 크기를 찍는다).
- 유용한 옵션: `--size` · `--framecount` · `--scale [정수]` · `--frames a-b` · `--spritesheet`.
- 헤드리스에서 Godot 셰이더 `ERROR: Condition "!actions.custom_samplers.has(...)"` 가 잔뜩 찍히는데 **정상이다**(Continuing). 진단할 때 무시할 것.

**샘플 .pxo**는 저장소 `Misc/example_pxo_files/`에 있다 — 파이프라인 시험용으로 받아 쓰면 된다.

관련: 프로젝트 메모리의 에셋 연결 메모 · 전역 CLAUDE.md «안전 경계»(Pixelorama는 무료)
