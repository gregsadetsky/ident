// google fonts css url for one family (some faces need an explicit weight)
const WEIGHTS: Record<string, string> = { "Space Mono": "700", Orbitron: "800", Fredoka: "700", "Playfair Display": "900" };
export function fontCssUrl(font: string): string {
  const fam = font.replace(/ /g, "+");
  const w = WEIGHTS[font];
  return `https://fonts.googleapis.com/css2?family=${fam}${w ? `:wght@${w}` : ""}&display=swap`;
}
