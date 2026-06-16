import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;
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

  const handleUpdateQuantity = async (id, delta) => {
    const item = cartItems.find((cartItem) => cartItem.id === id);

    if (!item) {
      return;
    }

    const nextQuantity = Math.max(0, Number(item.quantity || 0) + delta);

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

  const subtotal = Number(cart?.subtotal || 0);
  const total = subtotal;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/80 transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[430px] transform flex-col border-l border-white/10 bg-[#111111] shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-5 sm:px-6 sm:py-7">
          <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-white sm:text-3xl md:text-[2rem]">
            Shopping Cart ({itemCount})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/65 transition hover:text-[#39FF14]"
            aria-label="Close cart"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
          {cartLoading && !cartItems.length && <p className="px-2 text-sm text-white/65">Syncing cart...</p>}
          {cartSyncing && cartItems.length > 0 && <p className="px-2 text-[11px] uppercase tracking-widest text-white/40">Updating cart...</p>}
          {cartError && <p className="px-2 text-[11px] uppercase tracking-widest text-red-400">{cartError}</p>}

          {!cartLoading && !cartItems.length && (
            <div className="rounded-2xl border border-white/10 bg-[#151515] px-5 py-8 text-center text-white/65">
              Your cart is empty.
            </div>
          )}

          <div className="space-y-4">
            {cartItems.map((item) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const subtotalValue = Number(item.lineTotal || item.totalPrice || unitPrice * Number(item.quantity || 0));
              const compareAt = Number(item.compareAtPrice || item.originalPrice || 0);
              const compareAtPrice = compareAt > unitPrice ? compareAt : null;

              return (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={item.imageUrl || FALLBACK_IMAGE}
                      alt={item.name || 'Cart item'}
                      className="h-24 w-20 rounded-md bg-[#1a1a1a] object-cover mix-blend-luminosity opacity-85"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-sm font-bold uppercase leading-tight tracking-tight text-white">
                          {item.name || 'Untitled Product'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isActionDisabled}
                          className="rounded-md p-1 text-white/45 transition hover:text-[#39FF14] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove item"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-base font-bold text-white">{formatMoney(unitPrice)}</span>
                        {compareAtPrice && (
                          <span className="text-sm font-semibold text-white/35 line-through">{formatMoney(compareAtPrice)}</span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          disabled={isActionDisabled || Number(item.quantity || 0) <= 0}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#1a1a1a] text-xl font-semibold leading-none text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-lg font-semibold text-white">{Number(item.quantity || 0)}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          disabled={isActionDisabled}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#1a1a1a] text-xl font-semibold leading-none text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">
                        Subtotal: <span className="font-semibold text-white">{formatMoney(subtotalValue)}</span>
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-auto border-t border-white/10 bg-[#151515] px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <button
            type="button"
            onClick={handleClearCart}
            disabled={!cartItems.length || isActionDisabled}
            className="w-full rounded-full border border-white/20 bg-transparent py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/80 transition hover:border-[#39FF14] hover:text-[#39FF14] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {clearingCart ? 'Clearing...' : 'Clear Cart'}
          </button>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-white/65">Total:</p>
            <p className="font-display text-4xl font-bold leading-none text-[#39FF14]">{formatMoney(total)}</p>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={!cartItems.length || cartSyncing || clearingCart || cartLoading}
            className="mt-5 w-full rounded-full bg-[#39FF14] py-4 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-[#4ade80] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proceed to Checkout
          </button>
        </div>
      </aside>
    </>
  );
};

export default CartSidebar;
