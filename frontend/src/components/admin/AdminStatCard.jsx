const formatMetric = (value, format) => {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  if (format === 'percent') {
    return `${value}%`;
  }

  return new Intl.NumberFormat('en-US').format(value);
};

const AdminStatCard = ({ card }) => {
  const trendIsPositive = card.trend >= 0;

  return (
    <article className="border border-white/10 bg-zinc-900 px-4 py-5 transition-all duration-300 ease-in-out hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            {card.label}
          </p>
          <p className="mt-4 font-display text-[2rem] font-bold leading-none tracking-tight text-white">
            {formatMetric(card.value, card.format)}
          </p>
        </div>
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.16em] ${
            trendIsPositive ? 'text-[#7DFF63]' : 'text-[#ff7f57]'
          }`}
        >
          {trendIsPositive ? '+' : ''}
          {card.trend}%
        </p>
      </div>

      <div className="mt-7 flex h-11 items-end gap-1.5">
        {card.sparkline.map((point, index) => (
          <span
            key={`${card.id}-${index}`}
            className={`w-4 transition-all duration-300 ease-in-out ${index % 3 === 1 ? 'bg-[#7DFF63]' : 'bg-white/10'}`}
            style={{ height: `${Math.max(point, 16)}%` }}
          />
        ))}
      </div>
    </article>
  );
};

export default AdminStatCard;

