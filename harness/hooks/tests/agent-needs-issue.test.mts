import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { hasIssueRef, needIssueReason } from '../agent-needs-issue.mjs'

/**
 * 일꾼 브리프의 이슈 번호 확인(사용자 2026-11-25: 백그라운드 일꾼도 이슈에 적는다).
 */
const HOOK = path.resolve(import.meta.dirname, '../agent-needs-issue.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')
function repo(remote?: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'agent-issue-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  if (remote) spawnSync('git', ['remote', 'add', 'origin', remote], { cwd: dir })
  return dir
}
const call = (cwd: string, prompt: string, subagent_type = 'general-purpose') => needIssueReason({ cwd, tool_input: { subagent_type, prompt, model: 'sonnet' } })

describe('agent-needs-issue', () => {
  it('이슈 번호를 알아보고, 색 번호는 이슈로 치지 않는다', () => {
    for (const t of ['이슈 #12를 처리', 'see #1638', 'https://github.com/a/b/issues/7', '이슈 3번', '(#45)']) expect(hasIssueRef(t)).toBe(true)
    for (const t of ['배경 #121212', '초록 #1d8047', '#f0b860', '# 제목', 'C# 코드', '&#123;']) expect(hasIssueRef(t)).toBe(false)
  })
  it('GitHub 원격이 있는 저장소에서 이슈 번호 없는 브리프는 막는다', () => {
    const dir = repo('https://github.com/x/y.git')
    const r = call(dir, '목차를 줄여라')
    expect(r).toContain('gh issue create')
    expect(r).toContain('이슈 없음')
    rmSync(dir, { recursive: true, force: true })
  })
  it('이슈 번호나 «이슈 없음: 이유»가 있으면, 읽기 전용 유형이면 통과한다', () => {
    const dir = repo(':x/y.git')
    expect(call(dir, '이슈 #3의 일을 하고 결과를 코멘트로 남겨라')).toBeNull()
    expect(call(dir, '이슈 없음: 임시 폴더 정리뿐이라 이력이 필요 없다')).toBeNull()
    expect(call(dir, '자료를 찾아 요약', 'researcher')).toBeNull()
    expect(call(dir, '코드 위치 찾기', 'Explore')).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
  it('GitHub 원격이 없거나 git 밖이면 막지 않는다', () => {
    const local = repo()
    expect(call(local, '일해라')).toBeNull()
    const other = repo('https://gitlab.com/x/y.git')
    expect(call(other, '일해라')).toBeNull()
    expect(call(mkdtempSync(path.join(tmpdir(), 'no-git-')), '일해라')).toBeNull()
    rmSync(local, { recursive: true, force: true }); rmSync(other, { recursive: true, force: true })
  })
  it('실제 실행: 막을 때 deny JSON, 통과는 빈 출력, 입력이 깨져도 0', () => {
    const dir = repo('https://github.com/x/y.git')
    const run = (input: string) => spawnSync('node', [HOOK], { input, encoding: 'utf8' })
    const blocked = run(JSON.stringify({ cwd: dir, tool_name: 'Agent', tool_input: { prompt: '일해라', model: 'haiku' } }))
    expect(blocked.status).toBe(0)
    expect(JSON.parse(blocked.stdout).hookSpecificOutput.permissionDecision).toBe('deny')
    const ok = run(JSON.stringify({ cwd: dir, tool_name: 'Agent', tool_input: { prompt: '이슈 #9', model: 'haiku' } }))
    expect(ok.stdout).toBe('')
    expect(run('{').status).toBe(0)
    rmSync(dir, { recursive: true, force: true })
  })
  it('settings.json의 PreToolUse Agent에 걸려 있다', () => {
    const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const e = s.hooks.PreToolUse.find((h: any) => JSON.stringify(h).includes('agent-needs-issue.mjs'))
    expect(e.matcher).toBe('Agent')
  })
})
