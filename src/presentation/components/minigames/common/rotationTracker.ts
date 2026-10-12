/** Signed travel around the outer ring: back-and-forth jitter cancels itself. */
export class RotationTracker {
  private previous: number | null = null;
  private travel = 0;

  reset() { this.previous = null; this.travel = 0; }

  move(x: number, y: number, width: number, height: number): number {
    const dx = x - width / 2;
    const dy = y - height / 2;
    const radius = Math.min(width, height) / 2;
    if (Math.hypot(dx, dy) < radius * 0.45 || Math.hypot(dx, dy) > radius * 1.15) {
      this.previous = null;
      return Math.abs(this.travel) / (2 * Math.PI);
    }
    const angle = Math.atan2(dy, dx);
    if (this.previous !== null) {
      let delta = angle - this.previous;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      if (Math.abs(delta) <= Math.PI / 2) this.travel += delta;
    }
    this.previous = angle;
    return Math.abs(this.travel) / (2 * Math.PI);
  }

  release() { this.previous = null; }
}
