"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Loader2,
  LogOut,
  X,
  FileUp
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STUDENT_ANSWERS_BUCKET = "student-answers";

type Paper = {
  id: number;
  title: string;
  subject: string;
};

type Submission = {
  id: string;
  created_at: string;
  status: string;
  total_mark: number | null;
  papers?: { title: string }; // 🎯 පේපර් එකේ නම අදින්න
};

export default function StudentDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availablePapers, setAvailablePapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      setUserEmail(session.user.email || "unknown@student.com");
      setAuthReady(true);
      
      await fetchSubmissions(session.user.id);
      await fetchPapers();
    };
    void run();
    return () => { cancelled = true; };
  }, [router]);

  // 🎯 Database එකෙන් පේපර්ස් ලිස්ට් එක ගන්නවා
  const fetchPapers = async () => {
    const { data, error } = await supabase.from('papers').select('*').order('id', { ascending: false });
    if (data) setAvailablePapers(data);
  };

  const fetchSubmissions = async (studentId: string) => {
    setIsLoading(true);
    try {
      // 🎯 submissions ටේබල් එකයි papers ටේබල් එකයි Join කරලා පේපර් එකේ නමත් අරන් එනවා
      const { data, error } = await supabase
        .from('submissions')
        .select('id, created_at, status, total_mark, papers(title)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (data) setSubmissions(data as any);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedFile || !userId || !selectedPaperId) {
      alert("Please select a paper and a file first!");
      return;
    }

    setIsUploading(true);
    try {
      const { error: studentError } = await supabase
        .from('students')
        .upsert({ id: userId, email: userEmail });

      if (studentError) throw new Error("STUDENT_TABLE_ERROR: " + studentError.message);

      const submissionId = crypto.randomUUID();
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${submissionId}/answer_script.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(STUDENT_ANSWERS_BUCKET)
        .upload(filePath, selectedFile);

      if (uploadError) throw new Error("STORAGE_ERROR: " + uploadError.message);

      const { error: dbError } = await supabase
        .from('submissions')
        .insert({
          id: submissionId,
          student_id: userId,
          paper_id: parseInt(selectedPaperId), // 🎯 තෝරපු පේපර් එකේ ID එක යවනවා
          status: 'Pending',
          total_mark: null
        });

      if (dbError) throw new Error("SUBMISSIONS_TABLE_ERROR: " + dbError.message);

      alert("✅ Answer script submitted successfully!");
      setIsModalOpen(false);
      setSelectedFile(null);
      setSelectedPaperId("");
      await fetchSubmissions(userId); 

    } catch (err: any) {
      console.error("Upload error:", err);
      alert("❌ " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!authReady) return <div className="p-10 text-center font-bold text-indigo-600">Loading Student Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-black tracking-tight text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
          <Award className="text-indigo-600" /> Student Dashboard
        </h1>
        <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2 text-sm font-bold">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-[1fr_2fr] gap-8 mt-6">
        
        {/* වම් පැත්ත: Upload Trigger Button */}
        <aside className="h-fit">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 shadow-xl shadow-indigo-600/20 text-white text-center">
            <h2 className="font-bold text-2xl mb-2">New Exam?</h2>
            <p className="text-indigo-100 text-sm mb-8">Select an exam paper and upload your answer script.</p>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              <UploadCloud size={20} /> Select & Upload
            </button>
          </div>
        </aside>

        {/* දකුණු පැත්ත: Submissions List */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-xl">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100 border-b pb-4">
            <FileText size={20} className="text-indigo-500"/> My Submissions
          </h2>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mb-2 text-indigo-500" size={30} />
              <p className="text-sm">Loading your records...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 text-sm">You haven't submitted any papers yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-5 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md">
                  
                  <div>
                    {/* 🎯 දැන් පේන්නේ අදාළ පේපර් එකේ නමයි! */}
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">
                      {sub.papers?.title || `Exam Paper`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <FileText size={12}/> ID: #{sub.id.substring(0,6).toUpperCase()} • {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {sub.status === 'Pending' ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                        <Clock size={12} /> Pending
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Marked ({sub.total_mark}/100)
                      </span>
                    )}

                    {sub.status === 'Marked' && (
                      <Link 
                        href={`/student-view?id=${sub.id}`} 
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition shadow-md"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 🎯 Upload Modal (Pop-up Box) එක */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileUp className="text-indigo-600" size={18} /> Upload Submission
              </h3>
              <button onClick={() => !isUploading && setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Dropdown එක */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">1. Select Exam Paper</label>
                <select 
                  value={selectedPaperId} 
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  disabled={isUploading}
                  className="w-full p-3 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none transition"
                >
                  <option value="" disabled>-- Choose a paper --</option>
                  {availablePapers.map(paper => (
                    <option key={paper.id} value={paper.id}>{paper.title} ({paper.subject})</option>
                  ))}
                </select>
              </div>

              {/* File Picker එක */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">2. Attach Answer Script</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                />
              </div>

              <button 
                onClick={handleFinalSubmit}
                disabled={isUploading || !selectedPaperId || !selectedFile}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
              >
                {isUploading ? (
                  <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                ) : (
                  <><UploadCloud size={18} /> Confirm Upload</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}