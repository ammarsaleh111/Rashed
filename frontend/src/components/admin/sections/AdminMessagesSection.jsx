import React, { useEffect, useState } from 'react';

import {
  deleteAdminMessage,
  getAdminMessages,
  updateAdminMessage,
} from '../../../services/api/admin.js';

const STATUS_OPTIONS = ['new', 'read', 'resolved'];

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

const AdminMessagesSection = ({ onMessagesMutated }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalPages: 1, totalCount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchMessages = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await getAdminMessages({
        page,
        limit: meta.limit,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      setMessages(Array.isArray(response?.data) ? response.data : []);
      setMeta({
        page: Number(response?.meta?.page || page),
        limit: Number(response?.meta?.limit || meta.limit),
        totalPages: Math.max(1, Number(response?.meta?.totalPages || 1)),
        totalCount: Number(response?.meta?.totalCount || 0),
      });
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to load messages.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page, statusFilter]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchMessages();
  };

  const handleStatusChange = async (messageId, status) => {
    setStatusMessage('');
    setErrorMessage('');

    try {
      await updateAdminMessage(messageId, { status });
      setStatusMessage(`Message ${messageId} marked as ${status}.`);
      await fetchMessages();

      if (typeof onMessagesMutated === 'function') {
        await onMessagesMutated();
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to update message status.');
    }
  };

  const handleDelete = async (messageId) => {
    setStatusMessage('');
    setErrorMessage('');

    try {
      await deleteAdminMessage(messageId);
      setStatusMessage(`Message ${messageId} deleted.`);
      await fetchMessages();

      if (typeof onMessagesMutated === 'function') {
        await onMessagesMutated();
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to delete message.');
    }
  };

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">Customer Messages</h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">
            Manage Contact Us submissions from customers
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            type="text"
            placeholder="Search name/email/subject"
            className="w-72 max-w-full bg-[#1a1a1a] border border-white/15 px-4 py-3 text-[10px] uppercase tracking-widest text-white outline-none focus:border-neon"
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

      <div className="bg-[#111] border border-white/5 overflow-x-auto">
        <table className="min-w-[760px] text-sm text-white/85">
          <thead className="bg-black/35 text-[10px] uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-4 py-4 text-left">Sender</th>
              <th className="px-4 py-4 text-left">Subject</th>
              <th className="px-4 py-4 text-left">Date</th>
              <th className="px-4 py-4 text-left">Status</th>
              <th className="px-4 py-4 text-left">Message</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/60">Loading messages...</td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/60">No messages found.</td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr key={message.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{message.fullName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/45">{message.email}</p>
                  </td>
                  <td className="px-4 py-4">{message.subject}</td>
                  <td className="px-4 py-4 text-white/65">{formatDate(message.createdAt)}</td>
                  <td className="px-4 py-4">
                    <select
                      value={message.status}
                      onChange={(event) => handleStatusChange(message.id, event.target.value)}
                      className="bg-[#1a1a1a] border border-white/20 px-2 py-2 text-[10px] uppercase tracking-[0.14em] text-white outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-white/75 max-w-[360px]">
                    <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-5">{message.message}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(message.id)}
                      className="bg-[#2a1313] border border-red-500/40 px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 hover:border-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/55">
        <p>Showing {messages.length} of {meta.totalCount} messages</p>
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
    </div>
  );
};

export default AdminMessagesSection;
