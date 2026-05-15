"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  UserCircle,
  LogIn,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // දැනට ලොග් වෙලා ඉන්නවද බලනවා
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Login එකේදී Account එක නැත්නම් Sign Up කරනවා (ටෙස්ට් කරන්න ලේසි වෙන්න)
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert(signUpError.message);
      else alert("Check your email for confirmation or try logging in again!");
    }
    setLoading(false);
  };

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center font-bold">Checking System...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center">
        <div className="size-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-200">
          <GraduationCap size={40} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
          AL-EXAM <span className="text-indigo-600">Portal</span>
        </h1>

        {!session ? (
          /* 🔐 Login Form (ලොග් වෙලා නැත්නම් පේන කෑල්ල) */
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl font-black mb-6 text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <LogIn className="text-indigo-600" /> Welcome Back
            </h2>
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-indigo-500 transition" placeholder="student@example.com" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-indigo-500 transition" placeholder="••••••••" required />
              </div>
              <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : "Sign In / Sign Up"}
              </button>
            </form>
          </div>
        ) : (
          /* 🛣️ Entry Routes (ලොග් වුණාට පස්සේ විතරයි මේවා පේන්නේ) */
          <div className="grid md:grid-cols-3 gap-6 w-full animate-in slide-in-from-bottom duration-700">
            <Link href="/student-dashboard" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-indigo-600 transition-all text-left shadow-sm">
              <UserCircle className="text-indigo-600 mb-6" size={32} />
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Student</h3>
              <span className="flex items-center gap-2 font-bold text-indigo-600 text-xs">Enter Dashboard <ArrowRight size={14}/></span>
            </Link>

            <Link href="/teacher" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-teal-600 transition-all text-left shadow-sm">
              <CheckCircle className="text-teal-600 mb-6" size={32} />
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Teacher</h3>
              <span className="flex items-center gap-2 font-bold text-teal-600 text-xs">Start Grading <ArrowRight size={14}/></span>
            </Link>

            <Link href="/admin" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-rose-600 transition-all text-left shadow-sm">
              <ShieldCheck className="text-rose-600 mb-6" size={32} />
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Admin</h3>
              <span className="flex items-center gap-2 font-bold text-rose-600 text-xs">Control Panel <ArrowRight size={14}/></span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}