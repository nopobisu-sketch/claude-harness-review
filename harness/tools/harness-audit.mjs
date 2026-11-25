#!/usr/bin/env node
// 전역 → 프로젝트 층 구조가 실제로 돌아가는지 저장소마다 표로 보여 준다. 고치지 않고 읽기만 한다.
// 돌리는 법: node ~/.claude/tools/harness-audit.mjs [--days 7]
// 같은 실측이 하네스 지도에도 들어간다(tools/harness-map.mjs). 실측 함수는 tools/harness-measure.mjs 한 곳에 있다.
import { listRepos, measureRepo } from './harness-measure.mjs'

const i = process.argv.indexOf('--days')
const days = (i > 0 && Number(process.argv[i + 1])) || 7
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-')
const rows = listRepos().map((r) => measureRepo(r, { days }))
const sum = (k) => rows.reduce((a, r) => a + r.sessions[k], 0)

console.log(`# 전역→프로젝트 층 점검 (최근 ${days}일, ${new Date().toISOString().slice(0, 10)})\n`)
console.log('| 저장소 | 다르게 하는 것 | 프로젝트 메모리 | 정리할 것 | 세션 | 시작 요약(훅 뒤 세션) | 전역 메모리 열람 | 전역에 씀 | 프로젝트에 씀 |')
console.log('|---|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  const s = r.sessions
  console.log(`| ${r.name} | ${r.facts.overrides} | ${r.facts.memFiles} | ${r.pending.length} | ${s.sessions} | ${s.brief}/${s.briefEligible} | ${pct(s.readGlobal, s.sessions)} | ${s.writeGlobal} | ${s.writeProject} |`)
}
console.log(`| **합계** | | | | ${sum('sessions')} | ${sum('brief')}/${sum('briefEligible')} | ${pct(sum('readGlobal'), sum('sessions'))} | ${sum('writeGlobal')} | ${sum('writeProject')} |`)
console.log('\n읽는 법: «시작 요약»은 훅을 건 뒤 시작된 세션 중 요약이 들어간 수다. 둘이 같아야 장치가 도는 것이다.')
