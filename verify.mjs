// Headless verification for the WebMCP demos.
// Loads each app in Chrome, checks tool registration via
// document.modelContext.getTools(), and executes add_to_cart + get_cart.
//
// All settings are overridable via environment variables so the script
// works on any OS / CI without editing the file:
//
//   CHROME_PATH       Path to the Chrome executable
//                     (default: auto-detected per OS)
//   REACT_URL         React dev server URL      (default: http://localhost:3001)
//   ANGULAR_URL       Angular dev server URL    (default: http://localhost:4200)
//   HEADLESS          "true" for headless mode  (default: "false", headed)
//   PRODUCT_ID        Product to add to cart    (default: "p2")
//   PRODUCT_NAME      Expected name in cart     (default: "Coffee Mug")
//   PRODUCT_QTY       Quantity to add           (default: "2")
//
// Examples:
//   bun run verify
//   HEADLESS=true bun run verify
//   CHROME_PATH=/usr/bin/google-chrome REACT_URL=http://localhost:5173 bun run verify
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

function defaultChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'Chrome executable not found. Set CHROME_PATH env var to its location.'
    );
  }
  return found;
}

const config = {
  chromePath: defaultChromePath(),
  headless: process.env.HEADLESS === 'true',
  productId: process.env.PRODUCT_ID ?? 'p2',
  productName: process.env.PRODUCT_NAME ?? 'Coffee Mug',
  productQty: Number(process.env.PRODUCT_QTY ?? 2),
  targets: [
    { name: 'React', url: process.env.REACT_URL ?? 'http://localhost:3001' },
    { name: 'Angular', url: process.env.ANGULAR_URL ?? 'http://localhost:4200' },
  ],
};

console.log(`Chrome: ${config.chromePath} (headless: ${config.headless})`);

const browser = await puppeteer.launch({
  executablePath: config.chromePath,
  headless: config.headless,
  args: [
    '--no-sandbox',
    '--enable-features=WebMCP,WebMCPTesting',
    '--enable-webmcp-testing',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
});

let failed = false;

for (const target of config.targets) {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [${target.name} console.error] ${msg.text()}`);
  });
  try {
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    const result = await page.evaluate(async () => {
      const ctx = document.modelContext ?? navigator.modelContext;
      if (!ctx) return { available: false, tools: [] };
      const tools = await ctx.getTools();
      return {
        available: true,
        tools: tools.map((t) => t.name),
        sample: tools[0]
          ? { name: tools[0].name, description: tools[0].description }
          : null,
      };
    });

    if (!result.available) {
      console.log(`[${target.name}] FAIL: document.modelContext not available`);
      failed = true;
    } else if (result.tools.length === 0) {
      console.log(`[${target.name}] FAIL: 0 tools registered`);
      failed = true;
    } else {
      console.log(`[${target.name}] OK: ${result.tools.length} tools -> ${result.tools.join(', ')}`);
      const exec = await page.evaluate(
        async ({ productId, productQty }) => {
          const ctx = document.modelContext ?? navigator.modelContext;
          const tools = await ctx.getTools();
          const byName = (n) => tools.find((t) => t.name === n);
          const res = await ctx.executeTool(
            byName('add_to_cart'),
            JSON.stringify({ productId, quantity: productQty })
          );
          const cart = await ctx.executeTool(byName('get_cart'), JSON.stringify({}));
          return { res, cart };
        },
        { productId: config.productId, productQty: config.productQty }
      );
      console.log(`[${target.name}] add_to_cart ->`, JSON.stringify(exec.res));
      console.log(`[${target.name}] get_cart ->`, JSON.stringify(exec.cart));
      const cartText = JSON.stringify(exec.cart);
      if (!cartText.includes(config.productName)) {
        console.log(`[${target.name}] FAIL: cart does not contain ${config.productName}`);
        failed = true;
      }
    }
  } catch (err) {
    console.log(`[${target.name}] ERROR: ${err.message}`);
    failed = true;
  }
  await page.close();
}

await browser.close();
console.log(failed ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
process.exit(failed ? 1 : 0);
