import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/app/sign-in/sign-in-form";

type SignInPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const { callbackUrl } = (await searchParams) ?? {};

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--page-surface)] px-6 py-10 text-amber-50">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-200/75">
            Shri AI
          </p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-tight">
            Access your Shri AI workspace.
          </h1>
          <p className="mt-6 text-lg leading-8 text-amber-100/70">
            Sign in to continue guidance, or create a new personal workspace
            with a separate registration step.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200/12 bg-[var(--card-surface)] p-6 shadow-[0_20px_90px_rgba(0,0,0,0.3)] backdrop-blur">
          <h2 className="font-serif text-2xl font-semibold text-amber-50">
            Account access
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-100/68">
            Registration creates only your own workspace. Reviewer and admin
            access remain separately controlled.
          </p>
          <div className="mt-6">
            <SignInForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </section>
    </main>
  );
}
