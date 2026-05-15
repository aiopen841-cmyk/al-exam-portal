"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Award,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STUDENT_ANSWERS_BUCKET = "student-answers";
const PLACEHOLDER_IMAGE_URL = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80";

type GradingPin = {
  id: string;
  percentX: number;
  percentY: number;
  audio_url?: string;
};

function StudentResultsCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get('id'); // 🎯 URL එකෙන් Paper ID එක ගන්නවා

  const [authReady, setAuthReady] = useState(false);
  const [paperImage, setPaperImage] = useState<string>(PLACEHOLDER_IMAGE_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [pins, setPins] = useState<GradingPin[]>([]);
  const [finalMarks, setFinalMarks] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        router.replace("/");
        return;
      }
      if (!paperId) {
        alert("No paper selected!");
        router.push("/student-dashboard");
        return;
      }
      setAuthReady(true);
      await fetchSpecificPaperAndResults(paperId);
    };
    void run();
    return () => { cancelled = true; };
  }, [router, paperId]);

  const fetchSpecificPaperAndResults = async (subId: string) => {
    setIsLoading(true);
    try {
      // 1. අදාළ පේපර් එකේ ලකුණු ගන්නවා
      const { data: subData } = await supabase
        .from('submissions')
        .select('total_mark, status')
        .eq('id', subId)
        .maybeSingle();

      if (subData && subData.total_mark !== null) {
        setFinalMarks(subData.total_mark.toString());
      }

      // 2. අදාළ පේපර් එකේ ෆොටෝ එක Storage එකෙන් ගන්නවා
      const { data: files } = await supabase.storage.from(STUDENT_ANSWERS_BUCKET).list(subId);
      if (files && files.length > 0) {
        const actualFile = files.find(f => f.name !== '.emptyFolderPlaceholder');
        if (actualFile) {
          const filePath = `${subId}/${actualFile.name}`;
          const { data } = supabase.storage.from(STUDENT_ANSWERS_BUCKET).getPublicUrl(filePath);
          setPaperImage(data.publicUrl);
        }
      }

      // 3. අදාළ පේපර් එකේ Feedback Pins ටික ගන්නවා
      const { data: pinsData } = await supabase
        .from("feedback_pins")
        .select("*")
        .eq("submission_id", subId) // 🎯 හරියටම මේ පේපර් එකේ පින් විතරයි!
        .order("created_at", { ascending: true });

      if (pinsData) {
        const formattedPins: GradingPin[] = pinsData.map((p) => ({
          id: crypto.randomUUID(),
          percentX: p.x_percent,
          percentY: p.y_percent,
          audio_url: p.audio_url
        }));
        setPins(formattedPins);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudioFeedback = (url?: string) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => console.error("Playback failed:", err));
  };

  if (!authReady) return <div className="p-10 text-center font-bold text-indigo-600">Authenticating Student...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/student-dashboard" className="p-2 border rounded-xl hover:bg-slate-100 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-lg font-bold tracking-tight text-indigo-900 dark:text-indigo-100">Student Results Portal</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[1fr_380px] gap-8">
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-5 shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Your Marked Submission</h2>
            {isLoading && <Loader2 className="animate-spin text-indigo-500" size={16}/>}
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
            <img src={paperImage} alt="Paper" className="w-full" draggable={false} />
            
            {pins.map((pin, i) => (
              <button 
                key={pin.id} 
                onClick={() => playAudioFeedback(pin.audio_url)}
                className="absolute size-10 bg-indigo-600 border-[3px] border-white rounded-full flex items-center justify-center text-white text-sm font-black shadow-2xl -translate-x-1/2 -translate-y-1/2 transition hover:scale-110 hover:bg-indigo-500 hover:shadow-indigo-500/50 cursor-pointer animate-in zoom-in" 
                style={{ left: `${pin.percentX}%`, top: `${pin.percentY}%` }}
                title="Click to play feedback"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6 h-fit">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Award size={100} /></div>
            <h2 className="font-bold text-lg mb-2 flex items-center gap-2 relative z-10">
              <CheckCircle2 size={20} /> Final Result
            </h2>
            <p className="text-indigo-100 text-sm mb-6 relative z-10">Your submission has been graded by the teacher.</p>
            
            <div className="flex items-end gap-2 relative z-10">
              {finalMarks ? (
                <>
                  <span className="text-6xl font-black tracking-tighter leading-none">{finalMarks}</span>
                  <span className="text-xl font-bold text-indigo-200 mb-1">/ 100</span>
                </>
              ) : (
                <span className="text-xl font-bold text-indigo-200">Pending Grading...</span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-xl">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <MapPin size={20} className="text-indigo-500"/> Teacher Feedback
            </h2>
            
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
              {pins.length === 0 && !isLoading && <p className="text-sm text-slate-400 text-center py-4">No feedback pins found.</p>}
              {pins.map((pin, i) => (
                <div key={pin.id} className="p-4 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 transition">
                  <div className="flex justify-between items-center mb-3">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">PIN {i + 1}</span>
                  </div>
                  {pin.audio_url ? (
                    <div className="w-full mt-2">
                      <audio controls src={pin.audio_url} className="w-full h-10 rounded-lg outline-none" />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">No audio attached.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// Next.js SearchParams Wrapper
export default function StudentViewPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-indigo-600">Loading Portal...</div>}>
      <StudentResultsCanvas />
    </Suspense>
  );
}