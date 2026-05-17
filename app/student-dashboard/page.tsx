"use client";

import { useEffect, useState } from "react";
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
  FileUp,
  Lock,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STUDENT_ANSWERS_BUCKET = "student-answers";

type Paper = { id: number; title: string; subject: string; course_id: number; };
type Submission = { id: string; created_at: string; status: string; total_mark: number | null; papers?: { title: string }; };

export default function StudentDashboard() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
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

  // 🎯 Z-Score Predictor States
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedStream, setSelectedStream] = useState("Maths");
  const [selectedDistrict, setSelectedDistrict] = useState("Colombo");
  const [mark1, setMark1] = useState("75");
  const [mark2, setMark2] = useState("75");
  const [mark3, setMark3] = useState("75");
  const [isCalculatingRank, setIsCalculatingRank] = useState(false);
  const [rankResult, setRankResult] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { router.replace("/"); return; }

      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      if (!roleData || roleData.role !== 'student') {
        alert("🛑 Access Denied! Students Only.");
        router.replace("/");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || "");
      setIsCheckingAccess(false);
      
      await fetchSubmissions(session.user.id);
      await fetchPapers(session.user.email || "");
    };
    void checkAccess();
    return () => { cancelled = true; };
  }, [router]);

  const fetchPapers = async (email: string) => {
    const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('student_email', email);
    if (!enrollments || enrollments.length === 0) { setAvailablePapers([]); return; }
    const courseIds = enrollments.map(e => e.course_id);
    const { data } = await supabase.from('papers').select('*').in('course_id', courseIds).order('id', { ascending: false });
    if (data) setAvailablePapers(data);
  };

  const fetchSubmissions = async (studentId: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('submissions').select('id, created_at, status, total_mark, papers(title)').eq('student_id', studentId).order('created_at', { ascending: false });
      if (data) setSubmissions(data as any);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  // 🎯 Rank Prediction Calculator Logic
  const handlePredictRank = async () => {
    setIsCalculatingRank(true);
    setRankResult(null);

    try {
      const { data, error } = await supabase
        .from('z_score_data')
        .select('*')
        .eq('year', parseInt(selectedYear))
        .eq('stream', selectedStream)
        .eq('district', selectedDistrict)
        .eq('sub1_mark', parseInt(mark1))
        .eq('sub2_mark', parseInt(mark2))
        .eq('sub3_mark', parseInt(mark3))
        .maybeSingle(); 

      if (error) throw error;

      if (data) {
        setRankResult(data);
      } else {
        const { data: closestData } = await supabase
          .from('z_score_data')
          .select('*')
          .eq('year', parseInt(selectedYear))
          .eq('stream', selectedStream)
          .eq('district', selectedDistrict)
          .order('z_score', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (closestData) {
          setRankResult({ ...closestData, note: "Showing closest matched prediction based on stream trend." });
        } else {
          alert("⚠️ No official rank data found for the selected combination in database.");
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsCalculatingRank(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedFile || !userId || !selectedPaperId) return;
    setIsUploading(true);
    try {
      const { error: studentError } = await supabase.from('students').upsert({ id: userId, email: userEmail });
      if (studentError) throw studentError;

      const submissionId = crypto.randomUUID();
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${submissionId}/answer_script.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(STUDENT_ANSWERS_BUCKET).upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('submissions').insert({ id: submissionId, student_id: userId, paper_id: parseInt(selectedPaperId), status: 'Pending', total_mark: null });
      if (dbError) throw dbError;

      alert("✅ Submitted!");
      setIsModalOpen(false); setSelectedFile(null); setSelectedPaperId("");
      await fetchSubmissions(userId);
    } catch (err: any) { alert("❌ " + err.message); } 
    finally { setIsUploading(false); }
  };

  const marksOptions = Array.from({ length: 101 }, (_, i) => i).reverse(); 

  if (isCheckingAccess) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-black tracking-tight text-indigo-900 dark:text-indigo-100 flex items-center gap-2"><Award className="text-indigo-600" /> Student Dashboard</h1>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2 text-sm font-bold"><LogOut size={16} /> Logout</button>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid md:grid-cols-[1fr_2fr] gap-8 mt-6">
        
        {/* වම් පැත්ත */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-xl text-white text-center">
            <h2 className="font-bold text-xl mb-1">New Exam?</h2>
            <p className="text-indigo-100 text-xs mb-6">Upload your answer script for review.</p>
            <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 shadow-lg"><UploadCloud size={18} /> Select & Upload</button>
          </div>

          {/* 🎯 Z-Score Predictor UI Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-xl space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2"><Sparkles className="text-amber-500" size={16} /> Z-Score & Rank Predictor</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">AL Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                  <option value="2025">2025 A/L</option>
                  <option value="2026">2026 A/L</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Stream</label>
                <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                  <option value="Maths">Maths</option>
                  <option value="Bio">Biology</option>
                  <option value="Commerce">Commerce</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Your District</label>
              <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                <option value="Colombo">Colombo</option>
                <option value="Gampaha">Gampaha</option>
                <option value="Kandy">Kandy</option>
                <option value="Galle">Galle</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Sub 1 Mark</label>
                <select value={mark1} onChange={e => setMark1(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                  {marksOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Sub 2 Mark</label>
                <select value={mark2} onChange={e => setMark2(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                  {marksOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Sub 3 Mark</label>
                <select value={mark3} onChange={e => setMark3(e.target.value)} className="w-full p-2 border rounded-xl text-xs bg-slate-50 font-bold outline-none">
                  {marksOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handlePredictRank} disabled={isCalculatingRank} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 shadow-md">
              {isCalculatingRank ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} Predict My Rank
            </button>

            {/* Result Display */}
            {rankResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-700">Official Prediction Results:</span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border"><span className="block text-[9px] font-bold text-slate-400 uppercase">Island Rank</span><span className="text-xl font-black text-slate-800">#{rankResult.island_rank}</span></div>
                  <div className="bg-white p-2 rounded-xl border"><span className="block text-[9px] font-bold text-slate-400 uppercase">District Rank</span><span className="text-xl font-black text-slate-800">#{rankResult.district_rank}</span></div>
                </div>
                <div className="bg-white p-2 rounded-xl border text-center"><span className="block text-[9px] font-bold text-slate-400 uppercase">Estimated Z-Score</span><span className="text-lg font-black text-emerald-600">{rankResult.z_score.toFixed(4)}</span></div>
                {rankResult.note && <p className="text-[9px] text-amber-600 text-center font-medium">{rankResult.note}</p>}
              </div>
            )}
          </div>
        </div>

        {/* දකුණු පැත්ත */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-xl">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100 border-b pb-4"><FileText size={20} className="text-indigo-500"/> My Submissions</h2>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Loader2 className="animate-spin mb-2 text-indigo-500" size={30} /><p className="text-sm">Loading records...</p></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700"><p className="text-slate-500 text-sm">You haven't submitted any papers yet.</p></div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-5 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md">
                  <div><h3 className="font-bold text-slate-700 dark:text-slate-200">{sub.papers?.title || `Exam Paper`}</h3><p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><FileText size={12}/> ID: #{sub.id.substring(0,6).toUpperCase()} • {new Date(sub.created_at).toLocaleDateString()}</p></div>
                  <div className="flex items-center gap-4 shrink-0">
                    {sub.status === 'Pending' ? <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1"><Clock size={12} /> Pending</span> : <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Marked ({sub.total_mark}/100)</span>}
                    {sub.status === 'Marked' && <Link href={`/student-view?id=${sub.id}`} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition shadow-md">View Results</Link>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><FileUp className="text-indigo-600" size={18} /> Upload Submission</h3><button onClick={() => !isUploading && setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition p-1"><X size={20} /></button></div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">1. Select Enrolled Paper</label>
                {availablePapers.length === 0 ? <div className="p-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium flex items-start gap-3"><Lock size={18} className="mt-0.5" /><p>You are not enrolled in any active courses yet.</p></div> : (
                  <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} disabled={isUploading} className="w-full p-3 border-2 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50 text-sm outline-none transition">
                    <option value="" disabled>-- Choose a paper --</option>
                    {availablePapers.map(paper => <option key={paper.id} value={paper.id}>{paper.title} ({paper.subject})</option>)}
                  </select>
                )}
              </div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">2. Attach Answer Script</label><input type="file" accept="image/*,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} disabled={isUploading || availablePapers.length === 0} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition disabled:opacity-50" /></div>
              <button onClick={handleFinalSubmit} disabled={isUploading || !selectedPaperId || !selectedFile || availablePapers.length === 0} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30">{isUploading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><UploadCloud size={18} /> Confirm Upload</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}