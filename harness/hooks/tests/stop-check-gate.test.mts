import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * Stop 훅 — 끝내기 전 검사가 실패하면 2로 끝내 Claude를 되돌려 고치게 한다.
 */
const HOOK = path.resolve(import.meta.dirname, '../stop-check-gate.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')

function repo(check?: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'stop-gate-'))
  const g = (...a: string[]) => spawnSync('git', a, { cwd: dir })
  g('init', '-q')
  g('config', 'user.email', 't@t')
  g('config', 'user.name', 't')
  writeFileSync(path.join(dir, 'a.txt'), '1')
  if (check !== undefined) {
    mkdirSync(path.join(dir, '.claude'))
    writeFileSync(path.join(dir, '.claude', 'stop-check.sh'), check)
  }
  g('add', '-A')
  g('commit', '-qm', 'init')
  return dir
}

const state = mkdtempSync(path.join(tmpdir(), 'stop-gate-state-'))
const hook = (cwd: string, session = 's1') =>
  spawnSync('node', [HOOK], {
    input: JSON.stringify({ hook_event_name: 'Stop', cwd, session_id: session }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', STOP_CHECK_STATE_DIR: state },
  })

describe('끝내기 전 검사 관문', () => {
  it('검사 스크립트가 없는 저장소와 저장소 밖은 0으로 조용히 끝낸다', () => {
    expect(hook(repo()).status).toBe(0)
    expect(hook(mkdtempSync(path.join(tmpdir(), 'no-git-'))).status).toBe(0)
  })

  it('검사가 실패하면 2로 끝내고 출력 꼬리를 stderr로 돌려준다', () => {
    const r = hook(repo('echo "타입 오류 3건"; exit 1'))
    expect(r.status).toBe(2)
    expect(r.stderr).toContain('타입 오류 3건')
    expect(r.stderr).toContain('1/3번째')
  })

  it('출력에 «No such file or directory»가 섞여도 stdout을 남겨 막는 오류로 처리되게 한다', () => {
    const r = hook(repo('echo "cat: x.json: No such file or directory" >&2; exit 1'))
    expect(r.status).toBe(2)
    expect(r.stdout).toContain('blocked')
  })

  it('검사가 통과하면 0, 저장소가 그대로면 다시 돌리지 않는다', () => {
    const dir = repo('echo ran >> "$(git rev-parse --git-dir)/runs"; exit 0')
    expect(hook(dir).status).toBe(0)
    expect(hook(dir).status).toBe(0)
    expect(readFileSync(path.join(dir, '.git', 'runs'), 'utf8').trim().split('\n').length).toBe(1)
    writeFileSync(path.join(dir, 'a.txt'), '2')
    expect(hook(dir).status).toBe(0)
    expect(readFileSync(path.join(dir, '.git', 'runs'), 'utf8').trim().split('\n').length).toBe(2)
  })

  it('같은 세션에서 3번 막힌 뒤에는 1로 끝내 막지 않고 사용자에게만 알린다', () => {
    const dir = repo('exit 1')
    expect([1, 2, 3].map(() => hook(dir, 'loop').status).join(',')).toBe('2,2,2')
    const r = hook(dir, 'loop')
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('사람이 봐야 한다')
    expect(hook(dir, 'other').status).toBe(2)
  })

  it('검사 파일에서 줄이 빠지면 한 번만 멈춰 빠진 줄을 알리게 하고, 같은 변경으로는 다시 멈추지 않는다', () => {
    const dir = repo('echo ok\nnpm test\nexit 0')
    writeFileSync(path.join(dir, '.claude', 'stop-check.sh'), 'echo ok\nexit 0')
    const first = hook(dir, 'edit')
    expect(first.status).toBe(2)
    expect(first.stderr).toContain('검사 파일')
    expect(first.stderr).toContain('npm test')
    expect(first.stderr).toContain('되돌리지는 마라')
    expect(hook(dir, 'edit').status).toBe(0)
    writeFileSync(path.join(dir, '.claude', 'stop-check.sh'), 'exit 0')
    expect(hook(dir, 'edit').status).toBe(2)
  })

  it('검사 파일이 새로 생기면 한 번 알리고, 커밋된 검사 파일은 알리지 않는다', () => {
    const dir = repo()
    mkdirSync(path.join(dir, '.claude'))
    writeFileSync(path.join(dir, '.claude', 'stop-check.sh'), 'exit 0')
    const r = hook(dir, 'new')
    expect(r.status).toBe(2)
    expect(r.stderr).toContain('새로 생겼다')
    expect(hook(dir, 'new').status).toBe(0)
    spawnSync('git', ['add', '-A'], { cwd: dir })
    spawnSync('git', ['commit', '-qm', 'add check'], { cwd: dir })
    expect(hook(dir, 'new').status).toBe(0)
  })

  it('입력이 깨져도 세션을 가두지 않는다', () => {
    const r = spawnSync('node', [HOOK], { input: '{', encoding: 'utf8' })
    expect(r.status).toBe(0)
  })

  it('설정이 Stop에 이 훅을 건다', () => {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const cmds = (settings.hooks.Stop ?? []).flatMap((e: { hooks: { command: string }[] }) => e.hooks.map((h) => h.command))
    expect(cmds.some((c: string) => c.includes('stop-check-gate.mjs'))).toBe(true)
  })
})
