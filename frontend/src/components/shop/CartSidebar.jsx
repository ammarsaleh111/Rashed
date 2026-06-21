import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80';

const CartSidebar = ({ isOpen, onClose }) => {
  const {
    cart,
    cartLoading,
    cartSyncing,
    cartError,
    refreshCart,
    updateCartItemQuantity,
    removeCartItemById,
  } = useAppContext();
  const [clearingCart, setClearingCart] = useState(false);
  const navigate = useNavigate();

  const cartItems = cart?.items || [];
  const itemCount = Number(cart?.itemCount || cartItems.length || 0);
  const isActionDisabled = cartSyncing || cartLoading || clearingCart;

  useEffect(() => {
    if (isOpen) {
      refreshCart({ silent: true });
    }
  }, [isOpen, refreshCart]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleUpdateQuantity = async (id, delta) => {
    const item = cartItems.find((cartItem) => cartItem.id === id);

    if (!item) {
      return;
    }

    const nextQuantity = Math.max(1, Number(item.quantity || 0) + delta);

    if (nextQuantity === Number(item.quantity || 0)) {
      return;
    }

    await updateCartItemQuantity({
      cartItemId: id,
      quantity: nextQuantity,
    });
  };

  const handleRemoveItem = async (id) => {
    await removeCartItemById(id);
  };

  const handleClearCart = async () => {
    if (!cartItems.length) {
      return;
    }

    setClearingCart(true);
    try {
      const itemIds = cartItems.map((item) => item.id);
      for (const itemId of itemIds) {
        await removeCartItemById(itemId);
      }
      await refreshCart();
    } finally {
      setClearingCart(false);
    }
  };

  const handleProceedToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleViewCart = () => {
    onClose();
    navigate('/cart');
  };

  const subtotal = Number(cart?.subtotal || 0);
  const total = subtotal;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-400 ${
          isOpen
            ? 'pointer-events-auto bg-black/70 backdrop-blur-sm opacity-100'
            : 'pointer-events-none bg-black/0 backdrop-blur-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[440px] transform flex-col border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #131313 0%, #0f0f0f 50%, #0d0d0d 100%)',
        }}
      >
        {/* ── Header ── */}
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
          {/* Subtle glow behind title */}
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-[#39FF14]/3 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
              <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-white">
                Cart
              </h2>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/65 transition-all duration-200 hover:border-white/20 hover:text-white"
            aria-label="Close cart"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable Items ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          {/* Loading State */}
          {cartLoading && !cartItems.length && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39FF14]/20 border-t-[#39FF14]" />
              <p className="mt-4 text-xs uppercase tracking-widest text-zinc-500">Syncing cart...</p>
            </div>
          )}

          {/* Syncing indicator */}
          {cartSyncing && cartItems.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#39FF14]/15 bg-[#39FF14]/5 px-3 py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#39FF14]/30 border-t-[#39FF14]" />
              <p className="text-[10px] uppercase tracking-widest text-[#39FF14]/60">Updating...</p>
            </div>
          )}

          {/* Error */}
          {cartError && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-red-400">{cartError}</p>
            </div>
          )}

          {/* Empty State */}
          {!cartLoading && !cartItems.length && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#39FF14]/5 blur-2xl" />
                <div className="relative grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-[#151515]">
                  <svg className="h-9 w-9 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-zinc-400">Your cart is empty</p>
              <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-zinc-600">
                Browse our collection and add items to get started.
              </p>
            </div>
          )}

          {/* Cart Items */}
          <div className="space-y-3">
            {cartItems.map((item) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const subtotalValue = Number(item.lineTotal || item.totalPrice || unitPrice * Number(item.quantity || 0));
              const compareAt = Number(item.compareAtPrice || item.originalPrice || 0);
              const compareAtPrice = compareAt > unitPrice ? compareAt : null;

              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] transition-all duration-300 hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start gap-3.5 p-3.5">
                    {/* Thumbnail */}
                    <div className="relative h-[88px] w-[72px] flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={item.imageUrl || FALLBACK_IMAGE}
                        alt={item.name || 'Cart item'}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {compareAtPrice && (
                        <div className="absolute left-0 top-0 rounded-br-lg bg-red-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                          Sale
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-[13px] font-bold uppercase leading-tight tracking-tight text-white">
                          {item.name || 'Untitled Product'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isActionDisabled}
                          className="rounded-md p-1 text-white/30 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Price */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{formatMoney(unitPrice)}</span>
                        {compareAtPrice && (
                          <span className="text-xs text-white/30 line-through">{formatMoney(compareAtPrice)}</span>
                        )}
                      </div>

                      {/* Quantity + Subtotal */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            disabled={isActionDisabled || Number(item.quantity || 0) <= 1}
                            className="grid h-7 w-7 place-items-center text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="grid h-7 w-8 place-items-center border-x border-white/10 text-xs font-bold text-white">
                            {Number(item.quantity || 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            disabled={isActionDisabled}
                            className="grid h-7 w-7 place-items-center text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-white/50">
                          {formatMoney(subtotalValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto border-t border-white/10 bg-[#0e0e0e] px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          {/* Clear Cart */}
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              disabled={!cartItems.length || isActionDisabled}
              className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition-all duration-200 hover:border-red-500/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {clearingCart ? 'Clearing...' : 'Clear Cart'}
            </button>
          )}

          {/* Total */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Total</p>
            <p className="text-2xl font-bold leading-none text-neon" style={{ fontFamily: "'Bebas Neue', 'Space Grotesk', sans-serif" }}>
              {formatMoney(total)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={!cartItems.length || cartSyncing || clearingCart || cartLoading}
              className="w-full rounded-xl bg-[#39FF14] py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_0_20px_rgba(57,255,20,0.2)] transition-all duration-300 hover:bg-[#4ade80] hover:shadow-[0_0_30px_rgba(57,255,20,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              Proceed to Checkout
            </button>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleViewCart}
                className="w-full rounded-xl border border-white/10 bg-transparent py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                View Full Cart
              </button>
            )}
          </div>

          {/* COD Note */}
          <p className="mt-3 text-center text-[9px] uppercase tracking-[0.16em] text-white/30">
            Payment: Cash On Delivery (COD)
          </p>
        </div>
      </aside>
    </>
  );
};

export default CartSidebar;
