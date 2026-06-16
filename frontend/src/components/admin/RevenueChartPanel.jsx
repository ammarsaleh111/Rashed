const buildAreaPath = (series, width, height, padding) => {
  if (!series.length) {
    return {};
  }

  const maxValue = Math.max(...series.map((item) => item.value), 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = series.map((item, index) => {
    const x = padding + (innerWidth / Math.max(series.length - 1, 1)) * index;
    const y = padding + innerHeight - (item.value / maxValue) * innerHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padding).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;

  return { linePath, areaPath, points };
};

const RevenueChartPanel = ({ periods, activePeriod, onPeriodChange, series }) => {
  const width = 780;
  const height = 360;
  const padding = 26;
  const chart = buildAreaPath(series, width, height, padding);
  const labelStep = Math.max(Math.ceil(series.length / 7), 1);
  const visibleLabels = series.filter(
    (_item, index) => index % labelStep === 0 || index === series.length - 1,
  );

  return (
    <article className="border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-[2rem] font-bold uppercase tracking-tight text-white">
            Revenue Over Time
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Quarterly Kinetic Performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {periods.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onPeriodChange(period)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] transition-all duration-300 ease-in-out ${
                activePeriod === period
                  ? 'bg-black text-[#7DFF63]'
                  : 'bg-[#121212] text-zinc-500 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[640px]"
          role="img"
          aria-label="Revenue chart"
        >
          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7DFF63" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7DFF63" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.2, 0.4, 0.6, 0.8].map((offset) => (
            <line
              key={offset}
              x1={padding}
              x2={width - padding}
              y1={padding + (height - padding * 2) * offset}
              y2={padding + (height - padding * 2) * offset}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {chart.areaPath ? <path d={chart.areaPath} fill="url(#chartFill)" /> : null}
          {chart.linePath ? (
            <path
              d={chart.linePath}
              fill="none"
              stroke="#7DFF63"
              strokeWidth="7"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {chart.points?.map((point) => (
            <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3" fill="#7DFF63" />
          ))}
        </svg>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[640px] items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
          {visibleLabels.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
};

export default RevenueChartPanel;
