"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "ayeshakalhari98@gmail.com";
const TEACHER_EMAIL = "thilinasuranga568@gmail.com";

function sessionUserEmail(session: Session): string | null {
  const meta = session.user.user_metadata;
  const fromMeta =
    meta && typeof meta.email === "string" ? meta.email : null;
  return session.user.email ?? fromMeta;
}

function resolveDashboardPath(email: string | null | undefined): string {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (normalized === ADMIN_EMAIL) return "/admin";
  if (normalized === TEACHER_EMAIL) return "/teacher-dashboard";
  return "/dashboard";
}

export default function Home() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const routeAuthenticatedUser = (session: Session | null): boolean => {
      if (!session) return false;
      router.replace(resolveDashboardPath(sessionUserEmail(session)));
      return true;
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (routeAuthenticatedUser(session)) {
        return;
      }

      setSessionChecked(true);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (routeAuthenticatedUser(session)) {
        return;
      }
      setSessionChecked(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const signInWithGoogle = async () => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Google sign-in failed:", error.message);
      setIsLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-black dark:text-slate-100">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Checking your session…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-black dark:text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-lg shadow-slate-200/60 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
          <h1 className="text-center text-3xl font-semibold tracking-tight">
            A/L Exam Portal
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600 dark:text-slate-300">
            Access your exam dashboard securely using your Google account.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-[conic-gradient(from_45deg,_#4285f4_0_25%,_#34a853_25%_50%,_#fbbc05_50%_75%,_#ea4335_75%_100%)]"
              aria-hidden="true"
            />
            {isLoading ? "Redirecting..." : "Sign in with Google"}
          </button>
        </section>
      </div>
    </main>
  );
}
