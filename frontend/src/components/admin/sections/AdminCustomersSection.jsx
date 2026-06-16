import React from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const AdminCustomersSection = ({ customers }) => {
  const topCustomers = customers?.topCustomers || [];
  const cards = [
    { label: 'Total Customers', value: Number(customers?.totalCustomers || 0) },
    { label: 'New (30 Days)', value: Number(customers?.newCustomers30d || 0) },
    { label: 'Active (30 Days)', value: Number(customers?.activeCustomers30d || 0) },
  ];

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">Customer Protocol</h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">{cards[1].value} accounts activated in last 30d</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#111] border border-white/5 p-6">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-bold">{card.label}</p>
            <p className="text-4xl font-display font-black tracking-tighter text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-[#111] border border-white/5 p-6">
        <h3 className="text-neon font-display text-[10px] uppercase tracking-[0.2em] font-bold mb-6">Top Customers</h3>

        {topCustomers.length > 0 ? (
          <div className="space-y-3">
            {topCustomers.map((customer) => (
              <div key={customer.id} className="flex flex-col gap-3 border border-white/5 bg-black/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">{customer.name}</p>
                  <p className="text-[10px] tracking-[0.16em] text-white/45">{customer.email}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">{customer.totalOrders} Orders</p>
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-neon">
                    {currencyFormatter.format(customer.lifetimeValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">No customer orders yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersSection;
