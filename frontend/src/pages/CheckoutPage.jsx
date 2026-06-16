import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=400&q=80';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-sm text-white outline-none transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:border-[#39FF14]';

const createInitialForm = (user) => ({
  name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  phone: '',
  email: user?.email || '',
  city: '',
  address: '',
  notes: '',
});

const ORDER_CONFIRMATION_STORAGE_KEY = 'rashed_latest_order_confirmation';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { authUser, cart, cartLoading, cartSyncing, checkoutLoading, checkoutCart } = useAppContext();
  const [formValues, setFormValues] = useState(() => createInitialForm(authUser));
  const [submitError, setSubmitError] = useState('');

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const shipping = 0;
  const tax = 0;
  const total = Number(subtotal.toFixed(2));
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const isSubmitting = checkoutLoading || cartSyncing;

  const requiredFields = useMemo(
    () => ({
      name: 'Full name',
      phone: 'WhatsApp / phone',
      address: 'Delivery address',
    }),
    [],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    for (const key of Object.keys(requiredFields)) {
      if (!String(formValues[key] || '').trim()) {
        return `${requiredFields[key]} is required.`;
      }
    }

    if (formValues.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formValues.email.trim())) {
        return 'Please provide a valid email address.';
      }
    }

    return '';
  };

  const handleConfirmOrder = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!items.length) {
      setSubmitError('Your cart is empty. Add items before checkout.');
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    const result = await checkoutCart({
      customer: {
        name: formValues.name,
        phone: formValues.phone,
        address: formValues.address,
      },
      total,
    });

    if (!result.success) {
      setSubmitError(result.message || 'Unable to complete checkout.');
      return;
    }

    const orderResponse = result?.data || {};
    sessionStorage.setItem(ORDER_CONFIRMATION_STORAGE_KEY, JSON.stringify(orderResponse));
    navigate('/order-success', { state: { order: orderResponse }, replace: true });
  };

  if (!cartLoading && !items.length) {
    return (
      <section className="mx-auto w-full max-w-4xl px-2 py-10 text-white sm:px-6 sm:py-16">
        <div className="storefront-surface p-8 text-center">
          <p className="storefront-kicker">Checkout</p>
          <h1 className="storefront-title mt-4 text-[clamp(2.8rem,8vw,5rem)]">Your Bag Is Empty</h1>
          <Link to="/shop" className="storefront-primary mt-7 px-7">Shop Football Gear</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-2 py-8 text-white sm:px-6 sm:py-14">
      <div className="border-b border-white/10 pb-7">
        <p className="storefront-kicker">Cash On Delivery</p>
        <h1 className="storefront-title mt-4 text-[clamp(2.8rem,7vw,5.4rem)]">Fast Checkout</h1>
      </div>

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form id="checkout-form" onSubmit={handleConfirmOrder} className="storefront-surface p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Full Name *</span>
              <input name="name" value={formValues.name} onChange={handleChange} placeholder="Your name" className={inputClassName} />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">WhatsApp / Phone *</span>
              <input name="phone" value={formValues.phone} onChange={handleChange} placeholder="+20 100 000 0000" className={inputClassName} />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Email</span>
              <input type="email" name="email" value={formValues.email} onChange={handleChange} placeholder="you@example.com" className={inputClassName} />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">City</span>
              <input name="city" value={formValues.city} onChange={handleChange} placeholder="City" className={inputClassName} />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Delivery Address *</span>
              <input name="address" value={formValues.address} onChange={handleChange} placeholder="Street, building, floor" className={inputClassName} />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Notes</span>
              <textarea rows={3} name="notes" value={formValues.notes} onChange={handleChange} placeholder="Delivery notes" className={`${inputClassName} resize-none`} />
            </label>
          </div>

          {submitError && (
            <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[11px] uppercase tracking-widest text-red-300">
              {submitError}
            </div>
          )}
        </form>

        <aside className="storefront-surface h-fit p-5 lg:sticky lg:top-24">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Order Summary</p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-zinc-500">{itemCount} items</p>
            </div>
            <span className="storefront-chip text-neon">COD</span>
          </div>

          <div className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <img src={item.imageUrl || FALLBACK_IMAGE} alt={item.name || 'Cart item'} className="h-16 w-14 rounded-md border border-white/10 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-white">{item.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-200">{formatMoney(item.lineTotal || item.unitPrice * item.quantity || 0)}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-zinc-400"><span>Shipping</span><span>{formatMoney(shipping)}</span></div>
            <div className="mt-2 flex justify-between text-zinc-400"><span>Tax</span><span>{formatMoney(tax)}</span></div>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
              <span>Total</span>
              <span className="text-neon">{formatMoney(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting || cartLoading || !items.length}
            className="storefront-primary mt-5 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading ? 'Confirming...' : 'Confirm COD Order'}
          </button>

          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-white/55">
            You will be redirected to the confirmation page after order.
          </p>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
