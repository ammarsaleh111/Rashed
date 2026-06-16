import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatOrderDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const statusTheme = {
  pending: {
    label: 'Pending',
    text: 'text-[#f8d66d]',
    surface: 'border-[#f8d66d]/30 bg-[#f8d66d]/10',
  },
  processing: {
    label: 'Processing',
    text: 'text-[#74def3]',
    surface: 'border-[#74def3]/30 bg-[#74def3]/10',
  },
  shipped: {
    label: 'Shipped',
    text: 'text-white/80',
    surface: 'border-white/20 bg-white/5',
  },
  delivered: {
    label: 'Delivered',
    text: 'text-[#7DFF63]',
    surface: 'border-[#7DFF63]/30 bg-[#7DFF63]/10',
  },
  cancelled: {
    label: 'Cancelled',
    text: 'text-[#ff9f9f]',
    surface: 'border-[#ff9f9f]/30 bg-[#ff9f9f]/10',
  },
};

const statusKeys = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const getNormalizedStatus = (value) => String(value || '').trim().toLowerCase();

const UserDashboardPage = () => {
  const { authToken, authUser, orders, refreshMyOrders } = useAppContext();
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const role = String(authUser?.role || '').trim().toLowerCase();

  useEffect(() => {
    if (authToken && role === 'customer') {
      let isMounted = true;
      setOrdersRefreshing(true);

      Promise.resolve(refreshMyOrders()).finally(() => {
        if (isMounted) {
          setOrdersRefreshing(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    return undefined;
  }, [authToken, role]);

  if (!authToken) {
    return <Navigate to="/auth" replace />;
  }

  if (!authUser) {
    return (
      <section className="mx-auto flex min-h-[65vh] w-full max-w-5xl items-center justify-center px-6 py-20 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Restoring your dashboard...</p>
      </section>
    );
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const safeOrders = useMemo(() => {
    const value = Array.isArray(orders) ? [...orders] : [];
    value.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return value;
  }, [orders]);

  const dashboardStats = useMemo(() => {
    const totalOrders = safeOrders.length;
    const totalSpent = safeOrders.reduce(
      (accumulator, order) => accumulator + Number(order.total_amount || order.totalAmount || 0),
      0,
    );
    const averageOrderValue = totalOrders ? totalSpent / totalOrders : 0;

    const statusCounts = statusKeys.reduce(
      (accumulator, key) => ({ ...accumulator, [key]: 0 }),
      {},
    );

    safeOrders.forEach((order) => {
      const normalizedStatus = getNormalizedStatus(order.status);
      if (Object.prototype.hasOwnProperty.call(statusCounts, normalizedStatus)) {
        statusCounts[normalizedStatus] += 1;
      }
    });

    const activeOrders =
      statusCounts.pending + statusCounts.processing + statusCounts.shipped;
    const latestOrderDate = safeOrders[0]?.created_at
      ? formatOrderDate(safeOrders[0].created_at)
      : 'No orders yet';

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      activeOrders,
      statusCounts,
      latestOrderDate,
    };
  }, [safeOrders]);

  const recentOrders = safeOrders.slice(0, 6);

  const handleRefreshOrders = async () => {
    setOrdersRefreshing(true);
    try {
      await refreshMyOrders();
    } finally {
      setOrdersRefreshing(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1540px] px-2 py-3 text-white md:px-4">
      <div className="storefront-shell p-5 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="storefront-kicker">Customer Dashboard</p>
            <h1 className="storefront-title mt-4 text-[clamp(3rem,7vw,5.6rem)] text-white">
              Welcome, {authUser.firstName || 'Member'}
            </h1>
            <p className="storefront-subtitle mt-3 max-w-2xl">
              Manage your account, track your orders, and continue shopping from one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="storefront-chip">{authUser.tierStatus || 'Member'} Tier</span>
              <span className="storefront-chip">{Number(authUser.rewardPoints || 0)} Points</span>
              <span className="storefront-chip">Latest: {dashboardStats.latestOrderDate}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop" className="storefront-primary px-6">
                Continue Shopping
              </Link>
              <Link to="/cart" className="storefront-secondary px-6">
                Open Cart
              </Link>
              <Link to="/" className="storefront-secondary px-6">
                Home
              </Link>
            </div>
          </div>

          <aside className="storefront-surface p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Account Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/55">Member Since</span>
                <span className="font-semibold text-white">{authUser.createdAt ? formatOrderDate(authUser.createdAt) : 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/55">Active Orders</span>
                <span className="font-semibold text-neon">{dashboardStats.activeOrders}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/55">Average Order</span>
                <span className="font-semibold text-white">{currencyFormatter.format(dashboardStats.averageOrderValue)}</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Primary Email</p>
                <p className="mt-1 text-sm font-semibold text-white break-all">{authUser.email || 'Not set'}</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="storefront-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-white">{dashboardStats.totalOrders}</p>
          </article>
          <article className="storefront-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Total Spend</p>
            <p className="mt-2 text-3xl font-bold text-neon">{currencyFormatter.format(dashboardStats.totalSpent)}</p>
          </article>
          <article className="storefront-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Average Order</p>
            <p className="mt-2 text-3xl font-bold text-white">{currencyFormatter.format(dashboardStats.averageOrderValue)}</p>
          </article>
          <article className="storefront-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Reward Points</p>
            <p className="mt-2 text-3xl font-bold text-white">{Number(authUser.rewardPoints || 0)}</p>
          </article>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {statusKeys.map((key) => {
            const config = statusTheme[key];
            return (
              <article key={key} className={`storefront-surface p-3 ${config.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{config.label}</p>
                <p className={`mt-1 text-2xl font-bold ${config.text}`}>{dashboardStats.statusCounts[key]}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="storefront-surface p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neon">Profile</p>
              <h2 className="storefront-title mt-2 text-[clamp(2.2rem,6vw,3.6rem)] text-white">Saved Details</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Full Name</p>
              <p className="mt-1 text-sm font-semibold text-white">{authUser.firstName} {authUser.lastName}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Email</p>
              <p className="mt-1 text-sm font-semibold text-white break-all">{authUser.email || 'Not set'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Phone Number</p>
              <p className="mt-1 text-sm font-semibold text-white">{authUser.phoneNumber || 'Not set'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Member Since</p>
              <p className="mt-1 text-sm font-semibold text-white">{authUser.createdAt ? formatOrderDate(authUser.createdAt) : 'Unknown'}</p>
            </div>
          </div>
        </article>

        <article className="storefront-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neon">Recent Orders</p>
              <h2 className="storefront-title mt-2 text-[clamp(2.2rem,6vw,3.6rem)] text-white">Order Timeline</h2>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={ordersRefreshing}
              className="storefront-secondary min-h-0 px-4 py-2 text-[10px] disabled:opacity-50"
            >
              {ordersRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {recentOrders.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[680px]">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                    <th className="px-3 py-3">Order</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const normalizedStatus = getNormalizedStatus(order.status);
                    const currentStatus = statusTheme[normalizedStatus] || {
                      label: order.status || 'Unknown',
                      text: 'text-white/70',
                      surface: 'border-white/15 bg-white/5',
                    };

                    return (
                      <tr key={order.id} className="border-t border-white/10 text-sm text-white/80">
                        <td className="px-3 py-4 font-semibold text-white">{order.order_number}</td>
                        <td className="px-3 py-4 text-white/60">{formatOrderDate(order.created_at)}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${currentStatus.surface} ${currentStatus.text}`}>
                            {currentStatus.label}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold text-white">
                          {currencyFormatter.format(Number(order.total_amount || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/50">
              No orders yet. Start shopping to build your timeline.
            </p>
          )}
        </article>
      </div>
    </section>
  );
};

export default UserDashboardPage;
