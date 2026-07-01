import Link from "next/link";
import { requireReviewerForPage } from "@/lib/scripture-review/reviews";
import {
  getFeedbackAggregates,
  getLatencyAggregates,
  getLocalRuntimeAggregates,
  getVoiceQaAggregates,
} from "@/lib/telemetry/queries";
import { AlertCard, KpiCard, SectionHeader } from "./kpi-cards";

export default async function TelemetryDashboard() {
  const access = await requireReviewerForPage();

  if (!access.principal) {
    return (
      <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#171717]">
        <section className="mx-auto w-full max-w-4xl rounded-md border border-red-200 bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-red-700">
            Forbidden
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Admin access is required.
          </h1>
        </section>
      </main>
    );
  }

  const [feedback, latency, localRuntime, voiceQa] = await Promise.all([
    getFeedbackAggregates(),
    getLatencyAggregates(),
    getLocalRuntimeAggregates(),
    getVoiceQaAggregates(),
  ]);

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="border-b border-black/10 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#08766f]">
            Admin
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Staging Telemetry & Metrics
              </h1>
              <p className="mt-2 text-sm text-[#43514f]">
                Privacy-safe aggregated evidence from staging testing and usage.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-50"
              href="/dashboard"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <SectionHeader
          title="Retrieval & Persona Efficacy"
          description="Aggregated user feedback on response relevance, citation accuracy, and persona adherence."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <KpiCard
            title="Total Feedback Items"
            value={feedback.total.toLocaleString()}
            description="Total qualitative feedback signals received."
          />
          <KpiCard
            title="Helpful Rate"
            value={`${feedback.positiveRate.toFixed(1)}%`}
            description="Percentage of feedback marked as 'helpful'."
          />
          <div className="flex flex-col gap-3">
            <AlertCard
              title="Incorrect Citations"
              count={feedback.incorrectCitationCount}
              isCritical={true}
            />
            <AlertCard
              title="Irrelevant Retrievals"
              count={feedback.irrelevantRetrievalCount}
              isCritical={false}
            />
            <AlertCard
              title="Persona Mismatches"
              count={feedback.personaMismatchCount}
              isCritical={false}
            />
          </div>
        </div>

        <SectionHeader
          title="Voice Quality & Hardware Efficacy"
          description="Results from physical device testing via the Voice QA harness."
        />
        <div className="grid gap-6 md:grid-cols-4">
          <KpiCard
            title="Voice QA Pass Rate"
            value={
              voiceQa.runs.total > 0
                ? `${((voiceQa.runs.passed / voiceQa.runs.total) * 100).toFixed(0)}%`
                : "N/A"
            }
            description={`${voiceQa.runs.passed} passed / ${voiceQa.runs.total} total runs`}
          />
          <KpiCard
            title="Avg Word Error Rate"
            value={voiceQa.averageWER !== null ? `${voiceQa.averageWER}%` : "—"}
            description="Aggregate transcription accuracy."
          />
          <KpiCard
            title="Time to First Audible"
            value={
              voiceQa.averageFirstAudibleMs !== null
                ? `${voiceQa.averageFirstAudibleMs} ms`
                : "—"
            }
            description="Average delay before TTS playback starts."
          />
          <KpiCard
            title="Avg Step Latency"
            value={
              voiceQa.averageLatencyMs !== null
                ? `${voiceQa.averageLatencyMs} ms`
                : "—"
            }
            description="Average end-to-end voice step latency."
          />
        </div>

        <SectionHeader
          title="Local Runtime Usage"
          description="Performance and usage metrics for the local-first model runtime. Hosted-model spend is not estimated."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="p50 Latency"
            value={`${latency.p50} ms`}
            description="Median response time."
          />
          <KpiCard
            title="p95 Latency"
            value={`${latency.p95} ms`}
            description="95th percentile response time."
          />
          <KpiCard
            title="Local Requests"
            value={localRuntime.requestCount.toLocaleString()}
            description={`${localRuntime.totalTokens.toLocaleString()} tokens logged locally`}
          />
          <KpiCard
            title="Local Runtime Errors"
            value={`${localRuntime.errorRate.toFixed(1)}%`}
            description={`${localRuntime.errorCount.toLocaleString()} errors / ${localRuntime.requestCount.toLocaleString()} usage events`}
          />
          <KpiCard
            title="Cost Estimate"
            value={localRuntime.costEstimateLabel}
            description={localRuntime.costEstimateDescription}
          />
        </div>

        <SectionHeader
          title="Safety & Compliance"
          description="Crucial metrics regarding safety violations or unsafe generation detected during staging."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <AlertCard
            title="Unsafe Feedback Flags"
            count={feedback.unsafeCount}
            isCritical={true}
          />
        </div>
      </section>
    </main>
  );
}
