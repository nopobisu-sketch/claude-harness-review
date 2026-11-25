// PreToolUse 훅(Agent): 모델을 적지 않은 하위 에이전트 호출을 막는다.
// 모델을 비우면 부른 세션의 모델을 물려받는다. 감독 세션은 큰 모델이라 검토·조사 일꾼까지 같은 모델로 돌아 사용량이 샌다.
// 통과: 모델을 적은 호출, fork(부모 모델을 물려받는 것이 정상), 정의 파일 frontmatter에 model이 박힌 유형.
// 정의 파일을 못 찾거나 model이 inherit이면 물려받는 것과 같아서 막는다.
// 막을 때는 이유를 stderr에 쓰고 2로 끝낸다. Claude Code가 그 이유를 에이전트에게 돌려준다.
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** 정의 파일들에서 name이 맞는 것을 찾아 frontmatter의 model 값을 돌려준다. 없으면 null */
export function definedModel(agentType, dirs) {
  for (const dir of dirs) {
    let files
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    } catch {
      continue
    }
    for (const file of files) {
      let text
      try {
        text = readFileSync(join(dir, file), 'utf8')
      } catch {
        continue
      }
      const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
      if (!front) continue
      const field = (key) => new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]*?)["']?\\s*$`, 'm').exec(front)?.[1] ?? null
      const name = field('name') || file.slice(0, -3)
      if (name !== agentType) continue
      return field('model') || null
    }
  }
  return null
}

/**
 * @param {{ tool_input?: { model?: string, subagent_type?: string }, cwd?: string }} input
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [home]
 * @returns {string | null} 막을 이유, 통과면 null
 */
export function decide(input, env = process.env, home = homedir()) {
  const toolInput = input.tool_input ?? {}
  if (typeof toolInput.model === 'string' && toolInput.model.trim()) return null
  const type = toolInput.subagent_type || 'general-purpose'
  if (type === 'fork') return null
  const projectDir = env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
  const model = definedModel(type, [join(projectDir, '.claude', 'agents'), join(process.env.CLAUDE_CONFIG_DIR || join(home, '.claude'), 'agents')])
  if (model && model !== 'inherit') return null
  return (
    `하위 에이전트(${type}) 호출에 model이 없어서 막았다. 실행되지 않았다. ` +
    '모델을 비우면 부른 세션의 모델(감독이면 Fable)을 물려받아 사용량이 샌다. ' +
    'model을 적어 다시 불러라(검증·위험 검토는 opus, 판단 없는 기계적인 일은 haiku, 작은 고침은 sonnet). ' +
    '자리별 모델 표는 전역 메모리 ~/.claude/memory/parallel-work-and-models.md에 있다. 프로젝트에 자기 모델 표(예: docs/agents/worker-brief.md)가 있으면 그것을 먼저 따른다.'
  )
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
