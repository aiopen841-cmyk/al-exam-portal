"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Users, 
  BookOpen, 
  Loader2,
  LayoutDashboard,
  UserPlus
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Paper = {
  id: number;
  title: string;
  subject: string;
  month_year: string;
};

type UserRole = {
  id: number;
  email: string;
  role: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  // New Paper States
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [isAddingPaper, setIsAddingPaper] = useState(false);

  // New User States
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/");
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (!roleData || roleData.role !== 'admin') {
        alert("🛑 Access Denied! Admins Only.");
        router.push("/");
        return;
      }

      setIsCheckingAccess(false);
      fetchData();
    };

    checkAccess();
  }, [router]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch Papers
    const { data: papersData } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
    if (papersData) setPapers(papersData);

    // Fetch User Roles
    const { data: rolesData } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (rolesData) setUserRoles(rolesData);

    setIsLoading(false);
  };

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingPaper(true);
    try {
      const { error } = await supabase.from('papers').insert({ title, subject, month_year: monthYear });
      if (error) throw error;
      alert("✅ New Paper Added!");
      setTitle(""); setSubject(""); setMonthYear("");
      fetchData();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAddingPaper(false);
    }
  };

  const deletePaper = async (id: number) => {
    if (!confirm("Are you sure you want to delete this paper?")) return;
    await supabase.from('papers').delete().eq('id', id);
    fetchData();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;
    
    setIsAddingUser(true);
    try {
      const { error } = await supabase.from('user_roles').insert({ 
        email: newUserEmail.toLowerCase(), 
        role: newUserRole 
      });

      if (error) {
        if (error.code === '23505') throw new Error("This email is already in the system!");
        throw error;
      }

      alert(`✅ ${newUserRole.toUpperCase()} Added Successfully!`);
      setNewUserEmail("");
      fetchData();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const deleteUserRole = async (id: number) => {
    if (!confirm("Are you sure you want to remove this user's access?")) return;
    await supabase.from('user_roles').delete().eq('id', id);
    fetchData();
  };

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
        
        <div className="space-y-8">
          {/* 🎯 User Management Section */}
          <section className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                <UserPlus className="text-emerald-600" /> Manage Users & Access
            </h2>
            
            <form onSubmit={handleAddUser} className="grid md:grid-cols-4 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900">
              <input 
                type="email"
                placeholder="User's Gmail Address" 
                value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                className="md:col-span-2 p-3 rounded-xl border-2 outline-none focus:border-emerald-500 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                required
              />
              <select 
                value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                className="p-3 rounded-xl border-2 outline-none focus:border-emerald-500 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <button 
                type="submit" disabled={isAddingUser}
                className="py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
              >
                {isAddingUser ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Grant Access
              </button>
            </form>

            {/* List of Users */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {isLoading ? <Loader2 className="animate-spin mx-auto text-emerald-500 mt-4" /> : (
                userRoles.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        user.role === 'admin' ? 'bg-rose-100 text-rose-700' : 
                        user.role === 'teacher' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {user.role}
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
                    </div>
                    {user.role !== 'admin' && (
                      <button onClick={() => deleteUserRole(user.id)} className="p-2 text-slate-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 🎯 Paper Management Section */}
          <section className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                <BookOpen className="text-indigo-600" /> Manage Exam Papers
            </h2>
            
            <form onSubmit={handleAddPaper} className="grid md:grid-cols-3 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900">
              <input placeholder="Paper Title (e.g. Model Paper 05)" value={title} onChange={e => setTitle(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100" required />
              <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100" required />
              <input placeholder="Month/Year" value={monthYear} onChange={e => setMonthYear(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-100" required />
              <button type="submit" disabled={isAddingPaper} className="md:col-span-3 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition">
                {isAddingPaper ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Add New Paper
              </button>
            </form>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {isLoading ? <Loader2 className="animate-spin mx-auto text-indigo-500 mt-4" /> : (
                papers.map(paper => (
                  <div key={paper.id} className="flex items-center justify-between p-3 border dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{paper.title}</h4>
                      <p className="text-xs text-slate-500">{paper.subject} • {paper.month_year}</p>
                    </div>
                    <button onClick={() => deletePaper(paper.id)} className="p-2 text-slate-300 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* 🎯 Quick Stats Sidebar */}
        <aside className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200 dark:shadow-none">
            <LayoutDashboard className="mb-4 opacity-50 text-indigo-400" size={32} />
            <h3 className="text-lg font-bold mb-1">System Overview</h3>
            <p className="text-slate-400 text-xs mb-6">Real-time portal metrics</p>
            
            <div className="space-y-4">
                {/* 🎯 අලුත් Users ගණන් කරන කෑල්ල */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-white/10 pb-2 mb-2">Registered Users</span>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-medium">Students</span>
                      <span className="font-black text-indigo-400">{userRoles.filter(u => u.role === 'student').length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-medium">Teachers</span>
                      <span className="font-black text-teal-400">{userRoles.filter(u => u.role === 'teacher').length}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 font-medium">Admins</span>
                      <span className="font-black text-rose-400">{userRoles.filter(u => u.role === 'admin').length}</span>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400">Total Papers</span>
                    <span className="text-3xl font-black text-indigo-400">{papers.length}</span>
                </div>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}