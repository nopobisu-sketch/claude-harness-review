// PermissionRequest 훅: 승인할 사람이 없는 일꾼의 승인 요청을 창을 띄우지 않고 바로 거절한다.
// 사용자는 폰으로 감독 세션만 보므로, 일꾼이 맥 화면에 띄운 승인 창은 아무도 누르지 못하고 세션이 몇 시간씩 멈춘다.
// 일꾼은 둘이다: 다른 세션이 띄운 데스크톱 세션(앱의 세션 파일에 spawnedFrom.sideSession이 있다)과 하위 에이전트(훅 입력에 agent_id가 있다).
// 사람이 직접 연 세션의 요청은 결정하지 않고 끝낸다. 그러면 평소대로 승인 창이 뜬다.
// 공식 설정 permissions.denyInsteadOfPrompting은 사용자·관리 설정과 --settings에서만 걸려서 일꾼에만 걸 수 없다.
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// 앱의 세션 파일은 공개 문서에 없는 내부 형식이다. 못 읽으면 일꾼이 아닌 것으로 보고 평소 흐름에 맡긴다.
export function spawnedByAnotherSession(hostSessionId, home = homedir()) {
  if (!/^local_[0-9a-f-]+$/.test(hostSessionId || '')) return false
  const sessionsDir = join(home, 'Library', 'Application Support', 'Claude', 'claude-code-sessions')
  for (const account of listDir(sessionsDir)) {
    for (const org of listDir(join(sessionsDir, account))) {
      let session
      try {
        session = JSON.parse(readFileSync(join(sessionsDir, account, org, `${hostSessionId}.json`), 'utf8'))
      } catch {
        continue
      }
      // 세션이 띄운 세션은 sideSession이 참이다. 사용자가 연 포크·/btw 옆 대화도 spawnedFrom을 갖지만
      // userFork·btw가 붙는다. 사용자가 사이드바 맨 위로 끌어낸 세션은 lineageDetached가 붙는다.
      // 둘 다 사람이 맡은 세션이라 일꾼이 아니다. 모르는 모양도 일꾼으로 보지 않는다.
      const from = session?.spawnedFrom
      return from?.sideSession === true && !from.userFork && !from.btw && session.lineageDetached !== true
    }
  }
  return false
}

// 폴더가 없거나 폴더가 아닌 항목(.DS_Store 같은 것)이면 빈 목록으로 보고 넘어간다
function listDir(dir) {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

/**
 * @param {{ tool_name?: string, agent_id?: string }} input
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [home]
 */
export function decide(input, env = process.env, home = homedir()) {
  const who = input.agent_id
    ? '하위 에이전트'
    : spawnedByAnotherSession(env.CLAUDE_CODE_HOST_SESSION_ID, home)
      ? '다른 세션이 띄운 일꾼 세션'
      : null
  if (!who) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      decision: {
        behavior: 'deny',
        message:
          `이 요청은 ${who}에서 나왔고 승인 창을 누를 사람이 없어서 ${input.tool_name} 호출을 거절했다. 실행되지 않았다. ` +
          '거절된 것은 이 호출 하나다. 같은 호출을 다시 하지 말고, 승인이 필요 없는 다른 길로 하라. ' +
          '다른 길이 없으면 막힌 내용을 이슈에 번호 붙인 질문으로 남기고 나머지 일을 계속하라.',
      },
    },
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let raw = ''
  process.stdin.on('data', (d) => (raw += d))
  process.stdin.on('end', () => {
    let input
    try {
      input = JSON.parse(raw)
    } catch {
      process.exit(0)
    }
    const out = decide(input)
    if (out) process.stdout.write(JSON.stringify(out))
  })
}
