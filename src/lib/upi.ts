/**
 * RAUSCH Hyderabad - Merchant UPI & Ticketing Engine
 * Merchant: Smm Moblie And Watches (7416265415@okbizaxis)
 * Supports dynamic NPCI upi://pay URI generation, 1-tap app launch intents, and 4-tier pricing.
 */

export interface UpiGeneratorParams {
  finalAmount: number | string;
  bookingId?: string;
  note?: string;
  upiId?: string;
  payeeName?: string;
}

export const PASS_PRICING: Record<string, { name: string; price: number; category: "single" | "couple" }> = {
  general: {
    name: "GENERAL (STANDARD)",
    price: 1199,
    category: "single",
  },
  vip: {
    name: "VIP ACCESS",
    price: 1699,
    category: "single",
  },
  couple_general: {
    name: "COUPLE GENERAL",
    price: 2299,
    category: "couple",
  },
  couple_vip: {
    name: "COUPLE VIP",
    price: 3299,
    category: "couple",
  },
};

/**
 * Validates a UPI ID and numeric amount before URI generation.
 */
export function validateUpiPayment({ upiId, amount }: { upiId: string; amount: number | string }): boolean {
  const upiIdPattern = /^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/;
  const numericAmount = Number(amount);

  return (
    upiIdPattern.test(upiId) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
  );
}

/**
 * Central reusable Merchant UPI Payment URI generator for RAUSCH.
 * Generates NPCI & Merchant compliant upi://pay URI strings with exact 2-decimal amounts,
 * merchant parameters, clean notes, and unique transaction references.
 */
export function generateUpiPaymentUri({
  finalAmount,
  bookingId,
  note = "RAUSCH Hyderabad Pass",
  upiId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_UPI_ID) ||
    (typeof process !== "undefined" && process.env?.VITE_UPI_ID) ||
    "7416265415@okbizaxis",
  payeeName = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MERCHANT_NAME) ||
    (typeof process !== "undefined" && process.env?.VITE_MERCHANT_NAME) ||
    "Smm Moblie And Watches",
}: UpiGeneratorParams): string {
  const numericAmount = Number(finalAmount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const formattedAmount = numericAmount.toFixed(2);

  const isValid = validateUpiPayment({ upiId, amount: numericAmount });
  if (!isValid) {
    throw new Error("UPI validation failed");
  }

  // Generate unique transaction reference (e.g. RAU-12345 or RAU-1785000000000)
  const cleanBookingId = bookingId ? bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) : "";
  const transactionReference = cleanBookingId ? `RAU-${cleanBookingId}` : `RAU-${Date.now()}`;

  // Clean note (strip unsafe characters, emojis, &, #, ?, and unencoded symbols)
  const cleanNote = note.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "RAUSCH Pass";

  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    mc: "5732",
    mode: "02",
    tr: transactionReference,
    tn: cleanNote,
    am: formattedAmount,
    cu: "INR",
  });

  const upiUri = `upi://pay?${params.toString()}`;

  return upiUri;
}

/**
 * Generates Android package intent URIs for direct 1-tap app payment launching (PhonePe, GPay, Paytm, CRED, FamPay).
 */
export function getAppSpecificUpiIntent(upiUri: string, packageName: string): string {
  const queryString = upiUri.replace(/^upi:\/\/pay\?/, "");
  return `intent://pay?${queryString}#Intent;scheme=upi;package=${packageName};end`;
}
