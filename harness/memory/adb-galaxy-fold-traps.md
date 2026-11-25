---
name: adb-galaxy-fold-traps
description: "adb로 갤럭시 폴드를 다룰 때의 함정: screencap에 -d 필수, 게임 부스터 터치 방지 화면이 어둡게 덮고 터치를 막음"
metadata:
  type: reference
---

2026-11-25 Galaxy Z Fold 7(SM-F966N)에서 확인한 것.

- 폴드는 화면이 둘이라 `screencap -p`에 `-d <화면 id>`가 없으면 경고문이 PNG 앞에 섞여 파일이 깨진다. 켜진 화면 id는 `dumpsys display`의 `DisplayDeviceInfo` 줄에서 `state ON`인 것. 접힘 상태는 `cmd device_state print-state`(0=접힘).
- 게임 중 3분쯤 터치가 없으면 삼성 게임 부스터 «터치 방지»가 화면을 어둡게 덮고 터치를 막는다. 감지: `dumpsys window windows`에 `GameBooster TouchProtection}`. 해제: 빈 곳을 한 번 누르고 `input draganddrop`으로 가운데 잠금 아이콘을 위로 끈다(짧은 `input swipe`는 안 풀림).
- adb는 `~/Library/Android/sdk/platform-tools/adb`(PATH에 없음).
