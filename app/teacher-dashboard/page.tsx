"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Mic,
  Square,
  Trash2,
  CheckCircle2,
  Award
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const TEACHER_AUDIO_BUCKET = "teacher-audio";
const STUDENT_ANSWERS_BUCKET = "student-answers";
const PLACEHOLDER_IMAGE_URL = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80";

type GradingPin = {
  id: string;
  percentX: number;
  percentY: number;
  audio_url?: string;
};

type PinUploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; path: string }
  | { status: "error"; message: string };

function MarkingCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get('id'); // 🎯 URL එකෙන් Paper ID එක ගන්නවා

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pins, setPins] = useState<GradingPin[]>([]);
  const [recordingPinId, setRecordingPinId] = useState<string | null>(null);
  const [uploadByPinId, setUploadByPinId] = useState<Record<string, PinUploadState>>({});
  
  const [paperImage, setPaperImage] = useState<string>(PLACEHOLDER_IMAGE_URL);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  const [marks, setMarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (!paperId) {
        alert("No paper selected!");
        router.push("/teacher");
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
      
      // 🎯 අදාළ පේපර් එකට අදාල දේවල් විතරක් ගන්නවා
      await fetchSpecificPaper(paperId);
      await fetchExistingPins(paperId);
    };
    void run();
    return () => { cancelled = true; };
  }, [router, paperId]);

  const fetchExistingPins = async (subId: string) => {
    const { data, error } = await supabase
      .from("feedback_pins")
      .select("*")
      .eq("submission_id", subId) // 🎯 මේ පේපර් එකේ පින් විතරක් ගන්නවා
      .order("created_at", { ascending: true });

    if (data) {
      const formattedPins: GradingPin[] = data.map((p) => ({
        id: crypto.randomUUID(),
        percentX: p.x_percent,
        percentY: p.y_percent,
        audio_url: p.audio_url
      }));
      setPins(formattedPins);
      const uploadStates: Record<string, PinUploadState> = {};
      formattedPins.forEach((p) => {
        if (p.audio_url) uploadStates[p.id] = { status: "done", path: p.audio_url };
      });
      setUploadByPinId(uploadStates);
    }
  };

  const fetchSpecificPaper = async (subId: string) => {
    setIsLoadingImage(true);
    try {
      // ලකුණු තියෙනවද බලනවා
      const { data: subData } = await supabase
        .from('submissions')
        .select('total_mark')
        .eq('id', subId)
        .maybeSingle();

      if (subData && subData.total_mark !== null) {
        setMarks(subData.total_mark.toString());
      }

      // බකට් එකෙන් අදාළ ෆෝල්ඩර් එකේ ෆොටෝ එක ගන්නවා
      const { data: files } = await supabase.storage.from(STUDENT_ANSWERS_BUCKET).list(subId);
      if (files && files.length > 0) {
        const actualFile = files.find(f => f.name !== '.emptyFolderPlaceholder');
        if (actualFile) {
          const filePath = `${subId}/${actualFile.name}`;
          const { data } = supabase.storage.from(STUDENT_ANSWERS_BUCKET).getPublicUrl(filePath);
          setPaperImage(data.publicUrl);
        }
      } else {
        alert("Could not find the uploaded image for this paper.");
      }
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleRemovePin = async (pinId: string, audioUrl?: string) => {
    setPins(prev => prev.filter(p => p.id !== pinId));
    if (audioUrl) {
      await supabase.from("feedback_pins").delete().eq("audio_url", audioUrl);
    }
  };

  const uploadBlobForPin = async (pinId: string, pinIndex: number, percentX: number, percentY: number, blob: Blob) => {
    if (!userId || !paperId) return;
    setUploadByPinId((prev) => ({ ...prev, [pinId]: { status: "uploading" } }));
    const path = `${userId}/pin-${Date.now()}.webm`;
    const { error: storageError, data: storageData } = await supabase.storage
      .from(TEACHER_AUDIO_BUCKET)
      .upload(path, blob, { contentType: 'audio/webm' });

    if (storageError) return;
    const { data: { publicUrl } } = supabase.storage.from(TEACHER_AUDIO_BUCKET).getPublicUrl(storageData.path);

    // 🎯 සේව් කරද්දී submission_id එකත් යවනවා
    await supabase.from("feedback_pins").insert({
      submission_id: paperId, 
      pin_number: pinIndex + 1,
      x_percent: percentX,
      y_percent: percentY,
      audio_url: publicUrl,
    });

    setPins(prev => prev.map(p => p.id === pinId ? { ...p, audio_url: publicUrl } : p));
    setUploadByPinId((prev) => ({ ...prev, [pinId]: { status: "done", path: storageData.path } }));
  };

  const startRecording = async (pinId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const idx = pinsRef.current.findIndex(p => p.id === pinId);
        if (idx !== -1) uploadBlobForPin(pinId, idx, pinsRef.current[idx].percentX, pinsRef.current[idx].percentY, blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingPinId(pinId);
    } catch (err) {
      alert("Microphone denied!");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setRecordingPinId(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPins((prev) => [...prev, { id: crypto.randomUUID(), percentX: x, percentY: y }]);
  };

  const handleFinalSubmit = async () => {
    if (!marks || isNaN(Number(marks))) {
      alert("Please enter a valid mark!");
      return;
    }
    if (!paperId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ total_mark: Number(marks), status: 'Marked' })
        .eq('id', paperId);

      if (error) throw error;
      alert(`🎉 Final Grade: ${marks}/100 submitted successfully!`);
      router.push('/teacher'); // 🎯 Submit කරාම ආයේ Inbox එකට යනවා
    } catch (err: any) {
      alert("❌ Database Error: " + err.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady) return <div className="p-10 text-center font-bold">Authenticating...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="p-2 border rounded-xl hover:bg-slate-100 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-lg font-bold tracking-tight">Teacher Marking Canvas</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[1fr_380px] gap-8">
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-5 shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Submission Preview</h2>
            {isLoadingImage && <Loader2 className="animate-spin text-teal-500" size={16}/>}
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
            <img src={paperImage} alt="Paper" className="w-full cursor-crosshair" onClick={handleImageClick} draggable={false} />
            {pins.map((pin, i) => (
              <div 
                key={pin.id} 
                className="absolute size-9 bg-red-600 border-[3px] border-white rounded-full flex items-center justify-center text-white text-xs font-black shadow-2xl -translate-x-1/2 -translate-y-1/2" 
                style={{ left: `${pin.percentX}%`, top: `${pin.percentY}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6 h-fit">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-xl">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><MapPin size={20} className="text-red-500"/> Feedback Pins</h2>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {pins.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No pins added yet.</p>}
              {pins.map((pin, i) => (
                <div key={pin.id} className="p-4 border rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 transition">
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full shadow-sm">PIN {i + 1}</span>
                    <button onClick={() => handleRemovePin(pin.id, pin.audio_url)} className="text-slate-400 hover:text-red-600 p-1 transition-colors"><Trash2 size={16}/></button>
                  </div>

                  {recordingPinId === pin.id ? (
                    <button onClick={stopRecording} className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse shadow-md">
                      <Square size={14} fill="white"/> Stop & Save
                    </button>
                  ) : pin.audio_url ? (
                    <div className="w-full mt-2">
                      <audio controls src={pin.audio_url} className="w-full h-10 rounded-lg outline-none" />
                    </div>
                  ) : (
                    <button 
                      onClick={() => startRecording(pin.id)} 
                      disabled={uploadByPinId[pin.id]?.status === "uploading"} 
                      className="w-full py-3 bg-slate-900 dark:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition hover:bg-slate-800"
                    >
                      <Mic size={14}/> {uploadByPinId[pin.id]?.status === "uploading" ? "Uploading..." : "Record Voice Feedback"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border p-6 shadow-xl border-teal-100 dark:border-teal-900/50">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <Award size={20} /> Final Grading
            </h2>
            <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <input 
                type="number" 
                value={marks} 
                onChange={(e) => setMarks(e.target.value)} 
                placeholder="00" 
                min="0"
                max="100"
                className="w-20 p-3 border-2 border-slate-200 focus:border-teal-500 rounded-xl text-center font-black text-xl text-slate-800 outline-none transition bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700" 
              />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">/ 100 Marks</span>
            </div>

            <button 
              onClick={handleFinalSubmit} 
              disabled={isSubmitting} 
              className="w-full py-4 bg-teal-600 text-white rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition hover:bg-teal-700 shadow-lg shadow-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 size={18} /> Submit Final Grade</>
              )}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

// Next.js වල SearchParams පාවිච්චි කරද්දී මේක දාන්නම ඕනේ 
export default function TeacherMarkingPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Loading Canvas...</div>}>
      <MarkingCanvas />
    </Suspense>
  );
}