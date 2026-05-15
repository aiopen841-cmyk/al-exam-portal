"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  CheckCircle2,
  Clock,
  Hand,
  Loader2,
  LogOut,
  BookOpen,
  UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Submission = {
  id: string;
  created_at: string;
  status: string;
  total_mark: number | null;
  teacher_id: string | null;
  student_id: string;
};

export default function TeacherInboxPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
      await fetchAllSubmissions();
    };
    void run();
    return () => { cancelled = true; };
  }, [router]);

  const fetchAllSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setSubmissions(data);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎯 පේපර් එකක් ටීචර් තමන්ගේ නමට බාරගන්න ලොජික් එක
  const handleClaimPaper = async (submissionId: string) => {
    if (!userId) return;
    setClaimingId(submissionId);
    
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ teacher_id: userId })
        .eq('id', submissionId);

      if (error) throw error;
      
      // සාර්ථක නම් ලිස්ට් එක ආයෙත් අප්ඩේට් කරනවා
      await fetchAllSubmissions();
    } catch (err: any) {
      console.error("Error claiming paper:", err);
      alert("❌ Failed to claim paper: " + err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // පේපර්ස් වර්ග කරනවා
  const availablePapers = submissions.filter(s => s.status === 'Pending' && !s.teacher_id);
  const myClaimedPapers = submissions.filter(s => s.status === 'Pending' && s.teacher_id === userId);
  const myMarkedPapers = submissions.filter(s => s.status === 'Marked' && s.teacher_id === userId);

  if (!authReady) return <div className="p-10 text-center font-bold text-teal-600">Loading Teacher Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-black tracking-tight text-teal-900 dark:text-teal-100 flex items-center gap-2">
          <BookOpen className="text-teal-600" /> Teacher Portal
        </h1>
        <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2 text-sm font-bold">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-[1fr_350px] gap-8 mt-6">
        
        {/* 🎯 වම් පැත්ත: මගේ ගොඩ (My Workspace) */}
        <div className="space-y-8">
          
          {/* My Claimed Papers (බලන්න තියෙන ඒවා) */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-teal-100 dark:border-teal-900/50 p-6 shadow-xl">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-teal-800 dark:text-teal-400 border-b border-teal-50 pb-4">
              <UserCheck size={20} className="text-teal-500"/> My Assigned Papers (To Grade)
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-500" /></div>
            ) : myClaimedPapers.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">You haven't claimed any papers to grade yet.</p>
            ) : (
              <div className="space-y-4">
                {myClaimedPapers.map((sub, i) => (
                  <div key={sub.id} className="p-4 border border-teal-100 bg-teal-50/30 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800">Submission #{sub.id.substring(0, 6).toUpperCase()}</h3>
                      <p className="text-xs text-slate-500 mt-1">Claimed by you</p>
                    </div>
                    {/* 🎯 ඊළඟට අපි මේ බටන් එක අර Marking Canvas එකට ලින්ක් කරනවා */}
                    <Link 
                      href={`/teacher-dashboard?id=${sub.id}`} 
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition shadow-md"
                    >
                      Start Grading
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My Marked Papers (බලලා ඉවර ඒවා) */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-xl">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100 border-b pb-4">
              <CheckCircle2 size={20} className="text-emerald-500"/> Recently Graded By Me
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : myMarkedPapers.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No completed grades yet.</p>
            ) : (
              <div className="space-y-4">
                {myMarkedPapers.map((sub) => (
                  <div key={sub.id} className="p-4 border rounded-2xl flex items-center justify-between bg-slate-50">
                    <div>
                      <h3 className="font-bold text-slate-700">Submission #{sub.id.substring(0, 6).toUpperCase()}</h3>
                      <p className="text-xs text-slate-500">Graded on {new Date(sub.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-black text-lg text-emerald-600">{sub.total_mark} / 100</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 🎯 දකුණු පැත්ත: පොදු ගොඩ (Available Pool) */}
        <aside className="h-fit">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
            <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Inbox size={20} className="text-amber-400" /> Available Pool
            </h2>
            <p className="text-slate-400 text-xs mb-6">New submissions waiting for a teacher to claim.</p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-400" /></div>
              ) : availablePapers.length === 0 ? (
                <div className="text-center py-10 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                  <p className="text-slate-400 text-sm">Inbox is zero! 🎉<br/>No pending papers.</p>
                </div>
              ) : (
                availablePapers.map((sub) => (
                  <div key={sub.id} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 transition hover:border-slate-600">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-slate-200">Paper #{sub.id.substring(0, 6).toUpperCase()}</h3>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={10}/> {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-md">New</span>
                    </div>

                    <button 
                      onClick={() => handleClaimPaper(sub.id)}
                      disabled={claimingId === sub.id}
                      className="w-full py-3 bg-white text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-teal-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {claimingId === sub.id ? <Loader2 size={14} className="animate-spin"/> : <Hand size={14}/>}
                      Claim to Grade
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}