import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, RefreshCw, KeyRound, Loader2, Lock, ShieldCheck, RotateCcw } from "lucide-react";

export function ScannerPage() {
  const [session, setSession] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [resettingCheckIn, setResettingCheckIn] = useState(false);

  const [tokenInput, setTokenInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef("");
  const lastScanTimeRef = useRef(0);

  const checkGateAuth = async (user: any) => {
    if (!user) return false;
    const email = (user.email || "").toLowerCase().trim();
    const authorizedEmails = [
      "gate@rausch.night",
      "superadmin@rausch.night",
      "admin1@rausch.night",
      "admin2@rausch.night",
      "churiyapsfck@gmail.com",
    ];
    if (authorizedEmails.includes(email) || email.endsWith("@rausch.night")) {
      return true;
    }
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return roles?.some((r) => r.role === "gate" || r.role === "admin") || false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const verify = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess);
      if (sess?.user) {
        const ok = await checkGateAuth(sess.user);
        setIsAuthorized(ok);
      } else {
        setIsAuthorized(false);
      }
      setAuthLoading(false);
    };

    verify();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        const ok = await checkGateAuth(sess.user);
        setIsAuthorized(ok);
      } else {
        setIsAuthorized(false);
      }
      setAuthLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmittingLogin(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPass,
      });
      if (error) throw error;
      const ok = await checkGateAuth(data.user);
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error("Access Denied: This account does not have Gate Scanner clearance.");
      }
      setSession(data.session);
      setIsAuthorized(true);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const startCamera = async () => {
    setCameraError("");
    setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      codeReaderRef.current = reader;

      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      const backCamera = videoInputDevices.find((device) =>
        device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("rear")
      );
      const selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0]?.deviceId;

      if (videoRef.current) {
        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (res, err) => {
            if (res) {
              if (isProcessingRef.current) return;
              isProcessingRef.current = true;
              const text = res.getText();
              stopCamera();
              handleVerifyToken(text);
            }
          }
        );
      }
    } catch (err: any) {
      console.error(err);
      setCameraError(err.message || "Failed to access camera");
      setScanning(false);
      isProcessingRef.current = false;
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {}
      codeReaderRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleVerifyToken = async (rawToken: string) => {
    const clean = rawToken.trim().replace(/^.*\/p\//, "").replace(/^.*token=/, "");
    if (!clean) {
      isProcessingRef.current = false;
      return;
    }

    const now = Date.now();
    if (clean === lastScannedTokenRef.current && now - lastScanTimeRef.current < 4000) {
      return;
    }
    lastScannedTokenRef.current = clean;
    lastScanTimeRef.current = now;

    setLoading(true);
    setResult(null);

    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`ticket_token.eq.${clean},purchase_id.eq.${clean}`)
        .single();

      if (error || !booking) {
        setResult({
          status: "invalid",
          message: "INVALID PASS — Unrecognized Ticket Token",
        });
        return;
      }

      if (booking.status === "declined") {
        setResult({
          status: "declined",
          message: "PASS REVOKED / PAYMENT DECLINED",
          booking,
        });
        return;
      }

      if (booking.status === "pending") {
        setResult({
          status: "pending",
          message: "PAYMENT PENDING — Awaiting Admin Approval",
          booking,
        });
        return;
      }

      if (booking.status === "checked_in") {
        setResult({
          status: "already_used",
          message: `ALREADY CHECKED IN AT ${new Date(booking.checked_in_at).toLocaleTimeString()}`,
          booking,
        });
        return;
      }

      // Check-in guest!
      const now = new Date().toISOString();
      await supabase
        .from("bookings")
        .update({ status: "checked_in", checked_in_at: now })
        .eq("id", booking.id);

      setResult({
        status: "success",
        message: "ACCESS GRANTED — WELCOME TO RAUSCH x PHANTOM",
        booking: { ...booking, status: "checked_in", checked_in_at: now },
      });
    } catch (err: any) {
      setResult({
        status: "error",
        message: err.message || "Network error verifying ticket",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCheckIn = async (booking: any) => {
    if (!booking?.id) return;
    if (!confirm(`Are you sure you want to remove check-in for ${booking.full_name}? Their pass will become active again.`)) return;
    setResettingCheckIn(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          checked_in_at: null,
          checked_in_by: null,
        })
        .eq("id", booking.id);

      if (error) throw error;

      setResult({
        status: "success",
        message: "CHECK-IN REMOVED — Pass is active again and ready for entry",
        booking: { ...booking, status: "confirmed", checked_in_at: null },
      });
    } catch (err: any) {
      alert(err.message || "Failed to remove check-in");
    } finally {
      setResettingCheckIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100svh] bg-[#040507] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-silver" />
      </div>
    );
  }

  if (!session || !isAuthorized) {
    return (
      <div className="min-h-[100svh] bg-[#040507] flex flex-col items-center justify-center p-6 select-none text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#090b10] p-8 space-y-5 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-display text-2xl font-light text-white">Gate Scanner Clearance</h2>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {session && !isAuthorized
                ? `Signed in as ${session.user?.email || "User"} (Unauthorized). Gate staff login required.`
                : "Authorized gate security personnel credentials required."}
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 font-mono text-xs text-left">
              {loginError}
            </div>
          )}

          <form onSubmit={handleGateLogin} className="space-y-3 font-mono text-xs text-left">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                Gate Staff Email
              </label>
              <input
                type="email"
                required
                placeholder="gate@rausch.night"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:border-white/40"
              />
            </div>

            <button
              type="submit"
              disabled={submittingLogin}
              className="w-full rounded-xl bg-white py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {submittingLogin ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying Clearance...</span>
                </>
              ) : (
                <span>Unlock Gate Scanner →</span>
              )}
            </button>
          </form>

          <div className="pt-2">
            <a href="/" className="font-mono text-[10px] uppercase text-zinc-500 hover:text-white transition-colors">
              ← Return to Experience
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#040507] text-foreground p-6 sm:p-10 select-none">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-silver/80 block">
              GATE PROTOCOL · HYDERABAD
            </span>
            <h1 className="text-display mt-1 text-2xl sm:text-3xl font-light text-white">
              Gate Scanner
            </h1>
          </div>
          <a
            href="/admin"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase text-silver hover:text-white"
          >
            Admin Ctrl →
          </a>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-black aspect-square max-h-[380px] w-full flex items-center justify-center">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${scanning ? "block" : "hidden"}`}
            playsInline
            muted
          />

          {!scanning && (
            <div className="text-center p-6 space-y-4">
              <Camera className="h-12 w-12 text-silver/40 mx-auto" />
              <p className="font-mono text-xs text-muted-foreground max-w-xs mx-auto">
                Align the attendee's digital holographic pass QR in viewfinder to verify entry.
              </p>
              <button
                onClick={startCamera}
                className="rounded-xl bg-white px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-black hover:bg-silver transition-all cursor-pointer"
              >
                LAUNCH CAMERA SCANNER
              </button>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
              <div className="w-full text-center">
                <span className="rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] text-white backdrop-blur">
                  SCANNING QR...
                </span>
              </div>
              <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-emerald-400 animate-pulse" />
              <button
                onClick={stopCamera}
                className="pointer-events-auto rounded-full bg-black/70 px-4 py-1.5 font-mono text-[10px] text-red-300 backdrop-blur cursor-pointer"
              >
                Cancel Scanner
              </button>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 text-center font-mono">
            {cameraError}
          </div>
        )}

        {/* Manual Code Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyToken(tokenInput);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Or enter Token / Ref (e.g. RAU-K9F2A1)..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-white placeholder-white/30 focus:border-silver focus:outline-none font-mono"
          />
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="rounded-xl bg-white/10 px-5 py-3 font-mono text-xs font-semibold text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "VERIFY"}
          </button>
        </form>

        {/* Scan Result */}
        {result && (
          <div
            className={`rounded-3xl border p-6 space-y-4 shadow-2xl transition-all ${
              result.status === "success"
                ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                : result.status === "already_used"
                ? "border-purple-500/40 bg-purple-950/30 text-purple-200"
                : result.status === "pending"
                ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                : "border-red-500/40 bg-red-950/30 text-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {result.status === "success" ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : result.status === "already_used" ? (
                <AlertTriangle className="h-8 w-8 text-purple-400" />
              ) : (
                <XCircle className="h-8 w-8 text-red-400" />
              )}
              <div>
                <h3 className="font-mono text-base font-semibold uppercase tracking-wider text-white">
                  {result.message}
                </h3>
              </div>
            </div>

            {result.booking && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-2 text-silver">
                <div className="flex justify-between">
                  <span>Guest:</span>
                  <span className="text-white font-semibold">{result.booking.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pass Type:</span>
                  <span className="text-white uppercase">{result.booking.pass_type} ({result.booking.category})</span>
                </div>
                <div className="flex justify-between">
                  <span>Purchase ID:</span>
                  <span className="text-white">{result.booking.purchase_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="text-white">{result.booking.phone}</span>
                </div>
              </div>
            )}

            {result.status === "already_used" && result.booking && (
              <button
                onClick={() => handleRemoveCheckIn(result.booking)}
                disabled={resettingCheckIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300 transition-colors cursor-pointer"
              >
                {resettingCheckIn ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting Check-In...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                    <span>Remove Check-In (Reactivate Pass)</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                isProcessingRef.current = false;
                setResult(null);
                setTokenInput("");
                startCamera();
              }}
              className="w-full rounded-xl bg-white/10 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            >
              SCAN NEXT ATTENDEE →
            </button>
          </div>
        )}

        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}
