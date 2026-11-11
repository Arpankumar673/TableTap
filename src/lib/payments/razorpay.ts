import crypto from "crypto";
import { timingSafeEqualHex } from "@/lib/security/tokens";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isConfigured: boolean;
}

export function getRazorpayServerConfig(): RazorpayConfig {
  if (typeof window !== "undefined") {
    throw new Error("[Security Violation] Razorpay secret configuration cannot run in browser.");
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
  };
}

/**
 * Verifies Razorpay checkout signature: HMAC-SHA256(orderId + "|" + paymentId, keySecret).
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret } = params;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !keySecret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return timingSafeEqualHex(expected, razorpaySignature);
}

/**
 * Verifies Razorpay webhook X-Razorpay-Signature header against raw request body.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signatureHeader, webhookSecret } = params;
  if (!rawBody || !signatureHeader || !webhookSecret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqualHex(expected, signatureHeader);
}

/**
 * Creates a Razorpay Order using the official REST API (works seamlessly in Test & Live mode).
 */
export async function createRazorpayOrder(params: {
  amountInMinorUnits: number; // paise for INR (amount * 100)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; status: string }> {
  const cfg = getRazorpayServerConfig();
  if (!cfg.isConfigured) {
    throw new Error(
      "Razorpay test/live keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local."
    );
  }

  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInMinorUnits),
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${errText}`);
  }

  return response.json();
}
