import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.jsx';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80';

const CartPage = () => {
  const {
    cart,
    cartLoading,
    cartSyncing,
    cartError,
    updateCartItemQuantity,
    removeCartItemById,
  } = useAppContext();
  const navigate = useNavigate();
  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const itemCount = Number(cart?.itemCount || items.length || 0);
  const shipping = subtotal > 100 ? 0 : 12;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const isMutatingCart = cartSyncing || cartLoading;

  return (
    <section className="mx-auto w-full max-w-7xl px-3 py-8 text-white sm:px-6 sm:py-14">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="storefront-kicker">Cart</p>
          <h1 className="storefront-title mt-3 text-[clamp(2.4rem,6vw,4.5rem)]">Your Bag</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Link
          to="/shop"
          className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-400 transition-all duration-300 ease-in-out hover:text-neon"
        >
          <svg className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Continue Shopping
        </Link>
      </div>

      {/* Status Messages */}
      {cartLoading && !items.length && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#39FF14]/30 border-t-[#39FF14]" />
          <p className="text-sm text-zinc-400">Loading your cart...</p>
        </div>
      )}

      {cartSyncing && items.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/5 px-4 py-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#39FF14]/30 border-t-[#39FF14]" />
          <p className="text-[11px] uppercase tracking-widest text-[#39FF14]/70">Updating cart...</p>
        </div>
      )}

      {cartError && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-widest text-red-400">{cartError}</p>
        </div>
      )}

      {/* Empty State */}
      {!cartLoading && items.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center py-16">
          {/* Decorative empty cart icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[#39FF14]/5 blur-3xl" />
            <div className="relative grid h-28 w-28 place-items-center rounded-full border border-white/10 bg-[#111111]">
              <svg className="h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <h2 className="storefront-title mt-8 text-3xl text-zinc-300">Your bag is empty</h2>
          <p className="mt-3 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
            Looks like you haven't added anything to your bag yet. Explore our collection and find something you'll love.
          </p>
          <Link
            to="/shop"
            className="storefront-primary mt-8 px-8 py-3"
          >
            Browse Collection
          </Link>
        </div>
      )}

      {/* Cart Content */}
      {items.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Items Column */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const lineTotal = Number(item.lineTotal || item.totalPrice || unitPrice * Number(item.quantity || 0));
              const compareAt = Number(item.compareAtPrice || item.originalPrice || 0);
              const compareAtPrice = compareAt > unitPrice ? compareAt : null;

              return (
                <article
                  key={item.id}
                  className="group storefront-surface overflow-hidden p-0 transition-all duration-300 ease-in-out hover:border-white/20 hover:shadow-[0_8px_30px_rgba(57,255,20,0.06)]"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Product Image */}
                    <div className="relative h-40 w-full overflow-hidden sm:h-auto sm:w-36">
                      <img
                        src={item.imageUrl || FALLBACK_IMAGE}
                        alt={item.name || 'Cart item'}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[rgba(7,9,12,0.65)] hidden sm:block" />
                      {compareAtPrice && (
                        <div className="absolute left-2 top-2 rounded-full bg-red-500/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          Sale
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white line-clamp-2">
                              {item.name || 'Untitled Product'}
                            </h3>
                            {item.variant && (
                              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                {item.variant}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isMutatingCart}
                            className="rounded-lg border border-transparent p-1.5 text-zinc-500 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => removeCartItemById(item.id)}
                            aria-label="Remove item"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Price */}
                        <div className="mt-3 flex items-center gap-2.5">
                          <span className="text-lg font-bold text-neon">{formatMoney(unitPrice)}</span>
                          {compareAtPrice && (
                            <span className="text-sm text-zinc-500 line-through">{formatMoney(compareAtPrice)}</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: quantity + line total */}
                      <div className="mt-4 flex items-center justify-between">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          <button
                            type="button"
                            disabled={isMutatingCart || Number(item.quantity || 0) <= 1}
                            className="grid h-9 w-9 place-items-center text-lg font-semibold text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() =>
                              updateCartItemQuantity({ cartItemId: item.id, quantity: Math.max(1, item.quantity - 1) })
                            }
                          >
                            −
                          </button>
                          <span className="grid h-9 w-10 place-items-center border-x border-white/10 text-sm font-bold text-white">
                            {String(item.quantity).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            disabled={isMutatingCart}
                            className="grid h-9 w-9 place-items-center text-lg font-semibold text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() =>
                              updateCartItemQuantity({ cartItemId: item.id, quantity: item.quantity + 1 })
                            }
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Subtotal</p>
                          <p className="mt-0.5 text-base font-bold text-white">{formatMoney(lineTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Order Summary Sidebar */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="storefront-surface overflow-hidden">
              {/* Summary Header */}
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Order Summary</p>
              </div>

              {/* Summary Body */}
              <div className="space-y-0 px-6 py-5">
                {/* Item List Preview */}
                <div className="space-y-3 border-b border-white/8 pb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate pr-4 text-zinc-400">
                        {item.name} <span className="text-zinc-600">×{item.quantity}</span>
                      </span>
                      <span className="text-zinc-300">
                        {formatMoney(Number(item.lineTotal || item.totalPrice || (item.unitPrice || item.price || 0) * (item.quantity || 0)))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 border-b border-white/8 py-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-zinc-300">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Shipping</span>
                    <span className={shipping === 0 ? 'text-[#39FF14]' : 'text-zinc-300'}>
                      {shipping === 0 ? 'Free' : formatMoney(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Tax</span>
                    <span className="text-zinc-300">{formatMoney(tax)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-5">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">Total</span>
                  <span className="font-display text-3xl font-bold leading-none text-neon">{formatMoney(total)}</span>
                </div>

                {/* Free Shipping Hint */}
                {shipping > 0 && (
                  <div className="mt-4 rounded-lg border border-[#39FF14]/15 bg-[#39FF14]/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#39FF14]/70">
                      Add {formatMoney(100 - subtotal)} more for free shipping
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#39FF14] transition-all duration-500"
                        style={{ width: `${Math.min(100, (subtotal / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  disabled={cartLoading || cartSyncing || !items.length}
                  className="storefront-primary w-full py-3.5 text-sm"
                >
                  Proceed To Checkout
                </button>

                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-white/40">
                  Payment: Cash On Delivery (COD)
                </p>

                {/* Security Badges */}
                <div className="mt-4 flex items-center justify-center gap-4 border-t border-white/8 pt-4">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wider">Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wider">Protected</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wider">COD</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default CartPage;
