import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PASS_PRICING } from "@/lib/upi";
import { Loader2, QrCode, ArrowLeft, LogOut, Ticket, RefreshCw, ExternalLink } from "lucide-react";

export function PurchasesPage() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error("Failed to load passes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        window.location.href = "/login";
      } else {
        setUser(data.user);
        fetchBookings(data.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
        fetchBookings(session.user.id);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-[100svh] bg-[#040507] text-foreground px-6 py-12 md:px-14 lg:px-20 select-none">
      <div className="mx-auto max-w-5xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:opacity-80 transition-opacity">
                <img src="/images/rausch-logo.png" alt="RAUSCH" className="h-7 w-auto object-contain" />
              </a>
              <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-silver/80">
                MY CELESTIAL PASSES
              </span>
            </div>
            <h1 className="text-display mt-2 text-3xl sm:text-4xl font-light text-white">
              Passes & Bookings
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              Signed in as {user?.email || "Guest Attendee"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => user && fetchBookings(user.id)}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-silver hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <Loader2 className="h-8 w-8 animate-spin text-silver" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#090b10] p-12 text-center my-12">
            <Ticket className="h-12 w-12 text-silver/40 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white">No passes purchased yet</h3>
            <p className="font-mono text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              Secure your place at TOS Club & Lounge for the ultimate day experience.
            </p>
            <a
              href="/#passes"
              className="inline-block mt-6 rounded-xl bg-white px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all"
            >
              BROWSE PASSES →
            </a>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 my-10">
            {bookings.map((booking) => {
              const tier = PASS_PRICING[booking.pass_type as keyof typeof PASS_PRICING] || {
                name: booking.pass_type?.toUpperCase(),
                price: booking.final_amount,
                subtitle: "Entry Pass",
              };

              const isConfirmed = booking.status === "confirmed" || booking.status === "checked_in";
              const isPending = booking.status === "pending";

              return (
                <div
                  key={booking.id}
                  className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#0d1017] to-[#08090d] p-6 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-silver/80">
                        {booking.purchase_id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[8px] uppercase tracking-widest ${
                          booking.status === "checked_in"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : isConfirmed
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {booking.status === "checked_in"
                          ? "CHECKED IN"
                          : isConfirmed
                          ? "CONFIRMED"
                          : isPending
                          ? "VERIFICATION PENDING"
                          : "DECLINED"}
                      </span>
                    </div>

                    <h3 className="text-display mt-4 text-xl font-light text-white">
                      {tier.name}
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {tier.subtitle} · TOS Club & Lounge
                    </p>

                    <div className="my-5 rounded-2xl border border-white/10 bg-white/5 p-3 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Guest Name</span>
                        <span className="text-white font-medium">{booking.full_name}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Phone</span>
                        <span className="text-white">{booking.phone}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Amount Paid</span>
                        <span className="text-emerald-400 font-semibold">₹{booking.final_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>UPI Ref / UTR</span>
                        <span className="text-white font-mono">
                          {booking.utr || booking.utr_number || (
                            <span className="text-amber-400 font-normal">Pending Entry</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {booking.ticket_token ? (
                      <a
                        href={`/p/${booking.ticket_token}`}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white hover:text-black py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-all"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>VIEW DIGITAL TICKET →</span>
                      </a>
                    ) : isPending ? (
                      <div className="space-y-2">
                        {(!booking.utr && !booking.utr_number) ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const inputVal = (e.currentTarget.elements.namedItem("utrInput") as HTMLInputElement)?.value?.trim();
                              if (!inputVal || inputVal.length < 6) {
                                alert("Please enter a valid 12-digit UPI UTR number");
                                return;
                              }
                              try {
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ utr: inputVal, utr_number: inputVal })
                                  .eq("id", booking.id);
                                if (error) throw error;
                                alert("UTR saved successfully!");
                                user && fetchBookings(user.id);
                              } catch (err: any) {
                                alert(err.message || "Failed to update UTR");
                              }
                            }}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-left"
                          >
                            <div className="font-mono text-[10px] text-amber-200">
                              ⚡ <strong>Enter UTR to verify pass:</strong>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                name="utrInput"
                                required
                                placeholder="12-digit UTR"
                                className="flex-1 rounded-lg border border-white/20 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                              <button
                                type="submit"
                                className="rounded-lg bg-amber-400 px-3 py-1.5 font-mono text-[10px] font-bold text-black uppercase hover:bg-amber-300 transition-colors cursor-pointer"
                              >
                                Submit
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center font-mono text-[10px] text-amber-300">
                            Payment under verification by admin
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center font-mono text-[10px] text-red-300">
                        Payment declined. Contact support @rausch.hyd
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-8 border-t border-white/10 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Experience</span>
          </a>
        </div>
      </div>
    </div>
  );
}
