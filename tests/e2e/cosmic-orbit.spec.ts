import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "4k", width: 3840, height: 2160 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
}

async function expectHitTargetClear(page: Page, selector: string) {
  const blocked = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return target !== element && !element.contains(target);
  });

  expect(blocked).toBe(false);
}

test.describe("Cosmic Orbit Engine", () => {
  for (const viewport of viewports) {
    test(`keeps hero controls usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const canvas = page.locator("canvas[data-cosmic-status]");
      await expect(canvas).toBeAttached();
      await expect(canvas).toHaveAttribute("data-celestial-body-count", "9");
      await expect(canvas).toHaveAttribute("data-cosmic-center-x", "0.50");
      await expect(canvas).toHaveAttribute("data-cosmic-center-y", "0.50");
      await expect(canvas).toHaveAttribute("data-cosmic-status", "ready", {
        timeout: 15000,
      });

      await expect(page.getByTestId("hero-copy")).toBeVisible();
      await expect(page.getByTestId("hero-primary-cta")).toBeVisible();
      await expect(page.getByTestId("hero-secondary-cta")).toBeVisible();
      await expect(page.getByTestId("cosmic-motion-toggle")).toBeVisible();

      await expectNoHorizontalOverflow(page);
      await expectHitTargetClear(page, "[data-testid='hero-primary-cta']");
      await expectHitTargetClear(page, "[data-testid='hero-secondary-cta']");
      await expectHitTargetClear(page, "[data-testid='cosmic-motion-toggle']");

      await page.screenshot({
        path: `test-results/cosmic-${viewport.name}.png`,
        fullPage: false,
      });
    });
  }

  test("supports pause and resume without blocking controls", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.locator("canvas[data-cosmic-status]");
    const toggle = page.getByTestId("cosmic-motion-toggle");

    await expect(canvas).toHaveAttribute("data-cosmic-motion", "running");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(canvas).toHaveAttribute("data-cosmic-motion", "paused");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Resume");

    await toggle.press("Enter");
    await expect(canvas).toHaveAttribute("data-cosmic-motion", "running");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveText("Pause");
  });

  test("honors reduced motion immediately", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const canvas = page.locator("canvas[data-cosmic-status]");
    const toggle = page.getByTestId("cosmic-motion-toggle");

    await expect(canvas).toHaveAttribute("data-cosmic-motion", "reduced");
    await expect(toggle).toBeDisabled();
    await expect(toggle).toHaveText("Motion reduced");
  });
});
