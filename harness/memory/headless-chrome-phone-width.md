---
name: headless-chrome-phone-width
description: 헤드리스 Chrome은 창 폭을 500 아래로 못 줄여 --window-size로는 폰 폭(411·375) 화면이 안 나온다 — CDP로 기기 크기를 덮어써 굽는 스크립트가 있다
metadata:
  type: reference
---

헤드리스 Chrome(`--headless=new`)은 `--window-size=400,…`을 줘도 레이아웃 폭이 500 아래로 내려가지 않는다. 폰 폭 HTML이나 Storybook 견본을 찍으면 오른쪽이 잘리고, file:// 쪽 안에 http iframe을 넣는 우회도 빈 화면이 된다(2026-11-22 프로젝트 E #1602 시안 굽기에서 둘 다 겪음).

**쓰는 것:** `~/claude-resume/<작업 이름>/shot.py` — Chrome을 `--remote-debugging-port`로 띄우고 Python `websockets`(15.x, 이미 깔림)로 CDP `Emulation.setDeviceMetricsOverride(width=411, deviceScaleFactor=2, mobile=True)`를 건 뒤 `document.body.getBoundingClientRect().height`만큼 찍는다. `python3 shot.py <주소> <출력.png> [폭]` 또는 `--many 목록.tsv`.

**함정:** 쪽 높이를 `scrollHeight`로 재면 앞 장의 큰 뷰포트가 남아 모든 장이 같은 높이로 나온다 — body의 사각형 높이로 잰다. RN-web 화면(Storybook)은 안쪽 ScrollView라 쪽 높이가 화면 높이(900)에서 멈춘다.

시안을 HTML로 그릴 때 큰 글씨는 글자 크기·줄 높이를 `calc(Npx * var(--fs))`로 두면 1.3·2.0배를 같은 파일로 굽는다(RN의 fontScale은 레이아웃 폭은 그대로, 글자만 키운다).

**폰에서 보는 그림 요령 (08-23~, 사용자 «안 보여, 이미지로 줘»):** 비교 그림은 HTML → headless Chrome 스크린샷(`--force-device-scale-factor=1.5`, 폭 1320px·3열이면 폰에서도 읽힌다) → `SendUserFile`. 폰에선 pbcopy도 못 쓴다.
