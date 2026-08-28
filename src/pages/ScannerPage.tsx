import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, RefreshCw, KeyRound, Loader2 } from "lucide-react";

export function ScannerPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);

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
              const text = res.getText();
              handleVerifyToken(text);
              stopCamera();
            }
          }
        );
      }
    } catch (err: any) {
      console.error(err);
      setCameraError(err.message || "Failed to access camera");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleVerifyToken = async (rawToken: string) => {
    const clean = rawToken.trim().replace(/^.*\/p\//, "").replace(/^.*token=/, "");
    if (!clean) return;

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
        message: "ACCESS GRANTED — WELCOME TO RAUSCH",
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

            <button
              onClick={() => {
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
