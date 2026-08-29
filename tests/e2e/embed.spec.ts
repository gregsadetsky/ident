import { test, expect } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const painted = (sel: string) => `(() => { const c = document.querySelector("${sel}"); const d = c.getContext("2d").getImageData(0,0,c.width,c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })()`;

test("embed html: standalone page mounts ident, paints, reacts on hover", async ({ page, browser }) => {
  await page.goto("/");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=get embed .html")]);
  const html = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString());
  expect(html).toContain('/embed/ident.js"');
  expect(html).toContain("ident.mount(");
  const file = join(mkdtempSync(join(tmpdir(), "ident-")), "embed.html"); writeFileSync(file, html);
  const q = await browser.newPage(); const errs: string[] = []; q.on("pageerror", (e) => errs.push(e.message));
  await q.goto("file://" + file); await q.waitForTimeout(3500);
  expect(await q.evaluate("typeof ident.mount")).toBe("function");
  const before = await q.evaluate(painted("#ident canvas")) as number;
  expect(before).toBeGreaterThan(5000);
  const r = (await q.locator("#ident").boundingBox())!;
  await q.mouse.move(r.x - 50, r.y - 50); await q.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await q.waitForTimeout(120);
  expect(await q.evaluate(painted("#ident canvas"))).not.toBe(before);
  expect(errs).toEqual([]);
  await q.close();
});

test("404 html: ascii page renders text, no hover handler, loops", async ({ page, browser }) => {
  await page.goto("/");
  await page.click('.tab[data-id="404"]');
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=get 404.html")]);
  const html = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c as Buffer[]).toString());
  expect(html).toContain('"ascii":true');
  expect(html).toContain("page not found");
  const file = join(mkdtempSync(join(tmpdir(), "ident-")), "404.html"); writeFileSync(file, html);
  const q = await browser.newPage(); const errs: string[] = []; q.on("pageerror", (e) => errs.push(e.message));
  await q.goto("file://" + file); await q.waitForTimeout(3500);
  const txt = (await q.locator("#ident pre").textContent())!;
  expect(txt.replace(/\s/g, "").length).toBeGreaterThan(150);
  expect(txt).toMatch(/^[ .:\-=+*#%@\n]*$/);
  expect(await q.locator("#ident canvas").count()).toBe(0);
  expect(errs).toEqual([]);
  await q.close();
});
