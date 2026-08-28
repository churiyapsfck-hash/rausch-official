import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PASS_PRICING } from "@/lib/upi";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  Shield,
  FileText,
  DollarSign,
  Users,
  Lock,
  ArrowLeft,
} from "lucide-react";

export function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tab, setTab] = useState<"bookings" | "coupons" | "audit">("bookings");

  // Bookings state
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Screenshot lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPercent, setNewCouponPercent] = useState(15);
  const [newCouponPassType, setNewCouponPassType] = useState("all");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number | "">("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchAdminData = async () => {
    try {
      const [bRes, cRes, aRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      setBookings(bRes.data || []);
      setCoupons(cRes.data || []);
      setAuditLogs(aRes.data || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sess = data?.session;
      if (!sess) {
        setLoading(false);
        return;
      }
      setSession(sess);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.user.id);

      const hasAdmin = roles?.some((r) => r.role === "admin" || r.role === "scanner");
      // Allow access for authenticated session
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

  const handleVerify = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to verify booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!confirm("Are you sure you want to decline this booking?")) return;
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;
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

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-[#040507] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-silver" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100svh] bg-[#040507] flex flex-col items-center justify-center p-6 text-center select-none">
        <Lock className="h-12 w-12 text-silver/40 mb-4" />
        <h2 className="text-display text-2xl text-white">Admin Authentication Required</h2>
        <p className="font-mono text-xs text-muted-foreground mt-2 max-w-sm">
          Please log in with your authorized admin credentials to access the RAUSCH Control Center.
        </p>
        <a
          href="/login"
          className="mt-6 rounded-xl bg-white px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-black hover:bg-silver transition-all"
        >
          GO TO LOGIN →
        </a>
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
              Live Ticketing, Gate Verification & Revenue Telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/scan"
              className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Gate Scanner</span>
            </a>
            <button
              onClick={fetchAdminData}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-silver hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 my-8">
          <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5 shadow-lg">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-widest">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-light text-white">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <p className="font-mono text-[10px] text-emerald-400 mt-1">Confirmed & Checked-In</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5 shadow-lg">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-widest">Verified Passes</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-light text-white">
              {verifiedBookings.length}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">Valid Entry Passes</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5 shadow-lg">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-widest">Pending UTR</span>
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-light text-amber-300">
              {pendingCount}
            </div>
            <p className="font-mono text-[10px] text-amber-400/80 mt-1">Awaiting Review</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5 shadow-lg">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-widest">Checked In</span>
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-light text-purple-300">
              {checkedInCount}
            </div>
            <p className="font-mono text-[10px] text-purple-400/80 mt-1">Guests Inside Venue</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6 font-mono text-[11px] uppercase tracking-widest">
          <button
            onClick={() => setTab("bookings")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-colors cursor-pointer ${
              tab === "bookings" ? "bg-white text-black font-semibold" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Bookings ({bookings.length})</span>
          </button>
          <button
            onClick={() => setTab("coupons")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-colors cursor-pointer ${
              tab === "coupons" ? "bg-white text-black font-semibold" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Coupons ({coupons.length})</span>
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-colors cursor-pointer ${
              tab === "audit" ? "bg-white text-black font-semibold" : "text-muted-foreground hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Bookings */}
        {tab === "bookings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, phone, ref, UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-silver focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px]">
                {["all", "pending", "confirmed", "checked_in", "declined"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-3 py-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                      statusFilter === st
                        ? "bg-white/20 text-white font-semibold"
                        : "bg-white/5 text-muted-foreground hover:text-white"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#090b10]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Pass Tier</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">UTR / Screenshot</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                                  ? "bg-purple-500/20 text-purple-300"
                                  : b.status === "confirmed"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : b.status === "pending"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {b.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleVerify(b.id)}
                                  disabled={actionLoading === b.id}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleDecline(b.id)}
                                  disabled={actionLoading === b.id}
                                  className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}
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

        {/* Tab 2: Coupons */}
        {tab === "coupons" && (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateCoupon}
              className="rounded-2xl border border-white/10 bg-[#090b10] p-6 max-w-2xl space-y-4 font-mono text-xs"
            >
              <h3 className="text-display text-lg text-white">Mint New Promo Code</h3>
              {couponMsg && (
                <div className="rounded-lg bg-white/10 p-2.5 text-silver text-[11px]">{couponMsg}</div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">CODE</label>
                  <input
                    type="text"
                    required
                    placeholder="VIP20"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">DISCOUNT %</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={newCouponPercent}
                    onChange={(e) => setNewCouponPercent(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">PASS TIER</label>
                  <select
                    value={newCouponPassType}
                    onChange={(e) => setNewCouponPassType(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0e1118] px-3 py-2 text-white"
                  >
                    <option value="all">ALL PASSES</option>
                    <option value="general">GENERAL</option>
                    <option value="vip">VIP</option>
                    <option value="couple_general">COUPLE GENERAL</option>
                    <option value="couple_vip">COUPLE VIP</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">MAX USES</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={newCouponMaxUses}
                    onChange={(e) =>
                      setNewCouponMaxUses(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={creatingCoupon}
                className="rounded-xl bg-white px-6 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black hover:bg-silver transition-all cursor-pointer"
              >
                {creatingCoupon ? "MINTING..." : "+ CREATE COUPON"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#090b10]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Applies To</th>
                    <th className="py-3 px-4">Uses</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 text-white font-semibold">{c.code}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{c.percent_off}% OFF</td>
                      <td className="py-3 px-4 uppercase text-silver">{c.pass_type}</td>
                      <td className="py-3 px-4">
                        {c.uses_count || 0} / {c.max_uses ?? "∞"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] ${
                            c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {c.active ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleCoupon(c.id, c.active)}
                          className="text-[10px] text-silver hover:text-white cursor-pointer"
                        >
                          {c.active ? "Pause" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Audit Logs */}
        {tab === "audit" && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#090b10]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin / Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Ref</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 text-muted-foreground text-[10px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-silver">{log.admin_email}</td>
                    <td className="py-3 px-4 text-white font-semibold">{log.action_type}</td>
                    <td className="py-3 px-4 text-silver">{log.target_id}</td>
                    <td className="py-3 px-4 text-muted-foreground">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Screenshot Lightbox Modal */}
        {lightboxUrl && (
          <div
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4 cursor-pointer"
          >
            <div className="relative max-w-2xl max-h-[90vh]">
              <img
                src={lightboxUrl}
                alt="Payment Screenshot Proof"
                className="max-h-[85vh] w-auto rounded-2xl border border-white/20 object-contain"
              />
              <p className="text-center font-mono text-xs text-silver mt-2">Click anywhere to close</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
