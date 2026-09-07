import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CheckoutView } from './components/CheckoutView';
import { AdminPortal } from './components/AdminPortal';
import { AppSimulator } from './components/AppSimulator';
import { IntegrationGuide } from './components/IntegrationGuide';
import { TelegramSetupModal } from './components/TelegramSetupModal';
import { DepositOrder } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'checkout' | 'simulator' | 'admin' | 'integration'>('checkout');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [isTelegramConfigured, setIsTelegramConfigured] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  
  // URL Query Parameters
  const [queryParams, setQueryParams] = useState<{
    amount: number;
    userId: string;
    orderId?: string;
    callback?: string;
  }>({
    amount: 100,
    userId: 'user_' + Math.floor(1000 + Math.random() * 9000),
  });

  const [lastApprovedOrder, setLastApprovedOrder] = useState<DepositOrder | null>(null);

  // Parse URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const amt = Number(search.get('amount'));
      const uId = search.get('userId');
      const oId = search.get('orderId');
      const cb = search.get('callback');
      const tab = search.get('tab');

      setQueryParams({
        amount: amt && amt > 0 ? amt : 100,
        userId: uId || 'user_' + Math.floor(1000 + Math.random() * 9000),
        orderId: oId || undefined,
        callback: cb || undefined,
      });

      if (tab === 'admin') setCurrentTab('admin');
      if (tab === 'simulator') setCurrentTab('simulator');
      if (tab === 'integration') setCurrentTab('integration');
    }
  }, []);

  // Fetch settings & telegram status
  const checkSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setIsTelegramConfigured(Boolean(data.isTelegramConfigured));
      })
      .catch((err) => console.error('Settings error:', err));
  };

  // Poll pending count for badge
  const updatePendingCount = () => {
    fetch('/api/admin/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          const count = data.orders.filter((o: DepositOrder) => o.status === 'pending_verification').length;
          setPendingCount(count);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    checkSettings();
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 4000);
    return () => clearInterval(interval);
  }, []);

  // When launched from App Simulator
  const handleLaunchFromSimulator = (amount: number, userId: string, orderId: string) => {
    setQueryParams((prev) => ({
      ...prev,
      amount,
      userId,
      orderId,
    }));
    setCurrentTab('checkout');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingCount={pendingCount}
        isTelegramActive={isTelegramConfigured}
        onOpenTelegramSetup={() => setIsTelegramModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'checkout' && (
          <CheckoutView
            key={`${queryParams.amount}-${queryParams.orderId}`}
            initialAmount={queryParams.amount}
            initialOrderId={queryParams.orderId}
            initialUserId={queryParams.userId}
            initialCallback={queryParams.callback}
            onPaymentSuccess={(order) => {
              setLastApprovedOrder(order);
              updatePendingCount();
            }}
            onSwitchToAdmin={() => setCurrentTab('admin')}
          />
        )}

        {currentTab === 'simulator' && (
          <AppSimulator
            onLaunchGateway={handleLaunchFromSimulator}
            lastApprovedOrder={lastApprovedOrder}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPortal
            onOpenTelegramSetup={() => setIsTelegramModalOpen(true)}
            isTelegramConfigured={isTelegramConfigured}
            onRefreshOrdersCount={(count) => setPendingCount(count)}
          />
        )}

        {currentTab === 'integration' && (
          <IntegrationGuide />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} UPI PayGate • Real-time Deposit Gateway with Telegram & UTR Verification</p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <button onClick={() => setCurrentTab('checkout')} className="hover:text-indigo-600 transition-colors">Pay Screen</button>
            <button onClick={() => setCurrentTab('simulator')} className="hover:text-indigo-600 transition-colors">App Demo</button>
            <button onClick={() => setCurrentTab('admin')} className="hover:text-indigo-600 transition-colors">Admin Portal</button>
            <button onClick={() => setIsTelegramModalOpen(true)} className="hover:text-indigo-600 transition-colors">Telegram Bot</button>
          </div>
        </div>
      </footer>

      {/* Telegram Setup & Test Modal */}
      <TelegramSetupModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSettingsUpdated={() => {
          checkSettings();
          setIsTelegramModalOpen(false);
        }}
      />
    </div>
  );
}
