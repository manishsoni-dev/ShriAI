// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VoiceRecorder } from "@/app/_components/VoiceRecorder";

class MockMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  mimeType = "audio/webm";
  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

const getUserMedia = vi.fn();

function renderRecorder(hasStoredConsent: boolean) {
  const onError = vi.fn();
  render(
    <VoiceRecorder
      hasStoredConsent={hasStoredConsent}
      onError={onError}
      onTranscript={vi.fn()}
      personaDisplayName="Krishna"
      voiceState="idle"
    />,
  );
  return { onError };
}

describe("VoiceRecorder consent", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
  });

  it("does not request browser microphone permission before stored consent", () => {
    const { onError } = renderRecorder(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Start voice recording" }),
    );
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("consent"));
    expect(screen.getByText(/Enable local microphone processing/)).toBeTruthy();
  });

  it("requests microphone access after stored consent", async () => {
    renderRecorder(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Start voice recording" }),
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
  });
});
