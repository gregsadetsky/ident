import { state, update, subscribe } from "../core/state";

// makes the header slot a free box over a framed site: drag to move, corner handle to resize.
// resizing writes mark.w/h (the rail follows). pointer capture keeps events off the iframe.
export function makeFloating(slot: HTMLElement) {
  slot.classList.add("floating");
  const handle = document.createElement("i"); handle.className = "resize"; slot.appendChild(handle);
  const apply = () => {
    if (!slot.isConnected) return;
    slot.style.left = state.headerPos.x + "px"; slot.style.top = state.headerPos.y + "px";
    slot.style.width = state.mark.w + "px"; slot.style.height = state.mark.h + "px";
  };
  apply();

  let drag: { mode: "move" | "size"; sx: number; sy: number; x: number; y: number; w: number; h: number } | null = null;
  slot.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { mode: e.target === handle ? "size" : "move", sx: e.clientX, sy: e.clientY, x: state.headerPos.x, y: state.headerPos.y, w: state.mark.w, h: state.mark.h };
    slot.setPointerCapture(e.pointerId); e.preventDefault();
  });
  slot.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (drag.mode === "move") { state.headerPos.x = Math.round(drag.x + dx); state.headerPos.y = Math.round(drag.y + dy); apply(); }
    else update((s) => { s.mark.w = Math.max(32, Math.round(drag!.w + dx)); s.mark.h = Math.max(32, Math.round(drag!.h + dy)); });
  });
  const end = () => { drag = null; };
  slot.addEventListener("pointerup", end); slot.addEventListener("pointercancel", end);
  subscribe(apply);
}
