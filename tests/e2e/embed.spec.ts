import { test, expect, type Download } from "@playwright/test";
import { unzipSync, strFromU8 } from "fflate";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const painted = (sel: string) => `(() => { const c = document.querySelector("${sel}"); const d = c.getContext("2d").getImageData(0,0,c.width,c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })()`;

async function unzip(dl: Download): Promise<Record<string, string>> {
  const buf = Buffer.concat((await (await dl.createReadStream()).toArray()) as Buffer[]);
  expect(buf.subarray(0, 4).toString("hex")).toBe("504b0304");
  return Object.fromEntries(Object.entries(unzipSync(new Uint8Array(buf))).map(([k, v]) => [k, strFromU8(v)]));
}
// write the bundle to disk, return the dir (so the html can load ./ident.js)
function materialize(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ident-"));
  for (const [k, v] of Object.entries(files)) writeFileSync(join(dir, k), v);
  return dir;
}

test("embed zip: self-hosted page mounts ident, paints, reacts on hover", async ({ page, browser }) => {
  await page.goto("/");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=get embed .zip")]);
  const files = await unzip(dl);
  expect(Object.keys(files).sort()).toEqual(["ident.js", "index.html", "readme.txt"]);
  expect(files["index.html"]).toContain('src="./ident.js"');
  expect(files["index.html"]).toContain("ident.mount(");
  expect(files["ident.js"].length).toBeGreaterThan(5000);
  const dir = materialize(files);
  const q = await browser.newPage(); const errs: string[] = []; q.on("pageerror", (e) => errs.push(e.message));
  await q.goto("file://" + join(dir, "index.html")); await q.waitForTimeout(3500);
  expect(await q.evaluate("typeof ident.mount")).toBe("function");
  const before = await q.evaluate(painted("#ident canvas")) as number;
  expect(before).toBeGreaterThan(5000);
  const r = (await q.locator("#ident").boundingBox())!;
  await q.mouse.move(r.x - 50, r.y - 50); await q.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await q.waitForTimeout(120);
  expect(await q.evaluate(painted("#ident canvas"))).not.toBe(before);
  expect(errs).toEqual([]);
  await q.close();
});

test("404 zip: ascii page renders colored text, no canvas", async ({ page, browser }) => {
  await page.goto("/");
  await page.click('.tab[data-id="404"]');
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=get 404 .zip")]);
  const files = await unzip(dl);
  expect(Object.keys(files).sort()).toEqual(["404.html", "ident.js", "readme.txt"]);
  expect(files["404.html"]).toContain('"ascii":true');
  const dir = materialize(files);
  const q = await browser.newPage(); const errs: string[] = []; q.on("pageerror", (e) => errs.push(e.message));
  await q.goto("file://" + join(dir, "404.html")); await q.waitForTimeout(3500);
  const txt = (await q.locator("#ident pre").textContent())!;
  expect(txt.replace(/\s/g, "").length).toBeGreaterThan(80);
  expect(txt).toMatch(/^[ .:\-=+*#%@\n]*$/);
  expect(await q.locator("#ident canvas").count()).toBe(0);
  expect(await q.locator("#ident pre").evaluate((e) => getComputedStyle(e).color)).toBe("rgb(255, 77, 0)");
  expect(errs).toEqual([]);
  await q.close();
});

test("terminal zip: frames.txt parses, node loader and bash player agree on frame count", async ({ page }) => {
  await page.goto("/");
  await page.click('.tab[data-id="terminal"]');
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("text=get terminal .zip")]);
  const files = await unzip(dl);
  expect(Object.keys(files).sort()).toEqual(["frames.txt", "play.js", "play.sh", "readme.txt"]);
  const head = files["frames.txt"].split("\n")[0];
  expect(head).toMatch(/^# ident frames cols=\d+ rows=\d+ fps=30 count=75$/);
  const seps = files["frames.txt"].split("\n").filter((l) => l === "=====").length;
  expect(seps).toBe(75);
  const dir = materialize(files);
  const { execSync } = await import("child_process");
  const node = execSync(`node -e 'const c=require("./play.js").loadFrames("frames.txt"); console.log(JSON.stringify([c.frames.length, c.rows, c.frames.every(f => f.split("\\n").length === c.rows)]))'`, { cwd: dir }).toString();
  expect(JSON.parse(node)).toEqual([75, Number(head.match(/rows=(\d+)/)![1]), true]);
  // bash player, one loop, output captured: one clear sequence per frame
  const sh = execSync("bash ./play.sh frames.txt 1 | cat", { cwd: dir, timeout: 30000 });
  expect(sh.toString("latin1").split("\x1b[H\x1b[2J").length - 1).toBe(75);
  // the last frame is the settled mark: not empty
  const clip = files["frames.txt"].split("\n=====\n");
  expect(clip[75].replace(/\s/g, "").length).toBeGreaterThan(100);
});
