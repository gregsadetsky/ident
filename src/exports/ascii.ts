// ascii export: turns text into a plain-text block that pastes fine into
// a bash prompt/motd or a 404 page. starting point - just a box for now.
export function asciiBox(text: string): string {
  const lines = text.split("\n");
  const w = Math.max(0, ...lines.map((l) => l.length));
  const top = "+" + "-".repeat(w + 2) + "+";
  const body = lines.map((l) => "| " + l.padEnd(w) + " |");
  return [top, ...body, top].join("\n");
}
