// ident-<slug>-<unix seconds>.<ext>: slug = the mark text, nfkd-normalized (accents stripped),
// lowercased, anything outside a-z0-9 collapsed to one dash. empty text -> "mark".
export function slug(text: string): string {
  const s = text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "mark";
}
export function exportName(text: string, ext: string, now = Date.now()): string {
  return `ident-${slug(text)}-${Math.floor(now / 1000)}.${ext}`;
}
