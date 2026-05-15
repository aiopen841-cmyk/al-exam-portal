"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, BookOpen, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname === "/") return null; // Login පේජ් එකේ පේන්න ඕනේ නෑ

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-black text-indigo-600 text-xl tracking-tighter">
          <GraduationCap size={28} strokeWidth={3} /> AL-EXAM
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <Link href="/student-dashboard" className={`px-4 py-2 rounded-xl text-sm font-bold transition ${pathname === '/student-dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            Student
          </Link>
          <Link href="/teacher" className={`px-4 py-2 rounded-xl text-sm font-bold transition ${pathname === '/teacher' ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            Teacher
          </Link>
        </div>
      </div>
      <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-red-500 transition">
        <LogOut size={20} />
      </button>
    </nav>
  );
}