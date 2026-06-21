import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'rashed_latest_order_confirmation';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

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
  const [whatsappSent, setWhatsappSent] = useState(false);

  useEffect(() => {
    if (location.state?.order) {
      setStoredOrder(location.state.order);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.order));
    }
  }, [location.state]);

  const response = storedOrder || {};
  const order = response.order || response;
  const orderId = response.orderId || order.orderId || '';
  const whatsappUrl = response.whatsappUrl || order.whatsappUrl || '';
  const totalAmount = order.total || order.totalAmount || response.total || 0;

  const handleConfirmWhatsApp = () => {
    if (!whatsappUrl) {
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setWhatsappSent(true);
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="storefront-surface border-[#39FF14]/20 p-8 text-center shadow-[0_0_40px_rgba(57,255,20,0.12)]">
        {/* Warning Icon */}
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-amber-400/50 bg-amber-400/10 text-amber-400">
          <svg aria-hidden="true" className="h-10 w-10" fill="none" viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>

        {/* Main Title */}
        <h1 className="storefront-title mt-5 text-[clamp(2.2rem,7vw,4.2rem)]">
          Your order is almost complete
        </h1>

        {/* Order Details */}
        <p className="mt-3 text-sm uppercase tracking-[0.16em] text-zinc-400">
          {orderId ? `Order #${orderId}` : 'Order placed'} &bull; Cash on delivery: {formatMoney(totalAmount)}
        </p>

        {/* Warning Banner */}
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-5">
          <div className="flex items-start gap-3 text-left">
            <svg className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Order Not Yet Confirmed
              </p>
              <p className="mt-2 text-sm leading-relaxed text-amber-200/80">
                Your order will <strong className="text-amber-100">NOT</strong> be processed until you confirm it on WhatsApp. 
                Please click the button below to send your order details and complete your purchase.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="flex items-center gap-4">
            {/* Step 1 - Done */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12.5L9.2 16.7L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#39FF14]">Order Placed</span>
            </div>

            {/* Connector */}
            <div className="mt-[-20px] h-px w-12 bg-zinc-600" />

            {/* Step 2 - Pending */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className={`grid h-10 w-10 place-items-center rounded-full border ${whatsappSent ? 'border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]' : 'border-amber-400/40 bg-amber-400/10 text-amber-400 animate-pulse'}`}>
                {whatsappSent ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="M5 12.5L9.2 16.7L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                ) : (
                  <span className="text-lg font-bold">2</span>
                )}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${whatsappSent ? 'text-[#39FF14]' : 'text-amber-400'}`}>
                {whatsappSent ? 'Sent to WhatsApp' : 'Confirm on WhatsApp'}
              </span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleConfirmWhatsApp}
            disabled={!whatsappUrl}
            className={`group relative inline-flex items-center gap-3 rounded-xl border-2 px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] transition-all duration-300 ${
              !whatsappUrl
                ? 'pointer-events-none border-zinc-600 bg-zinc-800 text-zinc-500 opacity-50'
                : whatsappSent
                  ? 'border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14] hover:bg-[#39FF14]/20'
                  : 'animate-pulse border-[#25D366] bg-[#25D366] text-white shadow-[0_0_30px_rgba(37,211,102,0.35)] hover:shadow-[0_0_50px_rgba(37,211,102,0.5)]'
            }`}
          >
            {/* WhatsApp Icon */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {whatsappSent ? 'Resend on WhatsApp' : 'Confirm Order on WhatsApp'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="storefront-secondary px-6"
          >
            Continue Shopping
          </button>
        </div>

        {/* Helper Text */}
        <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-white/40">
          {whatsappSent
            ? 'WhatsApp was opened with your order details. Please send the message to confirm.'
            : 'Clicking the button will open WhatsApp with your order details pre-filled.'}
        </p>
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
