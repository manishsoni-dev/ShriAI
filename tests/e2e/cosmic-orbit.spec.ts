import { test, expect } from "@playwright/test";

test.describe("Cosmic Orbit Engine", () => {
  test("should render canvas and reach ready status", async ({ page }) => {
    await page.goto("/?cosmicDebug=1");

    // Find the canvas element
    const canvas = page.locator("canvas[data-cosmic-status]");
    await expect(canvas).toBeAttached();

    // Check status becomes ready
    await expect(canvas).toHaveAttribute("data-cosmic-status", "ready", {
      timeout: 15000,
    });

    // Check dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);

    // Optional: Visual proof by taking screenshot (will be saved in test-results)
    await page.screenshot({ path: "test-results/cosmic-orbit-top.png" });

    // Scroll down and screenshot
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500); // let animations settle
    await page.screenshot({ path: "test-results/cosmic-orbit-middle.png" });
  });
});
