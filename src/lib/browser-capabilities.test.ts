import { describe, expect, it } from "vitest";

import { detectPlatformFamily } from "@/lib/browser-capabilities";

describe("detectPlatformFamily", () => {
  it("prefers userAgentData platform signals", () => {
    expect(
      detectPlatformFamily({
        platform: "Linux x86_64",
        userAgentDataPlatform: "macOS",
      }),
    ).toBe("mac");
  });

  it("detects Windows platforms", () => {
    expect(
      detectPlatformFamily({
        platform: "Win32",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }),
    ).toBe("windows");
  });

  it("keeps mobile platforms distinct", () => {
    expect(
      detectPlatformFamily({
        platform: "iPhone",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ).toBe("ios");
    expect(
      detectPlatformFamily({
        platform: "Linux armv8l",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
      }),
    ).toBe("android");
  });
});
