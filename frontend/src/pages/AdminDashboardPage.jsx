import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import AdminStatCard from '../components/admin/AdminStatCard.jsx';
import AdminTopbar from '../components/admin/AdminTopbar.jsx';
import OrdersTable from '../components/admin/OrdersTable.jsx';
import RevenueChartPanel from '../components/admin/RevenueChartPanel.jsx';
import TopSellingPanel from '../components/admin/TopSellingPanel.jsx';

// Sections
import AdminInventorySection from '../components/admin/sections/AdminInventorySection.jsx';
import AdminOrdersSection from '../components/admin/sections/AdminOrdersSection.jsx';
import AdminCustomersSection from '../components/admin/sections/AdminCustomersSection.jsx';
import AdminAnalyticsSection from '../components/admin/sections/AdminAnalyticsSection.jsx';
import AdminSettingsSection from '../components/admin/sections/AdminSettingsSection.jsx';
import AdminMessagesSection from '../components/admin/sections/AdminMessagesSection.jsx';

import { useAppContext } from '../context/AppContext.jsx';
import { getAdminDashboard } from '../services/api/admin.js';

const AUTO_REFRESH_MS = 20000;

const periods = ['7D', '30D', '1Y'];

const periodKeyMap = {
  '7D': '7d',
  '30D': '30d',
  '1Y': '1y',
};

const EMPTY_DASHBOARD_DATA = {
  summaryCards: [],
  revenueSeries: {
    '7d': [],
    '30d': [],
    '1y': [],
  },
  topSelling: [],
  recentOrders: [],
  orderStatusCounts: {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
  analytics: {
    averageOrderValue: 0,
    cartAbandonmentRate: 0,
    returnCustomerRate: 0,
  },
  inventory: {
    totalProducts: 0,
    totalVariants: 0,
    lowStockVariants: 0,
    featuredProducts: 0,
  },
  customers: {
    totalCustomers: 0,
    newCustomers30d: 0,
    activeCustomers30d: 0,
    topCustomers: [],
  },
  overview: {
    generatedAt: '',
    allTimeRevenue: 0,
    allTimeOrders: 0,
    pendingOrders: 0,
    newMessages: 0,
    unresolvedMessages: 0,
    totalMessages: 0,
  },
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { authToken } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentOrdersPage, setCurrentOrdersPage] = useState(1);
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD_DATA);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const dashboardOrderPageSize = 4;

  const reloadDashboard = useCallback(async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setIsDashboardLoading(true);
      setDashboardError('');
    }

    try {
      const apiData = await getAdminDashboard();
      setDashboardData({
        ...EMPTY_DASHBOARD_DATA,
        ...apiData,
      });
      setLastSyncedAt(new Date());
      setDashboardError('');
    } catch (error) {
      const statusCode = Number(error?.response?.status || 0);

      if (statusCode === 401) {
        navigate('/auth', { replace: true });
        return;
      }

      if (statusCode === 403) {
        navigate('/dashboard', { replace: true });
        return;
      }

      if (!silent) {
        setDashboardError(
          error?.response?.data?.message || 'Failed to load admin dashboard data from the server.',
        );
        setDashboardData(EMPTY_DASHBOARD_DATA);
      }
    } finally {
      if (!silent) {
        setIsDashboardLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (!authToken) {
      navigate('/auth', { replace: true });
      return;
    }

    reloadDashboard();
  }, [authToken, navigate, reloadDashboard]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      reloadDashboard({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [authToken, reloadDashboard]);

  useEffect(() => {
    setCurrentOrdersPage(1);
  }, [searchTerm]);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const topSellingItems = (dashboardData.topSelling || []).filter((item) =>
    String(item.name || '').toLowerCase().includes(normalizedQuery),
  );
  const recentOrders = (dashboardData.recentOrders || []).filter(
    (item) =>
      String(item.orderNumber || '').toLowerCase().includes(normalizedQuery) ||
      String(item.customerName || '').toLowerCase().includes(normalizedQuery),
  );
  const dashboardOrderTotalPages = Math.max(1, Math.ceil(recentOrders.length / dashboardOrderPageSize));
  const dashboardOrderPage = Math.min(currentOrdersPage, dashboardOrderTotalPages);
  const dashboardPagedOrders = recentOrders.slice(
    (dashboardOrderPage - 1) * dashboardOrderPageSize,
    dashboardOrderPage * dashboardOrderPageSize,
  );
  const activeSeries = dashboardData.revenueSeries?.[periodKeyMap[selectedPeriod]] || [];
  const activeOrderCount =
    Number(dashboardData.orderStatusCounts?.pending || 0) +
    Number(dashboardData.orderStatusCounts?.processing || 0) +
    Number(dashboardData.orderStatusCounts?.shipped || 0) +
    Number(dashboardData.orderStatusCounts?.delivered || 0);
  const lastSyncLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Not synced yet';

  const renderSection = () => {
    switch (activeSection) {
      case 'Inventory':
        return (
          <AdminInventorySection
            inventory={dashboardData.inventory}
            onInventoryMutated={reloadDashboard}
          />
        );
      case 'Orders':
        return <AdminOrdersSection onOrdersMutated={() => reloadDashboard({ silent: true })} />;
      case 'Messages':
        return <AdminMessagesSection onMessagesMutated={() => reloadDashboard({ silent: true })} />;
      case 'Customers':
        return <AdminCustomersSection customers={dashboardData.customers} />;
      case 'Analytics':
        return (
          <AdminAnalyticsSection
            revenueSeries={dashboardData.revenueSeries}
            analytics={dashboardData.analytics}
          />
        );
      case 'Settings':
        return <AdminSettingsSection />;
      case 'Dashboard':
      default:
        if (isDashboardLoading) {
          return <p className="mt-8 text-sm text-white/60">Loading dashboard metrics...</p>;
        }

        return (
          <>
            <section className="mt-7 grid animate-in gap-4 fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardData.summaryCards.length > 0 ? (
                dashboardData.summaryCards.map((card) => (
                  <AdminStatCard key={card.id} card={card} />
                ))
              ) : (
                <p className="xl:col-span-4 text-[11px] uppercase tracking-widest text-white/45">
                  No summary metrics available yet.
                </p>
              )}
            </section>

            <section className="mt-6 grid animate-in gap-6 fade-in slide-in-from-bottom-4 duration-500 delay-100 xl:grid-cols-[minmax(0,1.75fr)_360px]">
              <RevenueChartPanel
                periods={periods}
                activePeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                series={activeSeries}
              />
              <TopSellingPanel items={topSellingItems} onViewAllProducts={() => setActiveSection('Inventory')} />
            </section>

            <section className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <OrdersTable
                items={dashboardPagedOrders}
                totalCount={dashboardData.overview?.allTimeOrders || recentOrders.length || activeOrderCount}
                currentPage={dashboardOrderPage}
                totalPages={dashboardOrderTotalPages}
                onPrevious={() => setCurrentOrdersPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentOrdersPage((page) => Math.min(dashboardOrderTotalPages, page + 1))}
              />
            </section>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen max-w-[1680px] md:grid-cols-[272px_minmax(0,1fr)]">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <AdminTopbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            dashboardSnapshot={dashboardData.overview}
            inventorySnapshot={dashboardData.inventory}
            isDashboardLoading={isDashboardLoading}
            onRefreshDashboard={() => reloadDashboard()}
            lastSyncedAt={lastSyncedAt}
          />

          <div className="mt-4 flex flex-col gap-3 border border-white/10 bg-zinc-900/60 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/60 md:flex-row md:items-center md:justify-between">
            <p>Live metrics refresh every {Math.round(AUTO_REFRESH_MS / 1000)}s</p>
            <div className="flex items-center gap-3">
              <span className="text-white/45">Last sync: {lastSyncLabel}</span>
              <button
                type="button"
                onClick={() => reloadDashboard()}
                disabled={isDashboardLoading}
                className="border border-white/20 px-3 py-1.5 text-white transition-all duration-300 ease-in-out hover:border-[#7DFF63] hover:text-[#7DFF63] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isDashboardLoading ? 'Syncing...' : 'Sync now'}
              </button>
            </div>
          </div>

          {dashboardError && <p className="mt-4 text-[11px] uppercase tracking-widest text-red-400">{dashboardError}</p>}

          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

