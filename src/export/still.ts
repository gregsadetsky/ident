import { state } from "../core/state";
import { renderStill } from "../engine";

// single frame, mark at rest, bg composited (or transparent). for places that can't animate.
export function downloadStill(name = "ident.png") {
  const c = document.createElement("canvas");
  c.width = state.mark.w; c.height = state.mark.h;
  renderStill(c);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
}
