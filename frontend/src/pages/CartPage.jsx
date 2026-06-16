import { Link, useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

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
  const shipping = subtotal > 100 ? 0 : 12;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const isMutatingCart = cartSyncing || cartLoading;

  return (
    <section className="mx-auto w-full max-w-7xl px-2 py-8 text-white sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="storefront-kicker">Cart</p>
          <h1 className="storefront-title mt-3 text-[clamp(2.4rem,6vw,4.5rem)]">Your Bag</h1>
        </div>
        <Link to="/shop" className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 transition-all duration-300 ease-in-out hover:text-neon">
          Continue Shopping
        </Link>
      </div>

      {cartLoading && !items.length && <p className="mt-6 text-sm text-zinc-400">Loading cart...</p>}
      {cartSyncing && items.length > 0 && <p className="mt-6 text-[11px] uppercase tracking-widest text-white/55">Updating cart...</p>}
      {cartError && <p className="mt-6 text-[11px] uppercase tracking-widest text-red-400">{cartError}</p>}

      {!cartLoading && items.length === 0 && (
        <div className="storefront-surface mt-10 p-8 text-center">
          <p className="text-sm text-zinc-400">Your bag is empty.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="storefront-surface p-4 transition-all duration-300 ease-in-out hover:border-white/20 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-28 w-full rounded-lg border border-white/10 object-cover mix-blend-luminosity opacity-80 sm:h-24 sm:w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-white">{item.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-zinc-400">{item.variant}</p>
                    <p className="mt-2 text-sm text-neon">${Number(item.unitPrice || 0).toFixed(2)}</p>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                    <div className="flex items-center border border-white/10 bg-black/40">
                      <button
                        type="button"
                        disabled={isMutatingCart}
                        className="px-3 py-1.5 text-zinc-400 transition-all duration-300 ease-in-out hover:text-white"
                        onClick={() => updateCartItemQuantity({ cartItemId: item.id, quantity: Math.max(0, item.quantity - 1) })}
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold">{String(item.quantity).padStart(2, '0')}</span>
                      <button
                        type="button"
                        disabled={isMutatingCart}
                        className="px-3 py-1.5 text-zinc-400 transition-all duration-300 ease-in-out hover:text-white"
                        onClick={() => updateCartItemQuantity({ cartItemId: item.id, quantity: item.quantity + 1 })}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isMutatingCart}
                      className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-all duration-300 ease-in-out hover:text-neon"
                      onClick={() => removeCartItemById(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="storefront-surface h-fit p-6 lg:sticky lg:top-24">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Order Summary</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
                <span>Total</span>
                <span className="text-neon">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={cartLoading || cartSyncing || !items.length}
              className="storefront-primary mt-6 w-full py-3"
            >
              Proceed To Checkout
            </button>

            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-white/60">
              Payment: Cash On Delivery (COD)
            </p>
          </aside>
        </div>
      )}
    </section>
  );
};

export default CartPage;
