export interface SpringDescriptor {
  duration: number;
  bounce: number;
}

export function springParams({ duration, bounce }: SpringDescriptor) {
  const mass = 1;
  const omega0 = (2 * Math.PI) / duration;
  const stiffness = omega0 * omega0 * mass;
  // bounce=0 → critically damped (ζ=1), bounce>0 → underdamped, bounce<0 → overdamped
  const zeta = 1 - bounce;
  const damping = 2 * zeta * omega0 * mass;
  return { mass, stiffness, damping };
}

export function springAt(
  desc: SpringDescriptor,
  t: number,
  from: number,
  to: number,
  v0 = 0,
): number {
  const { stiffness: k, damping: c, mass: m } = springParams(desc);
  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const A = from - to;

  if (zeta < 1 - 1e-6) {
    // underdamped
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const B = (v0 + zeta * omega0 * A) / omegaD;
    return (
      to + Math.exp(-zeta * omega0 * t) * (A * Math.cos(omegaD * t) + B * Math.sin(omegaD * t))
    );
  } else if (zeta < 1 + 1e-6) {
    // critically damped
    const B = v0 + omega0 * A;
    return to + (A + B * t) * Math.exp(-omega0 * t);
  } else {
    // overdamped
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega0 * (zeta + s);
    const r2 = -omega0 * (zeta - s);
    const C1 = (v0 - r2 * A) / (r1 - r2);
    const C2 = A - C1;
    return to + C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t);
  }
}

export const SPRING_DEFAULTS = {
  present: { duration: 0.5, bounce: 0.0 },
  dismiss: { duration: 0.4, bounce: 0.0 },
  snap: { duration: 0.35, bounce: 0.15 },
  push: { duration: 0.4, bounce: 0.0 },
  panel: { duration: 0.45, bounce: 0.0 },
} satisfies Record<string, SpringDescriptor>;
