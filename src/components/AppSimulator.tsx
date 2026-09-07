import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Smartphone, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react';
import { DepositOrder } from '../types';
import { formatCurrencyINR, formatDateTimeIST } from '../utils/formatters';

interface AppSimulatorProps {
  onLaunchGateway: (amount: number, userId: string, orderId: string) => void;
  lastApprovedOrder?: DepositOrder | null;
}

export const AppSimulator: React.FC<AppSimulatorProps> = ({
  onLaunchGateway,
  lastApprovedOrder,
}) => {
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('sim_wallet_balance');
    return saved ? Number(saved) : 0;
  });

  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [customInput, setCustomInput] = useState<string>('100');
  const [userId] = useState<string>('player_7781');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('idle');
  const [transactions, setTransactions] = useState<Array<{ id: string; amount: number; time: number; utr: string }>>(() => {
    const saved = localStorage.getItem('sim_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentCreditedAlert, setRecentCreditedAlert] = useState<number | null>(null);

  // When an order is approved in the system
  useEffect(() => {
    if (lastApprovedOrder && lastApprovedOrder.status === 'approved') {
      if (!transactions.some((t) => t.id === lastApprovedOrder.orderId)) {
        const newBalance = walletBalance + lastApprovedOrder.amount;
        setWalletBalance(newBalance);
        localStorage.setItem('sim_wallet_balance', newBalance.toString());

        const newTx = [
          {
            id: lastApprovedOrder.orderId,
            amount: lastApprovedOrder.amount,
            time: lastApprovedOrder.verifiedAt || Date.now(),
            utr: lastApprovedOrder.utr || 'N/A',
          },
          ...transactions,
        ];
        setTransactions(newTx);
        localStorage.setItem('sim_transactions', JSON.stringify(newTx));

        setRecentCreditedAlert(lastApprovedOrder.amount);
        setOrderStatus('credited');
        setTimeout(() => setRecentCreditedAlert(null), 6000);
      }
    }
  }, [lastApprovedOrder]);

  // Poll current order if active
  useEffect(() => {
    if (!activeOrderId || orderStatus === 'credited') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/order/${activeOrderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order && data.order.status === 'approved') {
            const added = data.order.amount;
            setWalletBalance((prev) => {
              const next = prev + added;
              localStorage.setItem('sim_wallet_balance', next.toString());
              return next;
            });
            setOrderStatus('credited');
            setRecentCreditedAlert(added);
            setTransactions((prev) => [
              {
                id: data.order.orderId,
                amount: added,
                time: data.order.verifiedAt || Date.now(),
                utr: data.order.utr || 'VERIFIED',
              },
              ...prev,
            ]);
            setActiveOrderId(null);
          } else if (data.order && data.order.status === 'pending_verification') {
            setOrderStatus('pending_verification');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const timer = setInterval(checkStatus, 2000);
    return () => clearInterval(timer);
  }, [activeOrderId, orderStatus]);

  // Launch Payment Gateway
  const handleInitiateDeposit = () => {
    const amt = Number(customInput) || depositAmount || 100;
    const generatedOrderId = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
    setActiveOrderId(generatedOrderId);
    setOrderStatus('launched');
    onLaunchGateway(amt, userId, generatedOrderId);
  };

  const handleResetWallet = () => {
    setWalletBalance(0);
    setTransactions([]);
    localStorage.removeItem('sim_wallet_balance');
    localStorage.removeItem('sim_transactions');
    setOrderStatus('idle');
    setActiveOrderId(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <span>Customer Mobile App Simulator</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Test the full user journey: Write ₹100 &gt; Click Deposit &gt; Gateway Opens &gt; Enter UTR &gt; Confirm on Telegram &gt; Balance auto-adds here!
          </p>
        </div>

        <button
          onClick={handleResetWallet}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Wallet Balance</span>
        </button>
      </div>

      {/* Grid: Phone Simulation on Left, Explanation on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left: Mobile App Container */}
        <div className="md:col-span-6 flex justify-center">
          <div className="w-full max-w-[360px] rounded-[36px] bg-slate-950 p-4 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
            
            {/* Phone Notch */}
            <div className="mx-auto mb-3 h-4 w-32 rounded-full bg-slate-900 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-slate-800 mr-2" />
              <div className="h-1.5 w-10 rounded-full bg-slate-800" />
            </div>

            {/* Inner Phone Screen */}
            <div className="min-h-[540px] rounded-[24px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white p-5 flex flex-col justify-between overflow-hidden">
              
              {/* Phone Header */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
                      GP
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">My Game / Shop</p>
                      <p className="text-[10px] text-slate-400 font-mono">User: {userId}</p>
                    </div>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Credit alert animation banner */}
                {recentCreditedAlert && (
                  <div className="mt-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 p-3 text-center text-xs text-emerald-300 font-bold animate-bounce">
                    🎉 ₹{recentCreditedAlert} Added Automatically!
                  </div>
                )}

                {/* Wallet Balance Card inside Phone */}
                <div className="mt-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 p-4 shadow-lg border border-indigo-500/20">
                  <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                    Available Wallet Balance
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight">
                      {formatCurrencyINR(walletBalance)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-indigo-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Real-time instant deposit active</span>
                  </div>
                </div>

                {/* Deposit Input Form */}
                <div className="mt-5 rounded-xl bg-slate-800/60 p-4 border border-slate-800">
                  <label className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wider">
                    Select or Enter Deposit Amount
                  </label>

                  {/* Preset Pills */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setDepositAmount(amt);
                          setCustomInput(amt.toString());
                        }}
                        className={`rounded-lg py-1.5 text-xs font-bold transition ${
                          depositAmount === amt
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  {/* Custom Input */}
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      value={customInput}
                      onChange={(e) => {
                        setCustomInput(e.target.value);
                        setDepositAmount(Number(e.target.value) || 0);
                      }}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-8 pr-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Enter Amount"
                    />
                  </div>

                  <button
                    id="btn-sim-deposit"
                    onClick={handleInitiateDeposit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-3 text-xs font-bold text-white shadow-md transition active:scale-[0.98] uppercase tracking-wider"
                  >
                    <span>Deposit ₹{customInput || depositAmount} via UPI</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Active Deposit Status Tracker */}
                {activeOrderId && (
                  <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      <span>{orderStatus === 'pending_verification' ? 'UTR under review' : 'Waiting for UTR...'}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{activeOrderId}</span>
                  </div>
                )}
              </div>

              {/* Transactions History inside Phone */}
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recent Wallet Deposits
                  </span>
                  <History className="h-3 w-3 text-slate-500" />
                </div>

                {transactions.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-2">
                    No deposits yet. Click Deposit ₹100 above!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {transactions.slice(0, 3).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-800/40 p-1.5 text-[11px]">
                        <div>
                          <p className="font-semibold text-emerald-400">+{formatCurrencyINR(tx.amount)}</p>
                          <p className="text-[9px] text-slate-400 font-mono">UTR: {tx.utr}</p>
                        </div>
                        <span className="text-[9px] text-slate-500">
                          {new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Right: How It Connects to Your App */}
        <div className="md:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              How the Flow Works in Real Life
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Here is how your own mobile application connects with this website:
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900">Step 1: In your App</span>
                <p className="text-slate-600 mt-1">
                  User enters <code className="bg-white px-1 py-0.5 rounded font-mono font-bold text-emerald-700">100</code> in your app. Your app opens this website with the link:
                </p>
                <div className="mt-2 rounded bg-slate-900 p-2 font-mono text-[11px] text-emerald-400 break-all">
                  https://your-domain.com/?amount=100&userId=USER_123
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900">Step 2: On this Website</span>
                <p className="text-slate-600 mt-1">
                  The page automatically generates a UPI QR code with <strong>₹100</strong> and receiver UPI ID. The user pays and enters the 12-digit UTR.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-900">Step 3: Instant Telegram Notification</span>
                <p className="text-slate-600 mt-1">
                  You receive an instant alert on your Telegram bot with:
                  <strong> Amount (₹100), Time, User ID, and UTR</strong>, plus quick <strong>[Confirm]</strong> buttons.
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-emerald-900">
                <span className="font-bold">Step 4: Auto Money Add</span>
                <p className="mt-1">
                  As soon as you click Confirm, the customer's page transitions to Approved and the money is added to their account!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Button to Test */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900">Try it right now:</h4>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Click the button below to generate an order for ₹{depositAmount} and open the payment screen!
            </p>
            <button
              onClick={handleInitiateDeposit}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700 transition uppercase tracking-wider"
            >
              <span>Test Deposit ₹{depositAmount} Now</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
