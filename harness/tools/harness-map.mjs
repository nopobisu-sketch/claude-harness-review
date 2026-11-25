#!/usr/bin/env node
// 하네스 지도(아티팩트 하나)에 쓸 실측 데이터를 만들고, 지도가 최신인지 검사한다.
// 지도는 Claude 세션만 쓸 수 있다(ArtifactData). 그래서 이 도구는 파일을 만들고, 세션이 그 파일을 지도에 쓴 뒤 mark한다.
//
//   node ~/.claude/tools/harness-map.mjs snapshot      전부 재서 state/harness-map/out/에 문서 파일을 만든다
//   node ~/.claude/tools/harness-map.mjs repo <경로>   저장소 하나만 재서 문서 파일 하나를 만든다(프로젝트 정리 뒤)
//   node ~/.claude/tools/harness-map.mjs mark          snapshot을 지도에 다 쓴 뒤 «반영됨»으로 적는다
//   node ~/.claude/tools/harness-map.mjs check         지도에 닿는 파일이 마지막 반영 뒤 바뀌었으면 1로 끝난다(끝내기 전 검사가 부름)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { GLOBAL_DIR, nfc } from '../hooks/harness-layers.mjs'
import { STALE_DAYS, globalHash, listRepos, mapHash, measureDevices, measureGlobal, measureMetrics, measureRepo, readHandoffs, recentChanges, slugOf } from './harness-measure.mjs'

export const MAP_URL = 'https://claude.ai/artifact/(하네스 지도 주소)'
export const STATE = join(GLOBAL_DIR, 'state', 'harness-map')
const OUT = join(STATE, 'out')
const PENDING = join(STATE, 'pending.json')
const SYNCED = join(STATE, 'synced.json')
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }

const HOW_TO_WRITE = (files) => `지도에 쓰는 법(ArtifactData, url ${MAP_URL}):
  1) list collection "map" 과 "repos" 로 지금 version을 읽는다(없는 문서는 version 없이 만든다).
  2) batch 한 번으로 아래 문서를 set 한다. 각 entry: {op:"set", collection, doc_id, file_path, if_version}.
${files.map((f) => `     - ${f.collection}/${f.doc_id}  ←  ${f.file}`).join('\n')}
  3) 다 쓰면: node ~/.claude/tools/harness-map.mjs mark`

export function buildSnapshot({ tests = true } = {}) {
  const repos = listRepos().map((r) => measureRepo(r))
  const global = measureGlobal()
  const devices = measureDevices({ tests })
  const doc = {
    v: 1, measuredAt: new Date().toISOString(), staleDays: STALE_DAYS, mapHash: mapHash(), globalHash: globalHash(),
    global, devices, metrics: measureMetrics(repos, global), handoffs: readHandoffs(), recent: recentChanges(),
    repoOrder: repos.map((r) => r.slug),
  }
  return { doc, repos }
}

function writeFiles(entries) {
  mkdirSync(OUT, { recursive: true })
  return entries.map(({ collection, doc_id, data }) => {
    const file = join(OUT, `${collection}__${doc_id}.json`)
    writeFileSync(file, JSON.stringify(data))
    return { collection, doc_id, file }
  })
}

function cmdSnapshot() {
  rmSync(OUT, { recursive: true, force: true })
  const { doc, repos } = buildSnapshot()
  const files = writeFiles([{ collection: 'map', doc_id: 'snapshot', data: doc }, ...repos.map((r) => ({ collection: 'repos', doc_id: r.slug, data: r }))])
  writeFileSync(PENDING, JSON.stringify({ mapHash: doc.mapHash, at: doc.measuredAt, files }))
  const bad = [...doc.global, ...doc.devices].filter((x) => x.status !== 'on').map((x) => `${x.label}(${x.statusText})`)
  console.log(`실측 ${doc.measuredAt} · 전역 ${doc.global.length} · 장치 ${doc.devices.length} · 저장소 ${repos.length}`)
  if (bad.length) console.log(`켜짐이 아닌 것: ${bad.join(', ')}`)
  console.log(HOW_TO_WRITE(files))
}

function cmdRepo(arg) {
  const path = nfc(resolve(arg || process.cwd()))
  // 지도는 ~/Documents/GitHub의 프로젝트만 싣는다(listRepos). 그 밖(시험용 임시 저장소 등)은 쓰지 않는다:
  // 2026-11-25 새 세션 실측에서 홈 아래 시험 저장소의 정리 일꾼이 실제 지도에 카드를 써 버렸다.
  const repo = listRepos().find((r) => r.path === path)
  if (!repo) { console.log(`${path}: ~/Documents/GitHub 바로 아래 프로젝트가 아니라 하네스 지도에 싣지 않는다. 지도에 쓸 것 없음.`); return }
  const data = measureRepo(repo)
  const files = writeFiles([{ collection: 'repos', doc_id: data.slug, data }])
  console.log(`${data.name}: ${data.statusText}`)
  console.log(HOW_TO_WRITE(files).replace(/\n {2}3\).*$/, '\n  (저장소 문서 하나라 mark는 필요 없다)'))
}

function cmdMark() {
  const p = readJson(PENDING)
  if (!p) { console.error('먼저 snapshot을 만들고 지도에 써라.'); process.exit(1) }
  if (p.mapHash !== mapHash()) { console.error('snapshot 뒤에 지도에 닿는 파일이 바뀌었다. snapshot부터 다시.'); process.exit(1) }
  writeFileSync(SYNCED, JSON.stringify({ mapHash: p.mapHash, at: new Date().toISOString(), measuredAt: p.at }))
  console.log(`지도 반영 기록: ${p.mapHash} (${p.at})`)
}

export function check() {
  const s = readJson(SYNCED)
  const now = mapHash()
  if (s?.mapHash === now) return { ok: true }
  return { ok: false, message: `하네스 지도가 지금 하네스와 다르다(지도에 닿는 파일이 ${s ? `${s.at.slice(0, 16)} 반영 뒤` : '한 번도 반영되지 않은 채'} 바뀌었다).
지도를 고쳐 쓰기 전에는 턴을 끝내지 않는다. 순서: node ~/.claude/tools/harness-map.mjs snapshot → 출력대로 ArtifactData로 쓰기 → node ~/.claude/tools/harness-map.mjs mark` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2)
  if (cmd === 'snapshot') cmdSnapshot()
  else if (cmd === 'repo') cmdRepo(arg)
  else if (cmd === 'mark') cmdMark()
  else if (cmd === 'check') { const r = check(); if (!r.ok) { console.log(r.message); process.exit(1) } }
  else { console.error('쓰는 법: snapshot | repo <경로> | mark | check'); process.exit(2) }
}
