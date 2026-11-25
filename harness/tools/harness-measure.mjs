// 하네스 지도와 점검표가 함께 쓰는 실측 함수. 모든 값은 파일·설정·세션 기록에서 그때 잰다(손으로 옮겨 적은 값 없음).
// 쓰는 곳: tools/harness-map.mjs(지도 데이터), tools/harness-audit.mjs(표), tools/harness-upkeep.mjs·hooks/session-start-brief.mjs(정리 알림).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { GLOBAL_DIR, GLOBAL_MEMORY, HOME, CORE_BRIEF, REPOS_DIR, PROPOSALS_FILE, encodeProjectPath, nfc, projectMemoryDir, readOverrides } from '../hooks/harness-layers.mjs'

export { REPOS_DIR }
export const BRIEF_MARK = 'Core brief (injected at every session start'
export const STALE_DAYS = 3
const EMPHASIS_RE = /\b(IMPORTANT|MUST|NEVER|CRITICAL)\b|반드시|절대로?/g
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return null } }
const sha = (...parts) => createHash('sha256').update(parts.map((p) => p ?? '').join('\0')).digest('hex').slice(0, 16)
const lines = (t) => (t == null ? 0 : t.split('\n').length)
const git = (cwd, args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); return r.status === 0 ? r.stdout : '' }

// 영문·숫자가 있는 이름은 예전 그대로(지도 문서 id). 한글뿐인 이름은 겹치지 않게 이름의 짧은 해시를 붙인다.
export const slugOf = (name) => {
  const n = nfc(name)
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `p-${sha(n).slice(0, 8)}`
}

/** 프로젝트 목록: git 저장소 + 메모리 폴더가 있는 git 없는 폴더(~/Documents/GitHub 바로 아래). */
export function listRepos() {
  if (!existsSync(REPOS_DIR)) return []
  return readdirSync(REPOS_DIR)
    .map((n) => join(REPOS_DIR, nfc(n)))
    .filter((p) => {
      try {
        if (!statSync(p).isDirectory()) return false
        if (existsSync(join(p, '.git'))) return statSync(join(p, '.git')).isDirectory()
        return existsSync(projectMemoryDir(p))
      } catch { return false }
    })
    .map((path) => ({ path, name: basename(path), slug: slugOf(basename(path)) }))
}

// ── 전역 층 ─────────────────────────────────────────────
function settings() { try { return JSON.parse(read(join(GLOBAL_DIR, 'settings.json'))) } catch { return {} } }

/** 프로젝트 정리가 필요한지 가르는 지문: 프로젝트 하네스에 닿는 전역 파일만 본다(전역 메모리는 자주 바뀌어 넣지 않는다). */
export function globalHash() {
  const s = settings()
  return sha(read(join(GLOBAL_DIR, 'CLAUDE.md')), read(CORE_BRIEF), read(join(GLOBAL_DIR, 'skills', 'harness-upkeep', 'SKILL.md')),
    JSON.stringify(s.hooks ?? {}), JSON.stringify(s.permissions?.deny ?? []))
}

/** 지도에 닿는 추적 파일 전체의 지문. 바뀌면 지도를 다시 써야 한다(끝내기 전 검사가 본다). */
export const MAP_FILES = ['CLAUDE.md', 'core-brief.md', 'GLOSSARY.md', 'settings.json', 'harness-report.md', 'scheduled-tasks/harness-docs-refresh-global/SKILL.md']
export const MAP_DIRS = [['hooks', /\.mjs$/], ['skills/harness-upkeep', /\.md$/], ['tools', /^harness-.*\.mjs$/]]
export function mapHash() {
  const parts = MAP_FILES.map((f) => `${f}\n${read(join(GLOBAL_DIR, f)) ?? ''}`)
  for (const [dir, re] of MAP_DIRS) {
    const full = join(GLOBAL_DIR, dir)
    if (!existsSync(full)) continue
    for (const f of readdirSync(full).filter((n) => re.test(n)).sort()) parts.push(`${dir}/${f}\n${read(join(full, f)) ?? ''}`)
  }
  return sha(...parts)
}

export function measureGlobal() {
  const claude = read(join(GLOBAL_DIR, 'CLAUDE.md')) ?? ''
  const brief = read(CORE_BRIEF) ?? ''
  const index = read(join(GLOBAL_MEMORY, 'MEMORY.md')) ?? ''
  const memFiles = existsSync(GLOBAL_MEMORY) ? readdirSync(GLOBAL_MEMORY).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md') : []
  const unindexed = memFiles.filter((f) => !index.includes(`(${f})`))
  const context = read(join(GLOBAL_DIR, 'GLOSSARY.md')) ?? ''
  const terms = (context.match(/^\*\*[^*]+\*\*:/gm) ?? []).length
  const deny = settings().permissions?.deny ?? []
  const skills = existsSync(join(GLOBAL_DIR, 'skills')) ? readdirSync(join(GLOBAL_DIR, 'skills')).filter((n) => !n.startsWith('.')) : []
  const emphasis = (claude.match(EMPHASIS_RE) ?? []).length
  return [
    { id: 'g-claude', label: '전역 규칙', path: '~/.claude/CLAUDE.md', summary: '모든 세션이 통째로 읽는 전역 지시문', status: lines(claude) <= 200 && emphasis === 0 ? 'on' : 'part', statusText: `${lines(claude)}줄 · 강조어 ${emphasis}`, facts: [['줄 수', lines(claude)], ['강조어', emphasis]] },
    { id: 'g-brief', label: '시작 요약', path: '~/.claude/core-brief.md', summary: '매 세션 앞에 놓이는 매번 지킬 규칙의 요약', status: brief && lines(brief) <= 40 ? 'on' : brief ? 'part' : 'off', statusText: brief ? `${lines(brief)}줄` : '없음', facts: [['줄 수', lines(brief)], ['목표', '40줄 이내']] },
    { id: 'g-memory', label: '전역 메모리', path: '~/.claude/memory/', summary: '어느 프로젝트에서나 통하는 업무 방식·도구 사용법', status: unindexed.length ? 'part' : 'on', statusText: unindexed.length ? `${memFiles.length}개 · 목차 빠짐 ${unindexed.length}` : `${memFiles.length}개`, facts: [['파일', memFiles.length], ['목차에 없는 파일', unindexed.join(', ') || '없음']] },
    { id: 'g-deny', label: '금지 규칙', path: '~/.claude/settings.json', summary: '승인 창 대신 처음부터 막는 규칙(deny)', status: deny.length ? 'on' : 'off', statusText: `${deny.length}개`, facts: [['규칙', deny.join(' · ')]] },
    { id: 'g-context', label: '용어집', path: '~/.claude/GLOSSARY.md', summary: '하네스에서 쓰는 말과 피할 말', status: terms ? 'on' : 'off', statusText: `용어 ${terms}개`, facts: [['용어', terms]] },
    { id: 'g-skills', label: '전역 스킬', path: '~/.claude/skills/', summary: '모든 프로젝트에서 부를 수 있는 스킬', status: skills.length ? 'on' : 'off', statusText: `${skills.length}묶음`, facts: [['묶음', skills.join(', ')]] },
  ]
}

// ── 장치 ───────────────────────────────────────────────
const HOOK_INFO = {
  'session-start-brief': { label: '시작 요약 훅', summary: '세션 시작·압축 뒤 시작 요약과 프로젝트 층 상태, 정리할 것을 넣는다', links: ['g-brief', 'g-claude'], perRepo: true },
  'memory-route-check': { label: '메모리 경로 훅', summary: '프로젝트 메모리에 쓰면 전역에 해당하는 것은 건의 파일로 돌리라고 알린다', links: ['g-memory'] },
  'global-write-guard': { label: '전역 쓰기 막기', summary: '프로젝트 세션이 ~/.claude의 전역 파일을 고치려 하면 막고 건의 파일로 안내한다', links: ['g-claude', 'g-memory'] },
  'stop-check-gate': { label: '끝내기 전 검사 관문', summary: '저장소의 검사 스크립트가 실패하면 턴을 끝내지 못하게 되돌린다', links: ['g-claude'], perRepo: true },
  'agent-needs-issue': { label: '일꾼 이슈 필수', summary: 'GitHub 저장소에서 일꾼 브리프에 이슈 번호가 없으면 돌려보낸다', links: ['g-claude', 'g-brief'] },
  'session-signals': { label: '입력 신호', summary: '«세션 N» 빈자리·keepalive «.»·마감 신호(«여기까지»)를 알아보고 할 절차를 넣는다', links: ['g-memory'] },
  'blender-run-guard': { label: 'Blender 직접 실행 막기', summary: 'Blender를 화면 없이 직접 부르면 막고 blender-run.sh로 안내한다', links: ['g-memory'] },
  'artifact-precheck': { label: '아티팩트 발행 전 검사', summary: '발행 전에 인라인 스크립트 문법과 U+2028 글자를 검사해 문제가 있으면 막는다', links: ['g-memory'] },
  'require-agent-model': { label: '모델 지정 필수', summary: '일꾼을 부를 때 모델을 꼭 적게 한다', links: ['g-claude'] },
  'no-ask-to-act': { label: '묻지 말고 하기', summary: '할 수 있는 일을 묻는 질문을 막는다', links: ['g-claude'] },
  'deny-unattended-prompt': { label: '무인 승인 창 거절', summary: '사람이 없는 실행에서 뜬 승인 창을 바로 거절한다', links: ['g-deny'] },
}

function runTests(name) {
  const file = join(GLOBAL_DIR, 'hooks', 'tests', `${name}.test.mts`)
  const alt = name === 'session-start-brief' || name === 'memory-route-check' ? join(GLOBAL_DIR, 'hooks', 'tests', 'harness-layers.test.mts') : null
  const f = existsSync(file) ? file : alt && existsSync(alt) ? alt : null
  if (!f) return null
  const r = spawnSync('node', ['--test', f], { encoding: 'utf8', timeout: 120000 })
  const out = `${r.stdout}${r.stderr}`
  const pass = Number(out.match(/ℹ pass (\d+)/)?.[1] ?? 0)
  const fail = Number(out.match(/ℹ fail (\d+)/)?.[1] ?? (r.status === 0 ? 0 : 1))
  return { pass, fail, file: basename(f) }
}

function lastScheduledRun(taskName) {
  const dir = join(GLOBAL_DIR, 'projects', encodeProjectPath(GLOBAL_DIR))
  if (!existsSync(dir)) return null
  let best = null
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    const p = join(dir, f)
    let head = ''
    try { head = readFileSync(p, 'utf8').slice(0, 4000) } catch { continue }
    if (!head.includes(`<scheduled-task name=\\"${taskName}\\"`) && !head.includes(`<scheduled-task name="${taskName}"`)) continue
    const at = head.match(/"timestamp":"([^"]+)"/)?.[1] ?? new Date(statSync(p).mtimeMs).toISOString()
    if (!best || at > best) best = at
  }
  return best
}

export function measureDevices({ tests = true } = {}) {
  const hooks = settings().hooks ?? {}
  const out = []
  for (const [event, entries] of Object.entries(hooks)) {
    for (const e of entries) for (const h of e.hooks ?? []) {
      const m = (h.command ?? '').match(/hooks\/([\w-]+)\.mjs/)
      if (!m) continue
      const name = m[1]
      const info = HOOK_INFO[name] ?? { label: name, summary: '설명 없음(HOOK_INFO에 더할 것)', links: [] }
      const exists = existsSync(join(GLOBAL_DIR, 'hooks', `${name}.mjs`))
      const t = tests ? runTests(name) : null
      const status = !exists ? 'off' : t == null ? 'part' : t.fail ? 'off' : 'on'
      out.push({ id: `d-${name}`, kind: 'hook', label: info.label, summary: info.summary, path: `hooks/${name}.mjs`, event: `${event}${e.matcher ? ` · ${e.matcher}` : ''}`,
        status, statusText: !exists ? '파일 없음' : t == null ? '시험 없음' : t.fail ? `시험 실패 ${t.fail}` : `시험 ${t.pass} 통과`, links: info.links, perRepo: !!info.perRepo })
    }
  }
  const last = lastScheduledRun('harness-docs-refresh-global')
  const age = last ? (Date.now() - Date.parse(last)) / 86400000 : null
  out.push({ id: 'd-refresh', kind: 'task', label: '하네스 문서 최신화', summary: '3일마다 새 권장안을 조사하고 고른 제안을 전역에 반영한다. 하나뿐인 예약 작업', path: 'scheduled-tasks/harness-docs-refresh-global', event: '예약 작업 · 3일마다 10:00',
    status: age == null ? 'off' : age <= STALE_DAYS + 1 ? 'on' : 'old', statusText: last ? `마지막 실행 ${last.slice(5, 10)}` : '실행 기록 없음', links: ['g-memory', 'g-claude', 'g-brief'] })
  out.push({ id: 'd-upkeep', kind: 'skill', label: '정리 스킬', summary: '전역이 바뀐 뒤 프로젝트 세션이 자기 개별 하네스를 맞추는 절차', path: 'skills/harness-upkeep', event: '시작 요약이 «정리할 것»을 알릴 때',
    status: existsSync(join(GLOBAL_DIR, 'skills', 'harness-upkeep', 'SKILL.md')) ? 'on' : 'off', statusText: '전역 한 벌', links: ['g-memory', 'g-skills'], perRepo: true })
  return out
}

// ── 넘길 것(harness-report.md) ─────────────────────────
/** «프로젝트에 넘길 것» 줄: `- [n1123-01 → 전체] …`, 줄에 «끝남»이 있으면 끝난 것. */
export function readHandoffs() {
  const t = read(join(GLOBAL_DIR, 'harness-report.md')) ?? ''
  const sec = t.split(/^## /m).find((s) => s.startsWith('프로젝트에 넘길 것')) ?? ''
  const out = []
  for (const l of sec.split('\n')) {
    const m = l.match(/^- \[(n\d{4}-\d{2}) → ([^\]]+)\]\s*(.*)$/)
    if (m) out.push({ id: m[1], scope: m[2].trim(), text: m[3].slice(0, 400), done: /끝남/.test(m[3]) })
  }
  return out
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
export const scopeMatches = (scope, repoName) => scope === '전체' || scope.split(/[,·]/).some((s) => { const a = norm(s), b = norm(repoName); return a && (b.startsWith(a) || a.startsWith(b)) })

// ── 프로젝트 정리 기록 ─────────────────────────────────
export const upkeepFile = (root) => join(projectMemoryDir(root), '.harness-upkeep.json')
export function readUpkeep(root) { try { return JSON.parse(readFileSync(upkeepFile(root), 'utf8')) } catch { return null } }

/** 이 저장소가 정리할 것: 첫 정리, 전역 바뀜, 아직 안 한 넘길 것. */
export function upkeepPending(root, name = basename(root)) {
  const rec = readUpkeep(root)
  const items = []
  if (!rec) items.push({ kind: 'first', text: '첫 정리: 이 저장소는 아직 한 번도 정리하지 않았다' })
  else if (rec.globalHash !== globalHash()) items.push({ kind: 'global', text: `전역 하네스가 ${rec.at?.slice(0, 10) ?? '지난 정리'} 이후 바뀌었다` })
  const handled = new Set(rec?.handled ?? [])
  for (const h of readHandoffs()) if (!h.done && !handled.has(h.id) && scopeMatches(h.scope, name)) items.push({ kind: 'handoff', id: h.id, text: `[${h.id}] ${h.text.slice(0, 160)}` })
  return items
}

// ── 세션 기록 ──────────────────────────────────────────
const projectDirs = () => { try { return readdirSync(join(GLOBAL_DIR, 'projects')) } catch { return [] } }
let briefSince
/** 시작 요약 훅이 처음 커밋된 때. 그 전에 시작된 세션은 요약이 없어도 장치 탓이 아니므로 세지 않는다. */
export function briefInstalledAt() {
  if (briefSince === undefined) {
    const t = git(GLOBAL_DIR, ['log', '--diff-filter=A', '--format=%aI', '--', 'hooks/session-start-brief.mjs']).trim().split('\n').pop()
    briefSince = t ? Date.parse(t) : 0
  }
  return briefSince
}
const firstTimestamp = (t) => { const m = t.slice(0, 20000).match(/"timestamp":"([^"]+)"/); return m ? Date.parse(m[1]) : NaN }

/** sessions: 최근 days일에 움직인 세션. brief/briefEligible: 그중 시작 요약 훅을 건 뒤 시작된 세션과, 거기에 요약이 들어간 수. */
export function sessionStats(root, days) {
  const since = Date.now() - days * 86400000
  const enc = encodeProjectPath(root)
  const s = { sessions: 0, briefEligible: 0, brief: 0, readGlobal: 0, writeGlobal: 0, writeProject: 0 }
  for (const d of projectDirs().filter((d) => d === enc || d.startsWith(enc + '--claude-worktrees-'))) {
    const full = join(GLOBAL_DIR, 'projects', d)
    for (const f of readdirSync(full)) {
      if (!f.endsWith('.jsonl')) continue
      const p = join(full, f)
      if (statSync(p).mtimeMs < since) continue
      const t = readFileSync(p, 'utf8')
      s.sessions++
      if (firstTimestamp(t) >= briefInstalledAt()) { s.briefEligible++; if (t.includes(BRIEF_MARK)) s.brief++ }
      if (/"file_path":\s*"[^"]*\/\.claude\/memory\/[^"]+"/.test(t)) s.readGlobal++
      if (/"name":\s*"(Write|Edit)","input":\{"file_path":\s*"[^"]*\/\.claude\/memory\//.test(t)) s.writeGlobal++
      if (/"name":\s*"(Write|Edit)","input":\{"file_path":\s*"[^"]*\/\.claude\/projects\/[^"]*\/memory\//.test(t)) s.writeProject++
    }
  }
  return s
}

// ── 저장소 ─────────────────────────────────────────────
function hasTests(path) {
  try { if (JSON.parse(read(join(path, 'package.json')) ?? '{}').scripts?.test) return true } catch {}
  if (existsSync(join(path, '.github', 'workflows')) && readdirSync(join(path, '.github', 'workflows')).length) return true
  return existsSync(join(path, 'pyproject.toml')) && existsSync(join(path, 'tests'))
}

// ── 프로젝트 건의 ───────────────────────────────────────
// 프로젝트 세션은 전역을 고치지 않고 그 프로젝트 메모리의 global-proposals.md에 건의를 적는다(사용자 결정 2026-11-25).
// 꼴: «## 건의 N (YYYY-MM-DD): 제목» 아래 «- 내용:», «- 근거:», «- 전역에서 고칠 후보:». 예전 꼴 «## 제안 N (날짜, 상태): 제목»도 읽는다.
// 전역은 이것을 하네스 지도의 제안 카드(id g-<slug>-<N>, source «프로젝트 건의 · 저장소»)로 올리고, 올린 것은 TAKEN_FILE에 적는다.
export const TAKEN_FILE = join(GLOBAL_DIR, 'state', 'harness-map', 'proposals-taken.json')
const PROPOSAL_HEAD = /^##\s*(?:건의|제안)\s*(\d+)\s*\(([^)]*)\)\s*[:：]\s*(.+?)\s*$/

export function parseProposals(text) {
  const out = []
  let cur = null
  let field = null
  for (const line of (text ?? '').split('\n')) {
    const h = line.match(PROPOSAL_HEAD)
    if (h) {
      cur = { n: Number(h[1]), date: h[2].match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null, title: h[3], fields: [] }
      out.push(cur)
      field = null
      continue
    }
    if (/^#{1,2} /.test(line)) { cur = null; field = null; continue }
    if (!cur) continue
    const b = line.match(/^- ([^:：]{1,40})[:：]\s*(.*)$/)
    if (b) { field = { key: b[1].trim(), text: b[2].trim() }; cur.fields.push(field); continue }
    if (field && line.trim()) field.text += ` ${line.trim()}`
  }
  return out
}

export const proposalCardId = (slug, n) => `g-${slug}-${n}`
export function readTaken() { try { return JSON.parse(readFileSync(TAKEN_FILE, 'utf8')) } catch { return {} } }

/** 모든 프로젝트의 건의. taken: 지도에 카드로 올렸는지 */
export function projectProposals(repos = listRepos()) {
  const taken = readTaken()
  const out = []
  for (const r of repos) {
    const file = join(projectMemoryDir(r.path), PROPOSALS_FILE)
    const text = read(file)
    if (!text) continue
    for (const p of parseProposals(text)) {
      const id = proposalCardId(r.slug, p.n)
      out.push({ ...p, id, repo: r.name, slug: r.slug, file: file.replace(HOME, '~'), taken: !!taken[id] })
    }
  }
  return out
}
export const waitingProposals = (repos) => projectProposals(repos).filter((p) => !p.taken)

export function measureRepo(repo, { days = STALE_DAYS } = {}) {
  const { path, name, slug } = repo
  const claude = read(join(path, 'CLAUDE.md'))
  const agents = read(join(path, 'AGENTS.md'))
  const instrLines = lines(claude) + lines(agents)
  const instrText = `${claude ?? ''}\n${agents ?? ''}`
  const emphasis = (instrText.match(EMPHASIS_RE) ?? []).length
  const testsHere = hasTests(path)
  const stopCheck = existsSync(join(path, '.claude', 'stop-check.sh'))
  const mem = projectMemoryDir(path)
  const memFiles = existsSync(mem) ? readdirSync(mem).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md').length : 0
  const overrides = readOverrides(path)
  const s = sessionStats(path, days)
  const pending = upkeepPending(path, name)
  const up = readUpkeep(path)
  const props = projectProposals([repo])
  const propsWaiting = props.filter((p) => !p.taken).map((p) => p.id)
  const checks = {
    'd-session-start-brief': s.briefEligible === 0 ? { status: 'na', text: '훅을 건 뒤 시작된 세션 없음' } : { status: s.brief === s.briefEligible ? 'on' : s.brief ? 'part' : 'off', text: `훅 뒤 세션 ${s.briefEligible}개 중 ${s.brief}개` },
    'd-stop-check-gate': !testsHere ? { status: 'na', text: '시험 없음 · 해당 없음' } : stopCheck ? { status: 'on', text: '검사 스크립트 있음' } : { status: 'off', text: '시험은 있는데 검사 스크립트 없음' },
    'd-upkeep': pending.length ? { status: 'part', text: `정리할 것 ${pending.length}건` } : { status: 'on', text: `정리 ${up?.at?.slice(5, 10) ?? '-'}` },
  }
  const issues = []
  if (checks['d-stop-check-gate'].status === 'off') issues.push('검사 스크립트 없음')
  if (instrLines > 200) issues.push(`지시문 ${instrLines}줄`)
  if (pending.length) issues.push(`정리할 것 ${pending.length}`)
  if (propsWaiting.length) issues.push(`지도에 안 올린 건의 ${propsWaiting.length}`)
  return {
    slug, name, path: path.replace(HOME, '~'), measuredAt: new Date().toISOString(),
    status: issues.length ? 'part' : 'on', statusText: issues.length ? issues.join(' · ') : '이상 없음',
    facts: { instrLines, emphasis, testsHere, stopCheck, memFiles, overrides: overrides.length },
    overrides, pending, lastUpkeep: up?.at ?? null, sessions: s, checks,
    proposals: { total: props.length, waiting: propsWaiting },
  }
}

// ── 권장안 측정값 ───────────────────────────────────────
/** 권장안 카드가 `metric`으로 가리키는 실측. status: on | part | off | na */
export function measureMetrics(repos, global) {
  const s = settings()
  const applicable = repos.filter((r) => r.checks['d-stop-check-gate'].status !== 'na')
  const stopOn = applicable.filter((r) => r.facts.stopCheck)
  const g = global.find((x) => x.id === 'g-claude')
  const shortRepos = repos.filter((r) => r.facts.instrLines <= 200 && r.facts.emphasis === 0)
  const sess = repos.reduce((a, r) => ({ n: a.n + r.sessions.briefEligible, b: a.b + r.sessions.brief }), { n: 0, b: 0 })
  const deny = s.permissions?.deny ?? []
  const pct = /컨텍스트 \d+%|context-percent/.test(read(join(GLOBAL_DIR, 'CLAUDE.md')) ?? '') || JSON.stringify(s.hooks ?? {}).includes('context-percent')
  const per = (f) => Object.fromEntries(repos.map((r) => [r.slug, f(r)]))
  const frac = (a, b) => (b === 0 ? 'na' : a === b ? 'on' : a ? 'part' : 'off')
  return {
    stopCheck: { status: frac(stopOn.length, applicable.length), text: `시험 있는 저장소 ${applicable.length}곳 중 ${stopOn.length}곳`, perRepo: per((r) => r.checks['d-stop-check-gate']) },
    instrShort: { status: g?.status === 'on' ? frac(shortRepos.length, repos.length) : 'part', text: `전역 ${g?.statusText} · 저장소 ${repos.length}곳 중 ${shortRepos.length}곳이 200줄·강조어 0`, perRepo: per((r) => ({ status: r.facts.instrLines <= 200 && r.facts.emphasis === 0 ? 'on' : 'off', text: `${r.facts.instrLines}줄 · 강조어 ${r.facts.emphasis}` })) },
    denyRules: { status: deny.length && deny.some((d) => d.includes('.ssh')) && deny.some((d) => d.includes('.env')) ? 'on' : deny.length ? 'part' : 'off', text: `금지 규칙 ${deny.length}개(.env·~/.ssh 포함 여부 확인)` },
    supervisorBrief: { status: sess.n === 0 ? 'na' : sess.b / sess.n >= 0.9 ? 'on' : sess.b ? 'part' : 'off', text: `시작 요약 훅을 건 뒤 시작된 세션 ${sess.n}개 중 ${sess.b}개에 들어감`, perRepo: per((r) => r.checks['d-session-start-brief']) },
    noPercentRule: { status: pct ? 'off' : 'on', text: pct ? '퍼센트 규칙이나 훅이 남아 있음' : '퍼센트 규칙·훅 없음' },
    sandbox: { status: s.sandbox?.enabled ? 'on' : 'off', text: s.sandbox?.enabled ? '샌드박스 켜짐' : '샌드박스 꺼짐' },
    upkeep: { status: frac(repos.filter((r) => !r.pending.length).length, repos.length), text: `저장소 ${repos.length}곳 중 ${repos.filter((r) => !r.pending.length).length}곳이 정리 끝남`, perRepo: per((r) => r.checks['d-upkeep']) },
  }
}

export function recentChanges(n = 12) {
  const out = git(GLOBAL_DIR, ['log', `-${n}`, '--date=iso-strict', '--format=%H%x09%ad%x09%s', '--name-only'])
  const items = []
  for (const block of out.trim().split(/\n(?=[0-9a-f]{40}\t)/)) {
    const [head, ...files] = block.split('\n').filter(Boolean)
    if (!head) continue
    const [hash, date, subject] = head.split('\t')
    items.push({ commit: hash.slice(0, 7), date, title: subject.replace(/^\w+(\([^)]*\))?:\s*/, ''), files: files.slice(0, 12) })
  }
  return items
}
