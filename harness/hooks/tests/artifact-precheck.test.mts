import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { artifactReason, inlineScripts, pageProblems } from '../artifact-precheck.mjs'

/**
 * PreToolUse(Artifact) 훅 — 발행 전 인라인 스크립트 node --check와 U+2028·U+2029 검사.
 * 2026-11-25 사용자 «1235 반영해»(이슈 user/claude-harness#4). 실제 발행은 하지 않고 훅 프로세스로만 시험한다.
 */
const HOOK = path.resolve(import.meta.dirname, '../artifact-precheck.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')
const LS = String.fromCharCode(0x2028)
const page = (body: string) => `<!doctype html><title>t</title>${body}`

function files(map: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'artifact-pre-'))
  for (const [name, text] of Object.entries(map)) writeFileSync(path.join(dir, name), text)
  return dir
}

describe('artifact-precheck', () => {
  it('JSON·importmap·babel·src 스크립트는 건너뛰고, 일반·module 스크립트만 본다', () => {
    const s = inlineScripts(page(
      '<script>let a = 1</script><script type="module">import x from "./x.js"; await x()</script>' +
      '<script type="application/json">{bad json</script><script type="importmap">{</script>' +
      '<script type="text/babel"><App /></script><script src="a.js"></script>'))
    expect(s.length).toBe(2)
    expect(s[1].module).toBe(true)
  })
  it('문법이 맞는 페이지는 문제없음(module의 최상위 await 포함)', () => {
    expect(pageProblems(page('<script>const f = () => 1; f()</script><script type="module">await Promise.resolve(1)</script>')).length).toBe(0)
  })
  it('깨진 스크립트와 U+2028이 든 스크립트를 잡는다', () => {
    const broken = pageProblems(page('<script>function (</script>'))
    expect(broken.length).toBe(1)
    expect(broken[0]).toContain('문법 오류')
    const ls = pageProblems(page(`<script>const re = /a${LS}b/</script>`))
    expect(ls.some((p) => p.includes('U+2028'))).toBe(true)
  })
  it('발행이 아니거나 자산 올리기, .md 페이지는 보지 않는다', () => {
    const dir = files({ 'bad.html': page('<script>function (</script>'), 'n.md': '# x' })
    expect(artifactReason({ action: 'read', url: 'https://claude.ai/artifact/x' }, dir)).toBeNull()
    expect(artifactReason({ action: 'publish', asset: true, file_path: 'bad.html', url: 'u' }, dir)).toBeNull()
    expect(artifactReason({ file_path: 'n.md' }, dir)).toBeNull()
    expect(artifactReason({ file_path: 'bad.html' }, dir)).toContain('발행하지 않았다')
    rmSync(dir, { recursive: true, force: true })
  })
  it('files에 실린 .js·.mjs 원본도 검사한다', () => {
    const dir = files({ 'ok.html': page('<p>x</p>'), 'app.js': 'const = 1', 'lib.mjs': 'export const a = 1' })
    const r = artifactReason({ file_path: 'ok.html', files: { 'app.js': 'app.js', 'lib.mjs': { from: 'lib.mjs' } } }, dir)!
    expect(r).toContain('app.js 문법 오류')
    expect(r.includes('lib.mjs 문법 오류')).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })
  it('실제 실행: 깨진 페이지는 deny JSON, 멀쩡한 페이지는 빈 출력, 입력이 깨져도 0', () => {
    const dir = files({ 'bad.html': page('<script>if (</script>'), 'good.html': page('<script>let x = 1</script>') })
    const run = (input: string) => spawnSync('node', [HOOK], { input, encoding: 'utf8' })
    const blocked = run(JSON.stringify({ cwd: dir, tool_name: 'Artifact', tool_input: { file_path: path.join(dir, 'bad.html') } }))
    expect(blocked.status).toBe(0)
    expect(JSON.parse(blocked.stdout).hookSpecificOutput.permissionDecision).toBe('deny')
    expect(run(JSON.stringify({ cwd: dir, tool_name: 'Artifact', tool_input: { file_path: path.join(dir, 'good.html') } })).stdout).toBe('')
    expect(run('{').status).toBe(0)
    rmSync(dir, { recursive: true, force: true })
  })
  it('지금 하네스 지도 페이지(map/index.html)는 통과한다', () => {
    const map = path.resolve(import.meta.dirname, '../../map/index.html')
    expect(pageProblems(readFileSync(map, 'utf8')).length).toBe(0)
  })
  it('settings.json의 PreToolUse Artifact에 걸려 있다', () => {
    const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const e = s.hooks.PreToolUse.find((h: any) => JSON.stringify(h).includes('artifact-precheck.mjs'))
    expect(e.matcher).toBe('Artifact')
  })
})
