import React, { useState } from 'react';
import RevenueChartPanel from '../RevenueChartPanel.jsx';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = (value) => `${Number(value || 0).toFixed(1)}%`;

const AdminAnalyticsSection = ({ revenueSeries, analytics }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');

  const periodKeyMap = {
    '7D': '7d',
    '30D': '30d',
    '1Y': '1y',
  };

  const activeSeries = revenueSeries?.[periodKeyMap[selectedPeriod]] || [];

  const stats = [
    {
      label: 'Avg Order Value',
      value: currencyFormatter.format(Number(analytics?.averageOrderValue || 0)),
    },
    {
      label: 'Cart Abandonment',
      value: percentFormatter(analytics?.cartAbandonmentRate || 0),
    },
    {
      label: 'Return Customer Rate',
      value: percentFormatter(analytics?.returnCustomerRate || 0),
    },
  ];

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">Insights & Analytics</h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">Conversion funnel and global sales trajectory</p>
        </div>
      </div>

      <div className="grid gap-6 mb-6">
        <RevenueChartPanel
          periods={['7D', '30D', '1Y']}
          activePeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          series={activeSeries}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center justify-center border border-white/5 bg-[#111] p-5 text-center sm:p-8">
            <span className="text-neon text-[10px] font-bold uppercase tracking-widest mb-3">{stat.label}</span>
            <span className="text-3xl font-display font-black text-white">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalyticsSection;
