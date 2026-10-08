# WebMCP Demo: One Store, Two Frameworks

> A live, framework-agnostic WebMCP demo: the same **AgentStore** in **React 19** and **Angular 22**, styled with **DaisyUI 5 + Tailwind 4**, verified headless via `bun run verify`.

---

## Overview

WebMCP (Web Model Context Protocol) is a proposed W3C standard (Google + Microsoft, Web ML Community Group) that lets a web page expose **structured tools** to in-browser AI agents via `document.modelContext`.

Instead of agents scraping the DOM and simulating clicks, your app **declares** its capabilities with JSON Schema and agents call them directly - with your live session, state, and cookies.

This repo ships **one store, two frameworks, same tool contract** to show that WebMCP is a **platform API, not a framework feature**.

**Demo:** AgentStore - 5 products (🎧 Headphones, ☕ Mug, 💻 Laptop Stand, 📓 Notebook, 💡 Lamp) - 4 tools:

| Tool | Purpose | Inputs |
|------|---------|--------|
| `search_products` | Filter products | `query?`, `inStockOnly?`, `maxPrice?` |
| `add_to_cart` | Add item | `productId` (p1-p5), `quantity?` |
| `get_cart` | Read cart + total | - |
| `clear_cart` | Empty cart | - |

Tools run **inside the page** - UI and agent call the same underlying function. Watch the DaisyUI cart and the black **Agent activity** terminal update live.

---

## Tech Stack

| Layer | React (`webmcp-react/`) | Angular (`webmcp-angular/`) |
|-------|------------------------|-----------------------------|
| Framework | Vite + React 19 | Angular 22 (zoneless) |
| WebMCP | `@mcp-b/react-webmcp` + `@mcp-b/global` polyfill | `@mcp-b/global` via `navigator.modelContext` |
| Styling | Tailwind 4 (`@tailwindcss/vite`) + DaisyUI 5 | Tailwind 4 (`.postcssrc.json` + `@tailwindcss/postcss`) + DaisyUI 5 |
| Language | TypeScript (strict) | TypeScript (strict) |
| Runtime | Bun 1.3 | Bun + Angular CLI |

Shared: `AgentStore` data, tool names/schemas, DaisyUI theme (`light`/`dark`), verification via `puppeteer-core`.

---

## Project Structure

```
webmcp-demo/
├── webmcp-react/          # React PoC (Vite)
│   ├── src/
│   │   ├── WebMCPDemo.tsx  # useWebMCP x4 + DaisyUI AgentStore
│   │   ├── App.tsx         # @mcp-b/global import + WebMCPDemo
│   │   ├── index.css       # @import "tailwindcss"; @plugin "daisyui"
│   │   └── main.tsx
│   └── vite.config.ts      # @tailwindcss/vite + @vitejs/plugin-react
├── webmcp-angular/        # Angular PoC
│   ├── src/
│   │   ├── app/
│   │   │   ├── webmcp.service.ts  # signals, computed, DestroyRef, registerTool
│   │   │   └── app.ts             # zoneless, CurrencyPipe, DaisyUI template
│   │   ├── styles.css             # @import "tailwindcss"; @plugin "daisyui"
│   │   └── main.ts                # import '@mcp-b/global'
│   ├── .postcssrc.json            # { "@tailwindcss/postcss": {} }
│   └── angular.json
├── verify.mjs             # Headless Chrome: registers + executes all 8 tools
├── package.json           # bun scripts for both apps + verify
└── opencode.json          # chrome-devtools MCP
```

---

## Quick Start

Requires **Bun 1.3+** and **Chrome** (for `document.modelContext` / polyfill).

```bash
# install both apps
bun install
bun install --cwd webmcp-react
bun install --cwd webmcp-angular

# dev (two terminals)
bun run dev:react     # http://localhost:3001
bun run dev:angular   # http://localhost:4200

# production builds
bun run build:react
bun run build:angular

# verify all 8 tools headless (Chrome + @mcp-b/global polyfill)
bun run verify
# → [React]   OK: 4 tools -> add_to_cart, clear_cart, get_cart, search_products
# → [Angular] OK: 4 tools -> ...
# → RESULT: ALL PASS

# options (all env vars, all optional):
# HEADLESS=true bun run verify                                  # headless Chrome (CI-friendly)
# CHROME_PATH=/usr/bin/google-chrome bun run verify             # custom Chrome location
# REACT_URL=http://localhost:5173 ANGULAR_URL=http://localhost:4201 bun run verify
```

**Enable native WebMCP (optional):** `chrome://flags/#enable-webmcp-testing` → Enabled + relaunch, or install the **MCP-B** / **Model Context Tool Inspector** extension. The PoCs use `@mcp-b/global` polyfill so they work without the flag - native and polyfill share `document.modelContext`.

---

## How WebMCP Works Here

```js
// Both apps register the same contract
document.modelContext.registerTool({
  name: "add_to_cart",
  description: "Add a product to the shopping cart",
  inputSchema: {
    type: "object",
    properties: { productId: { type: "string" }, quantity: { type: "number" } },
    required: ["productId"]
  },
  execute: async ({ productId, quantity }) => {
    // → updates the same signal/state the "Add to cart" button uses
    return { content: [{ type: "text", text: `Added ${quantity}x ...` }] };
  }
});
```

**Key differences from RPC:** ephemeral (only while tab open), visible (user sees it), same-origin + `Permissions-Policy: tools=self`, runs as logged-in user.

---

## UI

DaisyUI components: `navbar` (sticky, backdrop-blur), `hero` (gradient), `card`/`figure`/`badge` (products), `card bg-neutral` (Agent activity terminal), `dropdown` (cart), `footer`. Light/dark toggle, `overflow-x-hidden`, `max-w-7xl` container - no horizontal scrollbar, projector-ready (`text-5xl` hero, `hover:-translate-y-0.5` cards). React uses the indigo accent, Angular the pink accent.

---

## Gotchas (so you don't)

- **JSON Schema, not Zod:** Chrome rejects Zod internals with `Failed to parse input arguments`. Pass raw `{ type, properties, required }`.
- **Polyfill string:** `@mcp-b/global` polyfill `executeTool(tool, JSON.stringify(args))` (native spec takes an object).
- **Angular zoneless:** Don't add `provideZoneChangeDetection` without `zone.js`; use `provideRouter` only.
- **Lifecycle:** Always `unregister()` on destroy (`DestroyRef` / `useWebMCP` auto-cleanup) or `getTools()` leaks.
- **Tailwind 4 + Angular:** requires `.postcssrc.json` (not `postcss.config.js`) + `browserslist: "> 1%"` for `color-mix()`.

---

## References

**WebMCP spec & docs**

- WebMCP specification (W3C Web Machine Learning Community Group): https://github.com/webmachinelearning/webmcp
- Chrome WebMCP docs — get started: https://developer.chrome.com/docs/ai/webmcp
- Imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Declarative API: https://developer.chrome.com/docs/ai/webmcp/declarative-api
- WebMCP vs MCP: https://developer.chrome.com/docs/ai/webmcp/compare-mcp
- Tool security guidance: https://developer.chrome.com/docs/ai/webmcp/secure-tools
- Origin trial (Chrome 149+): https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241

**Cheat sheet**

- WebMCP cheat sheet (WebFuse): https://www.webfuse.com/webmcp-cheat-sheet

**Demos & examples**

- GoogleChromeLabs webmcp-tools (pizza-maker, react-flightsearch, french-bistro, doors, maze): https://github.com/GoogleChromeLabs/webmcp-tools
- WebMCP-org examples (React, Angular, Svelte, vanilla): https://github.com/WebMCP-org/examples
- Angular WebMCP support (experimental): https://angular.dev/ai/webmcp
- Live appointment-booking explainer demo: https://googlechromelabs.github.io/webmcp-tools/demos/explainer/

**Packages used in this repo**

- `@mcp-b/global` (polyfill for `document.modelContext`): https://www.npmjs.com/package/@mcp-b/global
- `@mcp-b/react-webmcp` (`useWebMCP` hook): https://www.npmjs.com/package/@mcp-b/react-webmcp
- Model Context Protocol (server-side counterpart): https://modelcontextprotocol.io
- Tailwind CSS v4: https://tailwindcss.com · DaisyUI 5: https://daisyui.com
- Verification via `puppeteer-core`: https://pptr.dev
