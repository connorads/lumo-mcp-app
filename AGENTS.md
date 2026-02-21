Before writing code, first explore the project structure, then invoke the `chatgpt-app-builder` skill for documentation.

# Illuminate — Interactive Visual AI Tutor

Hackathon project from **Claude Code London Hack Night 03** (20 Feb 2026). This MCP App teaches concepts with an adaptive visual loop inside the assistant.

## Product Goal

The app should feel like a live tutor:

- Explain a concept with an interactive diagram or mind map
- Let the user click nodes to drill deeper
- Check understanding with a quiz or fill-in-the-blank exercise
- Adapt the next explanation based on the result

Pitch: "Illuminate turns any concept into a live, visual, adaptive lesson in-chat."

## Learning Spiral

Core loop: **Explore -> Interact -> Drill -> Check -> Adapt -> Suggest**

- **Explore:** model calls `illuminate-diagram` or `illuminate-mindmap`
- **Interact:** user clicks a node or branch
- **Drill:** widget sends follow-up prompt, model deepens explanation
- **Check:** model calls `illuminate-quiz` (recognition) or `illuminate-fill-blank` (recall)
- **Adapt:** correct answer advances; wrong answer re-explains differently
- **Suggest:** model offers adjacent topics

Bloom's taxonomy guides tool selection: Remember/Understand → diagram/mindmap/quiz; Apply/Analyse → fill-in-blank.

No fixed endpoint; session ends naturally when the user stops engaging.

## Current App Surface

- `illuminate-diagram` (server tool + widget)
  - Interactive Mermaid.js diagram with clickable nodes (dagre layout)
  - Supports flowchart, sequenceDiagram, stateDiagram-v2, classDiagram
  - `nodeDescriptions` map for drill-down context
  - Includes optional `stepInfo` (`current`/`total`)
- `illuminate-mindmap` (server tool + widget)
  - Zoomable, pannable Markmap mind map from Markdown headings
  - Click any branch to explore that subtopic via follow-up
  - Use for concept landscapes/hierarchies (no clear directional flow)
- `illuminate-quiz` (server tool + widget)
  - Multiple-choice quiz (2-4 options) — tests recognition (Bloom's Remember/Understand)
  - Uses `correctId`, `explanation`, `topic`
  - Sends delayed follow-up message after answer
- `illuminate-fill-blank` (server tool + widget)
  - Fill-in-the-blank active recall — tests retrieval (Bloom's Apply/Analyse)
  - `{{BLANK_ID}}` placeholders in prompt, per-blank hints and answers
  - Correct turns green and locks; wrong shows hint; all correct reveals explanation + follow-up

## Architecture Notes

- **Structured data contract:** LLM outputs structured text (Mermaid syntax, Markdown headings, `{{BLANK_ID}}` templates); widgets handle all rendering. Never ask the LLM to output visual layout directly.
- Server is a typed pass-through: validate with Zod, return `structuredContent` plus text fallback.
- Widgets are topic-agnostic primitives; the model decides when/how to use them.
- `useSendFollowUpMessage` + `useWidgetState` create the dual-surface sync (user action -> model response -> next widget).
- `useWidgetState` reads/writes via `openai.widgetState.modelContent` (AppsSdkAdaptor). Default state only applies when `modelContent` is null.
- Tool descriptions embed Bloom's taxonomy and learning spiral phases to guide LLM tool selection.

## Key Files

- `server/src/index.ts` - MCP server, widget registration, fallback text
- `server/src/schemas.ts` - Zod input contracts (diagram, mindmap, quiz, fill-blank)
- `web/src/helpers.ts` - typed Skybridge helpers
- `web/src/widgets/illuminate-diagram.tsx` - Mermaid.js diagram + drill-down follow-ups
- `web/src/widgets/illuminate-mindmap.tsx` - Markmap mind map + branch click follow-ups
- `web/src/widgets/illuminate-quiz.tsx` - multiple-choice quiz + adaptive follow-ups
- `web/src/widgets/illuminate-fill-blank.tsx` - fill-in-the-blank active recall widget
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
- Run tests: `bun run test`
- Build: `bun build`
- Verify all widgets in devtools:
  - **Diagram:** Mermaid flowchart renders with proper layout; node click sends follow-up; light/dark theme re-renders correctly
  - **Mind map:** Markdown headings render as zoomable tree; pan/zoom works; branch click drills down
  - **Quiz:** correct/wrong paths work; follow-up fires once after 1.5s
  - **Fill-in-blank:** inputs render inline; correct turns green and locks; wrong shows hint; all correct reveals explanation + follow-up after 1.5s
  - Text fallback remains useful for non-UI hosts (Mermaid in fenced code block; Markdown as-is; fill-blank with answers listed)

## Key Links

- [Skybridge framework](https://github.com/alpic-ai/skybridge)
- [Starter template](https://github.com/alpic-ai/claude-hacknight-starter-20-02-2026)
- [MCP docs](https://modelcontextprotocol.io)
