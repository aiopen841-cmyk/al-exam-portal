"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Shield,
  Upload,
  Users,
  UserSquare2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const EXAM_PAPERS_BUCKET = "exam-papers";

/** Subjects available when publishing an exam (aligns with portal subjects). */
const SUBJECT_OPTIONS = [
  "Combined Maths",
  "Physics",
  "Chemistry",
  "Biology",
  "ICT",
] as const;

const DUMMY_REGISTERED_STUDENTS = 248;
const DUMMY_REGISTERED_TEACHERS = 18;

function slugifyPaperName(name: string) {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return s || "paper";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [paperName, setPaperName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setReady(true);
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
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const resetPublishFeedback = useCallback(() => {
    setPublishError(null);
    setPublishSuccess(false);
  }, []);

  const pickPdf = useCallback((file: File | undefined | null) => {
    resetPublishFeedback();
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPublishError("Please choose a PDF file.");
      return;
    }
    setPdfFile(file);
  }, [resetPublishFeedback]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      pickPdf(f);
    },
    [pickPdf],
  );

  const handlePublish = async () => {
    resetPublishFeedback();

    if (!paperName.trim()) {
      setPublishError("Enter a paper name.");
      return;
    }
    if (!examDate) {
      setPublishError("Select an exam date.");
      return;
    }
    if (!pdfFile) {
      setPublishError("Upload a PDF question paper.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setPublishError("You must be signed in to publish.");
      return;
    }

    setIsPublishing(true);

    const safeSlug = slugifyPaperName(paperName);
    const path = `${uid}/${Date.now()}-${safeSlug}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(EXAM_PAPERS_BUCKET)
      .upload(path, pdfFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (uploadError) {
      setIsPublishing(false);
      setPublishError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("exams").insert({
      subject,
      paper_name: paperName.trim(),
      exam_date: examDate,
      pdf_path: uploadData.path,
    });

    if (insertError) {
      await supabase.storage.from(EXAM_PAPERS_BUCKET).remove([uploadData.path]);
      setIsPublishing(false);
      setPublishError(insertError.message);
      return;
    }

    setIsPublishing(false);
    setPublishSuccess(true);
    setPaperName("");
    setExamDate("");
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        <p className="text-sm font-medium">Loading admin panel…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="flex w-full flex-shrink-0 flex-col border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-500">
            <Shield className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              Admin
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              A/L Exam Portal
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin navigation">
          <span className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </span>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-lg bg-indigo-50 px-3 py-2.5 text-left text-sm font-medium text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
          >
            <LayoutDashboard className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
            Dashboard
          </button>
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 opacity-70 dark:text-slate-500"
            title="Coming soon"
          >
            <BookOpen className="size-4 shrink-0" aria-hidden />
            Subjects
          </button>
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 opacity-70 dark:text-slate-500"
            title="Coming soon"
          >
            <UserSquare2 className="size-4 shrink-0" aria-hidden />
            Teachers
          </button>
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 opacity-70 dark:text-slate-500"
            title="Coming soon"
          >
            <Users className="size-4 shrink-0" aria-hidden />
            Students
          </button>
        </nav>

        <div className="mt-auto border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Administrator dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            Publish exam papers and monitor registrations.
          </p>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <section aria-label="Overview statistics">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Registered students
                      </p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                        {DUMMY_REGISTERED_STUDENTS.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Dummy total for local development
                      </p>
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      <GraduationCap className="size-5" aria-hidden />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Registered teachers
                      </p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                        {DUMMY_REGISTERED_TEACHERS.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Dummy total for local development
                      </p>
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <Users className="size-5" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              aria-label="Upload new exam paper"
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/40 ring-1 ring-indigo-100/80 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30 dark:ring-indigo-950/40 sm:p-6"
            >
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Upload new exam paper
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Add metadata and the question paper PDF. Files are stored in the{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono dark:bg-slate-800">
                      exam-papers
                    </code>{" "}
                    bucket; details are saved to the{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono dark:bg-slate-800">
                      exams
                    </code>{" "}
                    table.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200">
                  <FileUp className="size-3.5" aria-hidden />
                  Publish workflow
                </span>
              </div>

              {publishSuccess && (
                <div
                  className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
                  role="status"
                >
                  Paper published successfully. Metadata and PDF are saved.
                </div>
              )}
              {publishError && (
                <div
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                  role="alert"
                >
                  {publishError}
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="admin-subject"
                      className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Subject
                    </label>
                    <select
                      id="admin-subject"
                      value={subject}
                      onChange={(e) => {
                        resetPublishFeedback();
                        setSubject(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400"
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="admin-paper-name"
                      className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Paper name
                    </label>
                    <input
                      id="admin-paper-name"
                      type="text"
                      value={paperName}
                      onChange={(e) => {
                        resetPublishFeedback();
                        setPaperName(e.target.value);
                      }}
                      placeholder="e.g. 2026 Model Paper — Paper II"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="admin-exam-date"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      <Calendar className="size-3.5 text-slate-400" aria-hidden />
                      Exam date
                    </label>
                    <input
                      id="admin-exam-date"
                      type="date"
                      value={examDate}
                      onChange={(e) => {
                        resetPublishFeedback();
                        setExamDate(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Question paper (PDF)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => pickPdf(e.target.files?.[0])}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/80 dark:border-indigo-400 dark:bg-indigo-950/30"
                        : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/20"
                    }`}
                  >
                    <Upload
                      className={`mb-3 size-10 ${isDragging ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Drag and drop your PDF here
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      or click to browse · PDF only
                    </p>
                    {pdfFile && (
                      <p className="mt-4 max-w-full truncate rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
                        {pdfFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => void handlePublish()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:shadow-indigo-900/30"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" aria-hidden />
                      Publish paper
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
