Before writing code, first explore the project structure, then invoke the chatgpt-app-builder skill for documentation.

# Project

This is a hackathon project from **Claude Code London Hack Night 03** (20 Feb 2026) — a 90-minute hack to build an **MCP App** (Model Context Protocol interactive UI) solving an everyday workplace challenge.

## MCP Apps Skill

Use the `mcp-apps` skill (`.agents/skills/mcp-apps/`) for guidance on building MCP Apps. It covers the full workflow: declaring `ui://` resources, linking tools, building HTML views with postMessage JSON-RPC, CSP security, and theming. Reference files:

- `SKILL.md` — core patterns and key decisions
- `references/spec.md` — full type definitions and protocol details
- `references/examples.md` — complete runnable examples

The full SEP-1865 spec is at https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx (~1800 lines) — avoid fetching it unless you need something not covered by the skill.

## Key Links

- [Skybridge framework](https://github.com/alpic-ai/skybridge) — open-source MCP App builder
- [Starter template](https://github.com/alpic-ai/claude-hacknight-starter-20-02-2026)
- [MCP docs](https://modelcontextprotocol.io)
