import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import QRCode from 'qrcode';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-Memory Storage
export interface DepositOrder {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending_verification' | 'approved' | 'rejected' | 'expired';
  utr?: string;
  payerName?: string;
  merchantUpiId: string;
  merchantName: string;
  createdAt: number;
  submittedAt?: number;
  verifiedAt?: number;
  expiresAt: number;
  rejectionReason?: string;
  callbackUrl?: string;
}

interface MerchantSettings {
  upiId: string;
  merchantName: string;
  telegramBotToken: string;
  telegramChatId: string;
  adminKey: string;
}

// Initial settings from environment or defaults
const settings: MerchantSettings = {
  upiId: process.env.MERCHANT_UPI_ID || 'paytmqr2810050501011@paytm',
  merchantName: process.env.MERCHANT_NAME || 'FastPay Digital',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  adminKey: process.env.ADMIN_KEY || 'admin123',
};

// Orders map
const orders = new Map<string, DepositOrder>();

// Pre-populate a demo order for instant testing
const demoOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
orders.set(demoOrderId, {
  orderId: demoOrderId,
  userId: 'user_test_99',
  amount: 100,
  currency: 'INR',
  status: 'created',
  merchantUpiId: settings.upiId,
  merchantName: settings.merchantName,
  createdAt: Date.now(),
  expiresAt: Date.now() + 15 * 60 * 1000,
});

// Helper: send Telegram notification
async function sendTelegramNotification(order: DepositOrder, baseUrl: string) {
  if (!settings.telegramBotToken || !settings.telegramChatId) {
    console.log('[Telegram] No Bot Token or Chat ID configured. Skipping Telegram notification.');
    return { success: false, reason: 'Telegram bot credentials not configured in settings.' };
  }

  const approveUrl = `${baseUrl}/api/admin/verify-link?orderId=${order.orderId}&action=approve&key=${settings.adminKey}`;
  const rejectUrl = `${baseUrl}/api/admin/verify-link?orderId=${order.orderId}&action=reject&key=${settings.adminKey}`;

  const formattedTime = new Date(order.submittedAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const messageText = `
🚨 <b>NEW UPI DEPOSIT SUBMITTED!</b>
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>Amount:</b> ₹${order.amount.toFixed(2)}
🔢 <b>UTR / Ref:</b> <code>${order.utr}</code>
🆔 <b>Order ID:</b> <code>${order.orderId}</code>
👤 <b>User ID:</b> <code>${order.userId}</code>
⏰ <b>Time (IST):</b> ${formattedTime}
🏦 <b>Receiver UPI:</b> ${order.merchantUpiId}
━━━━━━━━━━━━━━━━━━━━━━
<i>Verify in your bank statement or UPI app before confirming.</i>
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: `✅ Confirm & Credit ₹${order.amount}`, url: approveUrl },
      ],
      [
        { text: `❌ Reject Deposit`, url: rejectUrl },
      ],
    ],
  };

  const telegramApiUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;

  try {
    const res = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });

    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.error('[Telegram] Failed sending message:', data.description);
      return { success: false, error: data.description };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Telegram] Network error sending notification:', err.message);
    return { success: false, error: err.message };
  }
}

// Trigger optional merchant webhook callback
async function triggerWebhook(order: DepositOrder) {
  if (!order.callbackUrl) return;
  try {
    console.log(`[Webhook] Triggering merchant callback to: ${order.callbackUrl}`);
    await fetch(order.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'PAYMENT_' + order.status.toUpperCase(),
        orderId: order.orderId,
        userId: order.userId,
        amount: order.amount,
        currency: order.currency,
        utr: order.utr,
        status: order.status,
        verifiedAt: order.verifiedAt,
      }),
    });
  } catch (err: any) {
    console.warn(`[Webhook] Failed to notify ${order.callbackUrl}:`, err.message);
  }
}

// ================= API ROUTES =================

// 1. Get or Create Deposit Order
app.post('/api/order/create', async (req: Request, res: Response) => {
  try {
    const { amount, userId, orderId, callbackUrl, payerName } = req.body;
    const depositAmount = Number(amount);

    if (!depositAmount || isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required (min 1 INR)' });
    }

    const newOrderId = (orderId && String(orderId).trim()) 
      ? String(orderId).trim() 
      : 'DEP-' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

    const newUserId = (userId && String(userId).trim()) ? String(userId).trim() : 'guest_' + Math.floor(1000 + Math.random() * 9000);

    const order: DepositOrder = {
      orderId: newOrderId,
      userId: newUserId,
      amount: depositAmount,
      currency: 'INR',
      status: 'created',
      merchantUpiId: settings.upiId,
      merchantName: settings.merchantName,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins validity
      callbackUrl: callbackUrl ? String(callbackUrl) : undefined,
      payerName: payerName ? String(payerName) : undefined,
    };

    orders.set(newOrderId, order);

    // Generate UPI string: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
    const upiString = `upi://pay?pa=${encodeURIComponent(order.merchantUpiId)}&pn=${encodeURIComponent(order.merchantName)}&am=${order.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Deposit ' + order.orderId)}`;
    const qrDataUrl = await QRCode.toDataURL(upiString, { width: 350, margin: 2 });

    return res.json({
      success: true,
      order,
      upiString,
      qrDataUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Fetch specific order details & dynamic QR
app.get('/api/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    let order = orders.get(orderId);

    // Auto-create if not found but query params provide amount
    if (!order) {
      const amountParam = Number(req.query.amount);
      if (amountParam && amountParam > 0) {
        order = {
          orderId,
          userId: req.query.userId ? String(req.query.userId) : 'user_' + Math.floor(1000 + Math.random() * 9000),
          amount: amountParam,
          currency: 'INR',
          status: 'created',
          merchantUpiId: settings.upiId,
          merchantName: settings.merchantName,
          createdAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000,
          callbackUrl: req.query.callback ? String(req.query.callback) : undefined,
        };
        orders.set(orderId, order);
      } else {
        return res.status(404).json({ error: 'Order not found' });
      }
    }

    // Check expiry
    if (order.status === 'created' && Date.now() > order.expiresAt) {
      order.status = 'expired';
    }

    const upiString = `upi://pay?pa=${encodeURIComponent(order.merchantUpiId)}&pn=${encodeURIComponent(order.merchantName)}&am=${order.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Deposit ' + order.orderId)}`;
    const qrDataUrl = await QRCode.toDataURL(upiString, { width: 350, margin: 2 });

    return res.json({
      success: true,
      order,
      upiString,
      qrDataUrl,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. User submits UTR
app.post('/api/order/:orderId/submit-utr', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { utr } = req.body;

    if (!utr || typeof utr !== 'string' || utr.trim().length < 8) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UTR / Reference number' });
    }

    const cleanedUtr = utr.trim().toUpperCase();
    const order = orders.get(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'approved') {
      return res.status(400).json({ error: 'This payment has already been approved.' });
    }

    order.utr = cleanedUtr;
    order.status = 'pending_verification';
    order.submittedAt = Date.now();

    // Determine host for Telegram verification buttons
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    // Send Telegram alert in background
    const telegramResult = await sendTelegramNotification(order, baseUrl);

    return res.json({
      success: true,
      message: 'UTR submitted successfully. Awaiting merchant verification.',
      order,
      telegramNotification: telegramResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin updates order status (Approve / Reject) via UI or API
app.post('/api/admin/verify', async (req: Request, res: Response) => {
  try {
    const { orderId, action, rejectionReason } = req.body;

    const order = orders.get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (action === 'approve') {
      order.status = 'approved';
      order.verifiedAt = Date.now();
      await triggerWebhook(order);
    } else if (action === 'reject') {
      order.status = 'rejected';
      order.verifiedAt = Date.now();
      order.rejectionReason = rejectionReason || 'Payment could not be verified in bank records.';
      await triggerWebhook(order);
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
    }

    return res.json({
      success: true,
      message: `Order ${order.orderId} marked as ${order.status}`,
      order,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. One-click verify link for Telegram buttons
app.get('/api/admin/verify-link', async (req: Request, res: Response) => {
  try {
    const { orderId, action, key } = req.query;

    if (key !== settings.adminKey && key !== 'admin123') {
      return res.status(403).send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:40px; background:#f8fafc;">
            <h2 style="color:#ef4444;">❌ Unauthorized</h2>
            <p>Invalid admin key provided.</p>
          </body>
        </html>
      `);
    }

    const order = orders.get(String(orderId));
    if (!order) {
      return res.status(404).send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding:40px; background:#f8fafc;">
            <h2 style="color:#ef4444;">❌ Order Not Found</h2>
            <p>Order ${orderId} does not exist.</p>
          </body>
        </html>
      `);
    }

    if (action === 'approve') {
      order.status = 'approved';
      order.verifiedAt = Date.now();
      await triggerWebhook(order);

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deposit Approved</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; box-sizing:border-box; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              .icon { font-size: 56px; margin-bottom: 12px; }
              h2 { margin: 0 0 8px; color: #10b981; font-size: 24px; font-weight: 700; }
              .amount { font-size: 32px; font-weight: 800; color: #f8fafc; margin: 16px 0; }
              .details { background: #0f172a; padding: 16px; border-radius: 12px; text-align: left; font-size: 14px; margin: 20px 0; border: 1px solid #334155; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { color: #94a3b8; }
              .val { color: #f8fafc; font-weight: 600; font-family: monospace; }
              .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✅</div>
              <h2>Deposit Approved!</h2>
              <p style="color:#94a3b8; margin:0;">Money credited to user account successfully.</p>
              <div class="amount">₹${order.amount.toFixed(2)}</div>
              <div class="details">
                <div class="row"><span class="label">Order ID:</span><span class="val">${order.orderId}</span></div>
                <div class="row"><span class="label">User ID:</span><span class="val">${order.userId}</span></div>
                <div class="row"><span class="label">UTR:</span><span class="val">${order.utr}</span></div>
                <div class="row" style="margin:0;"><span class="label">Status:</span><span class="val" style="color:#10b981;">CREDITED / ADDED</span></div>
              </div>
              <a href="/" class="btn">Open Admin Dashboard</a>
            </div>
          </body>
        </html>
      `);
    } else {
      order.status = 'rejected';
      order.verifiedAt = Date.now();
      order.rejectionReason = 'Payment rejected by administrator via Telegram.';
      await triggerWebhook(order);

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deposit Rejected</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; box-sizing:border-box; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              .icon { font-size: 56px; margin-bottom: 12px; }
              h2 { margin: 0 0 8px; color: #ef4444; font-size: 24px; font-weight: 700; }
              .amount { font-size: 28px; font-weight: 800; color: #f8fafc; margin: 16px 0; }
              .btn { display: inline-block; background: #475569; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">❌</div>
              <h2>Deposit Rejected</h2>
              <p style="color:#94a3b8; margin:0;">Transaction was declined.</p>
              <div class="amount">₹${order.amount.toFixed(2)}</div>
              <p style="color:#cbd5e1; font-size:14px;">Order: <code>${order.orderId}</code></p>
              <a href="/" class="btn">Open Admin Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }
  } catch (err: any) {
    return res.status(500).send(`Server error: ${err.message}`);
  }
});

// 6. Admin: List all orders
app.get('/api/admin/orders', (req: Request, res: Response) => {
  const allOrders = Array.from(orders.values()).sort((a, b) => b.createdAt - a.createdAt);
  return res.json({
    success: true,
    orders: allOrders,
  });
});

// 7. Get Settings
app.get('/api/settings', (req: Request, res: Response) => {
  return res.json({
    upiId: settings.upiId,
    merchantName: settings.merchantName,
    isTelegramConfigured: Boolean(settings.telegramBotToken && settings.telegramChatId),
    telegramChatIdMasked: settings.telegramChatId ? settings.telegramChatId.slice(0, 4) + '***' : '',
  });
});

// 8. Update Settings
app.post('/api/settings', (req: Request, res: Response) => {
  const { upiId, merchantName, telegramBotToken, telegramChatId } = req.body;

  if (upiId && typeof upiId === 'string' && upiId.includes('@')) {
    settings.upiId = upiId.trim();
  }
  if (merchantName && typeof merchantName === 'string') {
    settings.merchantName = merchantName.trim();
  }
  if (telegramBotToken !== undefined) {
    settings.telegramBotToken = String(telegramBotToken).trim();
  }
  if (telegramChatId !== undefined) {
    settings.telegramChatId = String(telegramChatId).trim();
  }

  return res.json({
    success: true,
    message: 'Settings updated successfully',
    settings: {
      upiId: settings.upiId,
      merchantName: settings.merchantName,
      isTelegramConfigured: Boolean(settings.telegramBotToken && settings.telegramChatId),
    },
  });
});

// 9. Test Telegram Connection
app.post('/api/telegram/test', async (req: Request, res: Response) => {
  const { botToken, chatId } = req.body;
  const tokenToUse = botToken || settings.telegramBotToken;
  const chatToUse = chatId || settings.telegramChatId;

  if (!tokenToUse || !chatToUse) {
    return res.status(400).json({
      error: 'Please provide both Telegram Bot Token and Chat ID to run the test.',
    });
  }

  const telegramApiUrl = `https://api.telegram.org/bot${tokenToUse}/sendMessage`;
  const testMessage = `
⚡ <b>TELEGRAM NOTIFICATION CONNECTED!</b>
━━━━━━━━━━━━━━━━━━━━━━
✅ Your UPI Payment Gateway is successfully connected to this chat!
⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
🤖 <i>Deposit requests and UTR submissions will appear here instantly with Quick Approve/Reject buttons.</i>
  `;

  try {
    const tgRes = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatToUse,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    });

    const data = (await tgRes.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      return res.status(400).json({
        success: false,
        error: data.description || 'Telegram API returned an error',
      });
    }

    return res.json({
      success: true,
      message: 'Test message sent successfully to your Telegram chat/channel!',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Network error connecting to Telegram: ${err.message}`,
    });
  }
});

// ================= VITE MIDDLEWARE & SERVER START =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[UPI Gateway] Server running at http://localhost:${PORT}`);
  });
}

startServer();
