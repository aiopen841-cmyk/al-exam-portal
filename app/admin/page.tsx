"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  BookOpen, 
  Loader2,
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  Search
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Course = {
  id: number;
  name: string;
  description: string;
};

type Paper = {
  id: number;
  title: string;
  subject: string;
  month_year: string;
  course_id: number; // 🎯 අලුතින් එකතු කරපු කෑල්ල
};

type UserRole = {
  id: number;
  email: string;
  role: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  // Course States
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [isAddingCourse, setIsAddingCourse] = useState(false);

  // Paper States
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(""); // 🎯 පේපර් එකට අදාළ කෝස් එක තෝරන්න
  const [isAddingPaper, setIsAddingPaper] = useState(false);

  // User States
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
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
    const { data: cData } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (cData) setCourses(cData);

    const { data: pData } = await supabase.from('papers').select('*').order('created_at', { ascending: false });
    if (pData) setPapers(pData);

    const { data: rData } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (rData) setUserRoles(rData);

    setIsLoading(false);
  };

  // --- Course Logic ---
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingCourse(true);
    try {
      const { error } = await supabase.from('courses').insert({ name: courseName, description: courseDesc });
      if (error) throw error;
      alert("✅ New Course Created!");
      setCourseName(""); setCourseDesc("");
      fetchData();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAddingCourse(false);
    }
  };

  const deleteCourse = async (id: number) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    await supabase.from('courses').delete().eq('id', id);
    fetchData();
  };

  // --- Paper Logic ---
  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      alert("⚠️ Please select a course for this paper!");
      return;
    }
    setIsAddingPaper(true);
    try {
      const { error } = await supabase.from('papers').insert({ 
        title, 
        subject, 
        month_year: monthYear,
        course_id: parseInt(selectedCourseId) // 🎯 කෝස් එක සේව් කරනවා
      });
      if (error) throw error;
      alert("✅ New Paper Added!");
      setTitle(""); setSubject(""); setMonthYear(""); setSelectedCourseId("");
      fetchData();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAddingPaper(false);
    }
  };

  const deletePaper = async (id: number) => {
    if (!confirm("Delete this paper?")) return;
    await supabase.from('papers').delete().eq('id', id);
    fetchData();
  };

  // --- User Logic ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      const { error } = await supabase.from('user_roles').insert({ email: newUserEmail.toLowerCase(), role: newUserRole });
      if (error) throw error;
      alert("✅ Access Granted!");
      setNewUserEmail("");
      fetchData();
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const deleteUserRole = async (id: number) => {
    if (!confirm("Remove access?")) return;
    await supabase.from('user_roles').delete().eq('id', id);
    fetchData();
  };

  const filteredUsers = userRoles.filter(user => 
    user.email.toLowerCase().includes(searchUser.toLowerCase()) || 
    user.role.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (isCheckingAccess) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <header className="max-w-6xl mx-auto mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="text-indigo-600" size={36} /> Admin Panel
        </h1>
      </header>

      <main className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_350px] gap-8">
        
        <div className="space-y-12">
          
          {/* 🎯 Course Management */}
          <section className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 shadow-xl border-t-8 border-t-indigo-600">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-indigo-600">
                <GraduationCap /> Manage Courses
            </h2>
            <form onSubmit={handleAddCourse} className="grid md:grid-cols-3 gap-4 mb-8 p-6 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200">
              <input placeholder="Course Name (e.g. Physics 2026)" value={courseName} onChange={e => setCourseName(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm" required />
              <input placeholder="Short Description" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-indigo-500 text-sm" />
              <button type="submit" disabled={isAddingCourse} className="py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition">
                {isAddingCourse ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Create Course
              </button>
            </form>
            <div className="grid md:grid-cols-2 gap-4">
              {courses.map(course => (
                <div key={course.id} className="p-5 border-2 border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition bg-white shadow-sm">
                  <div>
                    <h4 className="font-bold text-slate-800">{course.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{course.description || "No description"}</p>
                  </div>
                  <button onClick={() => deleteCourse(course.id)} className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition shadow-sm flex items-center gap-2 text-xs font-bold">
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 🎯 User Management (with Search) */}
          <section className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 shadow-xl border-t-8 border-t-emerald-600">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-emerald-600">
                <UserPlus /> Manage Users & Access
            </h2>
            <form onSubmit={handleAddUser} className="grid md:grid-cols-4 gap-4 mb-8 p-6 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200">
              <input type="email" placeholder="Gmail Address" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="md:col-span-2 p-3 rounded-xl border-2 outline-none focus:border-emerald-500 text-sm" required />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-emerald-500 text-sm font-bold">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={isAddingUser} className="py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition">
                {isAddingUser ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Grant Access
              </button>
            </form>

            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search by email or role..." 
                value={searchUser} onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 transition text-sm text-slate-700"
              />
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No users found.</div>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-xl text-sm hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.role === 'admin' ? 'bg-rose-100 text-rose-700' : user.role === 'teacher' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>{user.role}</span>
                      <span className="font-medium text-slate-700">{user.email}</span>
                    </div>
                    {user.role !== 'admin' && (
                      <button onClick={() => deleteUserRole(user.id)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 🎯 Paper Management (Now with Course Linking!) */}
          <section className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 shadow-xl border-t-8 border-t-amber-600">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-amber-600">
                <BookOpen /> Manage Exam Papers
            </h2>
            <form onSubmit={handleAddPaper} className="grid md:grid-cols-2 gap-4 mb-8 p-6 bg-amber-50/50 rounded-2xl border-2 border-dashed border-amber-200">
              <input placeholder="Paper Title (e.g. Model Paper 1)" value={title} onChange={e => setTitle(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-amber-500 text-sm" required />
              <input placeholder="Subject (e.g. Combined Maths)" value={subject} onChange={e => setSubject(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-amber-500 text-sm" required />
              <input placeholder="Month/Year (e.g. Aug 2026)" value={monthYear} onChange={e => setMonthYear(e.target.value)} className="p-3 rounded-xl border-2 outline-none focus:border-amber-500 text-sm" required />
              
              {/* 🎯 Course Dropdown */}
              <select 
                value={selectedCourseId} 
                onChange={e => setSelectedCourseId(e.target.value)} 
                className="p-3 rounded-xl border-2 outline-none focus:border-amber-500 text-sm font-bold text-slate-700"
                required
              >
                <option value="" disabled>-- Select Assigned Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button type="submit" disabled={isAddingPaper || courses.length === 0} className="md:col-span-2 py-3 bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition disabled:opacity-50">
                {isAddingPaper ? <Loader2 className="animate-spin"/> : <Plus size={20}/>} Add New Paper
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {papers.map(paper => {
                // 🎯 අදාළ කෝස් එකේ නම හොයාගන්නවා
                const courseName = courses.find(c => c.id === paper.course_id)?.name || "Unassigned";
                
                return (
                  <div key={paper.id} className="flex items-center justify-between p-3 border rounded-xl text-sm hover:bg-slate-50 transition">
                    <div>
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        {paper.title} 
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{courseName}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">{paper.subject} • {paper.month_year}</p>
                    </div>
                    <button onClick={() => deletePaper(paper.id)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 🎯 Quick Stats Sidebar */}
        <aside className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl">
            <LayoutDashboard className="mb-4 opacity-50 text-indigo-400" size={32} />
            <h3 className="text-lg font-bold mb-6">System Status</h3>
            <div className="space-y-6">
                
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
                    <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Courses</span>
                    <span className="text-3xl font-black text-indigo-400">{courses.length}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Papers</span>
                    <span className="text-3xl font-black text-amber-400">{papers.length}</span>
                </div>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}