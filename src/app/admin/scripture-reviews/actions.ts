"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  mutateScriptureReview,
  reviewErrorPayload,
} from "@/lib/scripture-review/reviews";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitScriptureReviewAction(formData: FormData) {
  const reviewId = formString(formData, "reviewId");
  let target = `/admin/scripture-reviews${reviewId ? `?reviewId=${reviewId}` : ""}`;

  try {
    await mutateScriptureReview({
      reviewId,
      updatedAt: formString(formData, "updatedAt"),
      action: formString(formData, "action"),
      accuracyScore: formString(formData, "accuracyScore") || undefined,
      interpretationNotes:
        formString(formData, "interpretationNotes") || undefined,
      rejectionReason: formString(formData, "rejectionReason") || undefined,
    });
    revalidatePath("/admin/scripture-reviews");
    target = `/admin/scripture-reviews?reviewId=${encodeURIComponent(reviewId)}&result=updated`;
  } catch (error) {
    const payload = reviewErrorPayload(error);
    target = `/admin/scripture-reviews?reviewId=${encodeURIComponent(reviewId)}&error=${encodeURIComponent(payload.error.code)}`;
  }

  redirect(target);
}
