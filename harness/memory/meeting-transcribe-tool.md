---
name: meeting-transcribe-tool
description: 회의 녹화 한국어 전사+화자 분리 전역 도구 ~/.claude/tools/meeting-transcribe.sh 사용법과 측정값, 실시간 전사를 안 쓰는 이유
metadata:
  type: reference
---

회의 녹화(영상·음성)를 «[시:분:초] 화자N: 말» 대본으로 만드는 도구를 2026-11-22에 전역에 깔았다.

- 실행: `~/.claude/tools/meeting-transcribe.sh -n 화자수 -t "제목" <입력> <출력.md>` (자기 시험: `bash ~/.claude/tools/meeting-transcribe.test.sh`)
- 내부: ffmpeg로 16kHz 음성 추출 → mlx-whisper large-v3-turbo(한국어) 전사와 sherpa-onnx 화자 분리(pyannote 분할 + eres2net)를 동시에 → 겹치는 시간이 가장 긴 화자를 문장마다 붙임
- 가상환경·모델은 ~/.local/share/meeting-transcribe (약 1.2GB, git 밖), 전사 모델은 ~/.cache/huggingface. 처음 돌 때 자동 설치, `--setup`만 따로 할 수도 있음
- 작업 폴더 runs/<시각>/에 asr.json·diar.json·로그가 남음(음성 wav는 끝나면 지움) → 화자 붙이기만 다시 할 때는 `python3 meeting-transcribe.py merge asr.json diar.json 제목 out.md`
- 측정(11-21, 75분 Zoom 녹화): 전사 약 2분 30초, 화자 분리 6~9분, 전체 약 9분. 같은 녹음을 다시 돌려도 화자 분리는 똑같고 전사는 단어 한두 개만 달랐다(11-22 재실행 대조)
- 회의록 등 간단한 마크다운을 한글 A4 PDF로: `python3 ~/.claude/tools/md-to-pdf.py 입력.md 출력.pdf` (Chrome 화면 없이 인쇄, 제목·글머리·번호·표·굵게/기울임)

**Why:** 11-14에 스크래치 폴더에 만든 도구가 지워져 11-21에 지난 세션 기록을 뒤져 다시 세웠다. 사용자가 고정 설치를 승인했다(11-22).
**How to apply:** -n은 꼭 참석 인원으로 준다(자동 추정은 잘 안 맞음). Zoom 녹화는 화자 분리가 섞이므로(한 번호에 여러 사람) 발언자는 맥락으로 판단하고 불확실한 것은 사용자에게 알린다. OBS 실시간 전사 플러그인(LocalVocal)은 화자 구분이 없고 정확도가 낮으며 파일 기록 누락·충돌 사례가 있어 쓰지 않는다. 사후 전사로 충분히 빠르다.
