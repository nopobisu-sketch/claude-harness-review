// 프로젝트 E 저장소의 vitest 시험을 고치지 않고 node --test로 돌리기 위한 얇은 다리.
// 돌리는 법: node --test ~/.claude/hooks/tests/*.test.mts (전역 훅을 고치면 커밋 전에 돌린다)
import assert from 'node:assert/strict'
import { format } from 'node:util'
import { describe, it as nodeIt, beforeEach, afterEach } from 'node:test'

function it(name, fn) {
  return nodeIt(name, fn)
}
it.each = (rows) => (name, fn) => {
  for (const row of rows) {
    const args = Array.isArray(row) ? row : [row]
    nodeIt(format(name, ...args), () => fn(...args))
  }
}

function matchers(actual, negate) {
  const check = (pass, message) => assert.ok(negate ? !pass : pass, message)
  return {
    toBe: (expected) => check(Object.is(actual, expected), `${format('%o', actual)} ${negate ? '===' : '!=='} ${format('%o', expected)}`),
    toBeNull: () => check(actual === null, `null${negate ? '이면 안 되는데 null' : '이어야 하는데 ' + format('%o', actual)}`),
    toContain: (part) => check(actual != null && actual.includes(part), `${format('%o', actual)}에 ${format('%o', part)}${negate ? '가 있다' : '가 없다'}`),
  }
}

export function expect(actual) {
  return { ...matchers(actual, false), not: matchers(actual, true) }
}

export { describe, it, beforeEach, afterEach }
