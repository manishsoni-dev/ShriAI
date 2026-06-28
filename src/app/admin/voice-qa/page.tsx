"use client";

import { useState } from "react";

type StepStatus = "pending" | "running" | "passed" | "failed";

interface QaStep {
  stepType: string;
  status: StepStatus;
  latencyMs?: number;
  firstAudibleMs?: number;
  transcript?: string;
  expectedTranscript?: string;
  wer?: number;
  errorCode?: string;
}

const DEFAULT_STEPS = [
  "mic-permission",
  "stt-transcription",
  "retrieval-grounding",
  "chat-grounded-response",
  "browser-speech-first-audible",
  "browser-speech-playback",
  "barge-in-interruption",
  "denied-mic-permission",
  "empty-audio",
  "stt-service-unavailable",
  "browser-speech-unavailable",
];

export default function VoiceQaHarness() {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [steps, setSteps] = useState<QaStep[]>(
    DEFAULT_STEPS.map((s) => ({ stepType: s, status: "pending" })),
  );

  function updateStep(index: number, status: StepStatus) {
    setSaveMessage(null);
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, status } : step,
      ),
    );
  }

  const allReviewed = steps.every(
    (step) => step.status === "passed" || step.status === "failed",
  );

  async function saveRun() {
    if (!allReviewed) return;
    setSaving(true);
    setSaveMessage(null);
    const passed = steps.every((step) => step.status === "passed");
    const response = await fetch("/api/admin/voice-qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Manual local voice QA",
        device: navigator.userAgent,
        browser: "Web",
        personaId: "krishna",
        status: passed ? "passed" : "failed",
        notes: "Manual physical-device local voice verification.",
        steps,
      }),
    });
    setSaving(false);
    setSaveMessage(
      response.ok
        ? "Manual QA run saved."
        : "Manual QA run could not be saved.",
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Voice QA Harness</h1>
      <p className="text-gray-600">
        Mark each check while testing on a physical device. Browser speech and
        local transcription failures must leave typed input and response text
        available.
      </p>

      <div className="space-y-2 mt-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-3 border rounded bg-white"
          >
            <span className="font-mono text-sm">{step.stepType}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded border border-green-700 px-2 py-1 text-xs text-green-700"
                onClick={() => updateStep(i, "passed")}
                type="button"
              >
                Pass
              </button>
              <button
                className="rounded border border-red-700 px-2 py-1 text-xs text-red-700"
                onClick={() => updateStep(i, "failed")}
                type="button"
              >
                Fail
              </button>
              <span className="w-16 text-right text-xs font-bold text-gray-600">
                {step.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button
        className="rounded bg-blue-600 px-6 py-2 font-medium text-white disabled:opacity-50"
        disabled={!allReviewed || saving}
        onClick={() => void saveRun()}
        type="button"
      >
        {saving ? "Saving..." : "Save manual QA run"}
      </button>
      {saveMessage ? <p role="status">{saveMessage}</p> : null}
    </div>
  );
}
