Before writing code, first explore the project structure, then invoke the `chatgpt-app-builder` skill for documentation.

# Illuminate — Interactive Visual AI Tutor

Hackathon project from **Claude Code London Hack Night 03** (20 Feb 2026). This MCP App teaches concepts with an adaptive visual loop inside the assistant.

## Product Goal

The app should feel like a live tutor:

- Explain a concept with an interactive diagram
- Let the user click nodes to drill deeper
- Check understanding with a quiz
- Adapt the next explanation based on quiz result

Pitch: "Illuminate turns any concept into a live, visual, adaptive lesson in-chat."

## Learning Spiral

Core loop: **Explore -> Interact -> Drill -> Check -> Adapt -> Suggest**

- **Explore:** model calls `illuminate-diagram`
- **Interact:** user clicks a node
- **Drill:** widget sends follow-up prompt, model deepens explanation
- **Check:** model calls `illuminate-quiz`
- **Adapt:** correct answer advances; wrong answer re-explains differently
- **Suggest:** model offers adjacent topics

No fixed endpoint; session ends naturally when the user stops engaging.

## Current App Surface

- `illuminate-diagram` (server tool + widget)
  - Interactive SVG diagram with clickable nodes
  - Node types: `concept`, `process`, `actor`, `data`, `decision`
  - Layout hint: `hierarchical` (flows) or `radial` (concept maps)
  - Includes optional `stepInfo` (`current`/`total`)
- `illuminate-quiz` (server tool + widget)
  - Multiple-choice quiz (2-4 options)
  - Uses `correctId`, `explanation`, `topic`
  - Sends delayed follow-up message after answer

## Architecture Notes

- Server is a typed pass-through: validate with Zod, return `structuredContent` plus text fallback.
- Widgets are topic-agnostic primitives; the model decides when/how to use them.
- `useSendFollowUpMessage` + `useWidgetState` create the dual-surface sync (user action -> model response -> next widget).
- Keep tool descriptions broad enough for learning, brainstorming, and exploratory use cases.

## Key Files

- `server/src/index.ts` - MCP server, widget registration, fallback text
- `server/src/schemas.ts` - Zod input contracts
- `web/src/helpers.ts` - typed Skybridge helpers
- `web/src/widgets/illuminate-diagram.tsx` - diagram UI + drill-down follow-ups
- `web/src/widgets/illuminate-quiz.tsx` - quiz UI + adaptive follow-ups
- `web/src/layout.ts` - diagram layout algorithms
- `web/src/index.css` - shared visual theme and widget styles

## MCP App Skills

Use the `mcp-apps` skill (`.agents/skills/mcp-apps/`) for MCP App decisions (resources, tool linkage, widget messaging, CSP, theming). Reference files:

- `SKILL.md` - core patterns and decisions
- `references/spec.md` - protocol details and type shapes
- `references/examples.md` - runnable examples

Use the `chatgpt-app-builder` skill for broader ChatGPT app workflow (architecture, local run, deploy, publish).

Only fetch full SEP-1865 spec if the skills do not cover the needed detail:
https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx

## Dev + Verification

- Start locally: `bun dev`
- Run tests: `bun test`
- Build: `bun build`
- Verify both widgets in devtools:
  - Diagram renders, animates, and node click sends follow-up
  - Quiz handles correct/wrong paths and sends one follow-up
  - Light/dark theme remains readable
  - Text fallback remains useful for non-UI hosts

## Key Links

- [Skybridge framework](https://github.com/alpic-ai/skybridge)
- [Starter template](https://github.com/alpic-ai/claude-hacknight-starter-20-02-2026)
- [MCP docs](https://modelcontextprotocol.io)
