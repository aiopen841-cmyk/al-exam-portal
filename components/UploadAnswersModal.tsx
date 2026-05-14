"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// 1. අපි අද හදපු බකට් එකේ නම මෙතනට දැම්මා
const BUCKET = "student-answers"; 
const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-z0-9]+$/i.test(fromName)) {
    return fromName.toLowerCase();
  }
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function isAcceptedImage(file: File): boolean {
  if (file.type && ACCEPTED_MIME.has(file.type.toLowerCase())) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

export type UploadAnswersModalProps = {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
};

export function UploadAnswersModal({
  open,
  onClose,
  taskId,
  taskTitle,
}: UploadAnswersModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "success">("idle");
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAndClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setFiles([]);
    setPhase("idle");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setPhase("idle");
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "uploading") {
        resetAndClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, phase, resetAndClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      setFiles([]);
      return;
    }
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (f && isAcceptedImage(f)) next.push(f);
    }
    if (next.length < list.length) {
      window.alert(
        "Some files were skipped. Please use JPG, PNG, or WebP images only."
      );
    }
    setFiles(next);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      window.alert("Please select at least one image to upload.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      window.alert("You must be signed in to upload answers.");
      return;
    }

    setPhase("uploading");

    try {
      const userId = session.user.id;
      // ළමයාගේ ඊමේල් එකත් ගමු ෆෝල්ඩර් එකේ නමට දාන්න (හොයාගන්න ලේසි වෙන්න)
      const userEmail = session.user.email || 'unknown';

      for (const file of files) {
        const ext = extensionForFile(file);
        const unique = `${Date.now()}-${crypto.randomUUID()}`;
        
        // 2. ෆයිල් එක සේව් වෙන තැන ලස්සනට හැදුවා: answers/paper_id/email_unique.jpg
        const path = `answers/${taskId}/${userEmail}_${unique}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (error) {
          throw error;
        }
      }

      setPhase("success");
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        resetAndClose();
      }, 1600);
    } catch (err: unknown) {
      setPhase("idle");
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      window.alert(message);
    }
  };

  if (!open) return null;

  const canDismiss = phase !== "uploading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        disabled={!canDismiss}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity disabled:cursor-not-allowed disabled:opacity-90 dark:bg-black/60"
        onClick={() => canDismiss && resetAndClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Upload answers
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {taskTitle}
            </p>
          </div>
          <button
            type="button"
            disabled={!canDismiss}
            onClick={() => resetAndClose()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {phase === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-100">
              <p className="font-medium">Upload complete</p>
              <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/90">
                Your answer images were saved successfully.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Answer images
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  JPG, PNG, or WebP. You can select multiple files.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="sr-only"
                  onChange={onFileChange}
                  disabled={phase === "uploading"}
                />
                <button
                  type="button"
                  disabled={phase === "uploading"}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-100"
                >
                  <Upload className="size-5 text-indigo-600 dark:text-indigo-400" />
                  {files.length === 0
                    ? "Choose images"
                    : `${files.length} file${files.length === 1 ? "" : "s"} selected`}
                </button>
                {files.length > 0 && (
                  <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-400">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}-${f.lastModified}`} className="truncate">
                        {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {phase === "uploading" && (
                <div className="flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-100">
                  <Loader2 className="size-5 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="font-medium">Uploading… Please wait</p>
                    <p className="mt-0.5 text-xs text-indigo-900/80 dark:text-indigo-200/80">
                      Do not close this window until uploads finish.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            disabled={phase === "uploading"}
            onClick={() => resetAndClose()}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/90"
          >
            {phase === "success" ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={phase === "uploading" || phase === "success" || files.length === 0}
            onClick={() => void handleUpload()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {phase === "uploading" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
