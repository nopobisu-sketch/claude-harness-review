#!/usr/bin/env node
// 프로젝트 «정리»의 시작과 끝을 기록한다. 절차는 스킬 ~/.claude/skills/harness-upkeep/SKILL.md에 있다.
//   node ~/.claude/tools/harness-upkeep.mjs status [저장소 경로]   정리할 것 목록
//   node ~/.claude/tools/harness-upkeep.mjs done [저장소 경로]     정리 끝: 지금 전역 지문과 처리한 넘길 것을 기록
// 기록은 그 저장소의 프로젝트 메모리 폴더 `.harness-upkeep.json`에 둔다(저장소는 건드리지 않음).
import { writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { repoRoot } from '../hooks/harness-layers.mjs'
import { globalHash, readHandoffs, readUpkeep, scopeMatches, upkeepFile, upkeepPending } from './harness-measure.mjs'

export function markDone(root) {
  const name = basename(root)
  const prev = readUpkeep(root)
  const handled = new Set(prev?.handled ?? [])
  for (const h of readHandoffs()) if (scopeMatches(h.scope, name)) handled.add(h.id)
  const rec = { globalHash: globalHash(), at: new Date().toISOString(), handled: [...handled].sort() }
  mkdirSync(dirname(upkeepFile(root)), { recursive: true })
  writeFileSync(upkeepFile(root), JSON.stringify(rec, null, 2))
  return rec
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2)
  const root = repoRoot(arg || process.cwd())
  if (!root) { console.error('프로젝트 폴더(git 저장소, 또는 ~/Documents/GitHub 바로 아래 폴더) 안에서 돌려라.'); process.exit(2) }
  if (cmd === 'status') {
    const items = upkeepPending(root)
    console.log(items.length ? `정리할 것 ${items.length}건 (${basename(root)}):\n${items.map((x) => `- ${x.text}`).join('\n')}` : `정리할 것 없음 (${basename(root)})`)
  } else if (cmd === 'done') {
    const rec = markDone(root)
    console.log(`정리 기록: ${basename(root)} · 전역 지문 ${rec.globalHash} · 처리한 넘길 것 ${rec.handled.length}건`)
  } else { console.error('쓰는 법: status | done [경로]'); process.exit(2) }
}
