import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { state } from "../core/state";
import { renderSequence } from "../engine";

export const CLIP = { seconds: 2.5, fps: 30 };

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// gif: one palette per frame. transparent bg = 1-bit alpha with index 0 reserved as the key
// (quantize doesn't promise where the transparent colour lands, so we place it ourselves).
// gif has no soft alpha: trails below half alpha vanish, above become solid.
export function encodeGif(): Blob {
  const gif = GIFEncoder();
  const transparent = state.mark.bg === "transparent";
  renderSequence(CLIP.seconds, CLIP.fps, (c, i) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let palette = quantize(data, transparent ? 255 : 256, { format: "rgb565" });
    let index = applyPalette(data, palette, "rgb565");
    if (transparent) {
      palette = [[0, 0, 0], ...palette];
      for (let p = 0; p < c.width * c.height; p++) index[p] = data[p * 4 + 3] < 128 ? 0 : index[p] + 1;
    }
    gif.writeFrame(index, c.width, c.height, { palette, delay: 1000 / CLIP.fps, transparent, transparentIndex: 0, dispose: transparent ? 2 : 0, repeat: 0, first: i === 0 });
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

// mp4: h.264 via webcodecs, muxed in the browser. no alpha (h.264 has none): bg composited, transparent -> black.
export async function encodeMp4(): Promise<Blob> {
  if (typeof VideoEncoder === "undefined") throw new Error("this browser has no WebCodecs (VideoEncoder)");
  const w = state.mark.w & ~1, h = state.mark.h & ~1; // h.264 wants even dims
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: w, height: h }, fastStart: "in-memory" });
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { throw e; } });
  enc.configure({ codec: "avc1.42001f", width: w, height: h, bitrate: 4_000_000, framerate: CLIP.fps });
  const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
  const ctx = tmp.getContext("2d")!;
  renderSequence(CLIP.seconds, CLIP.fps, (c, i) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(c, 0, 0, w, h);
    const frame = new VideoFrame(tmp, { timestamp: (i * 1e6) / CLIP.fps, duration: 1e6 / CLIP.fps });
    enc.encode(frame, { keyFrame: i % 30 === 0 });
    frame.close();
  });
  await enc.flush(); enc.close();
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: "video/mp4" });
}
