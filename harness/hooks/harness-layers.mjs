// 전역 → 프로젝트 층 구조의 공용 함수. 훅 둘(session-start-brief, memory-route-check)과 점검 도구(tools/harness-audit.mjs)가 같이 쓴다.
// 층: 전역(~/.claude/CLAUDE.md·core-brief.md·memory/) → 프로젝트(메모리 MEMORY.md 맨 위 «전역과 다르게 하는 것» 절 + 저장소 CLAUDE.md/AGENTS.md).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

export const HOME = homedir()
export const GLOBAL_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, '.claude')
export const GLOBAL_MEMORY = join(GLOBAL_DIR, 'memory')
export const CORE_BRIEF = join(GLOBAL_DIR, 'core-brief.md')
export const OVERRIDES_HEADING = '## 전역과 다르게 하는 것'
/** 프로젝트 세션이 전역에 올리는 건의를 적는 파일(프로젝트 메모리 폴더 안). 전역이 거둬 하네스 지도에 «프로젝트 건의»로 올린다(2026-11-25). */
export const PROPOSALS_FILE = 'global-proposals.md'

export const OVERRIDES_BLOCK = `${OVERRIDES_HEADING} (project overrides — 전역 규칙보다 우선)
<!-- 이 프로젝트에서만 전역(~/.claude) 규칙과 다르게 하는 것을 한 줄씩 적는다. 날짜와 사용자 말을 붙인다. 전역 규칙을 그대로 베껴 오지 않는다. -->
- 없음

`

export const NEW_MEMORY_INDEX = (name) => `# ${name} — 프로젝트 메모리

${OVERRIDES_BLOCK}## 계속 반영

## 일회성

## 끝남 — 지울 후보
`

/** Claude Code가 프로젝트 폴더 이름을 만드는 규칙: 영문·숫자 밖의 글자는 전부 '-' */
export const nfc = (p) => String(p).normalize('NFC')
/** macOS의 process.cwd()는 한글을 NFD(자모 분리)로 돌려주지만 Claude Code는 NFC 기준으로 폴더 이름을 만든다 → 먼저 NFC로 맞춘다. */
export const encodeProjectPath = (p) => nfc(p).replace(/[^A-Za-z0-9]/g, '-')

export const projectMemoryDir = (root) => join(GLOBAL_DIR, 'projects', encodeProjectPath(root), 'memory')

const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : null
}

export const REPOS_DIR = join(HOME, 'Documents', 'GitHub')

/** git이 없어도 ~/Documents/GitHub 바로 아래 폴더 안이면 그 폴더가 프로젝트 뿌리다(NFC 경로). 아니면 null. */
export function plainProjectRoot(cwd) {
  const p = nfc(resolve(cwd))
  const base = nfc(REPOS_DIR) + sep
  if (!p.startsWith(base)) return null
  const first = p.slice(base.length).split(sep)[0]
  return first ? base + first : null
}

/**
 * cwd가 속한 프로젝트(저장소)의 뿌리. worktree면 원래 저장소 뿌리로 돌린다(메모리는 원래 저장소 하나를 같이 쓴다).
 * git이 없으면 ~/Documents/GitHub 바로 아래 폴더를 뿌리로 본다. 그 밖은 null. 돌려주는 경로는 항상 NFC.
 */
export function repoRoot(cwd) {
  if (!cwd || !existsSync(cwd)) return null
  const common = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (!common) return plainProjectRoot(cwd)
  if (common.endsWith(`${sep}.git`)) return nfc(dirname(common))
  const top = git(cwd, ['rev-parse', '--show-toplevel'])
  return top ? nfc(top) : null
}

export const isGlobalRepo = (root) => root && resolve(root) === resolve(GLOBAL_DIR)
const TEMP_PREFIXES = ['/private/tmp', '/tmp', '/private/var/folders', '/var/folders']
export const isTempPath = (p) => TEMP_PREFIXES.some((t) => p === t || p.startsWith(t + '/'))

/**
 * 프로젝트 메모리 목차에 «전역과 다르게 하는 것» 절이 있게 한다(없으면 맨 위에 넣고, 목차가 없으면 새로 만든다).
 * 저장소 파일은 건드리지 않는다. 돌려주는 값: 'created' | 'inserted' | 'ok'
 */
export function ensureProjectLayer(root) {
  const dir = projectMemoryDir(root)
  const index = join(dir, 'MEMORY.md')
  if (!existsSync(index)) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(index, NEW_MEMORY_INDEX(root.split(sep).pop()))
    return 'created'
  }
  const text = readFileSync(index, 'utf8')
  if (text.includes(OVERRIDES_HEADING)) return 'ok'
  // 첫 줄이 목차 제목(«# 계속 반영» 같은 절 제목이 아닌 것)이면 그 아래에, 아니면 맨 위에 넣는다
  const lines = text.split('\n')
  const isTitle = /^# /.test(lines[0] ?? '') && !/계속|일회성|끝남/.test(lines[0])
  writeFileSync(index, isTitle
    ? [lines[0], '', OVERRIDES_BLOCK.trimEnd(), '', ...lines.slice(1).join('\n').replace(/^\n+/, '').split('\n')].join('\n')
    : OVERRIDES_BLOCK + text)
  return 'inserted'
}

/** «전역과 다르게 하는 것» 절의 항목(«없음» 제외) */
export function readOverrides(root) {
  const index = join(projectMemoryDir(root), 'MEMORY.md')
  if (!existsSync(index)) return []
  const lines = readFileSync(index, 'utf8').split('\n')
  const start = lines.findIndex((l) => l.startsWith(OVERRIDES_HEADING))
  if (start < 0) return []
  const out = []
  for (const l of lines.slice(start + 1)) {
    if (/^#{1,6} /.test(l)) break
    const m = l.match(/^\s*[-*] (.+)/)
    if (m && m[1].trim() !== '없음') out.push(m[1].trim())
  }
  return out
}

export const readStdinJson = () => {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}') } catch { return {} }
}
