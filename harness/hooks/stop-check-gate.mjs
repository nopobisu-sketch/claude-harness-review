// Stop 훅: 턴을 끝내기 전에 프로젝트의 검사 스크립트를 돌려, 실패하면 Claude를 되돌려 고치게 한다.
// 종료 코드 규칙(공식 문서, Lydia Hallie 강연 vlfCjWuv4es): 2 = 막고 stderr를 Claude에게 돌려줘 고치게 한다,
// 0 = 통과, 그 밖(1 등) = 막지 않고 stderr만 사용자에게 보인다(끝난 것으로 처리된다). 그래서 «막는다»는 반드시 2로 끝낸다.
// 켜는 법(프로젝트마다 고름): 저장소 뿌리에 .claude/stop-check.sh를 둔다. 없으면 이 훅은 아무것도 하지 않는다.
// 지난번 통과 이후 저장소가 바뀌지 않았으면(HEAD·작업 트리 지문이 같으면) 다시 돌리지 않는다. 대화만 한 턴은 비용이 없다.
// 같은 세션에서 연달아 MAX_RETRIES번 막혔으면 더 막지 않고 1로 끝내 사용자에게만 알린다(무한 되돌림 방지).
// 훅 자체가 고장 나면 조용히 0으로 끝낸다. 관문이 고장 났다고 세션을 가두지 않는다.
// 검사 파일 바뀜 알림(2026-11-25, 하네스 지도 h1125-02 «하자», 이슈 user/claude-harness#2): 검사받는 세션이 검사 파일을
//   고쳐(실패하는 시험 빼기 등) 관문을 지나갈 수 있다. 검사 파일에 커밋하지 않은 변경이 있으면, 같은 변경마다 한 번만 2로 되돌려
//   세션이 사용자에게 «무엇이 바뀌었는지» 한 줄로 알리게 한다. 되돌리거나 막지는 않는다(되돌릴지는 사용자가 정한다).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const SCRIPT = join('.claude', 'stop-check.sh')
export const MAX_RETRIES = 3
const CHECK_TIMEOUT_MS = 8 * 60 * 1000
const TAIL_LINES = 40

const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return r.status === 0 ? r.stdout : null
}

/** 저장소 상태 지문: HEAD + 작업 트리(추적 파일의 변경·새 파일 목록) */
export function fingerprint(root) {
  const head = git(root, ['rev-parse', 'HEAD']) ?? 'no-head'
  const status = git(root, ['status', '--porcelain', '--untracked-files=all']) ?? ''
  const diff = git(root, ['diff', 'HEAD']) ?? ''
  return createHash('sha256').update(head).update(status).update(diff).digest('hex')
}

/** 검사 파일의 커밋하지 않은 변경. 없으면 null. removed: 빠진 줄(새 파일이면 빈 배열) */
export function scriptChange(root) {
  const status = (git(root, ['status', '--porcelain', '--untracked-files=all', '--', SCRIPT]) ?? '').trim()
  if (!status) return null
  const diff = git(root, ['diff', 'HEAD', '--', SCRIPT]) ?? ''
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1).trim()).filter(Boolean)
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).length
  const fp = createHash('sha256').update(status).update(diff).update(diff ? '' : readFileSync(join(root, SCRIPT), 'utf8')).digest('hex')
  return { fp, isNew: status.startsWith('??') || status.startsWith('A'), removed, added }
}

const stateFile = (stateDir, root) => join(stateDir, `${createHash('sha256').update(root).digest('hex').slice(0, 16)}.json`)
const loadState = (file) => {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return {} }
}
const saveState = (file, state) => {
  try { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, JSON.stringify(state)) } catch {}
}

/**
 * @param {{ cwd?: string, session_id?: string }} input
 * @param {{ stateDir?: string }} [opts]
 * @returns {{ code: 0 | 1 | 2, stderr?: string }}
 */
export function run(input, { stateDir = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'state', 'stop-check') } = {}) {
  const cwd = input.cwd || process.cwd()
  const root = git(cwd, ['rev-parse', '--show-toplevel'])?.trim()
  if (!root || !existsSync(join(root, SCRIPT))) return { code: 0 }

  const file = stateFile(stateDir, root)
  const state = loadState(file)

  const changed = scriptChange(root)
  if (changed && state.scriptNotified !== changed.fp) {
    saveState(file, { ...state, scriptNotified: changed.fp })
    const what = changed.isNew ? '새로 생겼다'
      : changed.removed.length ? `빠진 줄 ${changed.removed.length}개: ${changed.removed.slice(0, 8).map((l) => `«${l.slice(0, 80)}»`).join(', ')}`
        : `줄 ${changed.added}개가 더해졌다(빠진 줄 없음)`
    return {
      code: 2,
      stderr: `끝내기 전 검사 파일(${SCRIPT})에 커밋하지 않은 변경이 있다: ${what}. ` +
        '검사받는 쪽이 검사를 약하게 만들 수 있어서 사용자가 알아야 한다. 사용자에게 한 줄로 알려라: 무엇이 바뀌었고 왜 바꿨는지(검사가 빠졌으면 그 검사). ' +
        '되돌리지는 마라(되돌릴지는 사용자가 정한다). 알린 뒤 끝내면 같은 변경으로는 다시 멈추지 않는다.\n',
    }
  }

  const fp = fingerprint(root)
  if (state.passed === fp) return { code: 0 }

  const r = spawnSync('bash', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 })
  if (r.status === 0) {
    saveState(file, { passed: fp })
    return { code: 0 }
  }

  const session = input.session_id || 'unknown'
  const tries = state.session === session ? (state.tries || 0) + 1 : 1
  saveState(file, { ...state, session, tries })
  const why = r.error?.code === 'ETIMEDOUT' ? `${CHECK_TIMEOUT_MS / 60000}분 안에 끝나지 않았다` : `종료 코드 ${r.status}`
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trimEnd().split('\n').slice(-TAIL_LINES).join('\n')

  if (tries > MAX_RETRIES) {
    return {
      code: 1,
      stderr: `끝내기 전 검사(${SCRIPT})가 ${MAX_RETRIES}번 고쳐도 실패해서 더 되돌리지 않았다(${why}). 사람이 봐야 한다.\n${tail}\n`,
    }
  }
  return {
    code: 2,
    stderr:
      `끝내기 전 검사(${SCRIPT})가 실패해서 턴을 끝내지 못하게 막았다(${why}, ${tries}/${MAX_RETRIES}번째). ` +
      '아래 출력의 원인을 고친 뒤 끝내라. 검사를 끄거나 건너뛰지 말고, 검사가 틀렸다고 판단되면 그 근거를 사용자에게 보고하라.\n' +
      `--- 출력 끝 ${TAIL_LINES}줄 ---\n${tail}\n`,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let raw = ''
  process.stdin.on('data', (d) => (raw += d))
  process.stdin.on('end', () => {
    let result
    try {
      result = run(JSON.parse(raw), process.env.STOP_CHECK_STATE_DIR ? { stateDir: process.env.STOP_CHECK_STATE_DIR } : undefined)
    } catch {
      process.exit(0)
    }
    if (result.stderr) process.stderr.write(result.stderr)
    // 공식 문서: Stop 훅이 stdout 없이 2로 끝나고 stderr에 «No such file or directory»가 있으면 막지 않는 오류로 처리된다.
    // 시험 출력에 그 문구가 섞여도 막히도록 stdout에 한 줄을 남긴다(평문 stdout + 2 = 막음, 이유는 stderr).
    if (result.code === 2) process.stdout.write('stop-check-gate: blocked\n')
    process.exit(result.code)
  })
}
