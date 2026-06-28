import { describe, expect, it } from "vitest";

import {
  clampOmVolume,
  getAmbientOmStatus,
} from "@/app/_components/AudioExperienceProvider";

describe("AudioExperienceProvider helpers", () => {
  it("clamps OM volume to the ambient range", () => {
    expect(clampOmVolume(-1)).toBe(0);
    expect(clampOmVolume(0.2)).toBe(0.2);
    expect(clampOmVolume(1)).toBe(0.42);
    expect(clampOmVolume(Number.NaN)).toBe(0.15);
  });

  it("reports truthful ambient OM status", () => {
    expect(
      getAmbientOmStatus({
        enabled: false,
        isPlaying: false,
        isSupported: true,
      }),
    ).toBe("paused");
    expect(
      getAmbientOmStatus({
        enabled: true,
        isPlaying: false,
        isSupported: true,
      }),
    ).toBe("ready");
    expect(
      getAmbientOmStatus({
        enabled: true,
        isPlaying: true,
        isSupported: true,
      }),
    ).toBe("playing");
    expect(
      getAmbientOmStatus({
        enabled: true,
        isPlaying: true,
        isSupported: false,
      }),
    ).toBe("unavailable");
  });
});
