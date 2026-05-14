"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Mic,
  PenLine,
  Square,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const TEACHER_AUDIO_BUCKET = "teacher-audio";
const STUDENT_ANSWERS_BUCKET = "student-answers"; // ළමයින්ගේ බකට් එක ඇඩ් කරා

// මේක පාවිච්චි වෙන්නේ බකට් එකේ මුකුත් නැත්නම් විතරයි
const PLACEHOLDER_IMAGE_URL =
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80";

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

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

export default function TeacherMarkingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pins, setPins] = useState<GradingPin[]>([]);
  const [recordingPinId, setRecordingPinId] = useState<string | null>(null);
  const [uploadByPinId, setUploadByPinId] = useState<Record<string, PinUploadState>>({});
  
  // අලුතින් දාපු State ටික
  const [paperImage, setPaperImage] = useState<string>(PLACEHOLDER_IMAGE_URL);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pinsRef = useRef<GradingPin[]>(pins);
  const skipUploadRef = useRef(false);

  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  // Auth චෙක් කරන එක සහ අලුත්ම පේපර් එක අදින කෑල්ල
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
      
      // අලුත්ම උත්තර පත්‍රය Supabase එකෙන් හොයාගෙන එනවා
      fetchLatestPaper();
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user?.id) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  // අලුත්ම ෆොටෝ එක හොයන ෆන්ක්ෂන් එක
  const fetchLatestPaper = async () => {
    setIsLoadingImage(true);
    try {
      // 1. answers කියන එක ඇතුළේ තියෙන ෆෝල්ඩර හොයනවා
      const { data: folders, error: folderError } = await supabase.storage
        .from(STUDENT_ANSWERS_BUCKET)
        .list("answers");

      if (folderError || !folders || folders.length === 0) {
        setIsLoadingImage(false);
        return;
      }

      let latestFile: any = null;
      let latestPath = "";

      // 2. හැම ෆෝල්ඩරේකටම ගිහින් අලුත්ම ෆොටෝ එක මොකක්ද බලනවා
      for (const folder of folders) {
        if (!folder.id) continue;
        const { data: files } = await supabase.storage
          .from(STUDENT_ANSWERS_BUCKET)
          .list(`answers/${folder.name}`);
          
        if (files) {
          for (const file of files) {
            if (file.name === ".emptyFolderPlaceholder") continue;
            // අලුත්ම එක හොයාගන්නවා (Date එක බලලා)
            if (!latestFile || new Date(file.created_at) > new Date(latestFile.created_at)) {
              latestFile = file;
              latestPath = `answers/${folder.name}/${file.name}`;
            }
          }
        }
      }

      // 3. ෆොටෝ එකක් හම්බවුණා නම් ඒකේ ලින්ක් එක අරන් පේජ් එකට දානවා
      if (latestPath) {
        const { data } = supabase.storage
          .from(STUDENT_ANSWERS_BUCKET)
          .getPublicUrl(latestPath);
        setPaperImage(data.publicUrl);
      }
    } catch (err) {
      console.error("Error fetching image:", err);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const stopMediaTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      skipUploadRef.current = true;
      mediaRecorderRef.current?.stop();
      stopMediaTracks();
    };
  }, [stopMediaTracks]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(100, Math.max(0, x));
    const clampedY = Math.min(100, Math.max(0, y));
    setPins((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        percentX: clampedX,
        percentY: clampedY,
      },
    ]);
  };

  const removePin = (id: string) => {
    if (recordingPinId === id && mediaRecorderRef.current?.state !== "inactive") {
      skipUploadRef.current = true;
      mediaRecorderRef.current?.stop();
    }
    setPins((prev) => prev.filter((p) => p.id !== id));
    setUploadByPinId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const uploadBlobForPin = async (
    pinId: string,
    pinIndex: number,
    percentX: number,
    percentY: number,
    blob: Blob,
  ) => {
    const uid = userId;
    if (!uid) {
      setUploadByPinId((prev) => ({
        ...prev,
        [pinId]: { status: "error", message: "Not signed in." },
      }));
      return;
    }

    setUploadByPinId((prev) => ({ ...prev, [pinId]: { status: "uploading" } }));

    const ext =
      blob.type.includes("webm")
        ? "webm"
        : blob.type.includes("mp4") || blob.type.includes("m4a")
          ? "m4a"
          : "webm";
    const path = `${uid}/pin-${pinIndex + 1}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error, data } = await supabase.storage
      .from(TEACHER_AUDIO_BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: blob.type || "audio/webm",
      });

    if (error) {
      setUploadByPinId((prev) => ({
        ...prev,
        [pinId]: { status: "error", message: error.message },
      }));
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(TEACHER_AUDIO_BUCKET).getPublicUrl(data.path);

    const pinNumber = pinIndex + 1;
    const { error: insertError } = await supabase.from("feedback_pins").insert({
      pin_number: pinNumber,
      x_percent: percentX,
      y_percent: percentY,
      audio_url: publicUrl,
    });

    if (insertError) {
      setUploadByPinId((prev) => ({
        ...prev,
        [pinId]: { status: "error", message: insertError.message },
      }));
      return;
    }

    setUploadByPinId((prev) => ({
      ...prev,
      [pinId]: { status: "done", path: data.path },
    }));
  };

  const startRecording = async (pinId: string) => {
    if (recordingPinId) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stopMediaTracks();
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        setRecordingPinId(null);
        const skip = skipUploadRef.current;
        skipUploadRef.current = false;
        if (skip || blob.size === 0) return;
        const list = pinsRef.current;
        const idx = list.findIndex((p) => p.id === pinId);
        if (idx < 0) return;
        const pin = list[idx];
        void uploadBlobForPin(pinId, idx, pin.percentX, pin.percentY, blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingPinId(pinId);
    } catch (err) {
      stopMediaTracks();
      const msg = err instanceof Error ? err.message : "Could not access microphone.";
      window.alert(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading workspace…
            </span>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 shadow-sm shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/25 dark:bg-teal-500">
              <PenLine className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                Teacher marking
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Image grading · voice notes · Supabase audio
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 sm:px-5">
          <p>
            <span className="font-medium text-slate-800 dark:text-slate-100">
              Drop pins on the paper
            </span>{" "}
            — click anywhere on the image. Each pin gets a numbered marker and an optional voice
            note, uploaded to the{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              teacher-audio
            </code>{" "}
            bucket after you stop recording.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(380px,100%)] lg:items-start">
          <section
            aria-label="Exam paper preview"
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/40 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/80"
          >
            <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Submission preview
                {isLoadingImage && <Loader2 className="size-3 animate-spin text-teal-500" />}
              </p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                Click to place feedback pins ({pins.length} placed)
              </p>
            </div>
            <div className="relative bg-slate-100/80 p-3 sm:p-4 dark:bg-slate-950/40">
              <div className="relative mx-auto max-w-4xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paperImage}
                  alt="Student exam paper for grading"
                  className={`block w-full cursor-crosshair rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10 transition-opacity duration-500 ${isLoadingImage ? 'opacity-50' : 'opacity-100'}`}
                  onClick={handleImageClick}
                  draggable={false}
                />
                {pins.map((pin, i) => (
                  <button
                    key={pin.id}
                    type="button"
                    aria-label={`Pin ${i + 1} at ${pin.percentX.toFixed(0)}%, ${pin.percentY.toFixed(0)}%`}
                    className="pointer-events-auto absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-600 text-xs font-bold text-white shadow-lg shadow-red-900/30 outline-none ring-2 ring-red-600/40 transition hover:scale-105 hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-900 dark:ring-red-500/50 dark:focus-visible:ring-offset-slate-950"
                    style={{ left: `${pin.percentX}%`, top: `${pin.percentY}%` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside
            className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
            aria-label="Pins and voice notes"
          >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-red-600 dark:text-red-400" aria-hidden />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pin list & voice notes
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Record per pin. Audio uploads when you stop.
              </p>
            </div>

            <div className="max-h-[min(70vh,560px)] overflow-y-auto p-3 sm:p-4">
              {pins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                  No pins yet. Click the paper image to add your first marker.
                </div>
              ) : (
                <ul className="space-y-3">
                  {pins.map((pin, i) => {
                    const upload = uploadByPinId[pin.id];
                    const isRecording = recordingPinId === pin.id;
                    return (
                      <li
                        key={pin.id}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-sm">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                Pin {i + 1}
                              </p>
                              <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                {pin.percentX.toFixed(1)}% · {pin.percentY.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePin(pin.id)}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                            aria-label={`Remove pin ${i + 1}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={() => void startRecording(pin.id)}
                              disabled={
                                upload?.status === "uploading" ||
                                (!!recordingPinId && recordingPinId !== pin.id)
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
                            >
                              <Mic className="size-3.5" aria-hidden />
                              Record voice note
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
                            >
                              <Square className="size-3.5 fill-current" aria-hidden />
                              Stop & upload
                            </button>
                          )}

                          {upload?.status === "uploading" && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              Uploading…
                            </span>
                          )}
                          {upload?.status === "done" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                              Saved to Database!
                            </span>
                          )}
                          {upload?.status === "error" && (
                            <span className="text-xs text-red-600 dark:text-red-400" title={upload.message}>
                              Upload failed
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}