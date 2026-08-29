// damped spring, 1 -> 0. deterministic: value is a pure function of t.
// speed scales time, bounce in [0,1] lowers damping (more overshoot).
export function envelope(t: number, speed = 1, bounce = 0.5): number {
  if (t <= 0) return 1;
  const x = t * speed * 6;
  const zeta = 1 - bounce * 0.85; // 1 = critically damped, 0.15 = very bouncy
  const w = 1;
  if (zeta >= 1) return (1 + w * x) * Math.exp(-w * x);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x));
}
