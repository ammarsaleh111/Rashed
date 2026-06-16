import React, { useEffect, useMemo, useState } from 'react';

import {
  getAdminOrderById,
  getAdminOrders,
  updateAdminOrderStatus,
} from '../../../services/api/admin.js';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const AdminOrdersSection = ({ onOrdersMutated }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalPages: 1, totalCount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await getAdminOrders({
        page,
        limit: meta.limit,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      setOrders(Array.isArray(response?.data) ? response.data : []);
      setMeta({
        page: Number(response?.meta?.page || page),
        limit: Number(response?.meta?.limit || meta.limit),
        totalPages: Math.max(1, Number(response?.meta?.totalPages || 1)),
        totalCount: Number(response?.meta?.totalCount || 0),
      });
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to load orders.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const statusCards = useMemo(() => {
    const counts = {
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };

    for (const order of orders) {
      const currentStatus = String(order.status || '');
      if (Object.prototype.hasOwnProperty.call(counts, currentStatus)) {
        counts[currentStatus] += 1;
      }
    }

    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [orders]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleStatusUpdate = async (orderId, nextStatus) => {
    setStatusMessage('');
    setErrorMessage('');

    try {
      await updateAdminOrderStatus(orderId, { status: nextStatus });
      setStatusMessage(`Order ${orderId} updated to ${nextStatus}.`);
      await fetchOrders();

      if (orderDetail?.id === orderId) {
        const detailResponse = await getAdminOrderById(orderId);
        setOrderDetail(detailResponse?.data || null);
      }

      if (typeof onOrdersMutated === 'function') {
        await onOrdersMutated();
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to update order status.');
    }
  };

  const openOrderDetail = async (orderId) => {
    setOrderDetail(null);
    setIsDetailLoading(true);
    setErrorMessage('');

    try {
      const response = await getAdminOrderById(orderId);
      setOrderDetail(response?.data || null);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to load order details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">Order Fulfillment</h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">
            Read order details and update statuses in real time
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            type="text"
            placeholder="Search order/customer"
            className="w-64 max-w-full bg-[#1a1a1a] border border-white/15 px-4 py-3 text-[10px] uppercase tracking-widest text-white outline-none focus:border-neon"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="bg-[#1a1a1a] border border-white/15 px-4 py-3 text-[10px] uppercase tracking-widest text-white outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-neon text-black text-[10px] font-bold px-6 py-3 uppercase tracking-widest hover:bg-[#4ade80] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {statusMessage && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-neon">{statusMessage}</p>}
      {errorMessage && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-red-400">{errorMessage}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {statusCards.map((status) => (
          <div key={status.label} className="bg-[#111] border border-white/5 p-4">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-bold">{status.label}</p>
            <p className="text-2xl font-display font-black tracking-tighter text-white">{status.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-white/5 overflow-x-auto">
        <table className="min-w-[760px] text-sm text-white/85">
          <thead className="bg-black/35 text-[10px] uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-4 py-4 text-left">Order</th>
              <th className="px-4 py-4 text-left">Customer</th>
              <th className="px-4 py-4 text-left">Date</th>
              <th className="px-4 py-4 text-left">Amount</th>
              <th className="px-4 py-4 text-left">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/60">Loading orders...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/60">No orders found.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-white/5">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{order.orderNumber}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/45">{order.totalUnits} units</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{order.customerName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/45">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-4">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4 font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-4">
                    <select
                      value={order.status}
                      onChange={(event) => handleStatusUpdate(order.id, event.target.value)}
                      className="bg-[#1a1a1a] border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.14em] text-white outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openOrderDetail(order.id)}
                      className="bg-[#1f1f1f] border border-white/20 px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-neon"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/55">
        <p>Showing {orders.length} of {meta.totalCount} orders</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="border border-white/15 bg-[#1a1a1a] px-3 py-2 text-white disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span>{page} / {Math.max(1, meta.totalPages)}</span>
          <button
            type="button"
            disabled={page >= meta.totalPages || isLoading}
            onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            className="border border-white/15 bg-[#1a1a1a] px-3 py-2 text-white disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {(isDetailLoading || orderDetail) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 px-4 py-8">
          <div className="w-full max-w-4xl border border-white/15 bg-[#111] p-6">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-neon font-bold">Order Detail</p>
                <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white">
                  {orderDetail?.orderNumber || 'Loading...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderDetail(null)}
                className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>

            {isDetailLoading ? (
              <p className="py-10 text-center text-white/60">Loading order detail...</p>
            ) : (
              orderDetail && (
                <div className="mt-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px] uppercase tracking-[0.14em] text-white/65 mb-5">
                    <p>Customer: <span className="text-white">{orderDetail.customerName}</span></p>
                    <p>Status: <span className="text-white">{orderDetail.status}</span></p>
                    <p>Date: <span className="text-white">{formatDate(orderDetail.createdAt)}</span></p>
                    <p>Total: <span className="text-neon">{formatCurrency(orderDetail.totalAmount)}</span></p>
                  </div>

                  <div className="overflow-x-auto border border-white/10">
                    <table className="min-w-[760px] text-sm text-white/85">
                      <thead className="bg-black/35 text-[10px] uppercase tracking-[0.16em] text-white/45">
                        <tr>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">SKU</th>
                          <th className="px-4 py-3 text-left">Qty</th>
                          <th className="px-4 py-3 text-left">Unit</th>
                          <th className="px-4 py-3 text-left">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetail.items.map((item) => (
                          <tr key={item.id} className="border-t border-white/5">
                            <td className="px-4 py-3">{item.productName}</td>
                            <td className="px-4 py-3 text-white/65">{item.sku}</td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersSection;
