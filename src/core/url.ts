// "example.com" -> "https://example.com"; existing http(s) scheme kept; empty stays empty
export function normalizeSiteUrl(v: string): string {
  const t = v.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : "https://" + t;
}
