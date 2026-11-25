---
name: mcp-turned-off
description: "2026-11-23에 꺼 둔 MCP 서버 넷과 다시 붙이는 법, Gmail 유지·Pinky 삭제 결정 — 30일 호출 1회뿐이라 끔, 사용자 «필요하면 그때그때 붙일게»"
metadata:
  type: reference
---

2026-11-23 사용자 «MCP 1234 끄자 필요하면 그때그때 붙일게». 근거는 Lydia Hallie 강연·공식 best-practices(연결된 서버는 안 써도 도구 이름·안내문이 매번 컨텍스트에 실린다)와 최근 30일 전사의 호출 수.

| 서버 | 30일 호출 | 끈 방법 | 다시 붙이는 법 |
|---|---|---|---|
| Higgsfield(영상·이미지 생성 커넥터, 도구 182개) | 1 | `set_session_connector_enabled` false — 새 세션 기본값도 꺼짐 | 입력창 + 메뉴 → Connectors에서 켜거나, 대화에서 «Higgsfield 켜 줘» |
| rea(역공학, 도구 207개) | 1 | `claude mcp remove -s user rea` | [[rea-reverse-engineering-tool]]의 명령 |
| obsidian_obsidian_vault | 1 | `claude mcp remove -s user obsidian_obsidian_vault` (매 세션 연결 실패 중이었다) | Obsidian을 켜고 MCP 플러그인에서 주소·토큰을 다시 받아 `claude mcp add --transport http …`. 옛 설정은 `~/.claude/backups/mcp-removed-2026-11-23.json`(토큰이 들어 있어 git 밖, 권한 600) |
| Figma 플러그인 MCP(plugin:figma:figma) | 1 | 끄지 않음: 로그인 안 된 상태(needs_auth)라 원래 도구가 0개다. 이 플러그인은 claude.ai에서 동기화되고 figma-use 같은 스킬도 함께 주므로 플러그인째 끄면 스킬까지 사라진다 | 공식 Figma 커넥터(도구 45개)가 같은 일을 한다 |

Gmail 커넥터는 호출 0회여도 일부러 유지한다. 2026-09-06 /doctor가 해제를 권했으나 사용자가 «살릴 거고»라고 유지를 택했다. 지연 로딩이라 문맥 비용이 0이니 /doctor·확장 정리에서 «안 쓰는 커넥터»로 다시 올리지 말고, 언급하면 «의도적 유지»라고 적는다. 호출 0회는 다른 지연 로딩 커넥터에도 정리 근거가 못 된다.

Pinky 폰 MCP는 11-14 사용자가 연결·앱 모두 지움(«둘다 지워»), 다시 쓰자는 말이 없으면 되살리지 않는다. 설치법은 docs/archive/memory-2026-11-25/pinky-phone-mcp.md.
