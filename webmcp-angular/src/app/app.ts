import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { WebMCPService } from './webmcp.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div [attr.data-theme]="dark() ? 'dark' : 'light'" class="min-h-screen bg-base-200 overflow-x-hidden antialiased">
      <!-- NAVBAR -->
      <div class="navbar bg-base-100/90 backdrop-blur border-b border-base-300 sticky top-0 z-40 px-4 sm:px-6 min-h-14">
        <div class="flex flex-1 items-center gap-3 min-w-0">
          <div class="bg-secondary text-secondary-content w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0">🤖</div>
          <span class="text-xl font-extrabold tracking-tight shrink-0">Agent<span class="text-secondary">Store</span></span>
          <div class="hidden sm:flex items-center gap-2 shrink-0">
            <span class="badge badge-secondary badge-sm font-mono whitespace-nowrap">Angular · WebMCP</span>
          </div>
        </div>
        <div class="flex flex-none items-center gap-1 shrink-0">
          <button aria-label="Toggle theme" class="btn btn-ghost btn-circle btn-sm" (click)="dark.update((v) => !v)">
            {{ dark() ? '🌙' : '☀️' }}
          </button>
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
              <div class="indicator">
                <span class="text-xl">🛒</span>
                @if (store.cartCount() > 0) {
                  <span class="badge badge-secondary badge-sm indicator-item font-mono">{{ store.cartCount() }}</span>
                }
              </div>
            </div>
            <div tabindex="0" class="card card-compact dropdown-content bg-base-100 z-50 mt-3 w-72 shadow-xl border border-base-300">
              <div class="card-body">
                @if (store.cart().length === 0) {
                  <span class="text-sm opacity-60">Cart is empty</span>
                } @else {
                  <ul class="text-sm">
                    @for (item of store.cart(); track item.productId) {
                      <li class="flex justify-between py-1">
                        <span>{{ item.name }} × {{ item.quantity }}</span>
                        <span class="font-mono">{{ item.price * item.quantity | currency }}</span>
                      </li>
                    }
                  </ul>
                }
                <div class="flex justify-between font-bold border-t border-base-200 pt-2 mt-1">
                  <span>Total</span>
                  <span class="text-secondary">{{ store.cartTotal() | currency }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- HERO -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div class="hero bg-gradient-to-br from-secondary via-accent to-secondary text-secondary-content rounded-2xl shadow-xl overflow-hidden border border-secondary/20">
          <div class="hero-content text-center py-14 md:py-16 w-full">
            <div class="max-w-3xl">
              <div class="badge badge-neutral badge-sm font-mono mb-3 opacity-90">The Agentic Frontend - Live Demo</div>
              <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">Shop like it&apos;s 2027</h1>
              <p class="py-5 text-base md:text-lg opacity-90 leading-relaxed max-w-2xl mx-auto">
                A storefront where AI agents don&apos;t scrape the DOM - they call <span class="font-mono font-semibold">tools</span>.
                <br class="hidden sm:block" />Same UI for humans. Structured API for agents.
              </p>
              <div class="flex gap-2 justify-center flex-wrap">
                <span class="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">search_products</span>
                <span class="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">add_to_cart</span>
                <span class="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">get_cart</span>
                <span class="badge badge-outline badge-lg font-mono bg-white/10 border-white/30">clear_cart</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-3">
        <!-- PRODUCT GRID -->
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-2xl font-bold">Products</h2>
            <span class="badge badge-ghost">{{ store.searchResults().length }} items</span>
          </div>

          @if (store.searchResults().length === 0) {
            <div class="card bg-base-100 shadow-sm border border-base-300">
              <div class="card-body items-center text-center py-12">
                <span class="text-5xl">🔍</span>
                <p class="opacity-60">No products match. Try another search.</p>
                <button class="btn btn-sm btn-outline" (click)="store.searchResults.set(store.products)">Reset filter</button>
              </div>
            </div>
          } @else {
            <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              @for (product of store.searchResults(); track product.id) {
                <div class="card bg-base-100 shadow-sm border border-base-300 hover:shadow-lg hover:border-secondary/20 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                  <figure class="bg-gradient-to-br from-base-200 to-base-300 h-28 flex items-center justify-center text-5xl">
                    {{ product.emoji }}
                  </figure>
                  <div class="card-body p-4">
                    <div class="flex justify-between items-start gap-2">
                      <h3 class="card-title text-[15px] leading-tight">{{ product.name }}</h3>
                      <span class="badge badge-sm font-medium shrink-0" [class]="categoryColor(product.category)">{{ product.category }}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span class="text-xl font-extrabold tracking-tight text-secondary">{{ product.price | currency }}</span>
                      <span class="badge badge-sm font-medium" [class]="product.inStock ? 'badge-success' : 'badge-error'">
                        {{ product.inStock ? '● In Stock' : '○ Out of Stock' }}
                      </span>
                    </div>
                    <div class="card-actions justify-between items-center mt-3">
                      <span class="font-mono text-xs opacity-40">{{ product.id }}</span>
                      <button class="btn btn-secondary btn-sm shadow-sm" [disabled]="!product.inStock" (click)="store.addToCart(product.id)">
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- SIDEBAR -->
        <div class="space-y-4">
          <div class="card bg-neutral text-neutral-content shadow-md border border-neutral/50 overflow-hidden">
            <div class="card-body p-4">
              <div class="flex items-center gap-2">
                <span class="text-lg">🧠</span>
                <h3 class="card-title text-sm font-bold">Agent activity</h3>
                <span class="badge badge-accent badge-sm ml-auto gap-1"><span class="w-2 h-2 bg-accent-content rounded-full animate-pulse inline-block"></span> WebMCP live</span>
              </div>
              <div class="bg-black rounded-lg p-3 font-mono text-xs text-green-300 break-words border border-white/10 min-h-[44px] flex items-center">
                <span class="opacity-40 mr-2">$</span>{{ store.lastTool() }}
              </div>
              <p class="text-xs opacity-60 leading-relaxed">Tools run <strong>inside this page</strong> with your session - no scraping, no re-auth.</p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between">
                <h3 class="card-title text-base">🛒 Cart</h3>
                <span class="badge badge-secondary font-mono">{{ store.cartCount() }}</span>
              </div>
              @if (store.cart().length === 0) {
                <div class="text-center py-8">
                  <span class="text-4xl opacity-40">🛍️</span>
                  <p class="text-sm opacity-60 mt-2">Empty - ask your agent to add something</p>
                  <p class="text-xs opacity-40 font-mono mt-1">try: “add a notebook to my cart”</p>
                </div>
              } @else {
                <ul class="divide-y divide-base-200">
                  @for (item of store.cart(); track item.productId) {
                    <li class="py-2.5 flex justify-between text-sm">
                      <span>{{ item.name }} <span class="opacity-50">× {{ item.quantity }}</span></span>
                      <span class="font-mono font-medium">{{ item.price * item.quantity | currency }}</span>
                    </li>
                  }
                </ul>
              }
              <div class="flex justify-between font-extrabold text-lg pt-3 border-t border-base-300">
                <span>Total</span>
                <span class="text-secondary">{{ store.cartTotal() | currency }}</span>
              </div>
              <div class="card-actions justify-between mt-3">
                <button class="btn btn-ghost btn-sm text-error" [disabled]="store.cart().length === 0" (click)="store.clearCart()">Clear</button>
                <button class="btn btn-secondary btn-sm shadow-sm" [disabled]="store.cart().length === 0">Checkout</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <footer class="footer footer-center bg-base-100 text-base-content p-8 mt-8 border-t border-base-300">
        <aside class="flex flex-col items-center gap-2">
          <p class="font-bold tracking-tight">AgentStore - Angular + WebMCP PoC</p>
          <p class="text-sm opacity-60">Tools registered on <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded">document.modelContext</code></p>
          <p class="text-xs opacity-40">Press the cart or ask your AI agent - same underlying tool, two callers.</p>
        </aside>
      </footer>
    </div>
  `,
})
export class AppComponent implements OnInit {
  readonly store = inject(WebMCPService);
  readonly dark = signal(false);

  ngOnInit(): void {
    this.store.initialize();
  }

  categoryColor(category: string): string {
    const map: Record<string, string> = {
      Electronics: 'badge-info',
      Kitchen: 'badge-warning',
      Office: 'badge-success',
    };
    return map[category] ?? 'badge-ghost';
  }
}
