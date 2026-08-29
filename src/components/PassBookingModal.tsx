import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PASS_PRICING, generateUpiPaymentUri, getAppSpecificUpiIntent } from "@/lib/upi";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  QrCode,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

export type PassTier = "general" | "vip" | "couple_general" | "couple_vip";

interface PassBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTier?: PassTier;
}

export function PassBookingModal({ isOpen, onClose, initialTier = "general" }: PassBookingModalProps) {
  const [tier, setTier] = useState<PassTier>(initialTier);
  const [step, setStep] = useState<"details" | "payment" | "utr" | "success">("details");
  const [user, setUser] = useState<any>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");

  // Payment State
  const [booking, setBooking] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [upiUri, setUpiUri] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utr, setUtr] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check Supabase Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        if (data.user.email) setEmail(data.user.email);
        if (data.user.user_metadata?.full_name) setFullName(data.user.user_metadata.full_name);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user?.email && !email) setEmail(session.user.email);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialTier) setTier(initialTier);
  }, [initialTier]);

  const basePrice = PASS_PRICING[tier]?.price || 1199;
  const finalPrice = discountPercent > 0 ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;

  // Handle Google Auth
  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Google Sign-In");
    }
  };

  // Validate Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("active", true)
        .single();

      if (error || !coupon) {
        throw new Error("Invalid or expired promo code");
      }

      if (coupon.pass_type !== "all" && coupon.pass_type !== tier) {
        throw new Error(`Only valid for ${coupon.pass_type.toUpperCase()} passes`);
      }

      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        throw new Error("Coupon usage limit reached");
      }

      setDiscountPercent(coupon.percent_off);
      setAppliedCoupon(coupon.code);
      setCouponError("");
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code");
      setDiscountPercent(0);
      setAppliedCoupon("");
    } finally {
      setCouponLoading(false);
    }
  };

  // Proceed to Payment Step
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg("Please provide your Full Name and Contact Phone Number.");
      return;
    }

    try {
      let userId = user?.id;
      if (!userId) {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        userId = anonData?.user?.id;
      }

      if (!userId) {
        setErrorMsg("Please sign in or provide contact details to reserve your pass.");
        return;
      }

      const purchaseId = `RAU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { data: createdBooking, error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          user_id: userId,
          pass_type: tier,
          category: PASS_PRICING[tier]?.category || "single",
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          purchase_id: purchaseId,
          status: "pending",
          coupon_code: appliedCoupon || null,
          discount_percent: discountPercent,
          final_amount: finalPrice,
        })
        .select()
        .single();

      if (bookingErr || !createdBooking) {
        throw new Error(bookingErr?.message || "Could not create booking record");
      }

      setBooking(createdBooking);

      // Generate Dynamic Merchant UPI URI
      const uri = generateUpiPaymentUri({
        finalAmount: createdBooking.final_amount,
        bookingId: createdBooking.purchase_id,
        note: `RAUSCH ${PASS_PRICING[tier]?.name || "PASS"}`,
      });
      setUpiUri(uri);

      // Generate Canvas QR Code
      const qrCode = await QRCode.toDataURL(uri, {
        margin: 1,
        width: 320,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(qrCode);

      setStep("payment");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to proceed to payment.");
    }
  };

  // Submit UTR and Screenshot
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanUtr = utr.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMsg("Please enter a valid 12-digit UPI UTR / Transaction Reference Number.");
      return;
    }

    setUploading(true);
    try {
      let screenshotPath = undefined;

      if (screenshotFile && booking?.user_id) {
        const fileExt = screenshotFile.name.split(".").pop();
        const filePath = `${booking.user_id}/${booking.purchase_id}_${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("payment-screenshots")
          .upload(filePath, screenshotFile, {
            upsert: true,
          });

        if (!uploadErr) {
          screenshotPath = `payment-screenshots/${filePath}`;
        }
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          utr: cleanUtr,
          screenshot_path: screenshotPath || null,
        })
        .eq("id", booking.id);

      if (updateErr) throw updateErr;

      setStep("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit verification details.");
    } finally {
      setUploading(false);
    }
  };

  const activeUpiId =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_UPI_ID) ||
    "7416265415@okbizaxis";

  const merchantName =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_MERCHANT_NAME) ||
    "Smm Moblie And Watches";

  const copyUpiId = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#090b10] p-6 sm:p-8 shadow-2xl text-foreground">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-silver/80">
              RAUSCH HYDERABAD · DIGITAL GATE
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {step === "details" && "STEP 01/03"}
              {step === "payment" && "STEP 02/03"}
              {step === "utr" && "STEP 03/03"}
              {step === "success" && "CONFIRMED"}
            </span>
          </div>
          <h3 className="text-display mt-1 text-2xl sm:text-3xl font-light tracking-tight">
            Reserve Your Celestial Pass
          </h3>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: ATTENDEE DETAILS */}
        {step === "details" && (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            {/* Google Sign-in Banner if not signed in */}
            {!user && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 py-2.5 px-4 font-mono text-[11px] uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Fast Sign-in with Google</span>
              </button>
            )}

            {/* Pass Tier Selection Grid */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                SELECT PASS TIER
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["general", "vip", "couple_general", "couple_vip"] as PassTier[]).map((t) => {
                  const info = PASS_PRICING[t];
                  const isSelected = tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTier(t);
                        setDiscountPercent(0);
                        setAppliedCoupon("");
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-silver bg-white/10 text-white shadow-[0_0_15px_rgba(220,235,255,0.15)]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <div className="font-mono text-[9px] uppercase tracking-wider text-silver/80">
                        {info.name}
                      </div>
                      <div className="mt-1 text-lg font-light text-foreground">
                        ₹{info.price.toLocaleString("en-IN")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendee Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Advait Sharma"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-silver focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-silver focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                EMAIL ADDRESS (OPTIONAL)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pass copy will be sent here"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-silver focus:outline-none"
              />
            </div>

            {/* Coupon Code Section */}
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                COUPON CODE (IF ANY)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="PROMO CODE"
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white uppercase placeholder-white/30 focus:border-silver focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-lg border border-white/20 px-4 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "APPLY"}
                </button>
              </div>
              {couponError && <p className="mt-1 text-[10px] text-red-400">{couponError}</p>}
              {appliedCoupon && (
                <p className="mt-1 text-[10px] text-emerald-400">
                  ✓ {appliedCoupon} applied: {discountPercent}% discount
                </p>
              )}
            </div>

            {/* Total Summary */}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                TOTAL PAYABLE
              </span>
              <div className="text-right">
                {discountPercent > 0 && (
                  <span className="mr-2 text-xs text-muted-foreground line-through">
                    ₹{basePrice.toLocaleString("en-IN")}
                  </span>
                )}
                <span className="text-2xl font-light text-white">
                  ₹{finalPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              PROCEED TO MERCHANT UPI SCAN →
            </button>
          </form>
        )}

        {/* STEP 2: MERCHANT UPI QR & 1-TAP PAYMENT */}
        {step === "payment" && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center justify-center">
              {/* Dynamic QR Code */}
              <div className="relative rounded-2xl bg-white p-3 shadow-[0_0_30px_rgba(220,235,255,0.25)]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR" className="h-44 w-44 sm:h-52 sm:w-52" />
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-black" />
                  </div>
                )}
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-silver/70">
                SCAN WITH ANY UPI APP · ₹{booking?.final_amount?.toLocaleString("en-IN")}
              </p>
            </div>

            {/* 1-Tap App Launch Buttons (Mobile Optimized) */}
            <div className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                OR PAY DIRECTLY VIA APP
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={getAppSpecificUpiIntent(upiUri, "com.phonepe.app")}
                  className="rounded-lg border border-purple-500/30 bg-purple-500/10 py-2 text-[10px] font-mono text-purple-200 hover:bg-purple-500/20 transition-colors"
                >
                  PhonePe
                </a>
                <a
                  href={getAppSpecificUpiIntent(upiUri, "com.google.android.apps.nbu.paisa.user")}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 py-2 text-[10px] font-mono text-blue-200 hover:bg-blue-500/20 transition-colors"
                >
                  GPay
                </a>
                <a
                  href={getAppSpecificUpiIntent(upiUri, "net.one97.paytm")}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-[10px] font-mono text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                >
                  Paytm
                </a>
              </div>
              <a
                href={upiUri}
                className="block w-full rounded-lg border border-white/20 bg-white/5 py-2 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
              >
                OPEN DEFAULT UPI APP ↗
              </a>
            </div>

            {/* Copy UPI ID Box & Merchant Info */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-left">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                    MERCHANT / PAYEE
                  </span>
                  <span className="font-medium text-white text-[12px]">{merchantName}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                    UPI ID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-silver text-[11px]">{activeUpiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-white bg-white/10 px-2 py-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {copiedUpi ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedUpi ? "COPIED" : "COPY"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("utr")}
              className="w-full rounded-xl bg-white py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              I HAVE PAID · SUBMIT UTR →
            </button>
          </div>
        )}

        {/* STEP 3: UTR & SCREENSHOT UPLOAD */}
        {step === "utr" && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="rounded-lg border border-silver/20 bg-white/5 p-3 text-xs text-silver/80">
              <span className="font-semibold text-white">Reference ID:</span> {booking?.purchase_id}
              <br />
              <span className="text-[11px] text-muted-foreground">
                Please enter the 12-digit UTR from your payment receipt for instant gate clearance.
              </span>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                12-DIGIT UPI UTR / TRANSACTION ID *
              </label>
              <input
                type="text"
                required
                maxLength={16}
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 423819283719"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-mono text-white tracking-widest placeholder-white/30 focus:border-silver focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                PAYMENT SCREENSHOT (OPTIONAL BUT RECOMMENDED)
              </label>
              <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center hover:bg-white/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-6 w-6 text-silver/60 mb-1" />
                <span className="font-mono text-[10px] text-silver">
                  {screenshotFile ? screenshotFile.name : "Tap to choose screenshot or drop image"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("payment")}
                className="rounded-xl border border-white/20 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                ← BACK
              </button>
              <button
                type="submit"
                disabled={uploading || !utr.trim()}
                className="flex-1 rounded-xl bg-white py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    VERIFYING...
                  </span>
                ) : (
                  "COMPLETE RESERVATION ✦"
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === "success" && (
          <div className="space-y-5 text-center py-4">
            <div className="inline-flex rounded-full bg-emerald-500/20 p-3 text-emerald-400 ring-1 ring-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h4 className="text-display text-2xl font-light text-white">Reservation Submitted</h4>
              <p className="mt-2 font-sans text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your payment reference <span className="font-mono text-white font-semibold">{booking?.purchase_id}</span> has been received. Our team will verify it in under 15 minutes.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pass Tier:</span>
                <span className="text-white font-semibold">{PASS_PRICING[tier]?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attendee:</span>
                <span className="text-white">{booking?.full_name || fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-white">₹{booking?.final_amount?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-amber-300 font-semibold uppercase">Pending Verification</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href="/purchases"
                className="w-full rounded-xl bg-white py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all"
              >
                VIEW MY PASSES →
              </a>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-white/15 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
