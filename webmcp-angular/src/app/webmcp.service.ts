import { Injectable, inject, DestroyRef, signal, computed } from '@angular/core';
import '@mcp-b/global';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  emoji: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class WebMCPService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly registeredTools: Array<{ unregister: () => void }> = [];

  readonly products: Product[] = [
    { id: 'p1', name: 'Wireless Headphones', price: 99.99, category: 'Electronics', inStock: true, emoji: '🎧' },
    { id: 'p2', name: 'Coffee Mug', price: 15.5, category: 'Kitchen', inStock: true, emoji: '☕' },
    { id: 'p3', name: 'Laptop Stand', price: 45.0, category: 'Electronics', inStock: false, emoji: '💻' },
    { id: 'p4', name: 'Notebook', price: 12.99, category: 'Office', inStock: true, emoji: '📓' },
    { id: 'p5', name: 'Desk Lamp', price: 32.75, category: 'Office', inStock: true, emoji: '💡' },
  ];

  readonly cart = signal<CartItem[]>([]);
  readonly searchResults = signal<Product[]>(this.products);
  readonly lastTool = signal<string>('waiting for agent…');

  readonly cartCount = computed(() => this.cart().reduce((sum, i) => sum + i.quantity, 0));
  readonly cartTotal = computed(() => this.cart().reduce((sum, i) => sum + i.price * i.quantity, 0));

  addToCart(productId: string, quantity = 1): { ok: boolean; message: string } {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return { ok: false, message: `Error: Product ${productId} not found` };
    if (!product.inStock) return { ok: false, message: `Error: ${product.name} is out of stock` };

    this.cart.update((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { productId, name: product.name, price: product.price, quantity }];
    });
    return { ok: true, message: `Added ${quantity}x ${product.name} to cart` };
  }

  clearCart(): void {
    this.cart.set([]);
  }

  search(query?: string, inStockOnly = false, maxPrice?: number): Product[] {
    const results = this.products.filter((p) => {
      if (inStockOnly && !p.inStock) return false;
      if (maxPrice !== undefined && p.price > maxPrice) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    this.searchResults.set(results);
    return results;
  }

  initialize(): void {
    this.registerSearchProducts();
    this.registerAddToCart();
    this.registerGetCart();
    this.registerClearCart();

    this.destroyRef.onDestroy(() => {
      this.registeredTools.forEach((tool) => tool.unregister());
      this.registeredTools.length = 0;
    });
  }

  private registerSearchProducts(): void {
    const tool = (navigator as any).modelContext.registerTool({
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
      execute: async (args: any) => {
        const { query, inStockOnly = false, maxPrice } = args ?? {};
        const results = this.search(query, inStockOnly, maxPrice);
        this.lastTool.set(`search_products({ query: ${JSON.stringify(query ?? '')} }) → ${results.length} results`);
        const text = `Found ${results.length} products\n${results
          .map((r) => `- [${r.id}] ${r.name} ($${r.price}) [${r.category}] ${r.inStock ? 'In Stock' : 'Out of Stock'}`)
          .join('\n')}`;
        return { content: [{ type: 'text', text }] };
      },
    });
    this.registeredTools.push(tool);
  }

  private registerAddToCart(): void {
    const tool = (navigator as any).modelContext.registerTool({
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
      execute: async (args: any) => {
        const { productId, quantity = 1 } = args ?? {};
        const result = this.addToCart(productId, quantity);
        this.lastTool.set(
          result.ok
            ? `add_to_cart(${productId}, ${quantity}) → ✅ ${result.message}`
            : `add_to_cart(${productId}) → ❌ ${result.message}`
        );
        return { content: [{ type: 'text', text: result.message }] };
      },
    });
    this.registeredTools.push(tool);
  }

  private registerGetCart(): void {
    const tool = (navigator as any).modelContext.registerTool({
      name: 'get_cart',
      description: 'View current shopping cart contents',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        this.lastTool.set('get_cart() → 🛒 read cart');
        const cart = this.cart();
        if (cart.length === 0) {
          return { content: [{ type: 'text', text: 'Cart is empty' }] };
        }
        const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const items = cart
          .map((i) => `- ${i.name} x${i.quantity} @ $${i.price} = $${(i.price * i.quantity).toFixed(2)}`)
          .join('\n');
        return { content: [{ type: 'text', text: `Cart:\n${items}\nTotal: $${total.toFixed(2)}` }] };
      },
    });
    this.registeredTools.push(tool);
  }

  private registerClearCart(): void {
    const tool = (navigator as any).modelContext.registerTool({
      name: 'clear_cart',
      description: 'Remove all items from the shopping cart',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        this.clearCart();
        this.lastTool.set('clear_cart() → 🗑️ cart emptied');
        return { content: [{ type: 'text', text: 'Cart cleared' }] };
      },
    });
    this.registeredTools.push(tool);
  }
}
