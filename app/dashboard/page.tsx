"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Atom,
  Award,
  BookOpen,
  Calculator,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  LogOut,
  MessageSquareText,
  Upload,
  UserRound,
} from "lucide-react";
import { UploadAnswersModal } from "@/components/UploadAnswersModal";
import { supabase } from "@/lib/supabaseClient";

const SUBJECTS = [
  {
    name: "Combined Maths",
    description: "Pure & applied papers, past drills, and model solutions.",
    icon: Calculator,
    accent: "from-violet-500/15 to-fuchsia-500/10 ring-violet-200/60 dark:ring-violet-500/25",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  {
    name: "Physics",
    description: "Mechanics, waves, and structured theory practice sets.",
    icon: Atom,
    accent: "from-sky-500/15 to-blue-500/10 ring-sky-200/60 dark:ring-sky-500/25",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  {
    name: "Chemistry",
    description: "Organic, inorganic, and quantitative reasoning packs.",
    icon: FlaskConical,
    accent: "from-emerald-500/15 to-teal-500/10 ring-emerald-200/60 dark:ring-emerald-500/25",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
] as const;

const PENDING_TASKS = [
  {
    id: "1",
    title: "2024 Model Paper — Physics Paper II",
    subject: "Physics",
    dueLabel: "Due in 3 days",
  },
  {
    id: "2",
    title: "Structured Test — Organic Chemistry (Set B)",
    subject: "Chemistry",
    dueLabel: "Due in 6 days",
  },
] as const;

const RECENT_RESULTS = [
  {
    id: "1",
    paper: "Combined Maths — Paper I (Mock)",
    mark: "85",
    max: "100",
    zScore: "1.95",
  },
] as const;

export default function StudentDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated">(
    "loading"
  );
  const [uploadModal, setUploadModal] = useState<{
    taskId: string;
    taskTitle: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setStatus("unauthenticated");
        router.replace("/");
        return;
      }

      setEmail(
        session.user.email ??
          (session.user.user_metadata?.email as string | undefined) ??
          null
      );
      setStatus("ready");
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        setStatus("unauthenticated");
        router.replace("/");
        return;
      }
      setEmail(
        session.user.email ??
          (session.user.user_metadata?.email as string | undefined) ??
          null
      );
      setStatus("ready");
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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-slate-400">
              <GraduationCap className="size-5 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Loading…</span>
            </div>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Preparing your dashboard…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 shadow-sm shadow-slate-200/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-500 dark:shadow-indigo-500/20">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                A/L Exam Portal
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Student workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="hidden max-w-[220px] items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 sm:flex dark:border-slate-700 dark:bg-slate-800/60"
              title={email ?? undefined}
            >
              <UserRound
                className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden
              />
              <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {email ?? "Signed in"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800/90 dark:focus-visible:ring-offset-slate-950"
            >
              <LogOut className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 lg:mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Pick up where you left off—subjects, submissions, and graded work
            in one place.
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 sm:hidden dark:text-slate-400">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate font-medium text-slate-600 dark:text-slate-300">
              {email ?? "Signed in"}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:gap-12">
          <section aria-labelledby="subjects-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700">
                  <BookOpen
                    className="size-4 text-indigo-600 dark:text-indigo-400"
                    aria-hidden
                  />
                </span>
                <div>
                  <h2
                    id="subjects-heading"
                    className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                  >
                    My subjects
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your enrolled A/L streams
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SUBJECTS.map((subject) => {
                const Icon = subject.icon;
                return (
                  <article
                    key={subject.name}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5 hover:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/30 dark:hover:shadow-indigo-500/10"
                  >
                    <div
                      className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${subject.accent} ring-1`}
                    >
                      <Icon
                        className={`size-6 ${subject.iconClass}`}
                        aria-hidden
                      />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {subject.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {subject.description}
                    </p>
                    <button
                      type="button"
                      className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition group-hover:bg-indigo-600 dark:bg-slate-100 dark:text-slate-900 dark:group-hover:bg-indigo-500 dark:group-hover:text-white"
                    >
                      View papers
                      <ChevronRight className="size-4 opacity-80" aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="tasks-heading">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700">
                <ClipboardList
                  className="size-4 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
              </span>
              <div>
                <h2
                  id="tasks-heading"
                  className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                >
                  Pending tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Download papers and upload your answers
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {PENDING_TASKS.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {task.title}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {task.subject}
                        </span>
                        <span>{task.dueLabel}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadModal({
                          taskId: task.id,
                          taskTitle: task.title,
                        })
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100"
                    >
                      <Upload className="size-4" aria-hidden />
                      Upload answers
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="results-heading">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700">
                <Award
                  className="size-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              </span>
              <div>
                <h2
                  id="results-heading"
                  className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                >
                  Recent results
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Graded submissions and feedback
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Paper
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Total mark
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Z-Score
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {RECENT_RESULTS.map((row) => (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                          {row.paper}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {row.mark}
                          </span>
                          <span className="text-slate-400">/{row.max}</span>
                        </td>
                        <td className="px-5 py-4 tabular-nums font-medium text-slate-800 dark:text-slate-200">
                          {row.zScore}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                          >
                            <MessageSquareText className="size-3.5" aria-hidden />
                            View feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {uploadModal ? (
        <UploadAnswersModal
          open
          taskId={uploadModal.taskId}
          taskTitle={uploadModal.taskTitle}
          onClose={() => setUploadModal(null)}
        />
      ) : null}
    </div>
  );
}
