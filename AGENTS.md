# AGENTS.md - Instructions for Coding Agents in webmcp-demo

This repo demos **WebMCP** (`document.modelContext`) via **one AgentStore, two frameworks** (React 19 + Angular 22).

## What WebMCP Is

- W3C CG draft (Google + Microsoft): `document.modelContext.registerTool({ name, description, inputSchema, execute })` + `getTools()`/`executeTool()`
- Imperative (JS) and Declarative (form attrs) - this repo uses **Imperative only**.
- Tools are **ephemeral** (tab), **visible**, gated by `Permissions-Policy: tools=self`. Polyfill `@mcp-b/global` backs `document.modelContext` when flag `chrome://flags/#enable-webmcp-testing` is off.

## Repo Layout - DO NOT RENAME

```
webmcp-demo/
├── webmcp-react/        # Vite + React 19 - DO NOT rename to react/
├── webmcp-angular/      # Angular 22 zoneless - DO NOT rename to angular/
├── verify.mjs           # puppeteer-core headless check (ALL PASS)
├── package.json         # bun scripts
└── opencode.json        # chrome-devtools MCP (type: local, bunx chrome-devtools-mcp)
```

**Do not rename `webmcp-react/` or `webmcp-angular/`.** If you move/rename folders, update `package.json` scripts accordingly.

## How to Run - Use `bun`

```bash
bun install
bun install --cwd webmcp-react
bun install --cwd webmcp-angular
bun run dev:react      # 3001
bun run dev:angular    # 4200 (ng serve)
bun run verify         # checks 8 tools end-to-end
bun run build:react
bun run build:angular  # Lightning CSS warning "1 selector" is harmless
```

Never use `npm`/`yarn`. Never add `tailwind.config.js` (v4 uses `@import`).

## Styling (Tailwind 4 + DaisyUI 5)

- **React:** `webmcp-react/vite.config.ts` has `@tailwindcss/vite`. CSS `src/index.css`: `@import "tailwindcss"; @plugin "daisyui" { themes: light --default, dark; }`
- **Angular:** `webmcp-angular/.postcssrc.json` is `{ "plugins": { "@tailwindcss/postcss": {} } }` - **must be `.postcssrc.json`, not `postcss.config.js`**. CSS `src/styles.css` same import. `browserslist: "> 1%"` in `package.json` preserves `color-mix()`.
- Shared visuals: `navbar` (backdrop-blur, border), `hero` (`rounded-2xl`, gradient), `card`/`badge`/`dropdown`, `max-w-7xl mx-auto overflow-x-hidden`. **Never put `mx-4` on `hero`** (width:100% overflows).

Navbar: `flex flex-1 items-center gap-3 min-w-0` + `shrink-0` on logo/title; badges in `hidden sm:flex` wrapper.

## WebMCP Details

**React (`webmcp-react/src/WebMCPDemo.tsx`):**
- `import '@mcp-b/global'` in `App.tsx` before hook mounts.
- `useWebMCP({ name, description, inputSchema: { type:'object', properties, required }, execute })`
- `inputSchema` **must be raw JSON Schema** - Zod serializes to `{def:...}` → `Failed to parse input arguments`.
- Polyfill quirk: `executeTool(tool, JSON.stringify(args))` (native wants object). See `verify.mjs`.

**Angular (`webmcp-angular/src/app/webmcp.service.ts`):**
- `import '@mcp-b/global'` in `main.ts`.
- `WebMCPService` holds `cart`/`searchResults`/`lastTool` as `signal`, `cartCount`/`cartTotal` as `computed`, `addToCart()` shared by UI button and tool. `initialize()` registers 4 tools, `DestroyRef` cleans up.
- `app.config.ts` is zoneless (`provideRouter` + `provideBrowserGlobalErrorListeners` only). No `provideZoneChangeDetection`.
- `app.ts` uses `CurrencyPipe` + `@for`/`@if`.

**Shared data:** p1 99.99, p2 15.5, p3 45 (out of stock), p4 12.99, p5 32.75 with `emoji`. Don't change without updating `verify.mjs`.

## Verification

`verify.mjs` uses `puppeteer-core` + auto-detected Chrome path (`CHROME_PATH` override) + `--enable-features=WebMCP`. Checks `getTools().length` and `executeTool(add_to_cart → get_cart)` on both ports (`REACT_URL`/`ANGULAR_URL` overrides, `HEADLESS=true` for headless). **Run `bun run verify` after every tool/schema change.**

Dev servers lock folders - kill `vite` (3001) and `ng.js` (4200) before renaming.

## Pitfalls

- `tailwind.config.js` breaks v4.
- `.postcssrc.json` vs `postcss.config.js` for Angular.
- `\$` + `{{` in Angular inline template literals - `\$` escapes so `\${{` becomes `${{` → Angular interpolates; bare `${{` in JS template literal is a JS interpolation error.
- Hero `mx-4` reintroduces horizontal scrollbar.
- Zod `inputSchema` → parse error.

## Pre-commit

```bash
bun run build:react && bun run build:angular && bun run verify
```

## Skills & MCP

- `opencode.json` exposes `chrome-devtools` MCP via `bunx -y chrome-devtools-mcp@latest`. Use it for headed verification if `verify.mjs` isn't enough.
- When asked for skills, prefer `docs`, `find-skills`, or `customize-opencode` as appropriate per `.claude` guidelines.
