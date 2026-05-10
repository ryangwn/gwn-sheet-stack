import { type SpringDescriptor, springAt } from './spring';

type ScheduleFn = (cb: (t: number) => void) => number;
type CancelFn = (id: number) => void;

const SETTLE_THRESHOLD = 0.05;
const SETTLE_VELOCITY_THRESHOLD = 1;

export class SpringDriver {
  private scheduleFrame: ScheduleFn;
  private cancelFrame: CancelFn;
  private frameId: number | null = null;
  private startTime: number | null = null;
  private desc: SpringDescriptor | null = null;
  private from = 0;
  private to = 0;
  private v0 = 0;

  value = 0;
  velocity = 0;
  isRunning = false;

  constructor(schedule: ScheduleFn, cancel: CancelFn) {
    this.scheduleFrame = schedule;
    this.cancelFrame = cancel;
  }

  start(
    desc: SpringDescriptor,
    from: number,
    to: number,
    v0: number,
    onTick: (v: number) => void,
    onComplete: () => void,
  ): void {
    if (this.frameId !== null) this.cancelFrame(this.frameId);

    this.desc = desc;
    this.from = from;
    this.to = to;
    this.v0 = v0;
    this.value = from;
    this.velocity = v0;
    this.isRunning = true;
    this.startTime = null;

    const step = (now: number) => {
      if (this.startTime === null) this.startTime = now;
      const t = (now - this.startTime) / 1000;

      const pos = springAt(desc, t, from, to, v0);
      const dt = 0.001;
      const posNext = springAt(desc, t + dt, from, to, v0);
      const vel = (posNext - pos) / dt;

      this.value = pos;
      this.velocity = vel;
      onTick(pos);

      const distToTarget = Math.abs(pos - to);
      const absVel = Math.abs(vel);

      if (distToTarget < SETTLE_THRESHOLD && absVel < SETTLE_VELOCITY_THRESHOLD) {
        this.value = to;
        this.velocity = 0;
        this.isRunning = false;
        this.frameId = null;
        onTick(to);
        onComplete();
        return;
      }

      this.frameId = this.scheduleFrame(step);
    };

    this.frameId = this.scheduleFrame(step);
  }

  stop(): void {
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
    this.isRunning = false;
  }
}
