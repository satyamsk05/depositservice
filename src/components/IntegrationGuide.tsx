import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Terminal, 
  Smartphone,
  Layers,
  Sparkles
} from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [testAmount, setTestAmount] = useState<number>(100);
  const [testUserId, setTestUserId] = useState<string>('user_9921');
  const [testCallback, setTestCallback] = useState<string>('https://yourapp.com/api/deposit-webhook');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'flutter' | 'android' | 'reactnative' | 'web'>('flutter');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  
  const generatedUrl = `${originUrl}/?amount=${testAmount}&userId=${encodeURIComponent(testUserId)}${
    testCallback ? `&callback=${encodeURIComponent(testCallback)}` : ''
  }`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const codeSnippets = {
    flutter: `// Flutter: Open UPI Payment Gateway
import 'package:url_launcher/url_launcher.dart';

void openDepositGateway({required double amount, required String userId}) async {
  final url = Uri.parse(
    '${originUrl}/?amount=\${amount.toInt()}&userId=\$userId'
  );
  
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  } else {
    throw 'Could not launch \$url';
  }
}`,
    android: `// Android (Kotlin): Open via Custom Tab or Browser Intent
val amount = ${testAmount}
val userId = "${testUserId}"
val url = "${originUrl}/?amount=$amount&userId=$userId"

val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
context.startActivity(intent)`,
    reactnative: `// React Native: Open URL in Browser or In-App Webview
import { Linking } from 'react-native';

const openPaymentGateway = async (amount = ${testAmount}, userId = "${testUserId}") => {
  const url = \`${originUrl}/?amount=\${amount}&userId=\${userId}\`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
};`,
    web: `// Web JavaScript / Next.js / React:
function redirectToDeposit(amount = ${testAmount}, userId = "${testUserId}") {
  const targetUrl = \`${originUrl}/?amount=\${amount}&userId=\${encodeURIComponent(userId)}\`;
  window.location.href = targetUrl;
}`
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            App Integration Link & URL Parameters
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          How to connect your Android, iOS, Flutter, or Web application to this deposit gateway.
        </p>
      </div>

      {/* URL Builder Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Live Link Generator
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Deposit Amount (₹)
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value) || 100)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              User ID
            </label>
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Callback URL (Optional)
            </label>
            <input
              type="text"
              value={testCallback}
              onChange={(e) => setTestCallback(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Generated URL Box */}
        <div className="rounded-2xl bg-slate-900 p-5 text-white border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
              Generated Gateway URL
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy URL'}</span>
              </button>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition uppercase tracking-wider"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Test in New Tab</span>
              </a>
            </div>
          </div>
          <p className="font-mono text-xs sm:text-sm text-indigo-200 break-all select-all">
            {generatedUrl}
          </p>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Client Code Examples
          </h3>

          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveCodeTab('flutter')}
              className={`rounded-md px-3 py-1 ${activeCodeTab === 'flutter' ? 'bg-white font-bold shadow text-indigo-600' : 'text-slate-600'}`}
            >
              Flutter
            </button>
            <button
              onClick={() => setActiveCodeTab('android')}
              className={`rounded-md px-3 py-1 ${activeCodeTab === 'android' ? 'bg-white font-bold shadow text-indigo-600' : 'text-slate-600'}`}
            >
              Android (Kotlin)
            </button>
            <button
              onClick={() => setActiveCodeTab('reactnative')}
              className={`rounded-md px-3 py-1 ${activeCodeTab === 'reactnative' ? 'bg-white font-bold shadow text-indigo-600' : 'text-slate-600'}`}
            >
              React Native
            </button>
            <button
              onClick={() => setActiveCodeTab('web')}
              className={`rounded-md px-3 py-1 ${activeCodeTab === 'web' ? 'bg-white font-bold shadow text-indigo-600' : 'text-slate-600'}`}
            >
              Web JS
            </button>
          </div>
        </div>

        <pre className="rounded-2xl bg-slate-950 p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
          {codeSnippets[activeCodeTab]}
        </pre>
      </div>

      {/* Webhook Specification */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900">
          Webhook Notification (When Admin Approves)
        </h3>
        <p className="text-xs text-slate-600">
          When the administrator clicks <strong>"Confirm"</strong> in Telegram or Merchant Admin, the server sends a POST request to your callback URL:
        </p>

        <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400">
{`POST /api/deposit-webhook
Content-Type: application/json

{
  "event": "PAYMENT_APPROVED",
  "orderId": "DEP-981245",
  "userId": "user_9921",
  "amount": 100,
  "currency": "INR",
  "utr": "428198765432",
  "status": "approved",
  "verifiedAt": 1725700000000
}`}
        </div>
      </div>
    </div>
  );
};
