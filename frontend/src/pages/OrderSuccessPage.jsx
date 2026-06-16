import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'rashed_latest_order_confirmation';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

const buildFallbackWhatsappUrl = (order) => {
  const phone = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

  if (!phone || !order?.orderNumber) {
    return '';
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const customer = order.customer || {};
  const message = [
    'Order Confirmation',
    '',
    `Order ID: #${order.orderNumber}`,
    '',
    'Customer:',
    `Name: ${customer.name || ''}`,
    `Phone: ${customer.phone || ''}`,
    '',
    'Address:',
    `${customer.address || ''}`,
    '',
    'Items:',
    ...items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const lineTotal = Number(item.lineTotal || Number(item.unitPrice || 0) * quantity);
      return `- ${item.productName || item.name || 'Item'} x ${quantity} = ${formatMoney(lineTotal)}`;
    }),
    '',
    `Total: ${formatMoney(order.totalAmount || order.subtotal || 0)}`,
    '',
    'Please confirm this order.',
  ].join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const normalizeOrderResponse = (response) => response?.data?.order || response?.order || response || {};

const readStoredOrder = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    return null;
  }
};

const OrderSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [storedOrder, setStoredOrder] = useState(() => location.state?.order || readStoredOrder());

  useEffect(() => {
    if (location.state?.order) {
      setStoredOrder(location.state.order);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.order));
    }
  }, [location.state]);

  const response = storedOrder || {};
  const order = normalizeOrderResponse(response);
  const whatsappUrl = response.whatsappUrl || order.whatsappUrl || buildFallbackWhatsappUrl(order);
  const orderId = response.orderId || order.orderId || order.orderNumber || '';
  const totalAmount = order.totalAmount || response.totalAmount || order.subtotal || 0;

  const confirmationLabel = useMemo(() => {
    return orderId ? `Order #${orderId}` : 'Order confirmed';
  }, [orderId]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="storefront-surface border-[#39FF14]/20 p-8 text-center shadow-[0_0_40px_rgba(57,255,20,0.12)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]">
          <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
            <path d="M5 12.5L9.2 16.7L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>

        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-[#39FF14]">Order Confirmed</p>
        <h1 className="storefront-title mt-3 text-[clamp(2.6rem,8vw,5rem)]">Your order has been created successfully.</h1>
        <p className="mt-4 text-sm uppercase tracking-[0.16em] text-zinc-400">{confirmationLabel}</p>
        <p className="mt-2 text-sm text-zinc-400">Cash on delivery: {formatMoney(totalAmount)}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={whatsappUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`storefront-primary px-6 ${!whatsappUrl ? 'pointer-events-none opacity-50' : ''}`}
          >
            Confirm Order on WhatsApp
          </a>
          <button type="button" onClick={() => navigate('/shop')} className="storefront-secondary px-6">
            Continue Shopping
          </button>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-white/50">
          WhatsApp will open with the full order message pre-filled.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4 text-left text-sm text-zinc-300">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Need to review later?</p>
          <p className="mt-2">Your order reference is stored here for this session. If you close this page, you can still return and confirm the order from the same browser session.</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/" className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 transition-all duration-300 hover:text-neon">
          Back to Home
        </Link>
      </div>
    </section>
  );
};

export default OrderSuccessPage;
