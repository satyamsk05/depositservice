import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { DepositOrder, OrderResponse } from '../types';
import { formatCurrencyINR, formatDateTimeIST, formatTimeRemaining } from '../utils/formatters';

interface CheckoutViewProps {
  initialOrderId?: string;
  initialAmount?: number;
  initialUserId?: string;
  initialCallback?: string;
  onPaymentSuccess?: (order: DepositOrder) => void;
  onSwitchToAdmin?: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  initialOrderId,
  initialAmount = 100,
  initialUserId,
  initialCallback,
  onPaymentSuccess,
  onSwitchToAdmin,
}) => {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [customAmountInput, setCustomAmountInput] = useState<string>(initialAmount.toString());
  const [userId, setUserId] = useState<string>(initialUserId || 'user_' + Math.floor(1000 + Math.random() * 9000));
  const [order, setOrder] = useState<DepositOrder | null>(null);
  const [upiString, setUpiString] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes
  
  // UTR submission state
  const [utrInput, setUtrInput] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [utrError, setUtrError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showUtrHelp, setShowUtrHelp] = useState<boolean>(false);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);

  // Polling interval ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Quick preset amounts
  const presetAmounts = [100, 200, 500, 1000, 2000];

  // Initialize or fetch order
  const createOrFetchOrder = async (targetAmount: number, targetOrderId?: string) => {
    setLoadingOrder(true);
    setUtrError('');
    try {
      if (targetOrderId) {
        // Fetch existing
        const res = await fetch(`/api/order/${targetOrderId}`);
        if (res.ok) {
          const data: OrderResponse = await res.json();
          setOrder(data.order);
          setUpiString(data.upiString || '');
          setQrDataUrl(data.qrDataUrl || '');
          if (data.order.expiresAt) {
            const rem = Math.max(0, Math.floor((data.order.expiresAt - Date.now()) / 1000));
            setTimeLeft(rem);
          }
          setLoadingOrder(false);
          return;
        }
      }

      // Create new order
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: targetAmount,
          userId: userId,
          orderId: targetOrderId,
          callbackUrl: initialCallback,
        }),
      });

      const data: OrderResponse = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setUpiString(data.upiString || '');
        setQrDataUrl(data.qrDataUrl || '');
        setTimeLeft(900);
      }
    } catch (err) {
      console.error('Failed to initialize order:', err);
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    createOrFetchOrder(amount, initialOrderId);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || order?.status === 'approved' || order?.status === 'expired') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (order && order.status === 'created') {
            setOrder({ ...order, status: 'expired' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, order?.status]);

  // Real-time polling for status update when waiting for admin confirmation
  useEffect(() => {
    if (!order?.orderId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/order/${order.orderId}`);
        if (res.ok) {
          const data: OrderResponse = await res.json();
          if (data.order) {
            setOrder((prev) => {
              if (prev && prev.status !== data.order.status) {
                if (data.order.status === 'approved' && onPaymentSuccess) {
                  onPaymentSuccess(data.order);
                }
              }
              return data.order;
            });
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    // Poll every 2 seconds if pending_verification, or 5s if created
    const pollIntervalMs = order.status === 'pending_verification' ? 2000 : 5000;
    pollingRef.current = setInterval(pollStatus, pollIntervalMs);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [order?.orderId, order?.status, onPaymentSuccess]);

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (!order?.merchantUpiId) return;
    navigator.clipboard.writeText(order.merchantUpiId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Submit UTR
  const handleSubmitUtr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUtrError('');

    const cleanUtr = utrInput.trim();
    if (!cleanUtr) {
      setUtrError('Please enter the 12-digit UTR number from your payment app.');
      return;
    }

    if (cleanUtr.length < 8) {
      setUtrError('UTR / Reference number must be at least 8 to 12 digits.');
      return;
    }

    if (!order) return;

    setIsSubmittingUtr(true);
    try {
      const res = await fetch(`/api/order/${order.orderId}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: cleanUtr }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setUtrError(data.error || 'Failed to submit UTR. Please retry.');
      } else {
        setOrder(data.order);
      }
    } catch (err: any) {
      setUtrError(err.message || 'Network error submitting UTR');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Quick simulated approval for quick testing if user wants to see instant credit
  const handleSimulatedAdminApprove = async () => {
    if (!order) return;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          action: 'approve',
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (onPaymentSuccess) onPaymentSuccess(data.order);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Outer Geometric Balance Split Card */}
      <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-slate-200">
        
        {/* ================= LEFT SIDE: DEEP SLATE 900 ================= */}
        <div className="w-full lg:w-1/2 bg-slate-900 p-8 sm:p-12 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            {/* Gateway Brand Header */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-md shadow-indigo-500/30">
                S
              </div>
              <div>
                <span className="text-xl font-semibold tracking-tight block">
                  {order?.merchantName || 'SecurePay'} Gateway
                </span>
                <span className="text-[11px] font-mono text-indigo-300">
                  Direct Bank UPI Verification
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl font-light mb-4 leading-tight">
              Complete your{' '}
              <span className="font-semibold text-indigo-400">recharge</span>{' '}
              instantly.
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
              Scan the dynamic QR code or use the receiver UPI ID to transfer funds. Enter your 12-digit UTR/Reference number for instant automated verification.
            </p>

            {/* 3-Step Geometric Micro-Guide */}
            <div className="space-y-3.5 mb-8 rounded-2xl bg-slate-800/60 p-5 border border-slate-800 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-xs">
                  1
                </div>
                <div>
                  <span className="font-semibold text-white">Scan & Transfer</span>
                  <p className="text-slate-400 text-xs mt-0.5">Pay exactly {formatCurrencyINR(order?.amount || amount)} via any UPI mobile app.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-xs">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white">Copy 12-Digit UTR</span>
                  <p className="text-slate-400 text-xs mt-0.5">Get the UPI Reference/UTR number from the successful payment screen.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-xs">
                  3
                </div>
                <div>
                  <span className="font-semibold text-white">Instant Balance Credit</span>
                  <p className="text-slate-400 text-xs mt-0.5">Admin verifies via Telegram and your balance credits automatically.</p>
                </div>
              </div>
            </div>

            {/* Accepted UPI Apps Pill Bar */}
            <div className="border-t border-slate-800/80 pt-5">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Supported Apps
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                <div className="rounded-lg bg-slate-800/80 p-2 border border-slate-700/60 text-indigo-200">
                  GPay
                </div>
                <div className="rounded-lg bg-slate-800/80 p-2 border border-slate-700/60 text-indigo-200">
                  PhonePe
                </div>
                <div className="rounded-lg bg-slate-800/80 p-2 border border-slate-700/60 text-indigo-200">
                  Paytm
                </div>
                <div className="rounded-lg bg-slate-800/80 p-2 border border-slate-700/60 text-indigo-200">
                  BHIM
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer Details */}
          <div className="space-y-3.5 border-t border-slate-800 pt-6 mt-8 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Order ID</span>
              <span className="font-mono text-indigo-300">
                #{order?.orderId || 'PENDING'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-slate-300">
                {userId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Session Timer</span>
              <span className="font-mono text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                {formatTimeRemaining(timeLeft)} left
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE: CRISP WHITE CANVAS ================= */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col items-center justify-center relative bg-white">
          
          {/* ================= STATE 1: APPROVED ================= */}
          {order?.status === 'approved' ? (
            <div className="w-full text-center flex flex-col items-center justify-center py-6">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 border border-emerald-200">
                <CheckCircle2 className="h-14 w-14" />
              </div>

              <span className="bg-emerald-100 text-emerald-700 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
                Deposit Confirmed
              </span>

              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Payment Credited!
              </h2>

              <p className="text-slate-500 text-sm mt-1.5 max-w-xs">
                Your transaction has been verified. The funds are now available in your wallet.
              </p>

              {/* Receipt info card */}
              <div className="w-full my-6 rounded-2xl bg-slate-50 p-5 text-left border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Amount Credited</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrencyINR(order.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-medium text-slate-900">{order.orderId}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Verified UTR:</span>
                  <span className="font-mono font-bold text-indigo-600">{order.utr}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-700">{formatDateTimeIST(order.verifiedAt)}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <button
                  id="btn-return-to-app"
                  onClick={() => {
                    if (order.callbackUrl) {
                      window.location.href = order.callbackUrl;
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <span>RETURN TO APP / WALLET</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  id="btn-new-deposit"
                  onClick={() => {
                    setOrder(null);
                    setUtrInput('');
                    createOrFetchOrder(100);
                  }}
                  className="w-full py-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors text-xs uppercase tracking-wider"
                >
                  New Deposit
                </button>
              </div>
            </div>
          ) : order?.status === 'pending_verification' ? (
            /* ================= STATE 2: PENDING VERIFICATION ================= */
            <div className="w-full flex flex-col items-center justify-center py-4">
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                  Verification Pending
                </span>
              </div>

              <div className="mb-4 mt-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="h-10 w-10 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div className="text-center mb-5">
                <span className="text-slate-500 text-xs uppercase tracking-widest font-bold">Deposit Amount</span>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 mt-1">
                  {formatCurrencyINR(order.amount)}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 text-center">
                Verifying UTR with Administrator
              </h3>
              <p className="text-slate-500 text-xs text-center max-w-xs mt-1 mb-6">
                Telegram alert sent. Once confirmed, this screen will update automatically.
              </p>

              {/* Submitted Info Block */}
              <div className="w-full rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5 text-xs sm:text-sm mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Submitted UTR:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {order.utr}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono text-slate-700">{order.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Submitted At:</span>
                  <span className="text-slate-700">{formatDateTimeIST(order.submittedAt)}</span>
                </div>
              </div>

              {/* Live auto-sync indicator */}
              <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-50/80 p-3 border border-indigo-100 text-xs text-indigo-800 font-medium mb-6">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Live polling active (every 2s). No refresh needed.</span>
              </div>

              {/* Dev quick approve helper */}
              <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
                {onSwitchToAdmin && (
                  <button
                    id="btn-switch-admin"
                    onClick={onSwitchToAdmin}
                    className="text-slate-600 hover:text-slate-900 font-semibold underline"
                  >
                    Open Admin
                  </button>
                )}
                <button
                  id="btn-simulated-approve"
                  onClick={handleSimulatedAdminApprove}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow hover:bg-indigo-700 transition text-xs"
                >
                  ⚡ Test Confirm Now
                </button>
              </div>
            </div>
          ) : (
            /* ================= STATE 3: PAYMENT & QR CODE ================= */
            <div className="w-full flex flex-col items-center justify-center">
              
              {/* Active Session Status Badge */}
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {presetAmounts.map((amt) => (
                    <button
                      key={amt}
                      id={`btn-preset-${amt}`}
                      onClick={() => {
                        setAmount(amt);
                        setCustomAmountInput(amt.toString());
                        createOrFetchOrder(amt);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        amount === amt
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shrink-0 ml-2">
                  Active Session
                </span>
              </div>

              {/* Deposit Amount Display */}
              <div className="text-center mb-5">
                <span className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                  Deposit Amount
                </span>
                <div className="text-5xl sm:text-6xl font-black text-slate-900 mt-1 tracking-tight">
                  {formatCurrencyINR(order?.amount || amount)}
                </div>
              </div>

              {/* QR Code Container with Geometric Border Accent */}
              <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 mb-5 flex items-center justify-center relative shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI Dynamic Payment QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-[11px] text-slate-400 font-mono">Generating QR...</span>
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-2xl pointer-events-none"></div>
              </div>

              {/* Receiver UPI ID with Copy Button */}
              <div className="w-full mb-6">
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between mb-4">
                  <span className="text-xs sm:text-sm font-mono text-slate-600 uppercase font-semibold truncate mr-2">
                    {order?.merchantUpiId || 'paytmqr2810050501011@paytm'}
                  </span>
                  <button
                    id="btn-copy-upi"
                    onClick={handleCopyUpi}
                    className="text-indigo-600 text-xs font-bold hover:underline shrink-0 uppercase tracking-wider"
                  >
                    {copySuccess ? 'COPIED!' : 'COPY ID'}
                  </button>
                </div>

                {/* Mobile Direct UPI Intent */}
                {upiString && (
                  <div className="mb-4 block sm:hidden">
                    <a
                      id="btn-pay-mobile-intent"
                      href={upiString}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-4 font-bold text-white shadow hover:bg-slate-800 transition text-xs uppercase tracking-wider"
                    >
                      <Smartphone className="h-4 w-4 text-indigo-400" />
                      <span>Open in UPI App (GPay/PhonePe)</span>
                    </a>
                  </div>
                )}

                {/* UTR Input Form */}
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label htmlFor="input-utr" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Transaction UTR / Ref Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUtrHelp(!showUtrHelp)}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Where is UTR?</span>
                    {showUtrHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {showUtrHelp && (
                  <div className="mb-3 rounded-xl bg-indigo-50/70 p-3 text-xs text-slate-700 border border-indigo-100 space-y-1">
                    <p className="font-bold text-indigo-950">12-digit UTR location:</p>
                    <p>• <strong>PhonePe:</strong> In payment details, see <strong>UTR: 12-digits</strong></p>
                    <p>• <strong>Google Pay:</strong> Check <strong>UPI transaction ID</strong></p>
                    <p>• <strong>Paytm:</strong> Check <strong>UPI Ref No.</strong></p>
                  </div>
                )}

                <form onSubmit={handleSubmitUtr} className="space-y-3">
                  <div className="relative">
                    <input
                      id="input-utr"
                      type="text"
                      maxLength={16}
                      value={utrInput}
                      onChange={(e) => {
                        setUtrInput(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase());
                        if (utrError) setUtrError('');
                      }}
                      placeholder="Enter 12-digit UTR Number"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-colors font-mono text-base sm:text-lg tracking-wider placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal shadow-sm uppercase"
                    />
                    <div className="absolute right-4 top-4 text-xs font-mono text-slate-400">
                      {utrInput.length}/12
                    </div>
                  </div>

                  {utrError && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{utrError}</span>
                    </p>
                  )}

                  <button
                    id="btn-submit-utr"
                    type="submit"
                    disabled={isSubmittingUtr || utrInput.trim().length < 8}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 sm:py-5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 text-sm uppercase tracking-wider"
                  >
                    {isSubmittingUtr ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Sending to Telegram...</span>
                      </>
                    ) : (
                      <>
                        <span>CONFIRM DEPOSIT</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Subtext */}
              <p className="text-slate-400 text-xs text-center leading-relaxed">
                Once you submit, our admins will verify the UTR via Telegram. <br />
                Your balance will reflect automatically after confirmation.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
