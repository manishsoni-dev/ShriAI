import { db } from "@/lib/db";

// Pricing per 1M tokens (GPT-4o standard)
const INPUT_PRICE_PER_MILLION = 5.0;
const OUTPUT_PRICE_PER_MILLION = 15.0;

export async function getFeedbackAggregates() {
  const feedbacks = await db.userFeedback.findMany({
    select: {
      labels: true,
    },
  });

  const counts: Record<string, number> = {};
  for (const f of feedbacks) {
    for (const label of f.labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
  }

  return {
    total: feedbacks.length,
    counts,
    positiveRate:
      feedbacks.length > 0
        ? ((counts["helpful"] || 0) / feedbacks.length) * 100
        : 0,
    unsafeCount: counts["unsafe"] || 0,
    personaMismatchCount: counts["persona_mismatch"] || 0,
    irrelevantRetrievalCount: counts["irrelevant_retrieval"] || 0,
    incorrectCitationCount: counts["incorrect_citation"] || 0,
  };
}

export async function getLatencyAggregates() {
  const usage = await db.usageEvent.findMany({
    where: { status: "success" },
    select: { latencyMs: true },
    orderBy: { latencyMs: "asc" },
  });

  if (usage.length === 0) {
    return { p50: 0, p95: 0, average: 0, count: 0 };
  }

  const p50Index = Math.floor(usage.length * 0.5);
  const p95Index = Math.floor(usage.length * 0.95);

  const total = usage.reduce((sum, u) => sum + u.latencyMs, 0);

  return {
    p50: usage[p50Index].latencyMs,
    p95: usage[p95Index].latencyMs,
    average: Math.round(total / usage.length),
    count: usage.length,
  };
}

export async function getCostAggregates() {
  const usage = await db.usageEvent.aggregate({
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });

  const inputTokens = usage._sum.inputTokens || 0;
  const outputTokens = usage._sum.outputTokens || 0;

  const estimatedInputCost =
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const estimatedOutputCost =
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  const totalEstimatedCost = estimatedInputCost + estimatedOutputCost;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalEstimatedCostUSD: Number(totalEstimatedCost.toFixed(4)),
  };
}

export async function getVoiceQaAggregates() {
  const runs = await db.voiceQaRun.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });

  const totals = {
    passed: 0,
    failed: 0,
    pending: 0,
    total: 0,
  };

  for (const group of runs) {
    if (group.status === "passed") totals.passed = group._count.status;
    if (group.status === "failed") totals.failed = group._count.status;
    if (group.status === "pending") totals.pending = group._count.status;
    totals.total += group._count.status;
  }

  const steps = await db.voiceQaStep.aggregate({
    _avg: {
      wer: true,
      firstAudibleMs: true,
      latencyMs: true,
    },
  });

  return {
    runs: totals,
    averageWER: steps._avg.wer
      ? Number((steps._avg.wer * 100).toFixed(2))
      : null,
    averageFirstAudibleMs: steps._avg.firstAudibleMs
      ? Math.round(steps._avg.firstAudibleMs)
      : null,
    averageLatencyMs: steps._avg.latencyMs
      ? Math.round(steps._avg.latencyMs)
      : null,
  };
}
