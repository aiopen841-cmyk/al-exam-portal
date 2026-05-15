import Link from "next/link";
import { GraduationCap, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <div className="size-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-200">
          <GraduationCap size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6">
          Next-Gen <span className="text-indigo-600">Exam Grading</span> Portal
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mb-12 font-medium">
          Upload your answers, get real-time voice feedback, and track your A/L progress like never before.
        </p>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link href="/student-dashboard" className="group p-8 border-2 border-slate-100 rounded-[40px] hover:border-indigo-600 transition-all text-left">
            <CheckCircle className="text-indigo-600 mb-4" size={32} />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Student Portal</h3>
            <p className="text-slate-500 text-sm mb-6">Submit papers and view teacher feedback.</p>
            <span className="flex items-center gap-2 font-bold text-indigo-600 group-hover:gap-4 transition-all">Enter Dashboard <ArrowRight size={18}/></span>
          </Link>

          <Link href="/teacher" className="group p-8 border-2 border-slate-100 rounded-[40px] hover:border-teal-600 transition-all text-left">
            <ShieldCheck className="text-teal-600 mb-4" size={32} />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Teacher Portal</h3>
            <p className="text-slate-500 text-sm mb-6">Claim submissions and record feedback.</p>
            <span className="flex items-center gap-2 font-bold text-teal-600 group-hover:gap-4 transition-all">Grade Papers <ArrowRight size={18}/></span>
          </Link>
        </div>
      </main>
    </div>
  );
}