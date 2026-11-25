import { describe, it, expect, beforeEach, afterEach } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { decide } from '../require-agent-model.mjs'

/**
 * PreToolUse 훅(Agent) — 모델을 적지 않은 하위 에이전트 호출을 막는다.
 * 정의 파일은 임시 프로젝트 폴더와 임시 HOME 아래에 같은 모양으로 세워 잰다.
 */
const HOOK = path.resolve(import.meta.dirname, '../require-agent-model.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')

let project: string
let home: string
let env: Record<string, string>

function writeAgent(root: string, file: string, front: string) {
  const dir = path.join(root, '.claude', 'agents')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, file), `---\n${front}\n---\n\n본문\n`)
}

beforeEach(() => {
  project = mkdtempSync(path.join(tmpdir(), 'agent-model-project-'))
  home = mkdtempSync(path.join(tmpdir(), 'agent-model-home-'))
  env = { CLAUDE_PROJECT_DIR: project }
  writeAgent(project, 'researcher.md', 'name: researcher\ndescription: 조사\nmodel: sonnet')
  writeAgent(project, 'heir.md', 'name: heir\nmodel: inherit')
  writeAgent(project, 'bare.md', 'name: bare\ndescription: 모델 없음')
  writeAgent(home, 'mine.md', 'name: mine\nmodel: "haiku"')
})

afterEach(() => {
  rmSync(project, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

const call = (toolInput: { model?: string; subagent_type?: string }) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'Agent',
  tool_input: { prompt: '일', ...toolInput },
})

describe('모델 없는 하위 에이전트 호출 막기', () => {
  it('유형도 모델도 없으면(general-purpose) 막고, 모델 표 위치를 알려 준다', () => {
    const reason = decide(call({}), env, home)
    expect(reason).toContain('model이 없어서 막았다')
    expect(reason).toContain('general-purpose')
    expect(reason).toContain('parallel-work-and-models.md')
  })

  it('정의 파일이 없는 유형은 막는다', () => {
    expect(decide(call({ subagent_type: 'Explore' }), env, home)).toContain('Explore')
  })

  it('정의 파일에 model이 없거나 inherit이면 막는다', () => {
    expect(decide(call({ subagent_type: 'bare' }), env, home)).not.toBeNull()
    expect(decide(call({ subagent_type: 'heir' }), env, home)).not.toBeNull()
  })

  it('모델이 빈 글자면 적지 않은 것으로 본다', () => {
    expect(decide(call({ model: '  ' }), env, home)).not.toBeNull()
  })

  it('모델을 적은 호출은 통과한다', () => {
    expect(decide(call({ model: 'opus' }), env, home)).toBeNull()
    expect(decide(call({ subagent_type: 'Explore', model: 'haiku' }), env, home)).toBeNull()
  })

  it('fork는 모델 없이도 통과한다', () => {
    expect(decide(call({ subagent_type: 'fork' }), env, home)).toBeNull()
  })

  it('정의 파일에 model이 박힌 유형은 통과한다(프로젝트·사용자 폴더 둘 다)', () => {
    expect(decide(call({ subagent_type: 'researcher' }), env, home)).toBeNull()
    expect(decide(call({ subagent_type: 'mine' }), env, home)).toBeNull()
  })

  it('전역의 researcher 정의는 실제로 model이 박혀 있어 통과한다', () => {
    const realHome = path.resolve(import.meta.dirname, '../../..')
    const empty = mkdtempSync(path.join(tmpdir(), 'agent-model-empty-'))
    expect(decide(call({ subagent_type: 'researcher' }), { CLAUDE_PROJECT_DIR: empty }, realHome)).toBeNull()
  })

  it('훅으로 실행하면 막을 때 2로 끝내며 이유를 stderr에 쓰고, 통과면 0으로 조용히 끝낸다', () => {
    const run = (input: object) =>
      spawnSync('node', [HOOK], { input: JSON.stringify(input), encoding: 'utf8', env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', HOME: home, ...env } })
    const blocked = run(call({}))
    expect(blocked.status).toBe(2)
    expect(blocked.stderr).toContain('model이 없어서 막았다')
    const passed = run(call({ model: 'opus' }))
    expect(passed.status).toBe(0)
    expect(passed.stderr).toBe('')
  })

  it('저장소 설정이 PreToolUse의 Agent에 이 훅을 건다', () => {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const entry = (settings.hooks.PreToolUse ?? []).find((e: { matcher?: string }) => e.matcher === 'Agent')
    expect(entry?.hooks.some((hook: { command: string }) => hook.command.includes('.claude/hooks/require-agent-model.mjs'))).toBe(true)
  })
})
