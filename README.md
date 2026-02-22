<div align="center">

<img src="web/public/lumo-fox.svg" alt="Lumo Fox" width="96" height="96">

# Lumo

**See it click.**

A tutor in your chat that draws diagrams you click to explore deeper.

</div>

---

Lumo is an interactive visual AI tutor built as an [MCP App](https://modelcontextprotocol.io). Ask it to teach you anything and it creates a live, adaptive lesson — diagrams, mind maps, quizzes, and fill-in-the-blank exercises — all inside the chat.

## How it works

Lumo follows a **learning spiral** guided by [Bloom's taxonomy](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy):

```
Explore → Interact → Drill → Check → Adapt → Suggest
```

1. **Explore** — the model draws an interactive diagram or mind map
2. **Interact** — you click a node to drill deeper
3. **Check** — a quiz or fill-in-the-blank tests your understanding
4. **Adapt** — correct answers advance; wrong answers trigger a different explanation
5. **Suggest** — the model offers adjacent topics to continue

No fixed endpoint — the session flows naturally until you stop.

## Widgets

| Widget | What it does | Bloom's level |
|--------|-------------|---------------|
| **lumo-sketch** | Interactive [Mermaid.js](https://mermaid.js.org/) diagrams — flowcharts, sequence, state, and class diagrams with clickable nodes | Remember / Understand |
| **lumo-map** | Zoomable, pannable mind maps from Markdown headings — click any branch to explore | Remember |
| **lumo-quiz** | Multiple-choice questions testing recognition | Remember / Understand |
| **lumo-recall** | Fill-in-the-blank exercises testing active recall from memory | Apply / Analyse |

## Tech stack

TypeScript · React 19 · [Skybridge](https://docs.skybridge.tech/) · MCP protocol · Mermaid.js · [Markmap](https://markmap.js.org/) · Zod · Vite · Vitest

## Development

```bash
bun install
bun dev        # MCP server + devtools at localhost:3000
bun run test   # run tests
```

## Credits

Built for **[Claude Code London Hack Night 03](https://super-mcp-world.netlify.app/)** (20 Feb 2026) using [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

Powered by the [Skybridge framework](https://github.com/alpic-ai/skybridge) and the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps).
