import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  HelpCircle,
  QrCode
} from 'lucide-react';
import { MerchantSettings } from '../types';

interface TelegramSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export const TelegramSetupModal: React.FC<TelegramSetupModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [botToken, setBotToken] = useState<string>('');
  const [chatId, setChatId] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load existing settings
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.upiId) setUpiId(data.upiId);
          if (data.merchantName) setMerchantName(data.merchantName);
          if (data.telegramChatIdMasked) setChatId(data.telegramChatIdMasked);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim() || undefined,
          chatId: chatId.trim() || undefined,
          upiId: upiId.trim() || undefined,
          merchantName: merchantName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        onSettingsUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Test Telegram Ping
  const handleTestTelegram = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          chatId: chatId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Test message received in your Telegram chat!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test message. Check Token & Chat ID.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing Telegram',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Telegram Bot & UPI Settings
              </h3>
              <p className="text-xs text-slate-500">
                Receive instant UTR alerts on Telegram with quick 1-click confirm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step-by-Step Hindi & English Guide */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs text-slate-800">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            <span>Telegram Bot Setup Guide (3 Simple Steps):</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>
              Telegram par <strong>@BotFather</strong> open karein, <code>/newbot</code> bhejein aur apna <strong>Bot Token</strong> copy karein.
            </li>
            <li>
              Apne banaye hue Bot ko search karke <strong>/start</strong> dabayein (so it can message you).
            </li>
            <li>
              Apna <strong>Chat ID</strong> nikalne ke liye Telegram par <strong>@userinfobot</strong> ya <strong>@RawDataBot</strong> ko message karein aur Chat ID yahan dalein.
            </li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* Telegram Credentials */}
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
              1. Telegram Bot Credentials
            </span>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="e.g. 7123456789:AAFxzW_KxY82b..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Admin Chat ID or Channel ID
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 987654321 or -100123456789"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTesting}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 uppercase tracking-wider text-[11px]"
              >
                {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Test Message to Telegram</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`rounded-lg p-2.5 flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Receiver UPI Configuration */}
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
              2. Receiver UPI Settings
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Receiver UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. merchant@paytm"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Business / Display Name
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. FastPay Wallet"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  <span>Settings saved successfully!</span>
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition uppercase tracking-wider text-xs shadow-md shadow-indigo-200"
              >
                {isSaving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
