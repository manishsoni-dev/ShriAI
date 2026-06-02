import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/app/sign-in/sign-in-form";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-10 text-[#171717]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#08766f]">
            Shri AI
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight">
            Sign in to your AI workspace.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#43514f]">
            Use your email and password. If this is your first time, Shri AI
            creates your user account and default workspace automatically.
          </p>
        </div>

        <div className="rounded-md border border-black/10 bg-white p-6 shadow-sm shadow-[#0f766e]/5">
          <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-[#43514f]">
            Enter a password with at least 8 characters.
          </p>
          <div className="mt-6">
            <SignInForm />
          </div>
        </div>
      </section>
    </main>
  );
}
