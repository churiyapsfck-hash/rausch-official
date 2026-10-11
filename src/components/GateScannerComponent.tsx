import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, XCircle, Camera, Loader2, Volume2, Sparkles, RotateCcw } from "lucide-react";

interface GateScannerProps {
  accessToken?: string;
}

export function GateScannerComponent({ accessToken }: GateScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);

  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "already" | "invalid" | "reset">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [scannedBooking, setScannedBooking] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [checkInCount, setCheckInCount] = useState(0);
  const [resetting, setResetting] = useState(false);
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef("");
  const lastGuestNameRef = useRef("");
  const ignoredTokenRef = useRef("");
  const [ignoredNotice, setIgnoredNotice] = useState("");

  // Audio chimes
  const playSound = (type: "success" | "warning" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio context error:", e);
    }
  };

  const handleVerifyToken = async (token: string) => {
    const clean = token.trim().replace(/^.*\/p\//, "").replace(/^.*token=/, "");
    if (!clean) {
      isProcessingRef.current = false;
      return;
    }

    setStatus("verifying");
    setStatusMessage("Verifying pass with gate database...");

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`ticket_token.eq.${clean},purchase_id.eq.${clean}`)
        .single();

      if (error || !booking) {
        setStatus("invalid");
        setStatusMessage("INVALID PASS — Unrecognized Ticket Token");
        setScannedBooking(null);
        playSound("error");
        return;
      }

      lastScannedTokenRef.current = booking.ticket_token || booking.purchase_id || clean;
      lastGuestNameRef.current = booking.full_name;

      if (booking.status === "declined") {
        setStatus("invalid");
        setStatusMessage("PASS REVOKED / PAYMENT DECLINED");
        setScannedBooking(booking);
        playSound("error");
        return;
      }

      if (booking.status === "pending") {
        setStatus("invalid");
        setStatusMessage("PAYMENT PENDING — Awaiting Admin Approval");
        setScannedBooking(booking);
        playSound("warning");
        return;
      }

      if (booking.status === "checked_in") {
        setStatus("already");
        setStatusMessage(`ALREADY CHECKED IN AT: ${new Date(booking.checked_in_at || Date.now()).toLocaleTimeString()}`);
        setScannedBooking(booking);
        playSound("warning");
        return;
      }

      // Check-in guest!
      const now = new Date().toISOString();
      await supabase
        .from("bookings")
        .update({ status: "checked_in", checked_in_at: now })
        .eq("id", booking.id);

      setStatus("success");
      setStatusMessage("ACCESS GRANTED — WELCOME TO RAUSCH x PHANTOM");
      setScannedBooking({ ...booking, status: "checked_in", checked_in_at: now });
      setCheckInCount((c) => c + 1);
      playSound("success");
    } catch (err: any) {
      setStatus("invalid");
      setStatusMessage(err.message || "Failed to communicate with gate server");
      playSound("error");
    }
  };

  const handleRemoveCheckIn = async (booking: any) => {
    if (!booking?.id) return;
    if (!confirm(`Are you sure you want to remove check-in for ${booking.full_name}? Pass will be active again.`)) return;
    setResetting(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed", checked_in_at: null, checked_in_by: null })
        .eq("id", booking.id);

      if (error) throw error;
      lastScannedTokenRef.current = booking.ticket_token || booking.purchase_id || "";
      lastGuestNameRef.current = booking.full_name;

      setStatus("reset");
      setStatusMessage(`CHECK-IN REMOVED FOR ${booking.full_name.toUpperCase()} — PASS IS NOW ACTIVE AGAIN`);
      setScannedBooking({ ...booking, status: "confirmed", checked_in_at: null });
      setCheckInCount((c) => Math.max(0, c - 1));
      playSound("success");
    } catch (err: any) {
      alert(err.message || "Failed to remove check-in");
    } finally {
      setResetting(false);
    }
  };

  const startCamera = async () => {
    setScanning(true);
    setStatus("idle");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;

      if (videoRef.current) {
        // Enforce lock during warmup so no residual GPU/framebuffer frames trigger a false decode
        isProcessingRef.current = true;
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 600);

        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              if (isProcessingRef.current) return;
              const text = result.getText();
              const clean = text.trim().replace(/^.*\/p\//, "").replace(/^.*token=/, "");
              if (!clean) return;

              // Prevent re-scanning the attendee who was just processed
              if (ignoredTokenRef.current && clean === ignoredTokenRef.current) {
                setIgnoredNotice(
                  `Previous pass for ${lastGuestNameRef.current || "attendee"} detected — point camera at NEXT attendee`
                );
                return;
              }

              isProcessingRef.current = true;
              ignoredTokenRef.current = "";
              setIgnoredNotice("");
              stopCamera();
              handleVerifyToken(clean);
            }
          }
        );
      }
    } catch (err) {
      console.error("Camera access error:", err);
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
    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch (e) {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6 select-none">
      {/* Top Stats Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#090b10] p-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-silver">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>GATE SCANNER ACTIVE</span>
        </div>
        <div>
          <span className="text-muted-foreground">CHECKED-IN TONIGHT: </span>
          <span className="text-lg font-semibold text-emerald-400">{checkInCount}</span>
        </div>
      </div>

      {/* Video Scanner Viewfinder */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-black aspect-square max-w-md mx-auto shadow-2xl flex items-center justify-center">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${scanning ? "block" : "hidden"}`}
        />

        {!scanning && (
          <div className="p-8 text-center space-y-4">
            <Camera className="h-12 w-12 text-silver/40 mx-auto" />
            <p className="font-mono text-xs text-muted-foreground">
              Ready to scan attendee digital pass QR codes
            </p>
            <button
              onClick={startCamera}
              className="rounded-xl bg-white px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-black hover:bg-silver transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              START CAMERA SCANNER ✦
            </button>
          </div>
        )}

        {scanning && (
          <>
            {/* Viewfinder Target Reticle */}
            <div className="pointer-events-none absolute inset-12 border-2 border-dashed border-white/40 rounded-2xl animate-pulse" />
            {ignoredNotice && (
              <div className="absolute top-4 left-4 right-4 pointer-events-auto rounded-xl bg-amber-950/90 border border-amber-500/50 p-2.5 text-center text-amber-200 font-mono text-[10px] space-y-1 shadow-lg backdrop-blur">
                <p>{ignoredNotice}</p>
                <button
                  type="button"
                  onClick={() => {
                    ignoredTokenRef.current = "";
                    setIgnoredNotice("");
                  }}
                  className="underline text-white hover:text-amber-300 font-semibold cursor-pointer block mx-auto"
                >
                  Tap here to allow re-scanning previous pass
                </button>
              </div>
            )}
            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase text-white hover:bg-black"
            >
              STOP CAMERA
            </button>
          </>
        )}
      </div>

      {/* Live Verification Result Banner */}
      {status !== "idle" && (
        <div
          className={`rounded-2xl border p-6 text-center space-y-3 transition-all animate-in fade-in ${
            status === "success"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
              : status === "reset"
              ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
              : status === "already"
              ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
              : status === "verifying"
              ? "border-silver/40 bg-white/10 text-white"
              : "border-red-500/40 bg-red-500/15 text-red-200"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {status === "verifying" && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-7 w-7 text-emerald-400" />}
            {status === "reset" && <RotateCcw className="h-7 w-7 text-sky-400" />}
            {status === "already" && <AlertTriangle className="h-7 w-7 text-amber-400" />}
            {status === "invalid" && <XCircle className="h-7 w-7 text-red-400" />}
            <h4 className="text-display text-2xl font-light">
              {status === "success" && "VALID PASS · ACCESS GRANTED"}
              {status === "reset" && "CHECK-IN REMOVED"}
              {status === "already" && "DUPLICATE SCAN WARNING"}
              {status === "invalid" && "INVALID PASS"}
              {status === "verifying" && "CHECKING GATE CLEARANCE..."}
            </h4>
          </div>

          <p className="font-mono text-xs tracking-wider">{statusMessage}</p>

          {scannedBooking && (
            <div className="mt-4 rounded-xl bg-black/30 p-4 text-left font-mono text-xs space-y-1.5 border border-white/10">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ATTENDEE:</span>
                <span className="text-white font-semibold">{scannedBooking.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TIER:</span>
                <span className="text-silver font-semibold uppercase">{scannedBooking.pass_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BOOKING REF:</span>
                <span className="text-white">{scannedBooking.purchase_id}</span>
              </div>
            </div>
          )}

          {status === "already" && scannedBooking && (
            <button
              onClick={() => handleRemoveCheckIn(scannedBooking)}
              disabled={resetting}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-300 transition-colors cursor-pointer"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Resetting Check-In...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 text-amber-400" />
                  <span>Remove Check-In (Reactivate Pass)</span>
                </>
              )}
            </button>
          )}

          {status !== "idle" && status !== "verifying" && (
            <button
              onClick={() => {
                ignoredTokenRef.current = lastScannedTokenRef.current;
                isProcessingRef.current = false;
                setStatus("idle");
                setStatusMessage("");
                setScannedBooking(null);
                setIgnoredNotice(
                  lastGuestNameRef.current
                    ? `Previous pass for ${lastGuestNameRef.current} ignored to avoid repeat scan`
                    : ""
                );
                startCamera();
              }}
              className="mt-4 w-full rounded-xl bg-white/10 hover:bg-white hover:text-black py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white transition-all cursor-pointer"
            >
              SCAN NEXT ATTENDEE →
            </button>
          )}
        </div>
      )}

      {/* Manual Token Lookup Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ignoredTokenRef.current = "";
          setIgnoredNotice("");
          handleVerifyToken(manualCode);
        }}
        className="rounded-2xl border border-white/15 bg-[#090b10] p-6 space-y-3"
      >
        <label className="block font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          MANUAL TOKEN OR REF ID LOOKUP
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="e.g. RAU-123456 or 24-character token"
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-xs text-white uppercase placeholder-white/30 focus:border-silver focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="rounded-xl bg-white px-6 font-mono text-[10px] font-semibold uppercase tracking-widest text-black hover:bg-silver transition-all disabled:opacity-50"
          >
            VERIFY
          </button>
        </div>
      </form>
    </div>
  );
}
