// PreToolUse 훅(Write|Edit|MultiEdit|NotebookEdit): 프로젝트 폴더에서 연 세션이 전역 하네스(~/.claude)의 파일을 고치지 못하게 막는다.
// 까닭(사용자 결정 2026-11-25, 건의 방식 1a·2a·3a): «세부 프로젝트는 전역 수정 금지». 프로젝트 세션은 전역에 해당하는 것을
//   (규칙이든 도구 함정이든) 그 프로젝트 메모리의 global-proposals.md에 «건의»로 적고, 전역이 하네스 지도에 올려 사용자가 고른다.
//   11-25 프로젝트 I 세션이 전역 메모리에 파일을 썼다가 되돌렸다: 글 규칙만으로는 쓴 뒤에야 알았다.
// 막지 않는 곳: ~/.claude/projects/(프로젝트 메모리), ~/.claude/plans/(계획 모드). 막지 않는 세션: 전역 저장소와 그 worktree에서 연 세션,
//   프로젝트 밖(홈·임시 폴더)에서 연 세션. 셸 명령으로 쓰는 길은 막지 못한다. 훅이 고장 나면 막지 않는다(언제나 0으로 끝낸다).
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GLOBAL_DIR, HOME, PROPOSALS_FILE, isGlobalRepo, nfc, projectMemoryDir, readStdinJson, repoRoot } from './harness-layers.mjs'

const ALLOWED = ['projects', 'plans'].map((d) => nfc(join(GLOBAL_DIR, d)) + sep)

/** 막아야 하면 이유 글, 아니면 null */
export function guardReason({ cwd, filePath }) {
  if (!cwd || !filePath) return null
  const p = nfc(resolve(cwd, filePath))
  const g = nfc(GLOBAL_DIR)
  if (p !== g && !p.startsWith(g + sep)) return null
  if (ALLOWED.some((a) => p.startsWith(a))) return null
  const root = repoRoot(cwd)
  if (!root || isGlobalRepo(root)) return null
  const inbox = join(projectMemoryDir(root), PROPOSALS_FILE).replace(HOME, '~')
  return `전역 수정 금지: project sessions do not edit the global harness (user decision 2026-11-25). ${p.replace(HOME, '~')} was not changed. ` +
    `If this would help every project (a rule, a tool trap, a skill or hook idea), add it as a 건의 to ${inbox}: ` +
    'a heading "## 건의 N (YYYY-MM-DD): 제목" with bullets "- 내용:", "- 근거:" (what happened in this project, with the user\'s words) and "- 전역에서 고칠 후보:". ' +
    'The global side puts it on the 하네스 지도 as «프로젝트 건의» and the user decides there. Tell the user in one line that you filed it as a 건의.'
}

function main() {
  try {
    const input = readStdinJson()
    const ti = input?.tool_input ?? {}
    const reason = guardReason({ cwd: input?.cwd || process.cwd(), filePath: ti.file_path || ti.notebook_path })
    if (reason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
