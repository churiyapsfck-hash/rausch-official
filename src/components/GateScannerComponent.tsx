import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, XCircle, Camera, Loader2, Volume2, Sparkles } from "lucide-react";

interface GateScannerProps {
  accessToken?: string;
}

export function GateScannerComponent({ accessToken }: GateScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);

  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "already" | "invalid">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [scannedBooking, setScannedBooking] = useState<any>(null);
  const [manualCode, setManualCode] = useState("");
  const [checkInCount, setCheckInCount] = useState(0);

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
    if (!token.trim()) return;
    setStatus("verifying");
    setStatusMessage("Verifying pass with gate database...");

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      const clean = token.trim().replace(/^.*\/p\//, "").replace(/^.*token=/, "");

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
      setStatusMessage("ACCESS GRANTED — WELCOME TO RAUSCH");
      setScannedBooking({ ...booking, status: "checked_in", checked_in_at: now });
      setCheckInCount((c) => c + 1);
      playSound("success");
    } catch (err: any) {
      setStatus("invalid");
      setStatusMessage(err.message || "Failed to communicate with gate server");
      playSound("error");
    }
  };

  const startCamera = async () => {
    setScanning(true);
    setStatus("idle");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;

      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) {
            const text = result.getText();
            if (text && text !== lastScanned) {
              setLastScanned(text);
              handleVerifyToken(text);
            }
          }
        }
      );
    } catch (err) {
      console.error("Camera access error:", err);
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current = null;
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
            {status === "already" && <AlertTriangle className="h-7 w-7 text-amber-400" />}
            {status === "invalid" && <XCircle className="h-7 w-7 text-red-400" />}
            <h4 className="text-display text-2xl font-light">
              {status === "success" && "VALID PASS · ACCESS GRANTED"}
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
        </div>
      )}

      {/* Manual Token Lookup Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
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
