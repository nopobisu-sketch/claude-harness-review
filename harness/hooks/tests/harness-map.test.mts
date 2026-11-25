import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { projectMemoryDir, repoRoot } from '../harness-layers.mjs'
import { globalHash, mapHash, readHandoffs, scopeMatches, slugOf, upkeepPending, upkeepFile, measureRepo, measureGlobal, measureMetrics } from '../../tools/harness-measure.mjs'
import { markDone } from '../../tools/harness-upkeep.mjs'
import { buildContext } from '../session-start-brief.mjs'

/**
 * 하네스 지도·정리 도구 — 실측 함수, 넘길 것 읽기, 정리 기록, 지도 반영 검사.
 */
const TOOLS = path.resolve(import.meta.dirname, '../../tools')
function repo() {
  const dir = mkdtempSync(path.join(homedir(), '.harness-map-test-'))
  spawnSync('git', ['init', '-q'], { cwd: dir })
  return dir
}
const cleanup = (dir: string) => { rmSync(dir, { recursive: true, force: true }); rmSync(path.dirname(projectMemoryDir(dir)), { recursive: true, force: true }) }

describe('이름과 범위', () => {
  it('slugOf는 저장소 이름을 지도 문서 id로 바꾼다', () => {
    expect(slugOf('프로젝트 I')).toBe('proj-i')
    expect(slugOf('프로젝트 A')).toBe('proj-a')
  })
  it('slugOf: 한글뿐인 이름은 서로 다른 slug, NFD·NFC는 같은 slug, 영문 slug는 그대로', () => {
    const a = slugOf('프로젝트 J'), b = slugOf('다른 폴더')
    expect(a === b).toBe(false)
    expect(/^p-[0-9a-f]{8}$/.test(a)).toBe(true)
    expect(slugOf('프로젝트 J'.normalize('NFD'))).toBe(a)
    expect(slugOf('프로젝트 D')).toBe('proj-d')
  })
  it('넘길 것의 범위: 전체는 모두, 이름은 앞부분이 맞으면', () => {
    expect(scopeMatches('전체', 'Anything')).toBe(true)
    expect(scopeMatches('프로젝트 E', '프로젝트 E')).toBe(true)
    expect(scopeMatches('프로젝트 E', '프로젝트 I')).toBe(false)
    expect(scopeMatches('프로젝트 I, 프로젝트 H', '프로젝트 H')).toBe(true)
  })
  it('harness-report.md의 넘길 것은 번호·범위·끝남을 읽는다', () => {
    const h = readHandoffs()
    expect(h.length > 0).toBe(true)
    const first = h.find((x) => x.id === 'n1123-01')!
    expect(first.scope).toBe('전체')
    expect(h.find((x) => x.id === 'n1119-01')!.done).toBe(true)
  })
})

describe('정리', () => {
  it('새 저장소: 첫 정리와 전체 대상 넘길 것이 뜨고, done 뒤에는 사라진다', () => {
    const dir = repo()
    const root = repoRoot(dir)!
    const before = upkeepPending(root, 'zz-test')
    expect(before.some((x) => x.kind === 'first')).toBe(true)
    expect(before.some((x) => x.id === 'n1123-01')).toBe(true)
    const rec = markDone(root)
    expect(rec.globalHash).toBe(globalHash())
    expect(JSON.parse(readFileSync(upkeepFile(root), 'utf8')).handled).toContain('n1123-01')
    expect(upkeepPending(root).length).toBe(0)
    cleanup(dir)
  })
  it('시작 요약 훅이 정리할 것을 알린다', () => {
    const dir = repo()
    const ctx = buildContext({ cwd: dir })
    expect(ctx).toContain('Upkeep due')
    expect(ctx).toContain('first upkeep (new repo)')
    expect(ctx).toContain('do not ask')
    expect(ctx).toContain('Worker or child sessions')
    expect(ctx).toContain('이슈 없음: 하네스 정리')
    markDone(repoRoot(dir)!)
    expect(buildContext({ cwd: dir })).not.toContain('Upkeep due')
    cleanup(dir)
  })
})

describe('실측', () => {
  it('저장소 실측은 장치별 상태와 이유를 낸다', () => {
    const dir = repo()
    const r = measureRepo({ path: repoRoot(dir)!, name: 'zz-test', slug: 'zz-test' })
    expect(r.checks['d-stop-check-gate'].status).toBe('na')
    expect(r.checks['d-upkeep'].status).toBe('part')
    expect(r.statusText).toContain('정리할 것')
    cleanup(dir)
  })
  it('권장안 측정값: 시험 있는 저장소가 없으면 검사 관문은 해당 없음', () => {
    const fake = [{ slug: 'a', checks: { 'd-stop-check-gate': { status: 'na' }, 'd-session-start-brief': { status: 'na' }, 'd-upkeep': { status: 'on' } }, facts: { instrLines: 10, emphasis: 0, stopCheck: false }, sessions: { briefEligible: 0, brief: 0 }, pending: [] }]
    const m = measureMetrics(fake as any, measureGlobal())
    expect(m.stopCheck.status).toBe('na')
    expect(m.upkeep.status).toBe('on')
    expect(m.supervisorBrief.status).toBe('na')
  })
  it('지도 지문은 같은 파일이면 같다', () => {
    expect(mapHash()).toBe(mapHash())
  })
})

describe('지도 저장소 쓰기', () => {
  it('~/Documents/GitHub 밖의 저장소는 지도에 쓸 문서를 만들지 않는다', () => {
    const dir = repo()
    const r = spawnSync('node', [path.join(TOOLS, 'harness-map.mjs'), 'repo', dir], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('지도에 싣지 않는다')
    expect(r.stdout.includes('repos/')).toBe(false)
    cleanup(dir)
  })
})

describe('지도 반영 검사', () => {
  it('check는 반영 기록과 지금 지문이 다르면 1로 끝나고 순서를 알려 준다', () => {
    const r = spawnSync('node', [path.join(TOOLS, 'harness-map.mjs'), 'check'], { encoding: 'utf8', env: { ...process.env } })
    // 반영 기록이 지금과 같으면 0, 다르면 1 — 어느 쪽이든 1일 때는 할 일을 적어야 한다
    if (r.status === 1) expect(r.stdout).toContain('harness-map.mjs snapshot')
    else expect(r.status).toBe(0)
  })
})
