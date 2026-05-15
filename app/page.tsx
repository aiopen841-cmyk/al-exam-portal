"use client";

import Link from "next/link";
import { 
  GraduationCap, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  UserCircle,
  Zap
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* 🌌 Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center">
        <div className="size-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-200 dark:shadow-none animate-bounce">
          <GraduationCap size={40} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
          AL-EXAM <span className="text-indigo-600">Portal</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mb-12 font-medium">
          The ultimate A/L answer script grading system with AI-powered efficiency and voice feedback. 🚀
        </p>

        {/* 🛣️ Entry Routes */}
        <div className="grid md:grid-cols-3 gap-6 w-full">
          
          {/* 1. Student Card */}
          <Link href="/student-dashboard" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-indigo-600 dark:hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-2">
            <div className="size-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <UserCircle className="text-indigo-600" size={28} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Student</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Submit your papers and review teacher feedback.</p>
            <span className="flex items-center gap-2 font-bold text-indigo-600 group-hover:gap-4 transition-all uppercase text-[10px] tracking-widest">Enter Dashboard <ArrowRight size={14}/></span>
          </Link>

          {/* 2. Teacher Card */}
          <Link href="/teacher" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-teal-600 dark:hover:border-teal-500 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-2">
            <div className="size-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <CheckCircle className="text-teal-600" size={28} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Teacher</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Claim student submissions and grade with voice notes.</p>
            <span className="flex items-center gap-2 font-bold text-teal-600 group-hover:gap-4 transition-all uppercase text-[10px] tracking-widest">Start Grading <ArrowRight size={14}/></span>
          </Link>

          {/* 3. Admin Card */}
          <Link href="/admin" className="group p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] hover:border-rose-600 dark:hover:border-rose-500 transition-all text-left shadow-sm hover:shadow-xl hover:-translate-y-2">
            <div className="size-12 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <ShieldCheck className="text-rose-600" size={28} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Admin</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Manage exam papers, subjects, and system analytics.</p>
            <span className="flex items-center gap-2 font-bold text-rose-600 group-hover:gap-4 transition-all uppercase text-[10px] tracking-widest">Control Panel <ArrowRight size={14}/></span>
          </Link>

        </div>

        {/* 🛠️ Footer Feature Tags */}
        <div className="mt-20 flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" /> Real-time Supabase Sync
            </div>
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2">
                <CheckCircle size={14} className="text-indigo-500" /> Next.js 14 Build
            </div>
        </div>
      </main>
    </div>
  );
}