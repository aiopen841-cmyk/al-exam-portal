"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Mic,
  PenLine,
  Square,
  Trash2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const TEACHER_AUDIO_BUCKET = "teacher-audio";
const STUDENT_ANSWERS_BUCKET = "student-answers";

const PLACEHOLDER_IMAGE_URL = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80";

type GradingPin = {
  id: string;
  percentX: number;
  percentY: number;
};

type PinUploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; path: string }
  | { status: "error"; message: string };

export default function TeacherMarkingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pins, setPins] = useState<GradingPin[]>([]);
  const [recordingPinId, setRecordingPinId] = useState<string | null>(null);
  const [uploadByPinId, setUploadByPinId] = useState<Record<string, PinUploadState>>({});
  
  const [paperImage, setPaperImage] = useState<string>(PLACEHOLDER_IMAGE_URL);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [scanStatus, setScanStatus] = useState<string>("Initializing scan...");

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pinsRef = useRef<GradingPin[]>(pins);

  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

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
      
      // ලොග් වුණ ගමන් සුපිරි ස්කෑන් එක පටන් ගන්නවා
      await fetchLatestPaper();
    };

    void run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user?.id) {
        setUserId(session.user.id);
        setAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchLatestPaper = async () => {
    setIsLoadingImage(true);
    setScanStatus("Scanning bucket...");
    console.log("🚀 STARTING SUPER SCAN...");

    try {
      // 1. මුලින්ම බකට් එකේ රූට් එකේ තියෙන ඔක්කොම ලිස්ට් කරමු
      const { data: rootItems, error: rootError } = await supabase.storage
        .from(STUDENT_ANSWERS_BUCKET)
        .list("");

      if (rootError) throw rootError;

      // Console එකේ බකට් එකේ තියෙන දේවල් වල නම් මෙතනින් බලාගන්න පුළුවන්
      console.log("📂 Items found in root:", rootItems?.map(i => i.name));

      let allFoundFiles: { path: string; created_at: string }[] = [];

      for (const item of rootItems || []) {
        if (item.name === ".emptyFolderPlaceholder") continue;

        // මේක ෆයිල් එකක් නම් (metadata තියෙනවා නම්)
        if (item.metadata) {
          allFoundFiles.push({ path: item.name, created_at: item.created_at ?? "" });
        } else {
          // මේක ෆෝල්ඩර් එකක් වෙන්න ඕනේ, ඒක ඇතුළත් බලමු
          console.log(`📂 Scanning sub-folder: ${item.name}`);
          const { data: subFiles } = await supabase.storage
            .from(STUDENT_ANSWERS_BUCKET)
            .list(item.name);
          
          subFiles?.forEach(f => {
            if (f.name !== ".emptyFolderPlaceholder") {
              allFoundFiles.push({ path: `${item.name}/${f.name}`, created_at: f.created_at ?? "" });
            }
          });
        }
      }

      console.log("📄 Total files detected:", allFoundFiles);

      if (allFoundFiles.length > 0) {
        // අලුත්ම එක තෝරාගැනීම
        allFoundFiles.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const latest = allFoundFiles[0];
        const { data } = supabase.storage
          .from(STUDENT_ANSWERS_BUCKET)
          .getPublicUrl(latest.path);
        
        console.log("🎯 SUCCESS! Loading URL:", data.publicUrl);
        setPaperImage(data.publicUrl);
        setScanStatus("Paper loaded!");
      } else {
        console.warn("⚠️ No valid files found.");
        setScanStatus("No submissions found.");
      }

    } catch (err) {
      console.error("❌ Scan Error:", err);
      setScanStatus("Scan failed.");
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPins((prev) => [
      ...prev,
      { id: crypto.randomUUID(), percentX: Math.min(100, Math.max(0, x)), percentY: Math.min(100, Math.max(0, y)) },
    ]);
  };

  const removePin = (id: string) => setPins((prev) => prev.filter((p) => p.id !== id));

  const startRecording = async (pinId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      recorder.onstop = () => {
        setRecordingPinId(null);
        // මෙතනට පස්සේ Audio Upload logic එක දාන්න පුළුවන්
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingPinId(pinId);
    } catch (err) {
      alert("Microphone access denied!");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  if (!authReady) return <div className="flex h-screen items-center justify-center font-medium">Authenticating...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 border rounded-xl hover:bg-slate-100 transition"><ArrowLeft size={20}/></Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold uppercase tracking-tight text-slate-500">Teacher Panel</h1>
            <p className="text-lg font-black leading-none">Marking Canvas</p>
          </div>
        </div>
        <div className="text-xs font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center gap-2">
          <div className={`size-2 rounded-full ${paperImage !== PLACEHOLDER_IMAGE_URL ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {scanStatus}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Paper Display */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-5 shadow-2xl shadow-slate-200/40 dark:shadow-none">
          <div className="flex justify-between items-center mb-5 border-b pb-4 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Exam Submission</h2>
            {isLoadingImage && <Loader2 className="animate-spin text-teal-500" size={18}/>}
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={paperImage} 
              alt="Student Submission" 
              className={`w-full cursor-crosshair transition-all duration-700 ${isLoadingImage ? 'opacity-40 blur-md' : 'opacity-100 blur-0'}`}
              onClick={handleImageClick}
              draggable={false}
            />
            
            {/* Display Pins */}
            {pins.map((pin, i) => (
              <div 
                key={pin.id}
                className="absolute size-9 bg-red-600 border-[3px] border-white rounded-full flex items-center justify-center text-white text-xs font-black shadow-2xl -translate-x-1/2 -translate-y-1/2 animate-in zoom-in duration-300"
                style={{ left: `${pin.percentX}%`, top: `${pin.percentY}%` }}
              >
                {i + 1}
              </div>
            ))}

            {/* Error Message if still placeholder */}
            {paperImage === PLACEHOLDER_IMAGE_URL && !isLoadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="text-amber-500" size={40}/>
                  <p className="text-sm font-bold text-slate-700">No student papers detected yet.<br/>Showing default view.</p>
                  <button onClick={fetchLatestPaper} className="mt-2 text-xs font-bold text-teal-600 underline">Try Scanning Again</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600"><MapPin size={20}/></div>
              <h2 className="font-bold text-lg tracking-tight">Feedback Pins</h2>
            </div>

            <div className="space-y-4">
              {pins.length === 0 ? (
                <div className="py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center gap-3">
                  <PenLine className="text-slate-200 dark:text-slate-700" size={48}/>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Click the paper<br/>to add pins</p>
                </div>
              ) : (
                pins.map((pin, i) => (
                  <div key={pin.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40 transition hover:ring-2 hover:ring-red-500/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-red-500/30">PIN {i + 1}</span>
                      <button onClick={() => removePin(pin.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"><Trash2 size={16}/></button>
                    </div>
                    
                    {recordingPinId === pin.id ? (
                      <button onClick={stopRecording} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-none transition-all scale-[0.98]">
                        <Square size={14} fill="white"/> Stop & Review
                      </button>
                    ) : (
                      <button 
                        onClick={() => startRecording(pin.id)} 
                        className="w-full py-3 bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Mic size={14}/> Record Feedback
                      </button>
                    )}
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