import { test, expect, type Page } from "@playwright/test";

const noErrors = (page: Page) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  return errs;
};

test("loads, all four destinations render, no page errors", async ({ page }) => {
  const errs = noErrors(page);
  await page.goto("/");
  await expect(page.locator(".tab")).toHaveCount(4);
  for (const id of ["header", "404", "readme", "terminal"]) {
    await page.click(`.tab[data-id="${id}"]`);
    await expect(page.locator(".editing")).toContainText(id === "header" ? "site header" : id);
    await expect(page.locator(".context .slot")).toBeVisible();
  }
  expect(errs).toEqual([]);
});

test("terminal ascii shows the mark and ignores colors", async ({ page }) => {
  await page.goto("/");
  await page.click('.tab[data-id="terminal"]');
  await page.waitForTimeout(300);
  const before = await page.locator(".term .slot pre").textContent();
  expect(before!.replace(/\s/g, "").length).toBeGreaterThan(20);
  expect(before).toMatch(/^[ .:\-=+*#%@\n]*$/);
  // opaque bg must not fill the ascii with @
  await page.evaluate(() => { const bg = document.querySelector<HTMLInputElement>("#bg")!; bg.value = "#2244ff"; bg.dispatchEvent(new Event("input")); });
  await page.waitForTimeout(300);
  const after = await page.locator(".term .slot pre").textContent();
  expect(after!.split("\n")[0]).toBe(before!.split("\n")[0]);
});

test("typing changes the mark; ascii is empty for blank text", async ({ page }) => {
  await page.goto("/");
  await page.click('.tab[data-id="terminal"]');
  await page.fill("#text", "");
  await page.waitForTimeout(400);
  expect((await page.locator(".term .slot pre").textContent())!.trim()).toBe("");
});

test("site url gets https prefixed, iframe loads, mark floats and resizes into the rail", async ({ page }) => {
  await page.goto("/");
  await page.fill("#siteurl", "example.com");
  await page.press("#siteurl", "Enter");
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://example.com");
  await expect(page.locator("#siteurl")).toHaveValue("https://example.com");
  const slot = page.locator(".slot.floating");
  const r = (await slot.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + 100, r.y + r.height / 2 + 50, { steps: 5 }); await page.mouse.up();
  const r2 = (await slot.boundingBox())!;
  expect(Math.round(r2.x - r.x)).toBe(100); expect(Math.round(r2.y - r.y)).toBe(50);
  const h = (await page.locator(".slot.floating .resize").boundingBox())!;
  await page.mouse.move(h.x + 6, h.y + 6); await page.mouse.down();
  await page.mouse.move(h.x + 6 - 112, h.y + 6 - 42, { steps: 5 }); await page.mouse.up();
  await expect(page.locator("#w")).toHaveValue("400");
  await expect(page.locator("#h")).toHaveValue("150");
  // editing the mark must not reload the iframe
  await page.evaluate(() => { (window as any).__fr = document.querySelector("iframe"); });
  await page.fill("#text", "HELLO");
  expect(await page.evaluate(() => (window as any).__fr === document.querySelector("iframe"))).toBe(true);
});

test("readme exports: png and gif download with the right magic bytes", async ({ page }) => {
  await page.goto("/");
  await page.click('.tab[data-id="readme"]');
  const magic: Record<string, [string, string]> = {
    "get still .png": ["ident.png", "89504e47"],
    "get .gif": ["ident.gif", "47494638"],
  };
  for (const [label, [name, hex]] of Object.entries(magic)) {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click(`text=${label}`)]);
    expect(dl.suggestedFilename()).toBe(name);
    const stream = await dl.createReadStream();
    const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
    const buf = Buffer.concat(chunks);
    expect(buf.length).toBeGreaterThan(1000);
    const head = buf.subarray(0, 8).toString("hex");
    expect(head, name).toContain(hex);
  }
});

test("mobile shows the note and hides the editor", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("#mobile")).toBeVisible();
  await expect(page.locator("#mobile")).toContainText("too demanding to work on mobile");
  await expect(page.locator("#rail")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await ctx.close();
});
