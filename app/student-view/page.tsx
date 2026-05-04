"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Headphones,
  Loader2,
  MapPin,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/** Same placeholder as teacher marking (`app/teacher/page.tsx`). */
const PLACEHOLDER_IMAGE_URL =
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80";

type FeedbackPinRow = {
  id: string;
  pin_number: number;
  x_percent: number;
  y_percent: number;
  audio_url: string;
};

type LoadState = "loading" | "ready" | "error";

async function fetchFeedbackPins() {
  return supabase
    .from("feedback_pins")
    .select("id, pin_number, x_percent, y_percent, audio_url")
    .order("pin_number", { ascending: true });
}

export default function StudentViewPage() {
  const [pins, setPins] = useState<FeedbackPinRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingPinId, setPlayingPinId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
      audioRef.current = null;
    }
    setPlayingPinId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await fetchFeedbackPins();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoadState("error");
        setPins([]);
        return;
      }
      setPins((data ?? []) as FeedbackPinRow[]);
      setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setLoadState("loading");
    setLoadError(null);
    void (async () => {
      const { data, error } = await fetchFeedbackPins();
      if (error) {
        setLoadError(error.message);
        setLoadState("error");
        setPins([]);
        return;
      }
      setPins((data ?? []) as FeedbackPinRow[]);
      setLoadState("ready");
    })();
  };

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const playPinAudio = (pin: FeedbackPinRow) => {
    if (!pin.audio_url?.trim()) return;

    if (playingPinId === pin.id && audioRef.current) {
      stopAudio();
      return;
    }

    stopAudio();

    const audio = new Audio(pin.audio_url);
    audioRef.current = audio;

    const onEnd = () => {
      audio.removeEventListener("ended", onEnd);
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingPinId(null);
      }
    };

    audio.addEventListener("ended", onEnd);

    setPlayingPinId(pin.id);

    void audio.play().catch(() => {
      audio.removeEventListener("ended", onEnd);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setPlayingPinId(null);
    });
  };

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
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25 dark:bg-violet-500">
              <Award className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                Your graded paper
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Teacher voice feedback · tap a pin to listen
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-violet-50/50 px-4 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-violet-950/20 dark:text-slate-300 sm:px-5">
          <p className="flex flex-wrap items-center gap-2">
            <Headphones className="size-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                Voice feedback is on the paper
              </span>{" "}
              — numbered pins match your teacher&apos;s comments. Click a pin to play the recording.
            </span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(340px,100%)] lg:items-start">
          <section
            aria-label="Graded submission"
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/30 ring-1 ring-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/30 dark:ring-slate-800/80"
          >
            <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Submission
              </p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                {loadState === "loading"
                  ? "Loading feedback…"
                  : loadState === "error"
                    ? "Could not load feedback"
                    : `${pins.length} feedback pin${pins.length === 1 ? "" : "s"} on your work`}
              </p>
            </div>

            <div className="relative bg-slate-100/80 p-3 sm:p-5 dark:bg-slate-950/40">
              {loadState === "loading" && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl bg-slate-200/40 py-16 dark:bg-slate-800/40"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-10 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Loading teacher feedback…
                  </p>
                </div>
              )}

              {loadState === "error" && (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-red-200 bg-red-50/50 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/20">
                  <p className="text-sm text-red-800 dark:text-red-200">{loadError}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    Try again
                  </button>
                </div>
              )}

              {loadState === "ready" && (
                <div className="relative mx-auto max-w-4xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={PLACEHOLDER_IMAGE_URL}
                    alt="Your submitted exam paper with feedback pins"
                    className="block w-full rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                    draggable={false}
                  />
                  {pins.length === 0 ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-[2px]">
                      <p className="rounded-lg bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg dark:bg-slate-900/95 dark:text-slate-200">
                        No pins yet — your teacher hasn&apos;t added voice feedback.
                      </p>
                    </div>
                  ) : (
                    pins.map((pin) => {
                      const isPlaying = playingPinId === pin.id;
                      return (
                        <button
                          key={pin.id}
                          type="button"
                          aria-label={`Play feedback for pin ${pin.pin_number}`}
                          aria-pressed={isPlaying}
                          className={`pointer-events-auto absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg outline-none transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-900 dark:focus-visible:ring-offset-slate-950 sm:size-10 sm:text-sm ${
                            isPlaying
                              ? "z-20 scale-110 bg-emerald-600 shadow-emerald-900/40 ring-2 ring-emerald-400/80 animate-pulse"
                              : "z-10 bg-red-600 shadow-red-900/30 ring-2 ring-red-600/40 hover:scale-105 hover:bg-red-500"
                          }`}
                          style={{ left: `${pin.x_percent}%`, top: `${pin.y_percent}%` }}
                          onClick={() => playPinAudio(pin)}
                        >
                          {pin.pin_number}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </section>

          <aside
            className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
            aria-label="Feedback list"
          >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-red-600 dark:text-red-400" aria-hidden />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Feedback pins
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click a pin on the paper or use the list below to play audio.
              </p>
            </div>

            <div className="max-h-[min(70vh,520px)] overflow-y-auto p-3 sm:p-4">
              {loadState === "loading" && (
                <div className="flex flex-col items-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="size-6 animate-spin text-violet-600" aria-hidden />
                  Loading…
                </div>
              )}
              {loadState === "error" && (
                <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">
                  Could not load pins.
                </p>
              )}
              {loadState === "ready" && pins.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                  No voice feedback pins for this paper yet.
                </p>
              )}
              {loadState === "ready" && pins.length > 0 && (
                <ul className="space-y-2">
                  {pins.map((pin) => {
                    const isPlaying = playingPinId === pin.id;
                    return (
                      <li key={pin.id}>
                        <button
                          type="button"
                          onClick={() => playPinAudio(pin)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                            isPlaying
                              ? "border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : "border-slate-200/90 bg-slate-50/50 text-slate-800 hover:border-violet-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:border-violet-700"
                          }`}
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                              isPlaying ? "bg-emerald-600 shadow-sm" : "bg-red-600"
                            }`}
                          >
                            {pin.pin_number}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">Pin {pin.pin_number}</span>
                            <span className="mt-0.5 block text-xs tabular-nums text-slate-500 dark:text-slate-400">
                              {pin.x_percent.toFixed(1)}% · {pin.y_percent.toFixed(1)}%
                            </span>
                          </span>
                          <Volume2
                            className={`size-4 shrink-0 ${isPlaying ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                            aria-hidden
                          />
                        </button>
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
