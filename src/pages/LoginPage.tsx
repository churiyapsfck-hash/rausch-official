import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const userEmail = data.user.email?.toLowerCase() || "";
        if (userEmail.endsWith("@rausch.night") || userEmail.includes("admin")) {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const userEmail = session.user.email?.toLowerCase() || "";
        if (userEmail.endsWith("@rausch.night") || userEmail.includes("admin")) {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPass = password;

      if (!cleanEmail || !cleanPass) {
        throw new Error("Please enter both email and password");
      }

      if (isSignUp) {
        const cleanName = fullName.trim();
        const cleanPhone = phone.trim();

        if (!cleanName || cleanPhone.length < 10) {
          throw new Error("Please enter your full name and a valid 10-digit mobile number");
        }

        const userCode = `RAU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // 1. Sign Up in Supabase Auth
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
              user_code: userCode,
            },
          },
        });

        if (signUpErr) throw signUpErr;

        // 2. Immediately establish session
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

        // 3. Upsert profile record
        const activeUserId = signInData?.user?.id || signUpData?.user?.id;
        if (activeUserId) {
          supabase
            .from("profiles")
            .upsert({
              id: activeUserId,
              user_code: userCode,
              full_name: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
            })
            .then(() => {})
            .catch(() => {});
        }

        if (signInErr && !signUpData?.session) {
          // If Supabase still has email confirmation turned on on the server
          setSuccessMsg("Account created! Redirecting to login...");
          setTimeout(() => {
            setIsSignUp(false);
            setLoading(false);
          }, 800);
          return;
        }

        setSuccessMsg("Account created successfully! Welcome to RAUSCH.");
        setTimeout(() => {
          const userEmail = (signInData?.user?.email || signUpData?.user?.email || "").toLowerCase();
          if (userEmail.endsWith("@rausch.night") || userEmail.includes("admin")) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/";
          }
        }, 500);
      } else {
        // Sign In Flow
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

        if (signInErr) throw signInErr;

        setSuccessMsg("Authenticated! Entering portal...");
        setTimeout(() => {
          const signedInEmail = data.user?.email?.toLowerCase() || "";
          if (signedInEmail.endsWith("@rausch.night") || signedInEmail.includes("admin")) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/";
          }
        }, 400);
      }
    } catch (err: any) {
      const raw = err?.message || err?.error_description || (typeof err === "string" ? err : "Authentication failed");
      const text = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      setErrorMsg(text === "{}" ? "Invalid credentials. Please check your email and password." : text);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-[#070709] text-white flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden select-none">
      {/* Background Radial Grid & Haze */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(220, 235, 255, 0.2) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-zinc-950/90 border border-zinc-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <a href="/" className="hover:opacity-80 transition-opacity">
            <img src="/images/rausch-logo.png" alt="RAUSCH" className="h-8 w-auto mx-auto object-contain" />
          </a>
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] uppercase text-zinc-400">
            <span>✦</span>
            <span>RAUSCH MMXXVI · ACCESS AUTH</span>
            <span>✦</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/90 border border-red-800 text-red-200 font-mono text-xs text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/90 border border-emerald-800 text-emerald-200 font-mono text-xs text-center leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 mb-6 font-mono text-xs uppercase tracking-widest">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${
              !isSignUp ? "border-b-2 border-white text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${
              isSignUp ? "border-b-2 border-white text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {isSignUp && (
            <>
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest mb-1 text-[10px]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kabir Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest mb-1 text-[10px]">
                  Phone Number (+91)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-zinc-400 uppercase tracking-widest mb-1 text-[10px]">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 uppercase tracking-widest mb-1 text-[10px]">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-white text-black font-mono font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-zinc-200 transition-all disabled:opacity-50 mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> PROCESSING...
              </span>
            ) : isSignUp ? (
              "Create Account →"
            ) : (
              "Sign In →"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-900 pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Experience</span>
          </a>
        </div>
      </div>
    </div>
  );
}
