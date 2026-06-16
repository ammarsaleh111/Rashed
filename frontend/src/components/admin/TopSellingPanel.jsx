const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const ProductThumb = ({ name, imageUrl }) => {
  if (imageUrl) {
    return <img alt={name} className="h-full w-full object-cover" src={imageUrl} />;
  }

  return (
    <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.12),transparent_25%),linear-gradient(135deg,#2a2a2a_0%,#101010_100%)] text-[18px] font-bold uppercase tracking-[0.12em] text-white/40">
      {name.slice(0, 2)}
    </div>
  );
};

const TopSellingPanel = ({ items, onViewAllProducts }) => {
  return (
    <article className="border border-white/10 bg-zinc-900 p-6">
      <p className="font-display text-[2rem] font-bold uppercase tracking-tight text-white">
        Top Selling
      </p>

      <div className="mt-8 space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 border border-white/5 bg-black/20 p-2 transition-all duration-300 ease-in-out hover:border-white/10">
              <div className="h-14 w-14 overflow-hidden border border-white/10 bg-[#101010]">
                <ProductThumb name={item.name} imageUrl={item.imageUrl} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold uppercase tracking-[0.1em] text-white">
                  {item.name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  {item.unitsSold} Units Sold
                </p>
              </div>
              <p className="text-[13px] font-bold text-[#7DFF63]">{formatCurrency(item.revenue)}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">No sales data available.</p>
        )}
      </div>

      <button
        type="button"
        onClick={onViewAllProducts}
        className="mt-7 w-full border border-white/10 bg-black/30 px-4 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition-all duration-300 ease-in-out hover:border-[#7DFF63] hover:text-[#7DFF63]"
      >
        View All Products
      </button>
    </article>
  );
};

export default TopSellingPanel;

