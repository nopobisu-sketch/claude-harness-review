#!/usr/bin/env node
// 프로젝트 건의를 하네스 지도의 제안 카드로 올린다(사용자 결정 2026-11-25: 건의는 프로젝트 메모리 파일에, 전역이 거둬 지도에 «프로젝트 건의»로 이력을 남긴다).
//   node ~/.claude/tools/harness-proposals.mjs list           모든 건의와 지도에 올렸는지
//   node ~/.claude/tools/harness-proposals.mjs cards          안 올린 건의를 카드 JSON으로 만들고 지도에 쓰는 법을 출력
//   node ~/.claude/tools/harness-proposals.mjs taken <id...>  지도에 쓴 카드를 «올림»으로 기록
// 읽기·꼴은 tools/harness-measure.mjs(projectProposals). 프로젝트 파일은 읽기만 한다.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GLOBAL_DIR } from '../hooks/harness-layers.mjs'
import { TAKEN_FILE, projectProposals, readTaken } from './harness-measure.mjs'

const MAP_URL = 'https://claude.ai/artifact/(하네스 지도 주소)'
const OUT = join(GLOBAL_DIR, 'state', 'harness-map', 'out')

const pick = (fields, test) => fields.filter((f) => test(f.key)).map((f) => f.text).join(' / ')

/** 건의 하나 → 지도 제안 카드(proposals/<id>) */
export function toCard(p, order) {
  const summary = pick(p.fields, (k) => k.startsWith('내용')) || p.title
  const why = pick(p.fields, (k) => k.startsWith('근거')) || '건의에 근거가 적히지 않음'
  const change = pick(p.fields, (k) => /고칠|정할|어긋/.test(k)) || '건의에 적히지 않음 · 전역이 정함'
  const note = pick(p.fields, (k) => !/^(내용|근거)/.test(k) && !/고칠|정할|어긋/.test(k))
  return {
    title: p.title, summary, why, change, cost: '건의에 적히지 않음',
    ...(note ? { caveat: note } : {}),
    state: '고를 것', answer: '', date: p.date ?? new Date().toISOString().slice(0, 10),
    source: `프로젝트 건의 · ${p.repo}`, from: { repo: p.repo, slug: p.slug, n: p.n, file: p.file },
    recId: null, links: [], order,
  }
}

export function markTaken(ids) {
  const taken = readTaken()
  const at = new Date().toISOString()
  for (const id of ids) taken[id] = { at }
  mkdirSync(dirname(TAKEN_FILE), { recursive: true })
  writeFileSync(TAKEN_FILE, JSON.stringify(taken, null, 2))
  return taken
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [cmd, ...args] = process.argv.slice(2)
  const all = projectProposals()
  if (cmd === 'list' || !cmd) {
    if (!all.length) console.log('프로젝트 건의 없음')
    for (const p of all) console.log(`${p.taken ? '올림' : '안 올림'} · ${p.id} · ${p.repo} · ${p.date ?? '날짜 없음'} · ${p.title}`)
  } else if (cmd === 'cards') {
    const waiting = all.filter((p) => !p.taken)
    if (!waiting.length) { console.log('지도에 안 올린 건의 없음'); process.exit(0) }
    mkdirSync(OUT, { recursive: true })
    waiting.forEach((p, i) => writeFileSync(join(OUT, `proposals__${p.id}.json`), JSON.stringify(toCard(p, 60 + i), null, 2)))
    console.log(`안 올린 건의 ${waiting.length}건. 지도에 쓰는 법(ArtifactData, url ${MAP_URL}):`)
    console.log('  1) list collection "proposals"로 같은 id가 이미 있는지 본다. 있으면 그 카드는 만들지 않는다(사용자 답이 지워진다).')
    console.log('  2) batch 한 번으로 아래를 op "set"(새 문서라 if_version 없음)으로 쓴다. 전역이 이미 정한 건의는 쓰기 전에 state·answer·result를 맞춘다.')
    for (const p of waiting) console.log(`     - proposals/${p.id}  ←  ${join(OUT, `proposals__${p.id}.json`)}   (${p.repo}: ${p.title})`)
    console.log(`  3) 다 쓰면: node ~/.claude/tools/harness-proposals.mjs taken ${waiting.map((p) => p.id).join(' ')}`)
  } else if (cmd === 'taken') {
    if (!args.length) { console.error('쓰는 법: taken <카드 id...>'); process.exit(2) }
    markTaken(args)
    console.log(`올림으로 기록: ${args.join(', ')}`)
  } else { console.error('쓰는 법: list | cards | taken <id...>'); process.exit(2) }
}
