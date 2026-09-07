import React from 'react';
import { ShieldCheck, Smartphone, Sliders, Code2, Send, CreditCard } from 'lucide-react';

interface NavbarProps {
  currentTab: 'checkout' | 'simulator' | 'admin' | 'integration';
  setCurrentTab: (tab: 'checkout' | 'simulator' | 'admin' | 'integration') => void;
  pendingCount: number;
  isTelegramActive: boolean;
  onOpenTelegramSetup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  pendingCount,
  isTelegramActive,
  onOpenTelegramSetup,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 font-bold text-xl text-white shadow-md shadow-indigo-500/20">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-lg sm:text-xl">SecurePay Gateway</span>
              <span className="inline-flex items-center rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-700/50">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Instant UPI Deposit & UTR Verification</p>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-800/90 border border-slate-700/70 p-1 text-sm font-medium">
          <button
            id="nav-tab-checkout"
            onClick={() => setCurrentTab('checkout')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-xs sm:text-sm ${
              currentTab === 'checkout'
                ? 'bg-indigo-600 text-white shadow font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Pay Screen</span>
          </button>

          <button
            id="nav-tab-simulator"
            onClick={() => setCurrentTab('simulator')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-xs sm:text-sm ${
              currentTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">User App</span>
            <span className="sm:hidden">App</span>
          </button>

          <button
            id="nav-tab-admin"
            onClick={() => setCurrentTab('admin')}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-xs sm:text-sm ${
              currentTab === 'admin'
                ? 'bg-indigo-600 text-white shadow font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Merchant Admin</span>
            {pendingCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-integration"
            onClick={() => setCurrentTab('integration')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-xs sm:text-sm ${
              currentTab === 'integration'
                ? 'bg-indigo-600 text-white shadow font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span className="hidden md:inline">Integration</span>
            <span className="md:hidden">Docs</span>
          </button>
        </nav>

        {/* Right Telegram status pill */}
        <div className="flex items-center gap-2">
          <button
            id="btn-telegram-status"
            onClick={onOpenTelegramSetup}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              isTelegramActive
                ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700/70'
            }`}
            title="Configure Telegram Bot for instant UTR notifications"
          >
            <Send className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {isTelegramActive ? 'Bot Live' : 'Connect Bot'}
            </span>
            <span className={`h-2 w-2 rounded-full ${isTelegramActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
