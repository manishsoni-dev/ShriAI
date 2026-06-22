import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Expose a function to collect errors/logs if needed
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  await page.goto("http://localhost:3001", { waitUntil: "networkidle0" });

  // Wait 5 seconds for animations
  await new Promise((r) => setTimeout(r, 5000));

  const report = await page.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    if (canvases.length === 0) return { error: "No canvases found" };

    const canvas = canvases[0];
    const rect = canvas.getBoundingClientRect();
    const style = window.getComputedStyle(canvas);

    const parent = canvas.parentElement;
    // Check all parent contexts up to body
    const parents = [];
    let curr = parent;
    while (curr && curr !== document) {
      const s = window.getComputedStyle(curr);
      parents.push({
        tagName: curr.tagName,
        className: curr.className,
        zIndex: s.zIndex,
        position: s.position,
        opacity: s.opacity,
        transform: s.transform,
        filter: s.filter,
        isolation: s.isolation,
        contain: s.contain,
        mixBlendMode: s.mixBlendMode,
        backgroundColor: s.backgroundColor,
      });
      curr = curr.parentElement;
    }

    return {
      mountedCanvases: canvases.length,
      cssDimensions: {
        width: rect.width,
        height: rect.height,
        styleWidth: style.width,
        styleHeight: style.height,
      },
      backingStore: { width: canvas.width, height: canvas.height },
      computed: {
        position: style.position,
        zIndex: style.zIndex,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
      },
      parents: parents,
      documentVisibility: document.visibilityState,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    };
  });

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
