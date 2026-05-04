"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LogOut,
  PenLine,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type SubmissionStatus = "Pending" | "Graded";

type DummySubmission = {
  id: string;
  studentEmail: string;
  subject: string;
  dateSubmitted: string;
  status: SubmissionStatus;
};

const DUMMY_SUBMISSIONS: DummySubmission[] = [
  {
    id: "1",
    studentEmail: "nimal.perera@student.edu.lk",
    subject: "Physics — Paper II",
    dateSubmitted: "2026-05-02",
    status: "Pending",
  },
  {
    id: "2",
    studentEmail: "sanduni.wick@student.edu.lk",
    subject: "Combined Mathematics — Paper I",
    dateSubmitted: "2026-05-01",
    status: "Pending",
  },
  {
    id: "3",
    studentEmail: "kasun.fernando@student.edu.lk",
    subject: "Chemistry — Organic Structures",
    dateSubmitted: "2026-04-30",
    status: "Graded",
  },
  {
    id: "4",
    studentEmail: "tharushi.j@student.edu.lk",
    subject: "Physics — Structured Essay",
    dateSubmitted: "2026-04-29",
    status: "Graded",
  },
  {
    id: "5",
    studentEmail: "dilan.silva@student.edu.lk",
    subject: "Combined Mathematics — Paper II",
    dateSubmitted: "2026-04-28",
    status: "Pending",
  },
  {
    id: "6",
    studentEmail: "imesha.r@student.edu.lk",
    subject: "Chemistry — Physical",
    dateSubmitted: "2026-04-27",
    status: "Graded",
  },
];

const SUMMARY_STATS = [
  {
    label: "Total pending papers",
    value: "15",
    hint: "Awaiting your review",
    icon: ClipboardList,
    accent:
      "from-amber-500/12 to-orange-500/8 ring-amber-200/50 dark:from-amber-500/10 dark:to-orange-500/5 dark:ring-amber-500/20",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Graded today",
    value: "5",
    hint: "Completed in the last 24h",
    icon: CheckCircle2,
    accent:
      "from-emerald-500/12 to-teal-500/8 ring-emerald-200/50 dark:from-emerald-500/10 dark:to-teal-500/5 dark:ring-emerald-500/20",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Average Z-score",
    value: "1.85",
    hint: "Across recent cohort",
    icon: BarChart3,
    accent:
      "from-teal-500/12 to-cyan-500/8 ring-teal-200/50 dark:from-teal-500/10 dark:to-cyan-500/5 dark:ring-teal-500/20",
    iconClass: "text-teal-600 dark:text-teal-400",
  },
] as const;

function formatSubmittedDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-LK", {
      dateStyle: "medium",
    }).format(new Date(iso + "T12:00:00"));
  } catch {
    return iso;
  }
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f4f6fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading teacher panel…
            </span>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/30 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/92 dark:shadow-black/25">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-600/25 dark:from-teal-500 dark:to-emerald-600 dark:shadow-teal-900/30">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                A/L Exam Portal - Teacher Panel
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Submissions & grading workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800/90 dark:focus-visible:ring-offset-slate-950"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-2 sm:mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Overview
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Track pending work, recent throughput, and cohort performance at a glance. Open a
            submission to mark with voice feedback on the grading canvas.
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUMMARY_STATS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br p-5 shadow-md shadow-slate-200/40 ring-1 dark:border-slate-700/80 dark:shadow-black/30 ${card.accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{card.hint}</p>
                  </div>
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800/80 dark:ring-slate-600/50 ${card.iconClass}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40 dark:ring-slate-800/80">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/90 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-teal-600 dark:text-teal-400" aria-hidden />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Student submissions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dummy data for local development
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Student email
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Subject
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Date submitted
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-6">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {DUMMY_SUBMISSIONS.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800 dark:text-slate-100 sm:px-6">
                      {row.studentEmail}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 sm:px-6">
                      {row.subject}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-600 dark:text-slate-300 sm:px-6">
                      {formatSubmittedDate(row.dateSubmitted)}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {row.status === "Pending" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/60">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800/60">
                          Graded
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      {row.status === "Pending" ? (
                        <Link
                          href="/teacher"
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus-visible:ring-offset-slate-950"
                        >
                          <PenLine className="size-3.5" aria-hidden />
                          Grade paper
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
