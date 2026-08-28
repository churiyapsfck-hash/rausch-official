import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PASS_PRICING } from "@/lib/upi";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  ExternalLink,
  Filter,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Ticket,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

export function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bookings" | "coupons" | "scanner">("bookings");

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals / Overlays
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    type: "approval" | "decline";
    booking: any;
  }>({
    isOpen: false,
    type: "approval",
    booking: null,
  });

  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPercent, setNewCouponPercent] = useState("10");
  const [newCouponPassType, setNewCouponPassType] = useState("all");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

  const fetchAdminData = async () => {
    try {
      const { data: bData } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bData) setBookings(bData);

      const { data: cData } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (cData) setCoupons(cData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (!sess) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
      fetchAdminData();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess) {
        setIsAuthorized(true);
        fetchAdminData();
      } else {
        setIsAuthorized(false);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const getApprovalWhatsAppLink = (booking: any) => {
    if (!booking) return "";
    const phone = booking.phone?.replace(/[^0-9]/g, "") || "";
    const fullPhone = phone.length === 10 ? `91${phone}` : phone;
    const passName = (booking.pass_type || "General").replace("_", " ").toUpperCase();
    const token = booking.ticket_token || booking.purchase_id;
    const passUrl = `${window.location.origin}/p/${token}`;

    const message = `✦ *RAUSCH MMXXVI · CELESTIAL PASS APPROVED* ✦\n\nHi *${booking.full_name || "Attendee"}*,\nYour booking for *RAUSCH* (Hyderabad · TOS Club & Lounge) has been verified and confirmed!\n\n🎟️ *Pass Tier*: ${passName}\n🆔 *Purchase ID*: ${booking.purchase_id}\n💰 *Amount Paid*: ₹${booking.final_amount}\n\n📲 *View & Download Your Digital Pass with Gate QR Code*:\n${passUrl}\n\n⚠️ *Gate Entry Rules*:\n• Present this Digital QR Pass at the venue scanner gate\n• Stag entry rules apply • Age: 16-24 only • Non-transferable\n\nSee you under the lunar lights! 🌙\n— *RAUSCH HYDERABAD*`;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const getDeclineWhatsAppLink = (booking: any) => {
    if (!booking) return "";
    const phone = booking.phone?.replace(/[^0-9]/g, "") || "";
    const fullPhone = phone.length === 10 ? `91${phone}` : phone;
    const passName = (booking.pass_type || "General").replace("_", " ").toUpperCase();

    const message = `✦ *RAUSCH HYDERABAD · PAYMENT VERIFICATION UPDATE* ✦\n\nHi *${booking.full_name || "Attendee"}*,\nWe could not verify your payment for *RAUSCH* (${passName} · Ref: ${booking.purchase_id}).\n\n❌ *Reason*: The transaction reference (UTR) or screenshot provided could not be matched with bank merchant records.\n\n🔄 *Next Steps*:\nIf this was an error or you have a valid bank transaction reference, please log into https://rausch.ironoak.site or contact @rausch.hyd on Instagram with your bank debit proof for manual review.\n\n— *RAUSCH HYDERABAD*`;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleVerify = async (booking: any) => {
    setActionLoading(booking.id);
    try {
      const generatedToken = booking.ticket_token || `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          ticket_token: generatedToken,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      const updatedBooking = { ...booking, status: "confirmed", ticket_token: generatedToken };
      setWhatsAppModal({
        isOpen: true,
        type: "approval",
        booking: updatedBooking,
      });

      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to verify booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (booking: any) => {
    if (!confirm("Are you sure you want to decline this booking?")) return;
    setActionLoading(booking.id);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (error) throw error;

      const updatedBooking = { ...booking, status: "declined" };
      setWhatsAppModal({
        isOpen: true,
        type: "decline",
        booking: updatedBooking,
      });

      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to decline booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewScreenshot = (path: string) => {
    const { data } = supabase.storage.from("payment-screenshots").getPublicUrl(path);
    if (data?.publicUrl) {
      setLightboxUrl(data.publicUrl);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    setCreatingCoupon(true);
    setCouponMsg("");
    try {
      const { error } = await supabase.from("coupons").insert({
        code: newCouponCode.trim().toUpperCase(),
        percent_off: Number(newCouponPercent),
        pass_type: newCouponPassType,
        max_uses: newCouponMaxUses === "" ? null : Number(newCouponMaxUses),
        active: true,
      });

      if (error) throw error;
      setCouponMsg("Coupon minted successfully!");
      setNewCouponCode("");
      setNewCouponMaxUses("");
      fetchAdminData();
    } catch (err: any) {
      setCouponMsg(`Error: ${err.message}`);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      await supabase.from("coupons").update({ active: !currentActive }).eq("id", id);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Delete this promo coupon permanently?")) return;
    try {
      await supabase.from("coupons").delete().eq("id", id);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const verifiedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
  const totalRevenue = verifiedBookings.reduce((sum, b) => sum + (b.final_amount || 0), 0);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const checkedInCount = bookings.filter((b) => b.status === "checked_in").length;

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      b.full_name?.toLowerCase().includes(query) ||
      b.phone?.toLowerCase().includes(query) ||
      b.purchase_id?.toLowerCase().includes(query) ||
      b.utr_number?.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });



  const [inlineEmail, setInlineEmail] = useState("");
  const [inlinePass, setInlinePass] = useState("");
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineLoading(true);
    setInlineError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: inlineEmail.trim(),
        password: inlinePass,
      });
      if (error) throw error;
      setSession(data.session);
      setIsAuthorized(true);
      fetchAdminData();
    } catch (err: any) {
      setInlineError(err.message || "Invalid admin credentials");
    } finally {
      setInlineLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[100svh] bg-[#040507] flex flex-col items-center justify-center p-6 select-none text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#090b10] p-8 space-y-5 text-center">
          <Lock className="h-10 w-10 text-silver/50 mx-auto" />
          <div>
            <h2 className="text-display text-2xl font-light text-white">Admin Operations Access</h2>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              Enter your authorized admin credentials to unlock the control center.
            </p>
          </div>

          {inlineError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 font-mono text-xs text-left">
              {inlineError}
            </div>
          )}

          <form onSubmit={handleInlineLogin} className="space-y-3 font-mono text-xs text-left">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@rausch.night"
                value={inlineEmail}
                onChange={(e) => setInlineEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={inlinePass}
                onChange={(e) => setInlinePass(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:border-white/40"
              />
            </div>

            <button
              type="submit"
              disabled={inlineLoading}
              className="w-full rounded-xl bg-white py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {inlineLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Unlock Control Center →</span>
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
    <div className="min-h-[100svh] bg-[#040507] text-foreground px-4 py-8 sm:px-10 lg:px-16 select-none">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <a href="/" className="hover:opacity-80 transition-opacity">
                <img src="/images/rausch-logo.png" alt="RAUSCH" className="h-7 w-auto object-contain" />
              </a>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-silver">
                CTRL CENTER
              </span>
            </div>
            <h1 className="text-display mt-2 text-3xl font-light text-white">Event Operations</h1>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Live Ticketing, Gate Verification & WhatsApp Dispatch
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/scan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-silver/30 bg-silver/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-silver/20 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-silver" />
              <span>Open Gate Scanner</span>
            </a>
            <button
              onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/login"))}
              className="rounded-xl border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white hover:border-white/30 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Telemetry Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[9px] uppercase tracking-widest">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-display mt-2 text-2xl sm:text-3xl font-light text-emerald-400">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">
              From {verifiedBookings.length} confirmed passes
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[9px] uppercase tracking-widest">Pending Review</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-display mt-2 text-2xl sm:text-3xl font-light text-amber-400">
              {pendingCount}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">Awaiting UTR audit</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[9px] uppercase tracking-widest">Checked In</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-display mt-2 text-2xl sm:text-3xl font-light text-purple-400">
              {checkedInCount}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">Attendees admitted</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[9px] uppercase tracking-widest">Active Coupons</span>
              <Tag className="h-4 w-4 text-silver" />
            </div>
            <div className="text-display mt-2 text-2xl sm:text-3xl font-light text-silver">
              {coupons.filter((c) => c.active).length}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground mt-1">Promotional discounts</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 mb-6 font-mono text-xs uppercase tracking-widest">
          <button
            onClick={() => setTab("bookings")}
            className={`pb-3 pr-6 transition-colors cursor-pointer ${
              tab === "bookings" ? "border-b-2 border-white text-white font-bold" : "text-muted-foreground hover:text-white"
            }`}
          >
            Pass Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setTab("coupons")}
            className={`pb-3 px-6 transition-colors cursor-pointer ${
              tab === "coupons" ? "border-b-2 border-white text-white font-bold" : "text-muted-foreground hover:text-white"
            }`}
          >
            Promo Coupons ({coupons.length})
          </button>
        </div>

        {/* Tab 1: Bookings Management */}
        {tab === "bookings" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search guest name, phone, UTR or Ref ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 font-mono text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                >
                  <option value="all">All Statuses ({bookings.length})</option>
                  <option value="pending">Pending Review ({pendingCount})</option>
                  <option value="confirmed">Approved / Confirmed</option>
                  <option value="checked_in">Checked In ({checkedInCount})</option>
                  <option value="declined">Declined</option>
                </select>

                <button
                  onClick={fetchAdminData}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                  title="Refresh table"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Guest Info</th>
                    <th className="py-3 px-4">Pass Tier</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">UTR / Proof</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions & WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No bookings matching filter
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const tier = PASS_PRICING[b.pass_type as keyof typeof PASS_PRICING] || {
                        name: b.pass_type?.toUpperCase(),
                      };
                      return (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-white font-semibold">{b.purchase_id}</td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{b.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{b.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-silver">{tier.name}</span>
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-semibold">
                            ₹{b.final_amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {b.utr_number && <div className="text-white">{b.utr_number}</div>}
                            {b.payment_screenshot_path ? (
                              <button
                                onClick={() => handleViewScreenshot(b.payment_screenshot_path)}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-0.5 cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View Proof</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No file</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${
                                b.status === "checked_in"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : b.status === "confirmed"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : b.status === "pending"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-red-500/20 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {b.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleVerify(b)}
                                    disabled={actionLoading === b.id}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleDecline(b)}
                                    disabled={actionLoading === b.id}
                                    className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Decline</span>
                                  </button>
                                </>
                              )}

                              {(b.status === "confirmed" || b.status === "checked_in") && (
                                <a
                                  href={getApprovalWhatsAppLink(b)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                                  title="Send pass & QR link on WhatsApp"
                                >
                                  <Send className="h-3 w-3 text-emerald-400" />
                                  <span>WhatsApp Pass</span>
                                </a>
                              )}

                              {b.status === "declined" && (
                                <a
                                  href={getDeclineWhatsAppLink(b)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 rounded-lg bg-red-600/20 border border-red-500/30 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-600/30 transition-colors"
                                  title="Send decline notice on WhatsApp"
                                >
                                  <MessageSquare className="h-3 w-3 text-red-400" />
                                  <span>WhatsApp Decline</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Coupons Management */}
        {tab === "coupons" && (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateCoupon}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 max-w-2xl backdrop-blur-xl"
            >
              <h3 className="text-display text-xl text-white mb-4">Create Promo Coupon</h3>

              {couponMsg && (
                <div
                  className={`mb-4 p-3 rounded-lg text-xs font-mono ${
                    couponMsg.startsWith("Error") ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {couponMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="block text-muted-foreground uppercase text-[9px] tracking-wider mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP20 or HYDSECRET"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-white uppercase focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase text-[9px] tracking-wider mb-1">
                    Discount Percentage (%)
                  </label>
                  <select
                    value={newCouponPercent}
                    onChange={(e) => setNewCouponPercent(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="5">5% OFF</option>
                    <option value="10">10% OFF</option>
                    <option value="15">15% OFF</option>
                    <option value="20">20% OFF</option>
                    <option value="25">25% OFF</option>
                    <option value="30">30% OFF</option>
                    <option value="50">50% OFF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase text-[9px] tracking-wider mb-1">
                    Applies To Pass
                  </label>
                  <select
                    value={newCouponPassType}
                    onChange={(e) => setNewCouponPassType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="all">All Pass Tiers</option>
                    <option value="general">General Only</option>
                    <option value="vip">VIP Only</option>
                    <option value="couple_general">Couple General Only</option>
                    <option value="couple_vip">Couple VIP Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase text-[9px] tracking-wider mb-1">
                    Max Redemptions (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={newCouponMaxUses}
                    onChange={(e) => setNewCouponMaxUses(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingCoupon}
                className="mt-6 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {creatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Mint Promo Coupon</span>
              </button>
            </form>

            {/* Coupons List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Tier Limit</th>
                    <th className="py-3 px-4">Usage</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active coupons minted yet
                      </td>
                    </tr>
                  ) : (
                    coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-white font-bold">{c.code}</td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">{c.percent_off}% OFF</td>
                        <td className="py-3 px-4 text-silver uppercase">{c.pass_type}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {c.uses_count} {c.max_uses ? `/ ${c.max_uses}` : "uses"}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleCoupon(c.id, c.active)}
                            className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase cursor-pointer ${
                              c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {c.active ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Screenshot Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-silver cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={lightboxUrl}
              alt="Payment Screenshot Proof"
              className="max-h-[85vh] w-auto rounded-xl object-contain border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Action Notification Modal with 1-Click WhatsApp Trigger */}
      {whatsAppModal.isOpen && whatsAppModal.booking && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 select-none backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <button
              onClick={() => setWhatsAppModal({ isOpen: false, type: "approval", booking: null })}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto ${
                  whatsAppModal.type === "approval"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                }`}
              >
                {whatsAppModal.type === "approval" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              <h3 className="text-lg font-serif text-white">
                {whatsAppModal.type === "approval" ? "Pass Verified & Approved!" : "Booking Marked Declined"}
              </h3>
              <p className="font-mono text-xs text-zinc-400">
                {whatsAppModal.type === "approval"
                  ? `Guest ${whatsAppModal.booking.full_name} is confirmed. Dispatch their digital QR pass on WhatsApp:`
                  : `Guest ${whatsAppModal.booking.full_name} has been declined. Notify them on WhatsApp:`}
              </p>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] space-y-1.5 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">GUEST:</span>
                <span className="text-white font-semibold">{whatsAppModal.booking.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">PHONE:</span>
                <span className="text-emerald-400">{whatsAppModal.booking.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">REF ID:</span>
                <span>{whatsAppModal.booking.purchase_id}</span>
              </div>
              {whatsAppModal.type === "approval" && (
                <div className="flex justify-between border-t border-zinc-800 pt-1.5 mt-1.5">
                  <span className="text-zinc-500">PASS QR LINK:</span>
                  <span className="text-silver truncate max-w-[200px]">
                    /p/{whatsAppModal.booking.ticket_token || whatsAppModal.booking.purchase_id}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={
                  whatsAppModal.type === "approval"
                    ? getApprovalWhatsAppLink(whatsAppModal.booking)
                    : getDeclineWhatsAppLink(whatsAppModal.booking)
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsAppModal({ isOpen: false, type: "approval", booking: null })}
                className={`w-full py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  whatsAppModal.type === "approval"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
              >
                <Send className="h-4 w-4" />
                <span>
                  {whatsAppModal.type === "approval"
                    ? "📲 Send WhatsApp Pass with QR Code →"
                    : "📲 Send WhatsApp Decline Notice →"}
                </span>
              </a>

              <button
                type="button"
                onClick={() => setWhatsAppModal({ isOpen: false, type: "approval", booking: null })}
                className="w-full py-2.5 font-mono text-[10px] uppercase text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer text-center"
              >
                Skip Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
