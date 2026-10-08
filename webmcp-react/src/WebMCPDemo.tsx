import { useState } from 'react';
import { useWebMCP } from '@mcp-b/react-webmcp';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  emoji: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const products: Product[] = [
  { id: 'p1', name: 'Wireless Headphones', price: 99.99, category: 'Electronics', inStock: true, emoji: '🎧' },
  { id: 'p2', name: 'Coffee Mug', price: 15.5, category: 'Kitchen', inStock: true, emoji: '☕' },
  { id: 'p3', name: 'Laptop Stand', price: 45.0, category: 'Electronics', inStock: false, emoji: '💻' },
  { id: 'p4', name: 'Notebook', price: 12.99, category: 'Office', inStock: true, emoji: '📓' },
  { id: 'p5', name: 'Desk Lamp', price: 32.75, category: 'Office', inStock: true, emoji: '💡' },
];

const categoryColor: Record<string, string> = {
  Electronics: 'badge-info',
  Kitchen: 'badge-warning',
  Office: 'badge-success',
};

function WebMCPDemo() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>(products);
  const [lastTool, setLastTool] = useState<string>('waiting for agent…');
  const [dark, setDark] = useState(false);

  useWebMCP({
    name: 'search_products',
    description: 'Search for products by name, category, or availability',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        inStockOnly: { type: 'boolean', description: 'Only show in-stock products' },
        maxPrice: { type: 'number', description: 'Maximum price filter' },
      },
    },
    execute: async ({ query, inStockOnly = false, maxPrice }: any) => {
      const results = products.filter((p) => {
        if (inStockOnly && !p.inStock) return false;
        if (maxPrice !== undefined && p.price > maxPrice) return false;
        if (query) {
          const q = query.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
        }
        return true;
      });
      setSearchResults(results);
      setLastTool(`search_products({ query: ${JSON.stringify(query ?? '')} }) → ${results.length} results`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${results.length} products\n${results
              .map((r) => `- [${r.id}] ${r.name} ($${r.price}) [${r.category}] ${r.inStock ? 'In Stock' : 'Out of Stock'}`)
              .join('\n')}`,
          },
        ],
      };
    },
  });

  useWebMCP({
    name: 'add_to_cart',
    description: 'Add a product to the shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID (p1-p5)' },
        quantity: { type: 'number', description: 'Quantity to add' },
      },
      required: ['productId'],
    },
    execute: async ({ productId, quantity = 1 }: any) => {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        setLastTool(`add_to_cart(${productId}) → ❌ not found`);
        return { content: [{ type: 'text' as const, text: `Error: Product ${productId} not found` }] };
      }
      if (!product.inStock) {
        setLastTool(`add_to_cart(${productId}) → ❌ out of stock`);
        return { content: [{ type: 'text' as const, text: `Error: ${product.name} is out of stock` }] };
      }
      setCart((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...prev, { productId, name: product.name, price: product.price, quantity }];
      });
      setLastTool(`add_to_cart(${productId}, ${quantity}) → ✅ added ${product.name}`);
      return { content: [{ type: 'text' as const, text: `Added ${quantity}x ${product.name} to cart` }] };
    },
  });

  useWebMCP({
    name: 'get_cart',
    description: 'View current shopping cart contents',
    inputSchema: {},
    execute: async () => {
      setLastTool('get_cart() → 🛒 read cart');
      if (cart.length === 0) {
        return { content: [{ type: 'text' as const, text: 'Cart is empty' }] };
      }
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const items = cart
        .map((item) => `- ${item.name} x${item.quantity} @ $${item.price} = $${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');
      return { content: [{ type: 'text' as const, text: `Cart:\n${items}\nTotal: $${total.toFixed(2)}` }] };
    },
  });

  useWebMCP({
    name: 'clear_cart',
    description: 'Remove all items from the shopping cart',
    inputSchema: {},
    execute: async () => {
      setCart([]);
      setLastTool('clear_cart() → 🗑️ cart emptied');
      return { content: [{ type: 'text' as const, text: 'Cart cleared' }] };
    },
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div data-theme={dark ? 'dark' : 'light'} className="min-h-screen bg-base-200 overflow-x-hidden antialiased">
      {/* NAVBAR */}
      <div className="navbar bg-base-100/90 backdrop-blur border-b border-base-300 sticky top-0 z-40 px-4 sm:px-6 min-h-14">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <div className="bg-primary text-primary-content w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0">
            🤖
          </div>
          <span className="text-xl font-extrabold tracking-tight shrink-0">
            Agent<span className="text-primary">Store</span>
          </span>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="badge badge-primary badge-sm font-mono whitespace-nowrap">React · WebMCP</span>
          </div>
        </div>
        <div className="flex flex-none items-center gap-1 shrink-0">
          <button
            aria-label="Toggle theme"
            className="btn btn-ghost btn-circle btn-sm"
            onClick={() => setDark(!dark)}
          >
            <span className="text-lg">{dark ? '🌙' : '☀️'}</span>
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <div className="indicator">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && <span className="badge badge-primary badge-sm indicator-item font-mono">{cartCount}</span>}
              </div>
            </div>
            <div tabIndex={0} className="card card-compact dropdown-content bg-base-100 z-50 mt-3 w-72 shadow-xl border border-base-300">
              <div className="card-body">
                {cart.length === 0 ? (
                  <span className="text-sm opacity-60">Cart is empty</span>
                ) : (
                  <ul className="text-sm">
                    {cart.map((item) => (
                      <li key={item.productId} className="flex justify-between py-1">
                        <span>
                          {item.name} <span className="opacity-50">× {item.quantity}</span>
                        </span>
                        <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-between font-bold border-t border-base-200 pt-2 mt-1">
                  <span>Total</span>
                  <span className="text-primary">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="hero bg-gradient-to-br from-primary via-primary to-secondary text-primary-content rounded-2xl shadow-xl overflow-hidden border border-primary/20">
          <div className="hero-content text-center py-14 md:py-16 w-full">
            <div className="max-w-3xl">
              <div className="badge badge-neutral badge-sm font-mono mb-3 opacity-90">The Agentic Frontend - Live Demo</div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">Shop like it&apos;s 2027</h1>
              <p className="py-5 text-base md:text-lg opacity-90 leading-relaxed max-w-2xl mx-auto">
                A storefront where AI agents don&apos;t scrape the DOM - they call <span className="font-mono font-semibold">tools</span>.
                <br className="hidden sm:block" />
                Same UI for humans. Structured API for agents.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <span className="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">search_products</span>
                <span className="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">add_to_cart</span>
                <span className="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">get_cart</span>
                <span className="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">clear_cart</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-3">
        {/* PRODUCT GRID */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">Products</h2>
            <span className="badge badge-ghost">{searchResults.length} items</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-5xl">🔍</span>
                <p className="opacity-60">No products match. Try another search.</p>
                <button className="btn btn-sm btn-outline" onClick={() => setSearchResults(products)}>
                  Reset filter
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-lg hover:border-primary/20 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                >
                  <figure className="bg-gradient-to-br from-base-200 to-base-300 h-28 flex items-center justify-center text-5xl">
                    {product.emoji}
                  </figure>
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="card-title text-[15px] leading-tight">{product.name}</h3>
                      <span className={`badge badge-sm font-medium shrink-0 ${categoryColor[product.category] ?? 'badge-ghost'}`}>
                        {product.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xl font-extrabold tracking-tight text-primary">${product.price.toFixed(2)}</span>
                      <span className={`badge badge-sm font-medium ${product.inStock ? 'badge-success' : 'badge-error'}`}>
                        {product.inStock ? '● In Stock' : '○ Out of Stock'}
                      </span>
                    </div>
                    <div className="card-actions justify-between items-center mt-3">
                      <span className="font-mono text-xs opacity-40">{product.id}</span>
                      <button
                        className="btn btn-primary btn-sm shadow-sm"
                        disabled={!product.inStock}
                        onClick={() => {
                          setCart((prev) => {
                            const existing = prev.find((i) => i.productId === product.id);
                            if (existing) {
                              return prev.map((i) =>
                                i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
                              );
                            }
                            return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
                          });
                        }}
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR: agent panel + cart */}
        <div className="space-y-4">
          <div className="card bg-neutral text-neutral-content shadow-md border border-neutral/50 overflow-hidden">
            <div className="card-body p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h3 className="card-title text-sm font-bold">Agent activity</h3>
                <span className="badge badge-accent badge-sm ml-auto gap-1">
                  <span className="w-2 h-2 bg-accent-content rounded-full animate-pulse inline-block" /> WebMCP live
                </span>
              </div>
              <div className="bg-black rounded-lg p-3 font-mono text-xs text-green-300 break-words border border-white/10 min-h-[44px] flex items-center">
                <span className="opacity-40 mr-2">$</span> {lastTool}
              </div>
              <p className="text-xs opacity-60 leading-relaxed">
                Tools run <strong>inside this page</strong> with your session - no scraping, no re-auth.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-base">🛒 Cart</h3>
                <span className="badge badge-primary font-mono">{cartCount}</span>
              </div>
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl opacity-40">🛍️</span>
                  <p className="text-sm opacity-60 mt-2">Empty - ask your agent to add something</p>
                  <p className="text-xs opacity-40 font-mono mt-1">try: “add a notebook to my cart”</p>
                </div>
              ) : (
                <ul className="divide-y divide-base-200">
                  {cart.map((item) => (
                    <li key={item.productId} className="py-2.5 flex justify-between text-sm">
                      <span>
                        {item.name} <span className="opacity-50">× {item.quantity}</span>
                      </span>
                      <span className="font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between font-extrabold text-lg pt-3 border-t border-base-300">
                <span>Total</span>
                <span className="text-primary">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="card-actions justify-between mt-3">
                <button className="btn btn-ghost btn-sm text-error" disabled={!cart.length} onClick={() => setCart([])}>
                  Clear
                </button>
                <button className="btn btn-primary btn-sm shadow-sm" disabled={!cart.length}>
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer footer-center bg-base-100 text-base-content p-8 mt-8 border-t border-base-300">
        <aside className="flex flex-col items-center gap-2">
          <p className="font-bold tracking-tight">AgentStore - React + WebMCP PoC</p>
          <p className="text-sm opacity-60">
            Tools registered on <code className="font-mono bg-base-200 px-1.5 py-0.5 rounded">document.modelContext</code>
          </p>
          <p className="text-xs opacity-40">Press the cart or ask your AI agent - same underlying tool, two callers.</p>
        </aside>
      </footer>
    </div>
  );
}

export default WebMCPDemo;
