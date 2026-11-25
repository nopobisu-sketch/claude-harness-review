import { describe, it, expect } from './vitest-shim.mjs'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { blenderReason, directBlender } from '../blender-run-guard.mjs'

/**
 * PreToolUse(Bash) 훅 — Blender를 화면 없이(-b·--background) 직접 부르면 막고 blender-run.sh로 안내한다.
 * 2026-11-25 사용자 «1235 반영해»(11-19 «훅은 만들지 않는다»를 뒤집음, 이슈 user/claude-harness#4).
 */
const HOOK = path.resolve(import.meta.dirname, '../blender-run-guard.mjs')
const SETTINGS = path.resolve(import.meta.dirname, '../../settings.json')
const APP = '/Applications/Blender.app/Contents/MacOS/Blender'

describe('blender-run-guard', () => {
  it('화면 없는 직접 실행은 막는다(경로·환경 변수·파이프·nohup 포함)', () => {
    for (const c of [
      'blender -b --version',
      `${APP} -b --factory-startup -P x.py`,
      `"${APP}" --background -P x.py`,
      `TZ=UTC ${APP} -b -P x.py | grep -E "Error"`,
      'cd out && blender -b scene.blend -f 1',
      `nohup ${APP} -b -P x.py`,
    ]) expect(directBlender(c)).toBe(true)
  })
  it('blender-run.sh를 거치거나 화면을 띄우는 실행, 글자만 들어간 명령은 통과한다', () => {
    for (const c of [
      '~/.claude/tools/blender-run.sh --expect out.png -- --factory-startup -P x.py',
      'open -a Blender scene.blend',
      `${APP} scene.blend`,
      'ls ~/Library/Application\\ Support/Blender -b',
      'grep -rn "blender -b" memory/',
      'echo blender',
      'cat blender-notes.md',
      'git commit -m "Blender 튕김 예방"',
    ]) expect(directBlender(c)).toBe(false)
  })
  it('막을 때는 blender-run.sh 쓰는 법을 알려 준다', () => {
    const r = blenderReason('blender -b --version')!
    expect(r).toContain('blender-run.sh --expect')
    expect(r).toContain('실행되지 않았다')
    expect(blenderReason('ls')).toBeNull()
  })
  it('실제 실행: 막을 때 deny JSON, 통과는 빈 출력, 입력이 깨져도 0', () => {
    const run = (input: string) => spawnSync('node', [HOOK], { input, encoding: 'utf8' })
    const blocked = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: `${APP} -b -P x.py` } }))
    expect(blocked.status).toBe(0)
    expect(JSON.parse(blocked.stdout).hookSpecificOutput.permissionDecision).toBe('deny')
    expect(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } })).stdout).toBe('')
    expect(run('{').status).toBe(0)
  })
  it('settings.json의 PreToolUse Bash에 걸려 있다', () => {
    const s = JSON.parse(readFileSync(SETTINGS, 'utf8'))
    const e = s.hooks.PreToolUse.find((h: any) => JSON.stringify(h).includes('blender-run-guard.mjs'))
    expect(e.matcher).toBe('Bash')
  })
})
