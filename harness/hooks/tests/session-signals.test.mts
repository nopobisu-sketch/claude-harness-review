import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { firstUserPrompt, signalNote } from '../session-signals.mjs'

/**
 * UserPromptSubmit 훅 — 빈자리 세션(«세션 N»), 그 세션의 keepalive «.», 마감 신호(«여기까지»·«다음 세션에서»).
 * 2026-11-25 사용자 «1235 반영해»(이슈 user/claude-harness#4).
 */
const HOOK = path.resolve(import.meta.dirname, '../session-signals.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')

function transcript(firstPrompt: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'signals-'))
  const file = path.join(dir, 't.jsonl')
  const lines = [
    { type: 'system', content: 'x' },
    { type: 'user', message: { role: 'user', content: '<system-reminder>무시</system-reminder>' } },
    { type: 'user', message: { role: 'user', content: [{ type: 'text', text: firstPrompt }] } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: '대기 중입니다' }] } },
  ]
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n'))
  return { dir, file }
}

describe('session-signals', () => {
  it('«세션 1»처럼 번호뿐인 메시지는 도구 없이 대기하라고 알린다', () => {
    for (const p of ['세션 1', '세션2', '  세션 12  ']) expect(signalNote({ prompt: p })).toContain('Placeholder session')
    expect(signalNote({ prompt: '세션 1' })).toContain('not even a due upkeep')
    expect(signalNote({ prompt: '세션 1 이어서 해줘' })).toBeNull()
  })
  it('빈자리 세션의 «.»은 지시가 아니라고 알리고, 다른 세션의 «.»에는 조용하다', () => {
    const a = transcript('세션 3')
    expect(firstUserPrompt(a.file)).toBe('세션 3')
    expect(signalNote({ prompt: '.', transcript_path: a.file })).toContain('Keepalive')
    const b = transcript('프로젝트 I 메인을 고쳐줘')
    expect(signalNote({ prompt: '.', transcript_path: b.file })).toBeNull()
    expect(signalNote({ prompt: '.' })).toBeNull()
    rmSync(a.dir, { recursive: true, force: true }); rmSync(b.dir, { recursive: true, force: true })
  })
  it('마감 신호에는 잃을 것 확인을, «다음 세션에서»에는 지금 시작하지 말라는 줄을 더한다', () => {
    const close = signalNote({ prompt: '오늘은 여기까지' })!
    expect(close).toContain('Session-close signal')
    expect(close).toContain('그냥 닫으셔도 잃을 게 없습니다')
    expect(close).toContain('not even a due upkeep')
    expect(close.includes('do not start that work now')).toBe(false)
    expect(signalNote({ prompt: '그건 다음 세션에서 할게' })).toContain('do not start that work now')
    expect(signalNote({ prompt: '이제 이거 꺼도 돼?' })).toContain('Session-close signal')
    expect(signalNote({ prompt: '이 세션 마무리하자' })).toContain('Session-close signal')
  })
  it('평범한 지시에는 아무것도 넣지 않는다', () => {
    for (const p of ['a로 진행', '버그 고쳐줘', '1235 반영해', '']) expect(signalNote({ prompt: p })).toBeNull()
  })
  it('실제 실행: 신호면 additionalContext JSON, 아니면 빈 출력, 입력이 깨져도 0', () => {
    const run = (input: string) => spawnSync('node', [HOOK], { input, encoding: 'utf8' })
    const r = run(JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: '세션 1' }))
    expect(r.status).toBe(0)
    const out = JSON.parse(r.stdout).hookSpecificOutput
    expect(out.hookEventName).toBe('UserPromptSubmit')
    expect(out.additionalContext).toContain('Placeholder')
    const quiet = run(JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: '진행해' }))
    expect(quiet.stdout).toBe('')
    expect(run('{').status).toBe(0)
  })
  it('settings.json의 UserPromptSubmit에 걸려 있다', () => {
    const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    expect(JSON.stringify(s.hooks.UserPromptSubmit ?? []).includes('session-signals.mjs')).toBe(true)
  })
})
