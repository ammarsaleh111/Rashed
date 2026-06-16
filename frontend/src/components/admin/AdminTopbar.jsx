import { Link } from 'react-router-dom';
import { useState } from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatLastSynced = (value) => {
  if (!(value instanceof Date)) {
    return 'Not synced';
  }

  return value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const MenuIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 20L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const BellIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M6.5 16.5h11l-1.4-1.7a3 3 0 01-.7-1.9V10a4.5 4.5 0 10-9 0v2.9a3 3 0 01-.7 1.9L4.5 16.5h2zM10 19a2 2 0 004 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const GridIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="6" cy="6" r="1.6" />
    <circle cx="12" cy="6" r="1.6" />
    <circle cx="18" cy="6" r="1.6" />
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
    <circle cx="6" cy="18" r="1.6" />
    <circle cx="12" cy="18" r="1.6" />
    <circle cx="18" cy="18" r="1.6" />
  </svg>
);

const AdminTopbar = ({
  searchTerm,
  onSearchChange,
  onOpenSidebar,
  dashboardSnapshot,
  inventorySnapshot,
  isDashboardLoading,
  onRefreshDashboard,
  lastSyncedAt,
}) => {
  const [activePanel, setActivePanel] = useState('');
  const pendingOrders = Number(dashboardSnapshot?.pendingOrders || 0);
  const newMessages = Number(dashboardSnapshot?.newMessages || 0);
  const unresolvedMessages = Number(dashboardSnapshot?.unresolvedMessages || 0);
  const lowStockVariants = Number(inventorySnapshot?.lowStockVariants || 0);
  const allTimeRevenue = Number(dashboardSnapshot?.allTimeRevenue || 0);
  const hasAlerts = pendingOrders + newMessages + lowStockVariants > 0;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-zinc-900 text-white/70 transition-all duration-300 ease-in-out hover:text-white md:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>
        <div>
          <p className="font-display text-[1.85rem] font-bold uppercase tracking-[-0.05em] text-[#7DFF63]">
            Rashed Admin
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
        <label className="flex h-12 w-full min-w-0 items-center gap-3 border border-white/10 bg-zinc-900 px-4 text-zinc-500 md:w-auto md:min-w-[260px]">
          <SearchIcon />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="SEARCH SYSTEM..."
            className="w-full bg-transparent text-[11px] font-medium uppercase tracking-[0.18em] text-white outline-none placeholder:text-zinc-600"
          />
        </label>

        <div className="relative flex flex-wrap items-center gap-3 text-white/65">
          <button
            type="button"
            onClick={() => setActivePanel((current) => (current === 'notifications' ? '' : 'notifications'))}
            className="relative inline-flex h-12 w-12 items-center justify-center border border-white/10 bg-zinc-900 transition-all duration-300 ease-in-out hover:text-white"
            aria-label="Notifications"
          >
            <BellIcon />
            <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${hasAlerts ? 'bg-[#7DFF63]' : 'bg-white/25'}`} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel((current) => (current === 'apps' ? '' : 'apps'))}
            className="inline-flex h-12 w-12 items-center justify-center border border-white/10 bg-zinc-900 transition-all duration-300 ease-in-out hover:text-white"
            aria-label="Apps"
          >
            <GridIcon />
          </button>
          <button
            type="button"
            onClick={onRefreshDashboard}
            disabled={isDashboardLoading}
            className="h-12 border border-white/10 bg-zinc-900 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 transition-all duration-300 ease-in-out hover:border-[#7DFF63] hover:text-[#7DFF63] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isDashboardLoading ? 'Syncing' : 'Sync'}
          </button>

          {activePanel === 'notifications' && (
            <div className="absolute right-0 top-full z-20 mt-3 w-[min(20rem,calc(100vw-2rem))] border border-white/10 bg-zinc-900/90 p-4 shadow-2xl shadow-black/35 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">Notifications</p>
              <div className="mt-4 space-y-3">
                <div className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/75">
                  {pendingOrders} pending orders need action.
                </div>
                <div className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/75">
                  {newMessages} new customer messages ({unresolvedMessages} unresolved).
                </div>
                <div className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/75">
                  {lowStockVariants} low-stock variants and {currencyFormatter.format(allTimeRevenue)} total revenue.
                </div>
                <button
                  type="button"
                  className="w-full border border-[#7DFF63] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7DFF63] transition-all duration-300 ease-in-out hover:bg-[#7DFF63] hover:text-[#101010]"
                  onClick={() => setActivePanel('')}
                >
                  Close Panel
                </button>
              </div>
            </div>
          )}

          {activePanel === 'apps' && (
            <div className="absolute right-0 top-full z-20 mt-3 w-[min(20rem,calc(100vw-2rem))] border border-white/10 bg-zinc-900/90 p-4 shadow-2xl shadow-black/35 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">Quick Actions</p>
              <div className="mt-4 grid gap-2">
                <Link to="/shop" className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 transition-all duration-300 ease-in-out hover:text-white">
                  Open Store
                </Link>
                <Link to="/dashboard" className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 transition-all duration-300 ease-in-out hover:text-white">
                  Open Dashboard
                </Link>
                <Link to="/help" className="border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 transition-all duration-300 ease-in-out hover:text-white">
                  Open Help
                </Link>
                <div className="border border-white/10 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                  Last Sync: {formatLastSynced(lastSyncedAt)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border border-white/10 bg-zinc-900 px-3 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white">
              RA
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                Rashed A.
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7DFF63]">
                Super Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTopbar;
