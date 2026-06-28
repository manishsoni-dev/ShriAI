import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { completeOnboardingAction } from "./actions";

export default async function OnboardingPage() {
  const user = await requireUser();
  const dbUser = await db.user.findUnique({ where: { id: user.id } });

  if (dbUser?.onboardedAt) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="max-w-xl w-full bg-white rounded-xl border shadow-lg overflow-hidden">
        <div className="bg-orange-50/50 p-8 border-b text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
            Welcome to Shri AI
          </h1>
          <p className="text-slate-600">
            Please review these important notices before you begin.
          </p>
        </div>

        <form action={completeOnboardingAction} className="p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Important Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
              <li>
                By continuing, you acknowledge that Shri AI provides spiritual
                reflection, not absolute divine authority. It is not a
                substitute for qualified human spiritual guides, therapists, or
                crisis support. All conversations are stored privately in your
                account unless you explicitly choose to share them.
              </li>
              <li>Feedback may be collected to improve the product.</li>
              <li>
                <strong>Urgent matters:</strong> Shri AI cannot provide medical,
                legal, or emergency assistance. Please contact qualified
                professionals for urgent matters.
              </li>
            </ul>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-medium">Preferences</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                name="language"
                className="w-full h-10 rounded-md border-input border px-3 py-2 text-sm"
                defaultValue="auto"
              >
                <option value="auto">Automatic (Detect from device)</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border">
              <input
                type="checkbox"
                name="microphone"
                id="microphone"
                className="mt-1"
              />
              <div className="space-y-1">
                <label htmlFor="microphone" className="text-sm font-medium">
                  Microphone & Voice Processing
                </label>
                <p className="text-xs text-slate-500">
                  I consent to microphone processing by Shri AI&apos;s local
                  faster-whisper service. Audio is processed transiently and is
                  deleted after transcription. You can continue without voice.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 text-white rounded-md font-medium text-sm"
            >
              I understand, let&apos;s begin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
