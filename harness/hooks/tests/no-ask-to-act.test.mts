import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { decide } from '../no-ask-to-act.mjs'

/**
 * PreToolUse 훅(start_session·wrap_up) — 묻지 말고 할 일을 묻는 질문과 제안 카드를 막는다.
 */
const HOOK = path.resolve(import.meta.dirname, '../no-ask-to-act.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')

const start = (toolInput: Record<string, unknown>) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'mcp__ccd_session__start_session',
  tool_input: toolInput,
})
const wrapUp = (ask?: string) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'mcp__ccd_turn__wrap_up',
  tool_input: { recap: '한 일', ...(ask === undefined ? {} : { ask, actions: [{ label: '예' }] }) },
})

describe('새 세션 열기', () => {
  it('own_initiative 제안 카드는 막고 user_asked로 바로 열라고 알려 준다', () => {
    const reason = decide(start({ initiation: 'own_initiative', title: '정리', prompt: '일' }))
    expect(reason).toContain('own_initiative')
    expect(reason).toContain('user_asked')
  })

  it('offer 묻는 카드도 막는다', () => {
    expect(decide(start({ initiation: 'offer', title: '정리' }))).not.toBeNull()
  })

  it('initiation이 없으면 막는다', () => {
    expect(decide(start({ title: '정리', prompt: '일' }))).not.toBeNull()
  })

  it('user_asked는 통과한다', () => {
    expect(decide(start({ initiation: 'user_asked', title: '정리', prompt: '일' }))).toBeNull()
  })

  it('proposal_id만 보낸 호출(사용자가 고른 카드 시작)은 통과한다', () => {
    expect(decide(start({ proposal_id: 'task_ab12cd34' }))).toBeNull()
  })
})

describe('마무리 질문', () => {
  it.each([
    ['머지할까요?', '머지'],
    ['PR을 머지해도 될까요?', '머지'],
    ['바로 고칠까요?', '고치기'],
    ['이 버그 고쳐도 될까요?', '고치기'],
    ['이슈로 만들까요?', '이슈 만들기'],
    ['후속 이슈를 등록할까요?', '이슈 만들기'],
    ['고칠 세션을 시작할까요?', '고치기'],
    ['새 세션을 열까요?', '세션 열기'],
    ['PR을 올릴까요?', 'PR·푸시·커밋'],
    ['Should I merge it?', '머지'],
    ['머지 방식을 어떻게 할까요?', '머지'],
    ['배치로 한꺼번에 머지할까요?', '머지'],
  ])('«%s»는 막는다(%s)', (ask, what) => {
    const reason = decide(wrapUp(ask))
    expect(reason).toContain(what)
    expect(reason).toContain('하고 나서 보고')
  })

  it.each([
    '처리방침 문구를 이대로 둘까요?',
    '약관 바뀐 PR, 읽고 머지하시겠어요?',
    '어느 시안으로 갈까요?',
    '배치를 바꾼 시안을 승인하시나요?',
    '두 안 중 어느 쪽으로 고칠까요?',
    '유료 API를 써도 될까요?',
    '월 요금이 드는 플랜으로 올릴까요?',
    '어떤 이름이 좋을까요?',
    '#1250과 #1251 중 먼저 머지할 것은 1번인가요 2번인가요?',
    '1안(바로 머지)과 2안(보류) 중 무엇으로 할까요?',
    'Fix A or B?',
    '머지 전에 폰에서 직접 보시겠어요?',
  ])('«%s»는 묻는 게 맞으니 통과한다', (ask) => {
    expect(decide(wrapUp(ask))).toBeNull()
  })

  it('ask 없는 마무리는 통과한다', () => {
    expect(decide(wrapUp())).toBeNull()
    expect(decide(wrapUp('  '))).toBeNull()
  })

  it('다른 도구는 건드리지 않는다', () => {
    expect(decide({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 1 --merge' } })).toBeNull()
  })
})

describe('훅 연결', () => {
  it('훅으로 실행하면 막을 때 2로 끝내며 이유를 stderr에 쓰고, 통과면 0으로 조용히 끝낸다', () => {
    const run = (input: object) =>
      spawnSync('node', [HOOK], { input: JSON.stringify(input), encoding: 'utf8', env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' } })
    const blocked = run(wrapUp('머지할까요?'))
    expect(blocked.status).toBe(2)
    expect(blocked.stderr).toContain('막았다')
    const passed = run(start({ initiation: 'user_asked', title: 't', prompt: 'p' }))
    expect(passed.status).toBe(0)
    expect(passed.stderr).toBe('')
  })

  it('저장소 설정이 PreToolUse의 start_session과 wrap_up에 이 훅을 건다', () => {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const entries = (settings.hooks.PreToolUse ?? []).filter((e: { hooks: { command: string }[] }) =>
      e.hooks.some((hook) => hook.command.includes('.claude/hooks/no-ask-to-act.mjs')),
    )
    for (const tool of ['mcp__ccd_session__start_session', 'mcp__ccd_turn__wrap_up']) {
      expect(entries.some((e: { matcher: string }) => new RegExp(`^(?:${e.matcher})$`).test(tool))).toBe(true)
    }
  })
})
