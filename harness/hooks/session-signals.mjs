// UserPromptSubmit 훅: 사용자 입력의 두 가지 신호를 알아보고, 해야 할 절차를 Claude 앞에 놓는다(막지 않는다, 언제나 0).
// ① 마감 신호(«여기까지»·«다음 세션에서»·«마무리하자»·«꺼도 돼»): 잃을 것 확인과 인수인계. «다음 세션에서»면 그 일을 지금 시작하지 않는다.
//    까닭: 전사 실측(2026-09-06, 1,134건 중 18건)에서 사용자는 세션 단위로 끊고, «꺼도 되나?»는 잃을 게 없는지 묻는 것이었다.
// ② 빈자리 세션: 첫 메시지가 «세션 1»처럼 번호뿐이면 모바일 접속용으로 열어 둔 자리다. 그 세션의 «.»(keepalive)도 지시가 아니다.
//    까닭: 2026-11-05 «세션1»에 기록을 뒤지고 이슈까지 추천했더니 사용자가 «그냥 내비둬», «이렇게 여는 건 전부 이 케이스».
// 2026-11-25 사용자 결정 «메모리의 지침은 최소로, 훅이나 코드로»(이슈 user/claude-harness#4).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { readStdinJson } from './harness-layers.mjs'

const PLACEHOLDER_RE = /^\s*세션\s*\d+\s*$/
const KEEPALIVE_RE = /^\s*[.·…]+\s*$/
const CLOSE_RE = /여기까지|다음\s*세션에서|(이\s*)?세션\s*마무리|마무리\s*하자|꺼도\s*(돼|되|될까)/
const NEXT_SESSION_RE = /다음\s*세션에서/

/** 대화 기록의 첫 사용자 메시지(글) */
export function firstUserPrompt(transcriptPath) {
  if (!transcriptPath) return null
  let text
  try { text = readFileSync(transcriptPath, 'utf8') } catch { return null }
  for (const line of text.split('\n')) {
    if (!line.includes('"user"')) continue
    try {
      const r = JSON.parse(line)
      if (r.type !== 'user') continue
      const c = r.message?.content
      const s = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : ''
      if (s && !s.startsWith('<')) return s
    } catch {}
  }
  return null
}

/** 넣을 안내 글, 없으면 null */
export function signalNote({ prompt, transcript_path }) {
  const p = String(prompt ?? '')
  if (PLACEHOLDER_RE.test(p)) {
    return 'Placeholder session: the first message is only a session number. The user opened this session to reach it later from the phone. Use no tools, start nothing (not even a due upkeep; it runs once the user sends a real instruction), and reply in one line that you are waiting (예: «대기 중입니다»).'
  }
  if (KEEPALIVE_RE.test(p)) {
    const first = firstUserPrompt(transcript_path)
    if (first && PLACEHOLDER_RE.test(first)) return 'Keepalive in a placeholder session: this «.» is not an instruction. Use no tools and reply with one short line.'
    return null
  }
  if (CLOSE_RE.test(p)) {
    const next = NEXT_SESSION_RE.test(p)
    return 'Session-close signal (user words like «여기까지», «다음 세션에서», «꺼도 돼»). If the user is closing this session, start no new work ' +
      '(not even a due upkeep; it runs in the next session) and instead: (1) check what could be lost: uncommitted changes, unpushed commits, open PRs or issues, running background workers or sessions; if nothing, say plainly «그냥 닫으셔도 잃을 게 없습니다». ' +
      '(2) leave a short handoff for the next session in an issue or PR comment (not a repo md file). ' +
      '(3) mention that settings changed in this session apply from new sessions. ' +
      (next ? '(4) The user said «다음 세션에서»: do not start that work now; only note where to start it. ' : '') +
      'If the words are not about closing the session, ignore this note.'
  }
  return null
}

function main() {
  try {
    const input = readStdinJson()
    const note = signalNote({ prompt: input?.prompt, transcript_path: input?.transcript_path })
    if (note) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: note } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
