import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  Sliders, 
  ArrowUpRight, 
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { DepositOrder, MerchantSettings } from '../types';
import { formatCurrencyINR, formatDateTimeIST } from '../utils/formatters';

interface AdminPortalProps {
  onOpenTelegramSetup: () => void;
  isTelegramConfigured: boolean;
  onRefreshOrdersCount?: (count: number) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onOpenTelegramSetup,
  isTelegramConfigured,
  onRefreshOrdersCount,
}) => {
  const [orders, setOrders] = useState<DepositOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        const pending = (data.orders || []).filter((o: DepositOrder) => o.status === 'pending_verification').length;
        if (onRefreshOrdersCount) onRefreshOrdersCount(pending);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3500);
    return () => clearInterval(interval);
  }, []);

  // Handle Verify / Action
  const handleVerify = async (orderId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Order ${orderId} ${action === 'approve' ? 'Confirmed & Money Added! ✅' : 'Rejected ❌'}`);
        setTimeout(() => setActionMessage(null), 3000);
        await fetchOrders();
      }
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending' && order.status !== 'pending_verification') return false;
    if (filter === 'approved' && order.status !== 'approved') return false;
    if (filter === 'rejected' && order.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchUtr = order.utr?.toLowerCase().includes(q);
      const matchOrder = order.orderId.toLowerCase().includes(q);
      const matchUser = order.userId.toLowerCase().includes(q);
      const matchAmount = order.amount.toString().includes(q);
      return matchUtr || matchOrder || matchUser || matchAmount;
    }
    return true;
  });

  // Calculate totals
  const totalVolume = orders
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingCount = orders.filter((o) => o.status === 'pending_verification').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Banner with Telegram Notice */}
      {!isTelegramConfigured && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Telegram Bot not yet connected
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your Telegram Bot to get immediate ping notifications on your phone whenever a customer enters UTR!
              </p>
            </div>
          </div>
          <button
            id="btn-admin-setup-telegram"
            onClick={onOpenTelegramSetup}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition whitespace-nowrap uppercase tracking-wider"
          >
            Connect Telegram Bot
          </button>
        </div>
      )}

      {/* Action Toast Alert */}
      {actionMessage && (
        <div className="mb-4 rounded-xl bg-slate-900 text-white p-3 text-center text-sm font-semibold shadow-lg animate-bounce">
          {actionMessage}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Approved</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {formatCurrencyINR(totalVolume)}
          </div>
          <p className="text-xs text-slate-500 mt-1">{approvedCount} successful transactions</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-900">
            {pendingCount}
          </div>
          <p className="text-xs text-amber-700 mt-1">Require UTR verification</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Telegram Bot</span>
            <div className={`rounded-lg p-2 ${isTelegramConfigured ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
              <Send className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-base font-bold text-slate-900">
            {isTelegramConfigured ? '🟢 Live & Connected' : '⚪ Not Configured'}
          </div>
          <button
            onClick={onOpenTelegramSetup}
            className="text-xs text-indigo-600 font-semibold hover:underline mt-1 block"
          >
            {isTelegramConfigured ? 'Test & Configure' : 'Setup Bot Now'} &rarr;
          </button>
        </div>
      </div>

      {/* Order List Header & Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Deposit Transactions & UTR Logs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify UTR against your bank statement and click "Confirm" to automatically credit user's balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UTR / Order / User..."
                className="rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-md px-2.5 py-1 ${filter === 'all' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`rounded-md px-2.5 py-1 flex items-center gap-1 ${filter === 'pending' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-600'}`}
              >
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`rounded-md px-2.5 py-1 ${filter === 'approved' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-slate-600'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`rounded-md px-2.5 py-1 ${filter === 'rejected' ? 'bg-white shadow text-red-700 font-bold' : 'text-slate-600'}`}
              >
                Rejected
              </button>
            </div>

            <button
              onClick={fetchOrders}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Refresh Orders"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Orders Table / Cards */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">No transactions found</p>
            <p className="text-xs mt-1">
              {filter === 'pending'
                ? 'No pending UTRs to verify at the moment.'
                : 'Create a deposit from the Pay Screen or Simulator to test.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <div 
                key={order.orderId}
                className={`p-4 sm:p-5 transition hover:bg-slate-50/80 ${
                  order.status === 'pending_verification' ? 'bg-amber-50/30' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-slate-900">
                        {formatCurrencyINR(order.amount)}
                      </span>
                      
                      {/* Status Tag */}
                      {order.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Approved & Credited</span>
                        </span>
                      ) : order.status === 'pending_verification' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 animate-pulse">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>Needs Verification</span>
                        </span>
                      ) : order.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span>Rejected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Created (Awaiting UTR)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Order: <strong className="font-mono text-slate-700">{order.orderId}</strong></span>
                      <span>User: <strong className="font-mono text-slate-700">{order.userId}</strong></span>
                      <span>Time: <strong className="text-slate-700">{formatDateTimeIST(order.submittedAt || order.createdAt)}</strong></span>
                    </div>

                    {/* UTR Pill */}
                    {order.utr ? (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">UTR Number:</span>
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-mono font-bold text-emerald-900">
                          <span>{order.utr}</span>
                          <button
                            id={`btn-copy-utr-${order.orderId}`}
                            onClick={() => handleCopy(order.utr!, order.orderId)}
                            className="text-emerald-700 hover:text-emerald-900"
                            title="Copy UTR to verify in Bank App"
                          >
                            {copiedUtr === order.orderId ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No UTR submitted yet</span>
                    )}

                    {order.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">
                        Reason: {order.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {order.status === 'pending_verification' ? (
                      <>
                        <button
                          id={`btn-approve-${order.orderId}`}
                          disabled={processingId === order.orderId}
                          onClick={() => handleVerify(order.orderId, 'approve')}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 uppercase tracking-wider"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Confirm & Add ₹{order.amount}</span>
                        </button>

                        <button
                          id={`btn-reject-${order.orderId}`}
                          disabled={processingId === order.orderId}
                          onClick={() => handleVerify(order.orderId, 'reject', 'UTR not matched in statement')}
                          className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : order.status === 'approved' ? (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-700">Balance Credited</span>
                        <p className="text-[11px] text-slate-400">At {formatDateTimeIST(order.verifiedAt)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
