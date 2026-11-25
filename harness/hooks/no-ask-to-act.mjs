// PreToolUse 훅(start_session·wrap_up): 묻지 말고 할 일을 묻는 질문과 제안 카드를 막는다.
// 사용자는 폰 원격으로 일한다. 머지·버그 고치기·이슈 만들기·새 세션 열기는 하고 나서 보고하는 일이고,
// 묻는 카드가 뜨면 답이 올 때까지 일이 멈춘다. 메모리 글은 이미 열린 세션에 닿지 않아 장치로 막는다.
// start_session: initiation이 user_asked가 아니면(own_initiative·offer) 막는다. proposal_id만 보낸 호출은 사용자가 이미 고른 카드라 통과.
// wrap_up: ask가 아래 «막는 질문» 표에 걸리고 «묻는 게 맞는 질문» 표에 걸리지 않으면 막는다.
// 막을 때는 이유를 stderr에 쓰고 2로 끝낸다. Claude Code가 그 이유를 에이전트에게 돌려준다.
import { pathToFileURL } from 'node:url'

const START_SESSION = 'mcp__ccd_session__start_session'
const WRAP_UP = 'mcp__ccd_turn__wrap_up'

/** 묻지 말고 할 일을 묻는 질문. 늘릴 때는 줄을 더한다 */
export const BLOCKED_ASKS = [
  { what: '머지', pattern: /(머지|merge)/i },
  { what: '고치기', pattern: /(고칠까|고쳐(도|드릴|볼까)|수정할까|수정해도|\bfix\b)/i },
  { what: '이슈 만들기', pattern: /이슈.{0,8}(만들|등록|올릴|남길|열까|열어)|(open|file|create) an issue/i },
  { what: '세션 열기', pattern: /세션.{0,10}(시작|열까|열어|띄울|띄워|만들)|(start|open) a (new )?session/i },
  { what: 'PR·푸시·커밋', pattern: /(PR.{0,6}(올릴|만들|열까)|푸시할까|push할까|커밋할까)/i },
]

/** 사용자에게 묻는 게 맞는 질문(전역 메모리 fix-and-test-without-asking). 여기 걸리면 막는 표에 걸려도 통과 */
export const ALLOWED_ASKS = [
  { what: '약관·처리방침', pattern: /(약관|처리방침|개인정보)/ },
  { what: '시안', pattern: /시안/ },
  { what: '돈 드는 일', pattern: /(비용|요금|유료|결제|구매|돈|과금|플랜)/ },
  { what: '여러 안 중 고르기', pattern: /(어느|어떤|뭘|골라|고를|고르|중에|중 하나|중 먼저|쪽으로|\d안|[AB]안|\bwhich\b|\bor\b)/i },
  { what: '폰 확인(사람 몫)', pattern: /(폰|아이폰|기기)/ },
  { what: '되돌릴 수 없는 운영 데이터', pattern: /(운영 (DB|데이터).{0,10}(지울|삭제)|되돌릴 수 없)/ },
]

const DO_IT =
  '사용자는 폰 원격으로 일하고, 머지·고치기·이슈 만들기·새 세션 열기는 묻지 말고 하고 나서 보고하라고 여러 번 정했다(전역 메모리 fix-and-test-without-asking, 프로젝트 CLAUDE.md에 같은 절이 있으면 그것도).'

/**
 * @param {{ tool_name?: string, tool_input?: Record<string, unknown> }} input
 * @returns {string | null} 막을 이유, 통과면 null
 */
export function decide(input) {
  const toolInput = input.tool_input ?? {}
  if (input.tool_name === START_SESSION) {
    if (toolInput.proposal_id && !toolInput.initiation) return null
    if (toolInput.initiation === 'user_asked') return null
    return (
      `새 세션을 initiation "${toolInput.initiation ?? '(없음)'}"로 열려고 해서 막았다. 실행되지 않았다. ` +
      `${DO_IT} 제안 카드나 묻는 카드를 띄우지 말고 initiation "user_asked"로 바로 열어라.`
    )
  }
  if (input.tool_name === WRAP_UP) {
    const ask = typeof toolInput.ask === 'string' ? toolInput.ask : ''
    if (!ask.trim()) return null
    if (ALLOWED_ASKS.some((a) => a.pattern.test(ask))) return null
    const hit = BLOCKED_ASKS.find((b) => b.pattern.test(ask))
    if (!hit) return null
    return (
      `마무리 질문 «${ask}»이 ${hit.what}를 묻고 있어서 막았다. 실행되지 않았다. ` +
      `${DO_IT} 그 일을 지금 하고, 한 일을 recap에 보고한 뒤 ask·actions 없이 wrap_up을 다시 불러라. ` +
      '약관·처리방침·시안·여러 안 중 고르기·돈 드는 일만 물어도 된다.'
    )
  }
  return null
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
    const reason = decide(input)
    if (reason) {
      process.stderr.write(`${reason}\n`)
      process.exit(2)
    }
  })
}
