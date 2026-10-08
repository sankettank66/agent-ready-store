# CLAUDE.md - Agent Instructions for webmcp-demo

This file is for **Claude Code** (and any Claude-based agent) working in this repo. It is the single source of truth for how this project is structured and how to make changes safely.

## Project: WebMCP Demo - One Store, Two Frameworks

**Goal:** Show that **WebMCP** (`document.modelContext`) is a platform API, not a framework feature, via **one AgentStore, two frameworks**.

### What WebMCP is
- W3C Community Group draft (Google + Microsoft) - `document.modelContext.registerTool({ name, description, inputSchema, execute })`
- Two APIs: **Imperative** (JS) and **Declarative** (form attributes). This repo uses Imperative only.
- Tools are **ephemeral** (tab lifetime), **visible** (user sees execution), gated by **Permissions-Policy: tools=self** and origin isolation.
- Polyfill: `@mcp-b/global` provides `document.modelContext` when native flag `chrome://flags/#enable-webmcp-testing` is off. Native and polyfill are tested via `verify.mjs`.

### Repo Structure - DO NOT RENAME

```
webmcp-demo/
├── webmcp-react/        # Vite + React 19 - DO NOT rename
├── webmcp-angular/      # Angular 22 zoneless - DO NOT rename
├── verify.mjs           # Headless verification (puppeteer-core)
├── package.json         # bun scripts: dev:react, dev:angular, verify
└── opencode.json        # chrome-devtools MCP
```

**Do not rename `webmcp-react/` or `webmcp-angular/`.** If you move/rename folders, update `package.json` scripts accordingly.

### How to Run (use `bun`, not `npm`)

```bash
bun install                          # root (for verify.mjs)
bun install --cwd webmcp-react
bun install --cwd webmcp-angular
bun run dev:react      # 3001 - Vite
bun run dev:angular    # 4200 - ng serve
bun run verify         # headless Chrome, checks 8 tools → ALL PASS
bun run build:react
bun run build:angular  # note: Lightning CSS warning "Could not parse 1 selector" is harmless (DaisyUI modern CSS)
```

**Do NOT run `npm install` or `yarn`.** Use `bun` and `bun add`. Tailwind v4 + DaisyUI 5 are already wired; do not add `tailwind.config.js` (v4 uses CSS `@import`).

### Styling: Tailwind 4 + DaisyUI 5

- **React:** `webmcp-react/vite.config.ts` has `@tailwindcss/vite` plugin. CSS is `src/index.css`: `@import "tailwindcss"; @plugin "daisyui" { themes: light --default, dark; }`
- **Angular:** `webmcp-angular/.postcssrc.json` must be `{ "plugins": { "@tailwindcss/postcss": {} } }` - NOT `postcss.config.js` (Angular ignores it). CSS is `src/styles.css` same import. `package.json` has `browserslist: "> 1%"` so Lightning CSS keeps `color-mix()`.
- Both apps share `AgentStore` visuals: `navbar` (sticky, backdrop-blur, border), `hero` (gradient, `rounded-2xl`), `card` (products, `border`, `hover:-translate-y-0.5`), `badge`, `dropdown` (cart), black `Agent activity` terminal. `max-w-7xl mx-auto` + `overflow-x-hidden` - **never add `mx-4` to a `hero` (width:100%) or you reintroduce horizontal scrollbar**.
- Navbar fix: `flex flex-1 items-center gap-3 min-w-0` with `shrink-0` on logo/title and badges in `hidden sm:flex` wrapper. Do not remove `flex` display.

### WebMCP Implementation Details

**React (`webmcp-react/src/WebMCPDemo.tsx`):**
```ts
import '@mcp-b/global'; // must be in App.tsx before WebMCPDemo mounts
import { useWebMCP } from '@mcp-b/react-webmcp';
useWebMCP({ name, description, inputSchema: { type:'object', properties:{...}, required:[] }, execute })
```
- `inputSchema` must be **raw JSON Schema** (`{ type, properties }`). **Never pass Zod objects** - they serialize as `{def:{...}}` and Chrome throws `Failed to parse input arguments`.
- Hook auto-unregisters on unmount (StrictMode-safe). `execute` closure sees state at call time - `get_cart` must read current `cart` (it does via closure; alternative is ref).
- Polyfill quirk: `document.modelContext.executeTool(tool, JSON.stringify(args))` - polyfill expects a JSON **string**, native spec expects an **object**. `verify.mjs` uses `JSON.stringify`.

**Angular (`webmcp-angular/src/app/webmcp.service.ts`):**
```ts
import '@mcp-b/global'; // in main.ts
@Injectable({providedIn:'root'})
export class WebMCPService {
  readonly cart = signal<CartItem[]>([]);
  readonly searchResults = signal<Product[]>(this.products);
  readonly lastTool = signal('...');
  addToCart(id,qty) { this.cart.update(...) }
  initialize() { navigator.modelContext.registerTool({...}) ; this.destroyRef.onDestroy(()=>tools.forEach(t=>t.unregister())) }
}
```
- Zoneless: `app.config.ts` has only `provideRouter(routes)` + `provideBrowserGlobalErrorListeners()` - **do not add `provideZoneChangeDetection`** without `zone.js`.
- Component `app.ts` is standalone with `imports: [CurrencyPipe]`, template uses `@for`/`@if` (no `CommonModule`).
- Same 4 tools, same schemas as React. Button and tool call the same `addToCart()` - keep it that way.

**Shared:**
- Products: p1 headphones 99.99, p2 mug 15.5, p3 laptop stand 45 (out of stock), p4 notebook 12.99, p5 lamp 32.75 - all with `emoji`. Do not change IDs or `inStock` without updating `verify.mjs` (it tests `add_to_cart(p2)` and `search_products(iphone)`).
- `lastTool` signal/state feeds the black terminal in both UIs - keep the string format `op(args) -> result` for demo readability.

### Verification

`verify.mjs` launches Chrome via `puppeteer-core` with `--enable-features=WebMCP` (Chrome path auto-detected per OS, overridable with `CHROME_PATH`; URLs via `REACT_URL`/`ANGULAR_URL`; `HEADLESS=true` for headless). It checks `getTools()` length (4 per app) and `executeTool` for `add_to_cart`/`get_cart`. **After any change to tools or schemas, run `bun run verify` and ensure `ALL PASS` before finishing.**

Dev servers `bun run dev:react` and `npx ng serve` stay running; they hold file locks - kill `vite` (port 3001) and `ng.js` (port 4200) before renaming folders.

### Common Pitfalls

1. Creating `tailwind.config.js` → breaks v4 (uses CSS `@import`). Don't.
2. Renaming `postcss.config.js` vs `.postcssrc.json` → Angular only reads the latter.
3. `\$` before `{{` in Angular inline template literal → `\$` escapes `$` so `\${{` outputs `${{` → Angular interpolates `{{ }}` after `$`. If you write `${{` directly in a JS template literal, it starts a JS interpolation and breaks build.
4. Horizontal scrollbar → hero `width:100%` + `mx-4` overflows. Use wrapper `max-w-7xl mx-auto px-4 pt-6` around hero.
5. `bun run verify` fails with `Failed to parse input arguments` → you passed Zod or malformed `inputSchema`.

### Before Committing

```bash
bun run build:react
bun run build:angular
bun run verify
```

If all three pass, the talk demo is ready.
