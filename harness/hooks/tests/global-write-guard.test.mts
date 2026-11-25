import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { GLOBAL_DIR, projectMemoryDir } from '../harness-layers.mjs'
import { guardReason } from '../global-write-guard.mjs'
import { parseProposals, projectProposals, proposalCardId } from '../../tools/harness-measure.mjs'
import { toCard } from '../../tools/harness-proposals.mjs'

/**
 * 프로젝트 세션의 전역 쓰기 막기(2026-11-25 사용자 결정 «세부 프로젝트는 전역 수정 금지»)와 프로젝트 건의 읽기.
 * 시험용 저장소는 홈 아래 이름이 겹치지 않는 폴더에 만든다.
 */
const HOOK = path.resolve(import.meta.dirname, '../global-write-guard.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')
function repo() {
  const dir = mkdtempSync(path.join(homedir(), '.harness-guard-test-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  return dir
}
const cleanup = (dir: string) => { rmSync(dir, { recursive: true, force: true }); rmSync(path.dirname(projectMemoryDir(dir)), { recursive: true, force: true }) }

describe('global-write-guard', () => {
  it('프로젝트 세션이 전역 규칙·메모리·훅·설정을 고치려 하면 막고 건의 파일을 알려 준다', () => {
    const dir = repo()
    for (const f of ['CLAUDE.md', 'core-brief.md', 'memory/zz-trap.md', 'hooks/x.mjs', 'settings.json', 'skills/a/SKILL.md']) {
      const r = guardReason({ cwd: dir, filePath: path.join(GLOBAL_DIR, f) })
      expect(r).toContain('전역 수정 금지')
      expect(r).toContain('global-proposals.md')
    }
    cleanup(dir)
  })
  it('프로젝트 메모리(건의 파일 포함)와 계획 폴더, 저장소 안 파일은 막지 않는다', () => {
    const dir = repo()
    expect(guardReason({ cwd: dir, filePath: path.join(projectMemoryDir(dir), 'global-proposals.md') })).toBeNull()
    expect(guardReason({ cwd: dir, filePath: path.join(GLOBAL_DIR, 'plans', 'p.md') })).toBeNull()
    expect(guardReason({ cwd: dir, filePath: path.join(dir, 'README.md') })).toBeNull()
    expect(guardReason({ cwd: dir, filePath: 'notes.md' })).toBeNull()
    cleanup(dir)
  })
  it('전역 저장소에서 연 세션과 프로젝트 밖 세션은 막지 않는다', () => {
    expect(guardReason({ cwd: GLOBAL_DIR, filePath: path.join(GLOBAL_DIR, 'CLAUDE.md') })).toBeNull()
    expect(guardReason({ cwd: path.join(GLOBAL_DIR, 'memory'), filePath: path.join(GLOBAL_DIR, 'memory', 'a.md') })).toBeNull()
    expect(guardReason({ cwd: '/private/tmp', filePath: path.join(GLOBAL_DIR, 'CLAUDE.md') })).toBeNull()
  })
  it('실제 실행: 막을 때는 deny JSON, 아닐 때는 빈 출력, 입력이 깨져도 0으로 끝난다', () => {
    const dir = repo()
    const run = (input: string) => spawnSync('node', [HOOK], { input, encoding: 'utf8' })
    const blocked = run(JSON.stringify({ cwd: dir, tool_name: 'Write', tool_input: { file_path: path.join(GLOBAL_DIR, 'memory', 'zz.md') } }))
    expect(blocked.status).toBe(0)
    const out = JSON.parse(blocked.stdout).hookSpecificOutput
    expect(out.hookEventName).toBe('PreToolUse')
    expect(out.permissionDecision).toBe('deny')
    const allowed = run(JSON.stringify({ cwd: dir, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'a.md') } }))
    expect(allowed.status).toBe(0)
    expect(allowed.stdout).toBe('')
    expect(run('깨진 입력').status).toBe(0)
    cleanup(dir)
  })
  it('settings.json의 PreToolUse에 걸려 있다(Write·Edit·MultiEdit·NotebookEdit)', () => {
    const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const e = s.hooks.PreToolUse.find((h: any) => JSON.stringify(h).includes('global-write-guard.mjs'))
    expect(e.matcher).toBe('Write|Edit|MultiEdit|NotebookEdit')
  })
})

describe('프로젝트 건의 읽기', () => {
  const sample = [
    '# 전역에 올린 제안', '',
    '## 제안 1 (2026-11-25, 올림): 넘기는 일은 이슈로 이력을 남긴다', '',
    '- 내용: 일을 넘길 때 이슈를 만든다.', '- 근거(이 프로젝트에서 일어난 일): 스무 번 넘게 넘기면서', '  이슈를 하나도 남기지 않았다.',
    '- 전역에서 고칠 후보: 전역 메모리에 항목 추가.', '',
    '## 건의 2 (2026-11-26): 기록은 한 명만', '- 내용: 감독이 기록한다.', '- 이 세션이 한 일: 없음',
  ].join('\n')
  it('예전 꼴(제안)과 새 꼴(건의)을 모두 읽고, 이어지는 줄을 붙인다', () => {
    const ps = parseProposals(sample)
    expect(ps.length).toBe(2)
    expect(ps[0].n).toBe(1)
    expect(ps[0].date).toBe('2026-11-25')
    expect(ps[0].fields.find((f: any) => f.key.startsWith('근거')).text).toContain('하나도 남기지 않았다')
    expect(ps[1].title).toBe('기록은 한 명만')
  })
  it('카드는 «프로젝트 건의 · 저장소» 출처와 내용·근거·고칠 곳을 갖는다', () => {
    const [p] = parseProposals(sample)
    const c = toCard({ ...p, id: proposalCardId('foo', 1), repo: 'Foo', slug: 'foo', file: '~/x' }, 60)
    expect(c.source).toBe('프로젝트 건의 · Foo')
    expect(c.summary).toContain('이슈를 만든다')
    expect(c.why).toContain('스무 번')
    expect(c.change).toContain('전역 메모리')
    expect(c.state).toBe('고를 것')
    expect(proposalCardId('proj-i', 3)).toBe('g-proj-i-3')
  })
  it('시험 저장소의 건의 파일을 모든 프로젝트 목록에서 찾는다', () => {
    const dir = repo()
    const mem = projectMemoryDir(dir)
    spawnSync('mkdir', ['-p', mem])
    spawnSync('sh', ['-c', `cat > "${mem}/global-proposals.md"`], { input: sample })
    const found = projectProposals([{ path: dir, name: 'zz', slug: 'zz' }])
    expect(found.map((p: any) => p.id).join(',')).toBe('g-zz-1,g-zz-2')
    cleanup(dir)
  })
})
