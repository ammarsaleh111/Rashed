const amountFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const statusClasses = {
  paid: 'bg-[#233d1f] text-[#7DFF63]',
  pending: 'bg-[#2b2b1f] text-[#e8d97d]',
  processing: 'bg-[#123742] text-[#74def3]',
  shipped: 'bg-[#343434] text-white/65',
  delivered: 'bg-[#1f2f3a] text-[#9fe0ff]',
  cancelled: 'bg-[#3f1e1e] text-[#ff9f9f]',
};

const downloadCsv = (items, filename = 'rashed-orders-report.csv') => {
  const headers = ['Order ID', 'Customer', 'Date', 'Amount', 'Status'];
  const rows = items.map((item) => [
    item.orderNumber,
    item.customerName,
    item.date,
    Number(item.amount || 0).toFixed(2),
    item.status,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

const OrdersTable = ({
  items,
  totalCount,
  currentPage = 1,
  totalPages = 1,
  onPrevious,
  onNext,
  onDownloadReport,
}) => {
  const resolvedTotalCount = Number(totalCount || items.length || 0);
  const canGoPrevious = typeof onPrevious === 'function' && currentPage > 1;
  const canGoNext = typeof onNext === 'function' && currentPage < totalPages;

  const handleDownload = () => {
    if (typeof onDownloadReport === 'function') {
      onDownloadReport(items);
      return;
    }

    downloadCsv(items);
  };

  return (
    <article className="border border-white/10 bg-zinc-900">
      <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-[2rem] font-bold uppercase tracking-tight text-white">
            Recent Orders
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="self-start text-[10px] font-bold uppercase tracking-[0.24em] text-[#7DFF63] transition-all duration-300 ease-in-out hover:text-white"
        >
          Download Report
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px]">
          <thead className="bg-black">
            <tr className="text-left text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              <th className="px-6 py-4">Order ID</th>
              <th className="px-4 py-4">Customer</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Amount</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-white/10 text-[12px] font-semibold text-white/82"
                >
                  <td className="px-6 py-5 text-white/92">{item.orderNumber}</td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[9px] font-bold text-white/75">
                        {item.customerInitials}
                      </span>
                      <span className="text-zinc-300">{item.customerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-zinc-500">{item.date}</td>
                  <td className="px-4 py-5 text-white">{amountFormatter.format(item.amount)}</td>
                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                        statusClasses[item.status] || 'bg-[#2a2a2a] text-white/70'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right text-white/38">...</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="px-6 py-10 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:tracking-[0.24em]">
        <p>
          Showing {items.length} of {resolvedTotalCount} Orders
        </p>
        <div className="flex items-center gap-5">
          <button type="button" onClick={onPrevious} disabled={!canGoPrevious} className="transition-all duration-300 ease-in-out hover:text-white disabled:cursor-not-allowed disabled:text-white/15">
            Previous
          </button>
          <span className="text-zinc-400">{currentPage} / {Math.max(1, totalPages)}</span>
          <button type="button" onClick={onNext} disabled={!canGoNext} className="text-white transition-all duration-300 ease-in-out hover:text-[#7DFF63] disabled:cursor-not-allowed disabled:text-white/15">
            Next
          </button>
        </div>
      </div>
    </article>
  );
};

export default OrdersTable;
