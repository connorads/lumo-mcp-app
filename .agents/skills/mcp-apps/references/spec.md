# MCP Apps Specification Reference

Full type definitions and protocol details for the `io.modelcontextprotocol/ui` extension (SEP-1865, stable 2026-01-26).

## Extension Identifier

`io.modelcontextprotocol/ui` — negotiated via MCP's extension capabilities mechanism. Optional and backwards-compatible.

## UI Resource Types

### UIResource (declaration in resources/list)

```typescript
interface UIResource {
  uri: string;           // MUST use ui:// scheme, e.g. "ui://server-name/view-id"
  name: string;          // Human-readable display name
  description?: string;  // Purpose and functionality
  mimeType: string;      // MUST be "text/html;profile=mcp-app"
  _meta?: {
    ui?: UIResourceMeta;
  };
}
```

### UIResourceMeta

```typescript
interface UIResourceMeta {
  csp?: McpUiResourceCsp;
  permissions?: {
    camera?: {};
    microphone?: {};
    geolocation?: {};
    clipboardWrite?: {};
  };
  domain?: string;         // Dedicated sandbox origin (host-specific format)
  prefersBorder?: boolean; // true = border + background, false = none, omit = host decides
}
```

### McpUiResourceCsp

```typescript
interface McpUiResourceCsp {
  connectDomains?: string[];   // fetch/XHR/WebSocket origins → CSP connect-src
  resourceDomains?: string[];  // images/scripts/styles/fonts/media → img-src, script-src, etc.
  frameDomains?: string[];     // nested iframes → frame-src
  baseUriDomains?: string[];   // base URIs → base-uri
}
```

Wildcard subdomains supported: `https://*.example.com`

### Resource Content (resources/read response)

```typescript
{
  contents: [{
    uri: string;                              // Matching ui:// URI
    mimeType: "text/html;profile=mcp-app";    // Always this exact value
    text?: string;                            // HTML as string
    blob?: string;                            // OR base64-encoded HTML
    _meta?: {
      ui?: UIResourceMeta;                    // Same structure as declaration
    };
  }]
}
```

Content MUST be valid HTML5. Provide via `text` (preferred) or `blob`.

## Tool-UI Linkage

### McpUiToolMeta

```typescript
interface McpUiToolMeta {
  resourceUri?: string;                      // ui:// URI of associated resource
  visibility?: Array<"model" | "app">;       // Default: ["model", "app"]
}

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  _meta?: {
    ui?: McpUiToolMeta;
  };
}
```

> **Deprecation:** `_meta["ui/resourceUri"]` is deprecated. Use `_meta.ui.resourceUri`. Removed before GA.

### Visibility Rules

| visibility | In agent tool list? | Callable by UI? | Use case |
|---|---|---|---|
| `["model", "app"]` | Yes | Yes | Standard tools (default) |
| `["model"]` | Yes | No | Agent-only operations |
| `["app"]` | No | Yes (same server only) | UI-driven interactions (refresh, paginate, filter) |

- Host MUST NOT include `visibility: ["app"]` tools in the agent's tool list
- Host MUST reject cross-server tool calls for app-only tools

### Resource Discovery

UI resources are primarily discovered through tool metadata, not `resources/list`. Servers MAY omit UI-only resources from `resources/list` and `notifications/resources/list_changed`.

Hosts MAY prefetch and cache UI resource content for performance.

## Communication Protocol

JSON-RPC 2.0 over `postMessage`. The view acts as an MCP client; the host acts as an MCP server that proxies to the actual MCP server.

### Lifecycle

1. Host loads HTML into sandboxed iframe
2. View sends `ui/initialize` request with capabilities
3. Host responds with `McpUiInitializeResult` including `hostContext`
4. View sends `ui/notifications/initialized` notification
5. Host sends `ui/notifications/tool-input` with tool arguments
6. View can now use `tools/call`, `resources/read`, etc.

**Critical:** The host MUST NOT send requests/notifications to the view before receiving `initialized`.

### Available Messages (View → Host)

| Method | Type | Purpose |
|---|---|---|
| `ui/initialize` | Request | Handshake, declare capabilities |
| `ui/notifications/initialized` | Notification | Signal readiness |
| `tools/call` | Request | Execute tool on MCP server |
| `resources/read` | Request | Read resource content |
| `notifications/message` | Notification | Log messages |
| `ping` | Request | Health check |
| `ui/open-link` | Request | Ask host to open external URL |
| `ui/message` | Request | Send message to host chat |
| `ui/request-display-mode` | Request | Request display mode change |
| `ui/update-model-context` | Request | Update model context |
| `ui/notifications/size-changed` | Notification | Report content size change |

### Host → View Notifications

| Method | Purpose |
|---|---|
| `ui/notifications/tool-input` | Complete tool arguments (sent once, required) |
| `ui/notifications/tool-input-partial` | Streaming partial arguments (optional, 0..n) |
| `ui/notifications/tool-result` | Tool execution result |
| `ui/notifications/tool-cancelled` | Tool was cancelled |
| `ui/notifications/host-context-changed` | Theme/display mode/dimensions changed |
| `ui/resource-teardown` | Host about to tear down the view (request, expects response) |

### App Capabilities (sent in ui/initialize)

```typescript
interface McpUiAppCapabilities {
  experimental?: {};
  tools?: {
    listChanged?: boolean;
  };
  availableDisplayModes?: Array<"inline" | "fullscreen" | "pip">;
}
```

### Host Context (returned from ui/initialize)

```typescript
interface HostContext {
  toolInfo?: {
    id?: RequestId;
    tool: Tool;
  };
  theme?: "light" | "dark";
  styles?: {
    variables?: Record<McpUiStyleVariableKey, string | undefined>;
    css?: { fonts?: string };
  };
  displayMode?: "inline" | "fullscreen" | "pip";
  availableDisplayModes?: string[];
  containerDimensions?: (
    | { height: number } | { maxHeight?: number }
  ) & (
    | { width: number } | { maxWidth?: number }
  );
  locale?: string;
  timeZone?: string;
  userAgent?: string;
  platform?: "web" | "desktop" | "mobile";
  deviceCapabilities?: { touch?: boolean; hover?: boolean };
  safeAreaInsets?: { top: number; right: number; bottom: number; left: number };
}
```

## CSP Enforcement Rules

### Default CSP (when ui.csp is omitted)

```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
media-src 'self' data:;
connect-src 'none';
```

### Host Behaviour

- MUST construct CSP headers from declared domains
- MUST NOT allow undeclared domains (may further restrict)
- SHOULD log CSP configurations for audit
- `frameDomains` provided → allow declared origins in `frame-src`; omitted → `frame-src 'none'`
- `baseUriDomains` provided → allow declared origins in `base-uri`; omitted → `base-uri 'self'`
- Always: `object-src 'none'`

## Sandbox Proxy Architecture (Web Hosts)

When the host is a web page, it MUST use an intermediate sandbox:

```
Host Page (origin A)
  └── Sandbox iframe (origin B, allow-scripts + allow-same-origin)
        └── View iframe (CSP-restricted, your HTML)
```

### Sandbox Lifecycle

1. Host creates sandbox iframe on different origin
2. Sandbox sends `ui/notifications/sandbox-proxy-ready` to host
3. Host sends `ui/notifications/sandbox-resource-ready` with raw HTML + CSP config
4. Sandbox loads HTML into inner iframe with enforced CSP
5. Sandbox forwards all non-`ui/notifications/sandbox-*` messages bidirectionally

## Capability Negotiation

Client advertises support in the MCP `initialize` request:

```json
{
  "capabilities": {
    "extensions": {
      "io.modelcontextprotocol/ui": {
        "mimeTypes": ["text/html;profile=mcp-app"]
      }
    }
  }
}
```

Servers SHOULD check `clientCapabilities` before registering UI-enabled tools, falling back to text-only tools for non-supporting hosts.

## Domain Field

The `domain` field in `UIResourceMeta` provides a dedicated sandbox origin. Format is host-specific:

| Host | Example Format |
|---|---|
| Claude.ai | `{hash}.claudemcpcontent.com` |
| ChatGPT | `www-example-com.oaiusercontent.com` |

Use only when you need a stable origin for OAuth, CORS, or API key allowlists.
