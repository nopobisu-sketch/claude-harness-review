// PreToolUse 훅(Artifact): 아티팩트 페이지를 발행하기 전에 인라인 스크립트 문법(node --check)과 U+2028·U+2029 글자를 검사해,
// 문제가 있으면 발행을 막고 어디가 틀렸는지 돌려준다.
// 까닭: 2026-11-14 한 아티팩트 페이지의 판 2·3이 정규식 안의 U+2028 때문에 문법 오류로 한 줄도 안 돌았고, 화면은 «불러오는 중»에
//   멈췄다. 감독 세션은 커넥터 탓으로 보고 두 번 헛고쳤다. node --check 한 번이면 잡혔다(memory/artifact-page-checks.md).
// 2026-11-25 사용자 결정 «1235 반영해»(이슈 user/claude-harness#4).
// 보는 것: 발행(action 없음 또는 publish)의 .html 페이지 안 인라인 스크립트(type 없음·text/javascript·module), files의 .js·.mjs 원본.
// 보지 않는 것: 자산 올리기(asset), JSON·importmap·babel 같은 다른 type, src로 불러오는 스크립트. 훅이 고장 나면 막지 않는다.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readStdinJson } from './harness-layers.mjs'

const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module'])

/** 페이지의 인라인 스크립트: [{ code, module, index }] */
export function inlineScripts(html) {
  const out = []
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m
  let i = 0
  while ((m = re.exec(html))) {
    i += 1
    const attrs = m[1]
    if (/\bsrc\s*=/.test(attrs)) continue
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? '').toLowerCase()
    if (!JS_TYPES.has(type)) continue
    out.push({ code: m[2], module: type === 'module', index: i })
  }
  return out
}

function nodeCheck(code, module, dir, name) {
  const file = join(dir, `${name}.${module ? 'mjs' : 'js'}`)
  writeFileSync(file, code)
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 20000 })
  if (r.status === 0) return null
  return (r.stderr || r.stdout || '').split('\n').filter(Boolean).slice(0, 4).join(' / ').replaceAll(dir, '')
}

/** 막을 이유 목록(없으면 빈 배열) */
export function pageProblems(html, label = 'page') {
  const problems = []
  const scripts = inlineScripts(html)
  const dir = mkdtempSync(join(tmpdir(), 'artifact-precheck-'))
  try {
    for (const s of scripts) {
      const ls = (s.code.split(LS).length - 1) + (s.code.split(PS).length - 1)
      if (ls) problems.push(`${label} 스크립트 ${s.index}번째에 줄 구분 글자(U+2028·U+2029)가 ${ls}개 있다. 코드에는 String.fromCharCode(0x2028)처럼 번호로 쓴다.`)
      const err = nodeCheck(s.code, s.module, dir, `s${s.index}`)
      if (err) problems.push(`${label} 스크립트 ${s.index}번째 문법 오류: ${err}`)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
  return problems
}

export function artifactReason(toolInput, cwd = process.cwd()) {
  const ti = toolInput ?? {}
  const action = ti.action ?? 'publish'
  if (action !== 'publish' || ti.asset) return null
  const problems = []
  const page = ti.file_path ? resolve(cwd, ti.file_path) : null
  if (page && /\.html?$/i.test(page)) {
    let html = null
    try { html = readFileSync(page, 'utf8') } catch {}
    if (html != null) problems.push(...pageProblems(html, 'page'))
  }
  const files = ti.files && !Array.isArray(ti.files) ? Object.entries(ti.files) : []
  const dir = mkdtempSync(join(tmpdir(), 'artifact-precheck-'))
  try {
    for (const [published, src] of files) {
      const from = typeof src === 'string' ? src : src?.from
      if (!from || !/\.(m?js)$/i.test(published)) continue
      let code
      try { code = readFileSync(resolve(ti.root ? resolve(cwd, ti.root) : cwd, from), 'utf8') } catch { continue }
      const err = nodeCheck(code, /\.mjs$/i.test(published), dir, 'f')
      if (err) problems.push(`${published} 문법 오류: ${err}`)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
  if (!problems.length) return null
  return `아티팩트 발행 전 검사에서 문제가 나와 발행하지 않았다: ${problems.join(' | ')} 고친 뒤 다시 발행하라(memory/artifact-page-checks.md).`
}

function main() {
  try {
    const input = readStdinJson()
    const reason = artifactReason(input?.tool_input, input?.cwd || process.cwd())
    if (reason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }))
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
