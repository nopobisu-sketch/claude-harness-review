// PreToolUse 훅(Bash): Blender를 화면 없이(-b·--background) 직접 부르면 막고 ~/.claude/tools/blender-run.sh로 안내한다.
// 까닭: 기록된 Blender 충돌은 전부 화면 없는 직접 실행에서 났고, «Blender -b … | grep Error»는 충돌에서 아무 줄도 내지 않아
//   «오류 없음»처럼 보였다(재발 4건, memory/blender-crash-prevention.md). blender-run.sh는 잠금·로그·기대 파일 확인·3회 재시도를 한다.
// 2026-11-19에는 «훅은 만들지 않는다»로 정했으나, 2026-11-25 사용자가 «1235 반영해»로 뒤집었다(이슈 user/claude-harness#4).
// 통과: blender-run.sh를 거치는 명령, 화면을 띄우는 실행(open -a Blender 등), Blender라는 글자가 경로·문자열에만 있는 명령. 훅이 고장 나면 막지 않는다.
import { pathToFileURL } from 'node:url'
import { readStdinJson } from './harness-layers.mjs'

// 명령의 한 조각(; && || | 로 나뉜 것)마다: 실행 파일이 blender/Blender(경로 포함)이고 -b 또는 --background 인자가 있으면 직접 실행으로 본다.
const SEGMENT_SPLIT = /;|&&|\|\||\|/
const BLENDER_EXE = /^(?:\S*=\S*\s+)*(?:"[^"]*\/)?(?:\S*\/)?[Bb]lender(?:\.app\/Contents\/MacOS\/Blender)?"?(?=\s|$)/
const BACKGROUND = /(?:^|\s)(?:-b|--background)(?=\s|$)/

export function directBlender(command) {
  const cmd = String(command ?? '')
  if (cmd.includes('blender-run.sh')) return false
  return cmd.split(SEGMENT_SPLIT).some((seg) => {
    const s = seg.trim().replace(/^(?:exec|time|nohup|caffeinate(?:\s+-\w+)*)\s+/, '')
    return BLENDER_EXE.test(s) && BACKGROUND.test(s)
  })
}

export function blenderReason(command) {
  if (!directBlender(command)) return null
  return 'Blender를 화면 없이 직접 부르지 말고 ~/.claude/tools/blender-run.sh를 써라. 예: ~/.claude/tools/blender-run.sh --expect 출력.png -- --factory-startup -P 스크립트.py ' +
    '(잠금으로 한 번에 하나, 로그 저장, 기대 파일 확인, 충돌이면 3회 재시도·충돌 보고서 알림). ' +
    '직접 실행과 «| grep Error»는 충돌을 «오류 없음»처럼 가렸다(memory/blender-crash-prevention.md, 사례 표). 이 명령은 실행되지 않았다.'
}

function main() {
  try {
    const input = readStdinJson()
    const reason = blenderReason(input?.tool_input?.command)
    if (reason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
