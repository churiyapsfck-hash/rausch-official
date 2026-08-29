import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DigitalPassCard } from "@/components/DigitalPassCard";
import { ArrowLeft, Loader2 } from "lucide-react";

export function PublicPassPage({ token }: { token: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Ticket token is required");
      setLoading(false);
      return;
    }

    supabase
      .from("bookings")
      .select("*")
      .or(`ticket_token.eq.${token},purchase_id.eq.${token}`)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("Ticket not found or invalid pass token.");
        } else if (data.status === "declined") {
          setError("This pass has been DECLINED by event administration. Access to the venue is revoked.");
        } else {
          setBooking(data);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to authenticate pass.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="min-h-[100svh] bg-[#030406] text-foreground flex flex-col items-center justify-center p-4 sm:p-8 select-none">
      <div
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(220, 235, 255, 0.3) 0%, rgba(0, 0, 0, 0) 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <a
            href="/purchases"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>My Passes</span>
          </a>
          <a
            href="/"
            className="font-mono text-[10px] uppercase tracking-widest text-silver hover:text-white transition-colors"
          >
            RAUSCH HYDERABAD ✦
          </a>
        </div>

        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-silver" />
            <p className="font-mono text-xs text-muted-foreground">Authenticating digital ticket...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center space-y-4">
            <h3 className="text-display text-2xl text-red-300">Invalid Ticket</h3>
            <p className="font-sans text-xs text-red-200/80 leading-relaxed">{error}</p>
            <a
              href="/"
              className="inline-block rounded-xl bg-white px-6 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black cursor-pointer"
            >
              Back to Home
            </a>
          </div>
        ) : booking ? (
          <div className="space-y-6">
            <DigitalPassCard booking={booking} />

            <div className="text-center space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full rounded-xl border border-white/20 bg-white/5 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                SAVE / PRINT TICKET PDF
              </button>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                KEEP THIS QR READY AT THE ENTRANCE GATE
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
