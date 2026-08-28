import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        window.location.href = "/purchases";
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.location.href = "/purchases";
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/purchases`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google Sign-In");
      setGoogleLoading(false);
    }
  };

  const handleOtpSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/purchases`,
        },
      });
      if (error) throw error;
      setMessage("Check your inbox! We sent an instant login link.");
    } catch (err: any) {
      setError(err.message || "Failed to send login link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center px-6 py-16 bg-[#040507] text-foreground select-none">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(220, 235, 255, 0.25) 0%, rgba(0, 0, 0, 0) 75%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-3xl border border-white/15 bg-[#090b10] p-8 shadow-2xl">
        <div className="text-center">
          <a href="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
            <img src="/images/rausch-logo.png" alt="RAUSCH" className="h-8 w-auto mx-auto object-contain" />
          </a>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-silver/80 block">
            CELESTIAL ACCESS PORTAL
          </span>
          <h2 className="text-display mt-2 text-3xl font-light text-white">Sign In to RAUSCH</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            View active passes, QR tickets, and order updates
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 text-center">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 py-3.5 px-4 font-mono text-[11px] uppercase tracking-widest text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
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
            )}
            <span>CONTINUE WITH GOOGLE</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="absolute bg-[#090b10] px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              OR VIA EMAIL OTP
            </span>
          </div>

          <form onSubmit={handleOtpSignIn} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-white placeholder-white/30 focus:border-silver focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-white py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black hover:bg-silver transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> SENDING LINK...
                </span>
              ) : (
                "SEND MAGIC LOGIN LINK →"
              )}
            </button>
          </form>
        </div>

        <div className="text-center pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}
