import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { REPOS_DIR, encodeProjectPath, ensureProjectLayer, projectMemoryDir, readOverrides, repoRoot } from '../harness-layers.mjs'
import { buildContext } from '../session-start-brief.mjs'
import { routeNote } from '../memory-route-check.mjs'

/**
 * 전역 → 프로젝트 층 구조 — 시작 요약 훅, 메모리 경로 훅, 공용 함수.
 * 시험용 저장소는 임시 폴더가 아니라 홈 아래 이름이 겹치지 않는 폴더에 만든다(임시 폴더는 훅이 일부러 건너뛴다).
 */
const HOOKS = path.resolve(import.meta.dirname, '..')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')

function repo() {
  const dir = mkdtempSync(path.join(homedir(), '.harness-layers-test-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  return dir
}
const cleanup = (dir: string) => {
  rmSync(dir, { recursive: true, force: true })
  rmSync(path.dirname(projectMemoryDir(dir)), { recursive: true, force: true })
}

describe('encodeProjectPath', () => {
  it('Claude Code 폴더 이름 규칙과 같다(영문·숫자 밖은 전부 -)', () => {
    expect(encodeProjectPath('~/Documents/GitHub/프로젝트 I')).toBe('-Users-user-Documents-GitHub-proj-i')
    expect(encodeProjectPath('~/Documents/GitHub/프로젝트 D')).toBe('-Users-user-Documents-GitHub-proj-d---------')
  })
})

describe('repoRoot', () => {
  it('worktree 안에서도 원래 저장소 뿌리를 돌려준다', () => {
    const dir = repo()
    const g = (...a: string[]) => spawnSync('git', a, { cwd: dir })
    g('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'i')
    const wt = path.join(dir, '.claude', 'worktrees', 'w1')
    g('worktree', 'add', '-q', wt)
    expect(repoRoot(wt)).toBe(repoRoot(dir))
    expect(repoRoot(path.join(dir, '.claude'))).toBe(repoRoot(dir))
    cleanup(dir)
  })
  it('git 저장소가 아니면 null', () => {
    expect(repoRoot(mkdtempSync(path.join(tmpdir(), 'nogit-')))).toBeNull()
  })
})

describe('ensureProjectLayer', () => {
  it('새 저장소: 목차를 만들고, 두 번째는 그대로 둔다', () => {
    const dir = repo()
    const root = repoRoot(dir)!
    expect(ensureProjectLayer(root)).toBe('created')
    const text = readFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), 'utf8')
    expect(text).toContain('## 전역과 다르게 하는 것')
    expect(text).toContain('## 계속 반영')
    expect(ensureProjectLayer(root)).toBe('ok')
    cleanup(dir)
  })
  it('목차는 있는데 절이 없으면 맨 위에 넣고 기존 내용은 남긴다', () => {
    const dir = repo()
    const root = repoRoot(dir)!
    mkdirSync(projectMemoryDir(root), { recursive: true })
    writeFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), '# 계속 반영\n- [a](a.md) — 기존\n')
    expect(ensureProjectLayer(root)).toBe('inserted')
    const text = readFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), 'utf8')
    expect(text.startsWith('## 전역과 다르게 하는 것')).toBe(true)
    expect(text).toContain('- [a](a.md) — 기존')
    cleanup(dir)
  })
  it('목차 제목이 있으면 제목 바로 아래에 넣는다', () => {
    const dir = repo()
    const root = repoRoot(dir)!
    mkdirSync(projectMemoryDir(root), { recursive: true })
    writeFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), '# Foo 메모리 목차\n\n## 계속 반영\n- [a](a.md)\n')
    expect(ensureProjectLayer(root)).toBe('inserted')
    const text = readFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), 'utf8')
    expect(text.startsWith('# Foo 메모리 목차\n\n## 전역과 다르게 하는 것')).toBe(true)
    expect(text).toContain('## 계속 반영\n- [a](a.md)')
    cleanup(dir)
  })
  it('readOverrides는 «없음»을 빼고 항목만 센다', () => {
    const dir = repo()
    const root = repoRoot(dir)!
    mkdirSync(projectMemoryDir(root), { recursive: true })
    writeFileSync(path.join(projectMemoryDir(root), 'MEMORY.md'), '## 전역과 다르게 하는 것\n- 질문은 하나씩\n- 영어로 답\n\n## 계속 반영\n- [x](x.md)\n')
    expect(readOverrides(root).length).toBe(2)
    cleanup(dir)
  })
})

describe('session-start-brief', () => {
  it('어디서든 시작 요약을 넣는다', () => {
    expect(buildContext({ cwd: tmpdir() })).toContain('Core brief')
  })
  it('프로젝트 저장소면 층 상태와 메모리 경로를 붙인다', () => {
    const dir = repo()
    const ctx = buildContext({ cwd: dir })
    expect(ctx).toContain('Project layer:')
    expect(ctx).toContain('New project')
    const again = buildContext({ cwd: dir })
    expect(again).toContain('No project overrides')
    expect(again).toContain('Upkeep due')
    expect(again).toContain('first upkeep')
    cleanup(dir)
  })
  it('전역 저장소에서는 프로젝트 메모리를 만들지 않는다', () => {
    expect(buildContext({ cwd: path.join(homedir(), '.claude') })).toContain('global harness repo')
  })
  it('실제 실행: JSON으로 additionalContext를 내고 0으로 끝난다(입력이 깨져도)', () => {
    const run = (input: string) => spawnSync('node', [path.join(HOOKS, 'session-start-brief.mjs')], { input, encoding: 'utf8' })
    const ok = run(JSON.stringify({ cwd: tmpdir(), source: 'startup' }))
    expect(ok.status).toBe(0)
    expect(JSON.parse(ok.stdout).hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(run('깨진 입력').status).toBe(0)
  })
})

describe('memory-route-check', () => {
  const home = homedir()
  it('프로젝트 메모리 주제 파일이면 범용 내용은 건의 파일로 돌리라고 알린다(전역에 쓰라고 하지 않는다)', () => {
    const note = routeNote(`${home}/.claude/projects/-Users-x-Foo/memory/tip.md`)!
    expect(note).toContain('Memory routing check')
    expect(note).toContain('global-proposals.md')
    expect(note).toContain('do not write ~/.claude')
  })
  it('건의 파일 자체를 쓸 때는 조용하다', () => {
    expect(routeNote(`${home}/.claude/projects/-Users-x-Foo/memory/global-proposals.md`)).toBeNull()
  })
  it('프로젝트 목차(MEMORY.md)나 다른 파일에는 조용하다', () => {
    expect(routeNote(`${home}/.claude/projects/-Users-x-Foo/memory/MEMORY.md`)).toBeNull()
    expect(routeNote(`${home}/Documents/GitHub/Foo/README.md`)).toBeNull()
  })
  it('전역 메모리 파일이 목차에 없으면 알리고, 있으면 조용하다', () => {
    expect(routeNote(`${home}/.claude/memory/zz-not-indexed.md`)).toContain('not linked')
    expect(routeNote(`${home}/.claude/memory/bash-tool-traps.md`)).toBeNull()
  })
})

describe('settings.json 연결', () => {
  const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
  it('SessionStart에 시작 요약 훅이 걸려 있다(처음·이어 열기·clear·압축)', () => {
    const e = s.hooks.SessionStart.find((h: any) => JSON.stringify(h).includes('session-start-brief.mjs'))
    expect(e.matcher).toBe('startup|resume|clear|compact')
  })
  it('PostToolUse Write|Edit에 메모리 경로 훅이 걸려 있다', () => {
    const e = s.hooks.PostToolUse.find((h: any) => JSON.stringify(h).includes('memory-route-check.mjs'))
    expect(e.matcher).toBe('Write|Edit')
  })
})

describe('한글 경로와 git 없는 프로젝트', () => {
  it('NFD(자모 분리) 경로도 NFC와 같은 폴더 이름이 된다', () => {
    const nfc = '~/Documents/GitHub/프로젝트 D'
    expect(encodeProjectPath(nfc.normalize('NFD'))).toBe(encodeProjectPath(nfc))
    expect(encodeProjectPath(nfc.normalize('NFD'))).toBe('-Users-user-Documents-GitHub-proj-d---------')
  })
  it('git 없는 ~/Documents/GitHub 하위 폴더는 바로 아래 폴더를 뿌리로 잡는다', () => {
    const dir = path.join(REPOS_DIR, '.harness-layers-plain-test-한글')
    mkdirSync(path.join(dir, 'sub', 'deep'), { recursive: true })
    try {
      expect(repoRoot(dir)).toBe(dir)
      expect(repoRoot(path.join(dir, 'sub', 'deep'))).toBe(dir)
      expect(repoRoot(dir.normalize('NFD'))).toBe(dir.normalize('NFC'))
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
  it('그 밖 경로(git 없는 홈 폴더·GitHub 폴더 자체)는 null', () => {
    const dir = mkdtempSync(path.join(homedir(), '.harness-layers-nogit-'))
    try {
      expect(repoRoot(dir)).toBe(null)
      expect(repoRoot(REPOS_DIR)).toBe(null)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
