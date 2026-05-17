"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Users, 
  BookOpen, 
  FileCheck,
  Loader2,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Paper = {
  id: number;
  title: string;
  subject: string;
  month_year: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  // New Paper Form States
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. ලොග් වෙලා නැත්නම් එලවනවා
      if (!session) {
        router.push("/");
        return;
      }

      // 2. Database එකෙන් බලනවා මෙයා Admin ද කියලා
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      // 3. Admin නෙමෙයි නම් (හෝ ටේබල් එකේ නැත්නම්) එලවනවා
      if (!roleData || roleData.role !== 'admin') {
        alert("🛑 Access Denied! Admins Only.");
        router.push("/");
        return;
      }

      // 4. Admin නම් විතරක් Papers ටික Load කරනවා
      setIsCheckingAccess(false);
      fetchPapers();
    };

    checkAccess();
  }, [router]);

  const fetchPapers = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
    if (data) setPapers(data);
    setIsLoading(false);
  };

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    
    try {
      const { error } = await supabase.from('papers').insert({
        title,
        subject,
        month_year: monthYear
      });

      if (error) throw error;
      
      alert("✅ New Paper Added!");
      setTitle(""); setSubject(""); setMonthYear("");
      await fetchPapers();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const deletePaper = async (id: number) => {
    if (!confirm("Are you sure you want to delete this paper?")) return;
    await supabase.from('papers').delete().eq('id', id);
    await fetchPapers();
  };

  // Security Check එක ඉවර වෙනකම් ලස්සන Loading එකක් පෙන්නනවා
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in fade-in duration-500">
      <header className="max-w-6xl mx-auto mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={36} /> Admin Panel
        </h1>
        <div className="flex gap-4">
            <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                <Users className="text-indigo-500" size={20}/>
                <span className="text-sm font-bold text-slate-500">Admin Mode</span>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_350px] gap-8">
        
        {/* 🎯 Paper Management */}
        <section className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <BookOpen className="text-indigo-600" /> Manage Exam Papers
            </h2>
            
            <form onSubmit={handleAddPaper} className="grid md:grid-cols-3 gap-4 mb-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200">
              <input 
                placeholder="Paper Title (e.g. Model Paper 05)" 
                value={title} onChange={e => setTitle(e.target.value)}
                className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm"
                required
              />
              <input 
                placeholder="Subject" 
                value={subject} onChange={e => setSubject(e.target.value)}
                className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm"
                required
              />
              <input 
                placeholder="Month/Year" 
                value={monthYear} onChange={e => setMonthYear(e.target.value)}
                className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm"
                required
              />
              <button 
                type="submit" 
                disabled={isAdding}
                className="md:col-span-3 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
              >
                {isAdding ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Add New Paper
              </button>
            </form>

            <div className="space-y-4">
              {isLoading ? <Loader2 className="animate-spin mx-auto text-indigo-500" /> : (
                papers.map(paper => (
                  <div key={paper.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-slate-50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800">{paper.title}</h4>
                      <p className="text-xs text-slate-500">{paper.subject} • {paper.month_year}</p>
                    </div>
                    <button onClick={() => deletePaper(paper.id)} className="p-2 text-slate-300 hover:text-red-500 transition">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 🎯 Quick Stats (Admin Only) */}
        <aside className="space-y-6">
          <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200">
            <LayoutDashboard className="mb-4 opacity-50" size={32} />
            <h3 className="text-lg font-bold mb-1">System Overview</h3>
            <p className="text-indigo-100 text-xs mb-6">Real-time portal metrics</p>
            
            <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-2xl">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-indigo-200">Total Papers</span>
                    <span className="text-3xl font-black">{papers.length}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-indigo-200">System Status</span>
                    <span className="text-sm font-bold flex items-center gap-2">
                        <div className="size-2 bg-emerald-400 rounded-full animate-ping" /> Live & Secure
                    </span>
                </div>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}