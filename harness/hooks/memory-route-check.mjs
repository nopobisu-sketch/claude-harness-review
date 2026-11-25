// PostToolUse 훅(Write|Edit): 메모리 파일을 쓴 직후, 그 내용이 맞는 층에 들어갔는지 Claude에게 한 번 더 묻게 한다.
// - 프로젝트 메모리 주제 파일을 썼으면: 어느 프로젝트에서나 통하는 내용이면 그 프로젝트의 건의 파일(global-proposals.md)로 돌리라고 알린다.
//   까닭(2026-11-23): Claude Code 기본 지시가 «프로젝트 메모리에 써라»여서 범용 내용이 프로젝트에 묻혔다. 처음에는 «전역으로 옮겨라»였으나,
//   2026-11-25 사용자 결정(«세부 프로젝트는 전역 수정 금지»)으로 프로젝트 세션은 건의만 하고 전역이 지도에서 고른다. 전역 쓰기는 global-write-guard가 막는다.
// - 전역 메모리 주제 파일을 썼는데 전역 목차(MEMORY.md)에 그 파일 줄이 없으면: 목차에 한 줄 넣으라고 알린다.
// 막지 않는다(언제나 0). 알림만 붙인다.
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GLOBAL_DIR, GLOBAL_MEMORY, PROPOSALS_FILE, readStdinJson } from './harness-layers.mjs'

const PROJECT_MEMORY_RE = new RegExp(`^${join(GLOBAL_DIR, 'projects').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^/]+/memory/[^/]+\\.md$`)

export function routeNote(filePath) {
  if (!filePath || !filePath.endsWith('.md')) return null
  const name = basename(filePath)
  if (PROJECT_MEMORY_RE.test(filePath)) {
    if (name === 'MEMORY.md' || name === PROPOSALS_FILE) return null
    return `Memory routing check: you wrote project memory (${name}). Keep project facts here. If part of it would hold in any project (working style, tool usage, a trap), do not write ~/.claude: project sessions do not edit the global harness (user decision 2026-11-25; a hook blocks it). Add that part as a 건의 to ${PROPOSALS_FILE} in this project memory folder ("## 건의 N (YYYY-MM-DD): 제목" with "- 내용:", "- 근거:", "- 전역에서 고칠 후보:"). If it is a rule this project does differently from global, put it in the "전역과 다르게 하는 것" section of the project MEMORY.md instead.`
  }
  if (filePath.startsWith(GLOBAL_MEMORY + '/') && name !== 'MEMORY.md') {
    const index = join(GLOBAL_MEMORY, 'MEMORY.md')
    const listed = existsSync(index) && readFileSync(index, 'utf8').includes(`(${name})`)
    if (!listed) return `Global memory ${name} is not linked from ~/.claude/memory/MEMORY.md. Add one index line, or it will never be seen.`
  }
  return null
}

function main() {
  try {
    const input = readStdinJson()
    const note = routeNote(input?.tool_input?.file_path)
    if (note) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: note } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
