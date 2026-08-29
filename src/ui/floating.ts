import { state, subscribe } from "../core/state";

// makes the header slot a free box over a framed site: drag to move (absolute px, no scroll follow).
// pointer capture keeps events off the iframe. size comes from the rail.
export function makeFloating(slot: HTMLElement) {
  slot.classList.add("floating");
  const apply = () => {
    if (!slot.isConnected) return;
    slot.style.left = state.headerPos.x + "px"; slot.style.top = state.headerPos.y + "px";
    slot.style.width = state.mark.w + "px"; slot.style.height = state.mark.h + "px";
  };
  apply();
  let drag: { sx: number; sy: number; x: number; y: number } | null = null;
  slot.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { sx: e.clientX, sy: e.clientY, x: state.headerPos.x, y: state.headerPos.y };
    slot.setPointerCapture(e.pointerId); e.preventDefault();
  });
  slot.addEventListener("pointermove", (e) => {
    if (!drag) return;
    state.headerPos.x = Math.round(drag.x + e.clientX - drag.sx); state.headerPos.y = Math.round(drag.y + e.clientY - drag.sy); apply();
  });
  const end = () => { drag = null; };
  slot.addEventListener("pointerup", end); slot.addEventListener("pointercancel", end);
  subscribe(apply);
}
