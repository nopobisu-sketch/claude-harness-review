import { describe, it, expect, beforeEach, afterEach } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { decide } from '../deny-unattended-prompt.mjs'

/**
 * PermissionRequest 훅 — 승인할 사람이 없는 일꾼(다른 세션이 띄운 세션, 하위 에이전트)의 승인 요청만 거절한다.
 * 데스크톱 앱의 세션 파일은 임시 HOME 아래에 같은 모양으로 세워 잰다.
 */
const HOOK = path.resolve(import.meta.dirname, '../deny-unattended-prompt.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')
const WORKER = 'local_11111111-2222-3333-4444-555555555555'
const SUPERVISOR = 'local_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

let home: string

function writeSession(id: string, body: string) {
  const dir = path.join(home, 'Library', 'Application Support', 'Claude', 'claude-code-sessions', 'acct', 'org')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, `${id}.json`), body)
}

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'deny-unattended-'))
  writeSession(WORKER, JSON.stringify({ sessionId: WORKER, spawnedFrom: { sessionId: SUPERVISOR, sideSession: true } }))
  writeSession(SUPERVISOR, JSON.stringify({ sessionId: SUPERVISOR }))
})

afterEach(() => rmSync(home, { recursive: true, force: true }))

const bash = { hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'touch x' } }

describe('일꾼의 승인 요청 거절', () => {
  it('하위 에이전트의 요청은 거절하고, 같은 호출을 되풀이하지 말라고 알린다', () => {
    const out = decide({ ...bash, agent_id: 'agent-1' }, {}, home)
    expect(out?.hookSpecificOutput.decision.behavior).toBe('deny')
    expect(out?.hookSpecificOutput.decision.message).toContain('하위 에이전트')
    expect(out?.hookSpecificOutput.decision.message).toContain('Bash 호출을 거절했다')
    expect(out?.hookSpecificOutput.decision.message).toContain('같은 호출을 다시 하지 말고')
  })

  it('다른 세션이 띄운 데스크톱 세션의 요청은 거절한다', () => {
    const out = decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: WORKER }, home)
    expect(out?.hookSpecificOutput.decision.behavior).toBe('deny')
    expect(out?.hookSpecificOutput.decision.message).toContain('다른 세션이 띄운 일꾼 세션')
  })

  it('사람이 직접 연 세션(감독)의 요청은 결정하지 않아 평소대로 승인 창이 뜬다', () => {
    expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: SUPERVISOR }, home)).toBeNull()
  })

  it('사용자가 맡은 세션(포크, /btw, 맨 위로 끌어낸 세션)과 모양을 모르는 spawnedFrom은 일꾼으로 보지 않는다', () => {
    const OTHER = 'local_cccccccc-0000-0000-0000-000000000000'
    const shapes = [
      { spawnedFrom: { sessionId: SUPERVISOR, sideSession: true, userFork: true } },
      { spawnedFrom: { sessionId: SUPERVISOR, sideSession: true, btw: true } },
      { spawnedFrom: { sessionId: SUPERVISOR, sideSession: true }, lineageDetached: true, lineageDetachedBy: 'user' },
      { spawnedFrom: { sessionId: SUPERVISOR, pendingPop: true } },
      null,
    ]
    for (const shape of shapes) {
      writeSession(OTHER, JSON.stringify(shape))
      expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: OTHER }, home)).toBeNull()
    }
  })

  it('세션 폴더에 폴더가 아닌 항목이 끼어도 일꾼 판정이 꺼지지 않는다', () => {
    const sessionsDir = path.join(home, 'Library', 'Application Support', 'Claude', 'claude-code-sessions')
    writeFileSync(path.join(sessionsDir, '.DS_Store'), '')
    writeFileSync(path.join(sessionsDir, 'acct', '.DS_Store'), '')
    expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: WORKER }, home)?.hookSpecificOutput.decision.behavior).toBe('deny')
  })

  it('세션 id에 상위 폴더 이동이 섞이면 그 경로의 파일을 읽지 않는다', () => {
    // 'local_../../x'를 그대로 이어 붙이면 같은 폴더의 x.json을 읽게 된다. 그 자리에 일꾼 파일을 두고도 거절하지 않아야 한다.
    writeSession('x', JSON.stringify({ spawnedFrom: { sessionId: SUPERVISOR, sideSession: true } }))
    expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: 'local_../../x' }, home)).toBeNull()
  })

  it('데스크톱 밖(터미널)에서 연 세션은 건드리지 않는다', () => {
    expect(decide(bash, {}, home)).toBeNull()
  })

  it('세션 파일이 없거나 깨졌으면 일꾼으로 단정하지 않는다', () => {
    expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: 'local_99999999-0000-0000-0000-000000000000' }, home)).toBeNull()
    writeSession(WORKER, '{not json')
    expect(decide(bash, { CLAUDE_CODE_HOST_SESSION_ID: WORKER }, home)).toBeNull()
  })

  it('훅으로 실행하면 거절 결정을 JSON으로 내고, 결정하지 않을 때는 아무것도 쓰지 않는다', () => {
    const run = (input: object, env: Record<string, string> = {}) =>
      spawnSync('node', [HOOK], { input: JSON.stringify(input), encoding: 'utf8', env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', HOME: home, ...env } })
    const denied = run(bash, { CLAUDE_CODE_HOST_SESSION_ID: WORKER })
    expect(denied.status).toBe(0)
    expect(JSON.parse(denied.stdout).hookSpecificOutput.decision.behavior).toBe('deny')
    const passed = run(bash, { CLAUDE_CODE_HOST_SESSION_ID: SUPERVISOR })
    expect(passed.status).toBe(0)
    expect(passed.stdout).toBe('')
  })

  it('저장소 설정이 PermissionRequest에 이 훅을 건다', () => {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const commands = (settings.hooks.PermissionRequest ?? []).flatMap((entry: { hooks: { command: string }[] }) =>
      entry.hooks.map((hook) => hook.command),
    )
    expect(commands.some((command: string) => command.includes('.claude/hooks/deny-unattended-prompt.mjs'))).toBe(true)
  })
})
