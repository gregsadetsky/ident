import { renderStill, frameSize } from "../engine";

// single frame, mark at rest, bg composited (or transparent). for places that can't animate.
export function downloadStill(name = "ident.png") {
  const c = document.createElement("canvas");
  const fs = frameSize(); c.width = fs.w; c.height = fs.h;
  renderStill(c);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
}
