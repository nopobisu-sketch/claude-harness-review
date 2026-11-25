// PreToolUse 훅(Agent): 일꾼(하위 에이전트)에게 일을 넘길 때 브리프에 GitHub 이슈 번호가 있어야 한다.
// 까닭(사용자 2026-11-25: «일꾼이 이슈를 적는건 맞는데 백그라운드 에이전트 일꾼은 이슈를 안적어서 문제인 부분임»):
//   전역 CLAUDE.md에 «일꾼 브리프에는 자세한 결과는 이슈에»라는 글 규칙이 있었는데도, 프로젝트 I 프로젝트에서 11-23~25에
//   일을 스무 번 넘게 넘기는 동안 이슈가 하나도 남지 않았다. 폰에서 시키면 백그라운드 일꾼의 진행이 남지 않았다.
// 통과: 브리프에 이슈 번호(#123, …/issues/123, «이슈 123»)나 «이슈 없음: 이유»가 있는 호출, 읽기 전용 유형(조사·탐색·계획),
//   GitHub 원격이 없는 폴더(이슈를 만들 곳이 없음)와 git 밖 세션. 색 번호(#121212 같은 6자리)는 이슈 번호로 치지 않는다.
// 막을 때는 permissionDecision deny로 이유를 돌려준다. 훅이 고장 나면 막지 않는다(언제나 0으로 끝낸다).
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { readStdinJson } from './harness-layers.mjs'

export const READ_ONLY_TYPES = ['researcher', 'Explore', 'Plan', 'claude-code-guide', 'web-fetch', 'statusline-setup']
const ISSUE_RE = /(?<![\w&/])#\d{1,5}(?!\w)|\/issues\/\d+|이슈\s*#?\d{1,5}(?!\d)/
const NO_ISSUE_RE = /이슈\s*없음\s*[:：]\s*\S/

export const hasIssueRef = (text) => ISSUE_RE.test(text ?? '')

function hasGithubRemote(cwd) {
  const r = spawnSync('git', ['remote', '-v'], { cwd, encoding: 'utf8' })
  return r.status === 0 && /github\.com[:/]/.test(r.stdout)
}

/** 막아야 하면 이유 글, 아니면 null */
export function needIssueReason({ cwd, tool_input: ti = {} }) {
  const type = ti.subagent_type || 'general-purpose'
  if (READ_ONLY_TYPES.includes(type)) return null
  const prompt = String(ti.prompt ?? '')
  if (hasIssueRef(prompt) || NO_ISSUE_RE.test(prompt)) return null
  if (!cwd || !hasGithubRemote(cwd)) return null
  return '일꾼에게 일을 넘길 때는 그 일의 GitHub 이슈를 먼저 만들고(gh issue create) 브리프에 이슈 번호를 넣어라. ' +
    '일꾼은 자세한 결과(한 것, 확인한 범위, 확인하지 못한 것, 커밋 번호)를 그 이슈에 코멘트로 남기고, 감독에게는 이슈 번호와 결과 한 줄만 보고한다. ' +
    '감독은 결과를 확인한 뒤 이슈를 닫는다(사용자 결정 2026-11-25: 백그라운드 일꾼도 이슈에 적는다). ' +
    `조사·읽기만 하는 일이면 읽기 전용 유형(${READ_ONLY_TYPES.join(', ')})을 쓰고, 이슈가 필요 없는 일이면 브리프에 «이슈 없음: 이유»를 한 줄 적어라. 이 호출은 실행되지 않았다.`
}

function main() {
  try {
    const input = readStdinJson()
    const reason = needIssueReason({ cwd: input?.cwd || process.cwd(), tool_input: input?.tool_input })
    if (reason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
