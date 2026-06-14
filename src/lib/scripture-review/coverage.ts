import "server-only";

import { db } from "@/lib/db";

function chapterFromRef(canonicalRef: string) {
  const chapter = Number(canonicalRef.split(".")[0]);
  return Number.isInteger(chapter) && chapter > 0 ? String(chapter) : "unknown";
}

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export async function getReviewCoverage() {
  const chunks = await db.scriptureChunk.findMany({
    select: {
      id: true,
      canonicalRef: true,
      personaTags: true,
      source: {
        select: {
          canonicalTitle: true,
        },
      },
      reviews: {
        select: {
          reviewStatus: true,
          approvedForVoice: true,
        },
        take: 1,
      },
    },
  });

  const totalChunks = chunks.length;
  const statusCounts = {
    pending: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    needs_changes: 0,
  };
  let approvedForText = 0;
  let approvedForVoice = 0;
  const byChapter = new Map<string, { total: number; voiceApproved: number }>();
  const bySource = new Map<string, { total: number; voiceApproved: number }>();
  const byPersona = new Map<string, { total: number; voiceApproved: number }>();

  for (const chunk of chunks) {
    const review = chunk.reviews[0];
    const status = review?.reviewStatus ?? "pending";
    statusCounts[status as keyof typeof statusCounts] =
      (statusCounts[status as keyof typeof statusCounts] ?? 0) + 1;
    const isTextApproved = status === "approved";
    const isVoiceApproved = isTextApproved && Boolean(review?.approvedForVoice);

    if (isTextApproved) approvedForText++;
    if (isVoiceApproved) approvedForVoice++;

    const chapter = chapterFromRef(chunk.canonicalRef);
    const chapterCounts = byChapter.get(chapter) ?? {
      total: 0,
      voiceApproved: 0,
    };
    chapterCounts.total++;
    if (isVoiceApproved) chapterCounts.voiceApproved++;
    byChapter.set(chapter, chapterCounts);

    const source = chunk.source.canonicalTitle;
    const sourceCounts = bySource.get(source) ?? {
      total: 0,
      voiceApproved: 0,
    };
    sourceCounts.total++;
    if (isVoiceApproved) sourceCounts.voiceApproved++;
    bySource.set(source, sourceCounts);

    for (const persona of chunk.personaTags) {
      const personaCounts = byPersona.get(persona) ?? {
        total: 0,
        voiceApproved: 0,
      };
      personaCounts.total++;
      if (isVoiceApproved) personaCounts.voiceApproved++;
      byPersona.set(persona, personaCounts);
    }
  }

  return {
    totalChunks,
    pending: statusCounts.pending,
    inReview: statusCounts.in_review,
    approvedForText,
    approvedForVoice,
    rejected: statusCounts.rejected,
    needsChanges: statusCounts.needs_changes,
    reviewedPercentage: percent(
      approvedForText + statusCounts.rejected + statusCounts.needs_changes,
      totalChunks,
    ),
    voiceApprovedPercentage: percent(approvedForVoice, totalChunks),
    byChapter: Array.from(byChapter.entries())
      .map(([chapter, counts]) => ({ chapter, ...counts }))
      .sort((a, b) => Number(a.chapter) - Number(b.chapter)),
    bySource: Array.from(bySource.entries()).map(([source, counts]) => ({
      source,
      ...counts,
    })),
    byPersona: Array.from(byPersona.entries()).map(([persona, counts]) => ({
      persona,
      ...counts,
    })),
  };
}
