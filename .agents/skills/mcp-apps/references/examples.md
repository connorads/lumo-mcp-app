# MCP Apps Working Examples

Complete, runnable examples covering common patterns.

## Example 1: Weather Dashboard (TypeScript MCP Server + HTML View)

A server that provides weather data with an interactive dashboard UI.

### Server Side

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

// Declare UI resource
server.resource("weather-dashboard", "ui://weather-server/dashboard", async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: "text/html;profile=mcp-app",
    text: DASHBOARD_HTML, // defined below
    _meta: {
      ui: {
        csp: {
          connectDomains: ["https://api.openweathermap.org"],
        },
        prefersBorder: true,
      },
    },
  }],
}));

// Tool linked to UI resource — callable by both agent and app
server.tool(
  "get_weather",
  "Get current weather for a location",
  { location: { type: "string", description: "City name" } },
  async ({ location }) => {
    const data = await fetchWeather(location);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      _meta: {
        ui: { resourceUri: "ui://weather-server/dashboard" },
      },
    };
  }
);

// App-only tool — UI can call it, agent cannot see it
server.tool(
  "refresh_weather",
  "Refresh weather data",
  {
    location: { type: "string" },
    units: { type: "string", enum: ["metric", "imperial"] },
  },
  async ({ location, units }) => {
    const data = await fetchWeather(location, units);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      _meta: {
        ui: {
          resourceUri: "ui://weather-server/dashboard",
          visibility: ["app"],
        },
      },
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTML View (DASHBOARD_HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { --bg: #fff; --fg: #1a1a1a; --accent: #0066cc; --card-bg: #f5f5f5; }
    [data-theme="dark"] { --bg: #1a1a1a; --fg: #e8e8e8; --accent: #66b3ff; --card-bg: #2a2a2a; }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); padding: 1rem; }

    .card { background: var(--card-bg); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
    .temp { font-size: 3rem; font-weight: 700; color: var(--accent); }
    .location { font-size: 1.2rem; opacity: 0.8; margin-bottom: 0.5rem; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem; }

    button {
      background: var(--accent); color: white; border: none; padding: 0.5rem 1rem;
      border-radius: 4px; cursor: pointer; font-size: 0.9rem;
    }
    button:hover { opacity: 0.85; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input { padding: 0.5rem; border: 1px solid var(--card-bg); border-radius: 4px; flex: 1; }
    .error { color: #e53e3e; padding: 0.5rem; }
    .loading { opacity: 0.5; }
  </style>
</head>
<body>
  <div class="controls">
    <input type="text" id="location" placeholder="Enter city name" value="London" />
    <button onclick="search()">Search</button>
    <button onclick="refresh()">Refresh</button>
  </div>
  <div id="content" class="loading">Loading...</div>

  <script>
    let nextId = 1;
    const pending = new Map();
    let currentLocation = "London";

    function mcpRequest(method, params = {}) {
      const id = nextId++;
      window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    }

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg?.jsonrpc) return;

      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
        return;
      }

      if (msg.method === "ui/notifications/context-update") {
        applyTheme(msg.params?.hostContext?.theme);
      }
    });

    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme || "light");
    }

    function renderWeather(data) {
      const el = document.getElementById("content");
      el.className = "";
      try {
        const weather = typeof data === "string" ? JSON.parse(data) : data;
        el.innerHTML = `
          <div class="card">
            <div class="location">${weather.location}</div>
            <div class="temp">${weather.temp}°</div>
            <div>${weather.description}</div>
            <div class="details">
              <div>Humidity: ${weather.humidity}%</div>
              <div>Wind: ${weather.wind} m/s</div>
              <div>Feels like: ${weather.feelsLike}°</div>
              <div>Pressure: ${weather.pressure} hPa</div>
            </div>
          </div>`;
      } catch (e) {
        el.innerHTML = `<div class="error">Failed to parse weather data</div>`;
      }
    }

    async function search() {
      currentLocation = document.getElementById("location").value;
      const el = document.getElementById("content");
      el.className = "loading";
      el.textContent = "Loading...";

      try {
        const result = await mcpRequest("tools/call", {
          name: "get_weather",
          arguments: { location: currentLocation },
        });
        const text = result.content?.[0]?.text;
        renderWeather(text);
      } catch (err) {
        el.innerHTML = `<div class="error">${err.message || "Failed to fetch weather"}</div>`;
      }
    }

    async function refresh() {
      try {
        const result = await mcpRequest("tools/call", {
          name: "refresh_weather",
          arguments: { location: currentLocation, units: "metric" },
        });
        const text = result.content?.[0]?.text;
        renderWeather(text);
      } catch (err) {
        document.getElementById("content").innerHTML =
          `<div class="error">Refresh failed: ${err.message}</div>`;
      }
    }

    (async () => {
      try {
        const result = await mcpRequest("ui/initialize", {
          capabilities: {},
          clientInfo: { name: "Weather Dashboard", version: "1.0.0" },
          protocolVersion: "2026-01-26",
        });
        applyTheme(result.hostContext?.theme);
        search();
      } catch (e) {
        document.getElementById("content").innerHTML =
          `<div class="error">Failed to connect to host</div>`;
      }
    })();
  </script>
</body>
</html>
```

## Example 2: Minimal MCP Client Helper (reusable in any view)

Drop this into any HTML view for a clean MCP communication layer:

```javascript
class McpClient {
  #nextId = 1;
  #pending = new Map();
  #notificationHandlers = new Map();

  constructor() {
    window.addEventListener("message", (e) => this.#onMessage(e));
  }

  #onMessage(event) {
    const msg = event.data;
    if (!msg?.jsonrpc) return;

    if (msg.id != null && this.#pending.has(msg.id)) {
      const { resolve, reject } = this.#pending.get(msg.id);
      this.#pending.delete(msg.id);
      msg.error ? reject(msg.error) : resolve(msg.result);
      return;
    }

    if (msg.method) {
      const handler = this.#notificationHandlers.get(msg.method);
      if (handler) handler(msg.params);
    }
  }

  request(method, params = {}) {
    const id = this.#nextId++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
  }

  notify(method, params = {}) {
    window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
  }

  onNotification(method, handler) {
    this.#notificationHandlers.set(method, handler);
  }

  async initialize(name, version = "1.0.0") {
    const result = await this.request("ui/initialize", {
      capabilities: {},
      clientInfo: { name, version },
      protocolVersion: "2026-01-26",
    });
    this.notify("ui/notifications/initialized");
    return result;
  }

  callTool(name, args = {}) {
    return this.request("tools/call", { name, arguments: args });
  }

  readResource(uri) {
    return this.request("resources/read", { uri });
  }

  log(level, data) {
    this.notify("notifications/message", { level, data });
  }
}
```

Usage:

```javascript
const mcp = new McpClient();
const { hostContext } = await mcp.initialize("My App");
applyTheme(hostContext?.theme);

mcp.onNotification("ui/notifications/context-update", (params) => {
  applyTheme(params?.hostContext?.theme);
});

const result = await mcp.callTool("get_data", { id: "123" });
```

## Example 3: CSP Configurations for Common Scenarios

### Fully offline (no external access)
```json
{}
```
No `csp` field — host uses locked-down defaults.

### API calls to a single backend
```json
{
  "csp": {
    "connectDomains": ["https://api.myapp.com"]
  }
}
```

### CDN for libraries + API + embedded video
```json
{
  "csp": {
    "connectDomains": ["https://api.myapp.com", "wss://realtime.myapp.com"],
    "resourceDomains": ["https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
    "frameDomains": ["https://www.youtube.com"]
  }
}
```

### Multiple API providers + wildcard CDN
```json
{
  "csp": {
    "connectDomains": [
      "https://api.stripe.com",
      "https://api.mapbox.com"
    ],
    "resourceDomains": [
      "https://*.cloudflare.com",
      "https://cdn.jsdelivr.net"
    ]
  }
}
```

## Example 4: Tool with Text Fallback

Always return meaningful text content alongside UI metadata, so hosts without MCP Apps support still get useful output:

```typescript
server.tool("analyse_data", "Analyse dataset and visualise results", schema, async (args) => {
  const analysis = await runAnalysis(args);

  return {
    content: [
      {
        type: "text",
        text: `Analysis complete.\n\nSummary: ${analysis.summary}\nRecords: ${analysis.count}\nKey insight: ${analysis.topInsight}`,
      },
    ],
    _meta: {
      ui: { resourceUri: "ui://my-server/analysis-view" },
    },
  };
});
```

## Example 5: Multiple Views from One Server

```typescript
// Dashboard view for overview
server.resource("overview", "ui://analytics/overview", async (uri) => ({
  contents: [{ uri: uri.href, mimeType: "text/html;profile=mcp-app", text: OVERVIEW_HTML }],
}));

// Detail view for deep-dive
server.resource("detail", "ui://analytics/detail", async (uri) => ({
  contents: [{ uri: uri.href, mimeType: "text/html;profile=mcp-app", text: DETAIL_HTML }],
}));
```
