---
name: mcp-apps
description: >
  Build MCP App servers that deliver interactive HTML user interfaces to hosts
  like Claude.ai and ChatGPT. Use when creating MCP servers with UI resources,
  building interactive tools with visual output, or implementing bidirectional
  communication between iframe UIs and MCP hosts. Covers the ui:// resource
  scheme, tool-UI linkage, postMessage JSON-RPC transport, CSP security, and
  sandbox architecture. Triggers on: "MCP app", "MCP UI", "ui:// resource",
  "interactive MCP tool", "MCP server with interface", "MCP iframe".
---

# MCP Apps

Build MCP servers that deliver interactive HTML interfaces to hosts. An MCP App is an MCP server that declares UI resources (HTML documents served via the `ui://` scheme), links them to tools, and communicates bidirectionally with the host through postMessage JSON-RPC.

## Mental Model

Think of MCP Apps as a three-layer architecture:

```
┌─────────────────────────────────────┐
│  HOST (Claude.ai, ChatGPT, etc.)    │
│  ┌───────────────────────────────┐  │
│  │  SANDBOX (iframe, diff origin) │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  VIEW (your HTML app)   │  │  │
│  │  │  ← postMessage/JSON-RPC →  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│           ↕ MCP protocol            │
│  ┌───────────────────────────────┐  │
│  │  YOUR MCP SERVER              │  │
│  │  (declares resources + tools) │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Server side:** Declare UI resources with `ui://` URIs. Link tools to those resources via `_meta.ui.resourceUri`. Return HTML content through `resources/read`.

**Client side (the HTML):** Your HTML acts as a lightweight MCP client. It sends JSON-RPC 2.0 messages via `window.parent.postMessage()` and receives responses via `message` event listeners. The host proxies tool calls to your server.

**Security boundary:** The host wraps your HTML in a sandboxed iframe on a different origin. CSP is enforced from your declared domains. Your app never gets direct network access beyond what you declare.

## Core Workflow

### 1. Declare UI Resources

Every UI resource uses the `ui://` URI scheme and `text/html;profile=mcp-app` MIME type:

```typescript
// In your server's resources/list handler
{
  uri: "ui://my-server/dashboard",
  name: "Dashboard",
  description: "Interactive data dashboard",
  mimeType: "text/html;profile=mcp-app"
}
```

Return HTML content via `resources/read`. Include CSP and rendering metadata in `_meta.ui`:

```typescript
// resources/read response
{
  contents: [{
    uri: "ui://my-server/dashboard",
    mimeType: "text/html;profile=mcp-app",
    text: "<!DOCTYPE html><html>...</html>",
    _meta: {
      ui: {
        csp: {
          connectDomains: ["https://api.example.com"],
          resourceDomains: ["https://cdn.jsdelivr.net"]
        },
        prefersBorder: true
      }
    }
  }]
}
```

If you omit `csp`, the host enforces a fully locked-down default — no external connections, no external resources. Only declare domains you actually need.

### 2. Link Tools to UIs

Associate tools with UI resources through `_meta.ui.resourceUri`:

```typescript
{
  name: "get_dashboard_data",
  description: "Fetch dashboard data for visualisation",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  _meta: {
    ui: {
      resourceUri: "ui://my-server/dashboard",
      visibility: ["model", "app"]
    }
  }
}
```

When the host supports MCP Apps, it renders tool results using your UI. When it doesn't, the tool behaves normally with text-only output.

**Visibility controls who can call the tool:**
- `["model", "app"]` (default) — the AI agent and the UI can both call it
- `["app"]` — only the UI iframe can call it; hidden from the agent's tool list
- `["model"]` — only the agent can call it; the UI cannot invoke it

App-only tools are perfect for UI-driven interactions like "refresh", "paginate", or "toggle view" that don't need AI involvement.

### 3. Build the HTML View

Your HTML is a self-contained MCP client. It communicates with the host via postMessage.

**Initialisation handshake** — always start with this:

```javascript
// Minimal postMessage MCP client
let nextId = 1;
const pending = new Map();

// Send JSON-RPC request, get promise of result
function mcpRequest(method, params = {}) {
  const id = nextId++;
  window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

// Send notification (no response expected)
function mcpNotify(method, params = {}) {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
}

// Listen for responses and notifications
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg?.jsonrpc) return;

  // Response to a request we sent
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(msg.error) : resolve(msg.result);
    return;
  }

  // Notification from host
  if (msg.method) {
    handleNotification(msg.method, msg.params);
  }
});

// Handle host notifications (theme changes, etc.)
function handleNotification(method, params) {
  if (method === "ui/notifications/context-update") {
    applyTheme(params?.hostContext?.theme);
  }
}

// Initialise — must be first thing you do
async function init() {
  const result = await mcpRequest("ui/initialize", {
    capabilities: {},
    clientInfo: { name: "My App", version: "1.0.0" },
    protocolVersion: "2026-01-26",
  });

  // result.hostContext has theme, toolInfo, style config
  if (result.hostContext?.theme) {
    applyTheme(result.hostContext.theme);
  }

  // Now you can call tools
  const data = await mcpRequest("tools/call", {
    name: "get_dashboard_data",
    arguments: { query: "initial" },
  });

  renderDashboard(data);
}

init();
```

**Available MCP messages from the view:**
- `ui/initialize` → handshake, returns host context (theme, tool info, styles)
- `tools/call` → execute a tool on your MCP server
- `resources/read` → read a resource from your server
- `notifications/message` → log messages to the host
- `ping` → health check

### 4. Handle Theming

The host provides theme information at initialisation and via notifications. Respect it:

```javascript
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme || "light");
}
```

```css
:root { --bg: #ffffff; --fg: #1a1a1a; --accent: #0066cc; }
[data-theme="dark"] { --bg: #1a1a1a; --fg: #f0f0f0; --accent: #66b3ff; }
body { background: var(--bg); color: var(--fg); }
```

The `hostContext` from `ui/initialize` may also include a `style` object with CSS variables — apply these for deeper host integration. See `references/spec.md` for the full `HostContext` interface.

## Key Decision Points

**When to use app-only tools (`visibility: ["app"]`):**
Use when the interaction is purely UI-driven — pagination, filtering, refreshing, form submission. These don't need the AI to be aware of them.

**When to request CSP domains:**
Only declare domains your UI actively fetches from. `connectDomains` for APIs/WebSockets, `resourceDomains` for CDN scripts/images/fonts, `frameDomains` for embedded iframes (YouTube, etc.).

**When to request permissions:**
Camera, microphone, geolocation, clipboard-write are opt-in. Declare only what you need. The host may refuse — always use JS feature detection as fallback.

**When to use `domain` in metadata:**
Only when you need a stable, dedicated origin for OAuth callbacks, CORS policies, or API key allowlists. Format is host-specific — check host documentation.

**When to use `prefersBorder`:**
Set `true` for dashboards, data views, and structured content. Set `false` for immersive experiences, games, or full-bleed designs. Always set explicitly — hosts' defaults vary.

## Quality Checks

A well-built MCP App:
- Initialises with `ui/initialize` before any other communication
- Handles both light and dark themes
- Degrades gracefully if the host doesn't support MCP Apps (text-only tool output still works)
- Declares minimal CSP — only the domains it actually needs
- Uses app-only visibility for UI-only interactions
- Keeps HTML self-contained (inline styles/scripts, or load from declared CDN domains)
- Handles errors from tool calls and displays meaningful feedback

For full type definitions, CSP construction rules, sandbox proxy architecture, and complete working examples, see:
- **Type definitions & protocol:** `references/spec.md`
- **Working examples:** `references/examples.md`
