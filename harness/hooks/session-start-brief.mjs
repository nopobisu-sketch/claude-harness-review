// SessionStart 훅: 모든 세션이 시작할 때(처음·/clear·압축 뒤) 전역 핵심 요약(core-brief.md)을 Claude 앞에 놓고,
// 이 세션의 프로젝트 층 상태를 알린다. 새 저장소면 프로젝트 메모리 목차와 «전역과 다르게 하는 것» 절을 저절로 만든다.
// 까닭(2026-11-23): 전역 메모리는 목차만 자동으로 들어가서 하위 프로젝트 세션의 6%만 주제 파일을 열었다.
// 프로젝트 I 세션은 이미 적혀 있던 «감독은 감독만»을 읽지 않아 어겼다. 글 규칙 대신 장치로 매 세션 앞에 놓는다.
// 훅이 고장 나도 세션을 막지 않는다: 언제나 0으로 끝낸다.
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  CORE_BRIEF, OVERRIDES_HEADING, ensureProjectLayer, isGlobalRepo, isTempPath, projectMemoryDir, readOverrides, readStdinJson, repoRoot,
} from './harness-layers.mjs'
import { upkeepPending, waitingProposals } from '../tools/harness-measure.mjs'

export function buildContext({ cwd }) {
  const parts = []
  if (existsSync(CORE_BRIEF)) parts.push(readFileSync(CORE_BRIEF, 'utf8').trim())

  if (!cwd || isTempPath(cwd)) return parts.join('\n\n')
  const root = repoRoot(cwd)
  if (!root) return parts.join('\n\n')

  if (isGlobalRepo(root)) {
    parts.push('Project layer: this is the global harness repo (~/.claude). Changes here reach every project; commit to main.')
    let waiting = []
    try { waiting = waitingProposals() } catch {}
    if (waiting.length) {
      parts.push(`Project proposals waiting (프로젝트 건의 ${waiting.length}건, not yet on the 하네스 지도): ${waiting.map((w) => w.id).join(', ')}. ` +
        'The scheduled task harvests them every 3 days; if the user says «건의 거둬», run node tools/harness-proposals.mjs cards now. Mention it to the user in one line.')
    }
    return parts.join('\n\n')
  }

  const state = ensureProjectLayer(root)
  const overrides = readOverrides(root)
  const memDir = projectMemoryDir(root)
  const lines = [`Project layer: ${root}`, `Project memory: ${memDir}/MEMORY.md`]
  if (state === 'created') lines.push('New project: the project memory index was just created with empty sections. Tell the user in one line that this repo now follows the global harness.')
  if (state === 'inserted') lines.push(`The "${OVERRIDES_HEADING}" section was just added to the project memory index.`)
  lines.push(overrides.length
    ? `This project overrides global on ${overrides.length} point(s); see "${OVERRIDES_HEADING}" in the project MEMORY.md. Those win over global rules.`
    : 'No project overrides: follow the global rules as written.')
  let due = []
  try { due = upkeepPending(root) } catch {}
  if (due.length) {
    // 2026-11-25 사용자 결정(a): «알려라»만 적었더니 프로젝트 I 세션 8개가 한 번도 정리하지 않았다(감독은 언급조차 안 했고, 일꾼은 자기 몫이 아니라고 넘겼다).
    lines.push(`Upkeep due (정리할 것 ${due.length}건): ${due.map((d) => d.kind === 'handoff' ? d.id : d.kind === 'first' ? 'first upkeep (new repo)' : 'global harness changed').join(', ')}. ` +
      'If the user opened this session directly: do not ask. Before other work, hand the harness-upkeep skill for this repo to a background worker on a cheaper model ' +
      '(brief: «이슈 없음: 하네스 정리 — 기록은 .harness-upkeep.json과 하네스 지도»), then tell the user in one line that upkeep is running. ' +
      'If this notice arrives in the middle of a task (after compaction or resume), start it right after the current task wraps up. ' +
      'Worker or child sessions (started by another session) and scheduled tasks skip this; the supervisor handles it.')
  }
  parts.push(lines.join('\n'))
  return parts.join('\n\n')
}

function main() {
  try {
    const input = readStdinJson()
    const additionalContext = buildContext({ cwd: input.cwd || process.cwd() })
    if (additionalContext) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }))
    }
  } catch {}
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
