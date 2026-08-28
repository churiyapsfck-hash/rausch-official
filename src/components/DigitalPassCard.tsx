import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, ShieldCheck, Sparkles, MapPin, Calendar, Clock } from "lucide-react";
import { PASS_PRICING } from "@/lib/upi";

interface DigitalPassCardProps {
  booking: {
    id: string;
    purchase_id: string;
    pass_type: string;
    category?: string;
    full_name: string;
    phone: string;
    email?: string;
    status: string;
    ticket_token?: string;
    checked_in_at?: string;
    final_amount: number;
    created_at?: string;
  };
}

export function DigitalPassCard({ booking }: DigitalPassCardProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const token = booking.ticket_token || booking.purchase_id;
  const isVip = booking.pass_type === "vip" || booking.pass_type === "couple_vip";
  const isCheckedIn = !!booking.checked_in_at;
  const isVerified = booking.status === "verified" || booking.status === "active";

  useEffect(() => {
    if (token) {
      QRCode.toDataURL(token, {
        margin: 1,
        width: 320,
        color: {
          dark: isVip ? "#1a1205" : "#0a0c10",
          light: "#FFFFFF",
        },
      }).then(setQrUrl);
    }
  }, [token, isVip]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 15, y: -y * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const tierInfo = PASS_PRICING[booking.pass_type] || { name: booking.pass_type.toUpperCase(), price: booking.final_amount };

  return (
    <div
      className="perspective-1000 flex items-center justify-center p-4"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border transition-transform duration-300 ease-out select-none shadow-2xl"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          borderColor: isVip ? "rgba(225, 195, 120, 0.4)" : "rgba(255, 255, 255, 0.18)",
          background: isVip
            ? "radial-gradient(ellipse at 50% 0%, rgba(55, 40, 15, 0.95) 0%, rgba(12, 10, 8, 0.98) 100%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(25, 30, 45, 0.95) 0%, rgba(7, 8, 11, 0.98) 100%)",
        }}
      >
        {/* Holographic Sheen Layer */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 2}% ${50 - tilt.y * 2}%, rgba(255,255,255,0.8), transparent 70%)`,
          }}
        />

        {/* Top Header */}
        <div className="border-b border-white/10 p-6 pb-4">
          <div className="flex items-center justify-between">
            <img src="/images/rausch-logo.png" alt="RAUSCH" className="h-6 w-auto object-contain" />
            <div
              className={`rounded-full px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-widest ${
                isCheckedIn
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : isVerified
                  ? "bg-silver/20 text-white ring-1 ring-white/40"
                  : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
              }`}
            >
              {isCheckedIn ? "CHECKED IN ✦" : isVerified ? "ACTIVE PASS" : "PENDING"}
            </div>
          </div>

          <div className="mt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-silver/70">
              OFFICIAL ADMISSION TICKET
            </span>
            <h3 className="text-display mt-1 text-2xl sm:text-3xl font-light text-white tracking-tight">
              {tierInfo.name}
            </h3>
          </div>
        </div>

        {/* QR Code Body */}
        <div className="flex flex-col items-center justify-center p-6 bg-black/20">
          <div
            className={`relative rounded-2xl p-3 shadow-xl ${
              isVip ? "bg-gradient-to-b from-[#fbf2dd] to-[#d6b772]" : "bg-white"
            }`}
          >
            {qrUrl ? (
              <img src={qrUrl} alt="Gate QR" className="h-44 w-44 object-contain" />
            ) : (
              <div className="h-44 w-44 flex items-center justify-center font-mono text-xs text-black">
                MINTING PASS...
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <span className="font-mono text-[11px] font-semibold text-white tracking-widest">
              {token}
            </span>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
              PRESENT AT GATE · 2-SECOND SCAN ENTRY
            </p>
          </div>
        </div>

        {/* Guest & Venue Details */}
        <div className="border-t border-white/10 p-6 pt-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase text-[10px] tracking-wider">ATTENDEE</span>
            <span className="text-white font-medium">{booking.full_name.toUpperCase()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase text-[10px] tracking-wider">BOOKING REF</span>
            <span className="text-silver">{booking.purchase_id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground uppercase text-[10px] tracking-wider">VENUE</span>
            <span className="text-white text-right">TOS Club & Lounge, Banjara Hills</span>
          </div>

          <div className="flex justify-between border-t border-white/10 pt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> ONE DAY GATHERING
            </span>
            <span>UNLIMITED FOOD & MOCKTAILS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
