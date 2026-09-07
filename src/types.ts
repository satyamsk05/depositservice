export type OrderStatus = 'created' | 'pending_verification' | 'approved' | 'rejected' | 'expired';

export interface DepositOrder {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
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

export interface OrderResponse {
  success: boolean;
  order: DepositOrder;
  upiString?: string;
  qrDataUrl?: string;
  serverTime?: number;
  error?: string;
}

export interface MerchantSettings {
  upiId: string;
  merchantName: string;
  isTelegramConfigured: boolean;
  telegramChatIdMasked?: string;
}
