/**
 * Pahadi Daud: the physics of a little jeep on hills. Pure maths, no drawing, so it can run (and be tested) anywhere.
 *
 * Units: pixels and seconds, y grows downward. 16 px = 1 metre (the server counts the same way: coins every 40 m).
 * The jeep is a body with two wheels on springs. Gas pushes the rear wheel along the ground, brake slows it; in the air gas and
 * brake tilt the jeep back and forward. The jeep is out when the driver's head touches the ground or the fuel is gone.
 */
export const PX_PER_M = 16;
export const START_X = 260;
const G = 1500;

/** The ground: gentle at the start, bigger and steeper hills the further you go. */
export function ground(x: number): number {
  const d = Math.max(0, x - START_X);
  const ramp = Math.min(1, d / 3500);
  const big = 70 + 260 * ramp;
  const mid = 34 + 120 * ramp;
  const small = 10 + 22 * ramp;
  const flat = Math.min(1, d / 700); // the first stretch is flat so you can start calmly
  const h = big * Math.sin(d / 330 + 0.6) + mid * Math.sin(d / 150 + 1.7) + small * Math.sin(d / 61 + 0.3) - big * Math.sin(0.6);
  return -(flat * h) - d * 0.045; // a slow climb: it is a hill climb
}

const slopeAt = (x: number) => (ground(x + 1.5) - ground(x - 1.5)) / 3;

export type Pickup = { kind: "coin" | "fuel"; index: number; x: number; y: number; value: number; got: boolean };

export type HillOptions = { coinBig: number; coinSmall: number; coinGapM: number; firstCoinM: number };

export class HillWorld {
  // the body
  x = START_X;
  y = ground(START_X) - 40;
  vx = 0;
  vy = 0;
  angle = 0;
  omega = 0;
  wheelSpin = 0;
  grounded = false;
  // the run
  fuel = 1;
  coins = 0;
  coinsCount = 0;
  crashed = false;
  outOfFuel = false;
  time = 0;
  maxX = START_X;
  private pickups = new Map<string, Pickup>();
  constructor(private o: HillOptions) {}

  get distanceM() {
    return Math.max(0, Math.floor((this.maxX - START_X) / PX_PER_M));
  }
  get speedMs() {
    return Math.hypot(this.vx, this.vy) / PX_PER_M;
  }

  /** The coin and fuel can at each place on the road, made the same way every time. */
  pickupsBetween(x0: number, x1: number): Pickup[] {
    const out: Pickup[] = [];
    const gap = this.o.coinGapM * PX_PER_M;
    const first = START_X + this.o.firstCoinM * PX_PER_M;
    const i0 = Math.max(0, Math.floor((x0 - first) / gap));
    const i1 = Math.floor((x1 - first) / gap);
    for (let i = i0; i <= i1; i++) {
      const key = `c${i}`;
      let p = this.pickups.get(key);
      if (!p) {
        const px = first + i * gap;
        p = { kind: "coin", index: i, x: px, y: ground(px) - 54, value: i % 2 === 0 ? this.o.coinBig : this.o.coinSmall, got: false };
        this.pickups.set(key, p);
      }
      out.push(p);
    }
    // a fuel can about every 380 m, between the coins
    const fgap = 380 * PX_PER_M;
    const ffirst = START_X + 260 * PX_PER_M + gap / 2;
    const f0 = Math.max(0, Math.floor((x0 - ffirst) / fgap));
    const f1 = Math.floor((x1 - ffirst) / fgap);
    for (let i = f0; i <= f1; i++) {
      const key = `f${i}`;
      let p = this.pickups.get(key);
      if (!p) {
        const px = ffirst + i * fgap;
        p = { kind: "fuel", index: i, x: px, y: ground(px) - 54, value: 0, got: false };
        this.pickups.set(key, p);
      }
      out.push(p);
    }
    return out;
  }

  /** One step of the world. gas and brake are on or off. */
  step(dt: number, gas: boolean, brake: boolean) {
    if (this.crashed) return;
    const SUB = 4;
    const h = dt / SUB;
    for (let s = 0; s < SUB; s++) this.sub(h, gas && this.fuel > 0, brake);
    this.time += dt;
    if (gas && this.fuel > 0) this.fuel = Math.max(0, this.fuel - dt / 70);
    if (this.fuel <= 0 && !this.outOfFuel) this.outOfFuel = true;
    this.maxX = Math.max(this.maxX, this.x);
    // pick things up
    for (const p of this.pickupsBetween(this.x - 80, this.x + 80)) {
      if (p.got) continue;
      if (Math.hypot(p.x - this.x, p.y - (this.y - 10)) < 46) {
        p.got = true;
        if (p.kind === "coin") {
          this.coins += p.value;
          this.coinsCount++;
        } else this.fuel = Math.min(1, this.fuel + 0.55);
      }
    }
    // out of fuel and almost stopped: that is the end
    if (this.outOfFuel && this.grounded && Math.hypot(this.vx, this.vy) < 14) this.crashed = true;
  }

  private sub(h: number, gas: boolean, brake: boolean) {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    // local to world
    const W = (lx: number, ly: number) => ({ x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c });
    const wheels = [W(-36, 16), W(36, 16)];
    let ax = 0;
    let ay = G;
    let alpha = 0;
    let contacts = 0;
    for (let i = 0; i < 2; i++) {
      const w = wheels[i];
      const gy = ground(w.x);
      const pen = w.y + 15 - gy;
      if (pen <= 0) continue;
      contacts++;
      const p = Math.min(pen, 34);
      const sl = slopeAt(w.x);
      const nl = Math.hypot(sl, 1);
      const nx = sl / nl; // upward normal (y is down)
      const ny = -1 / nl;
      const tx = 1 / nl; // along the ground, towards +x
      const ty = sl / nl;
      const rx = w.x - this.x;
      const ry = w.y - this.y;
      // velocity of the wheel point
      const wvx = this.vx - this.omega * ry;
      const wvy = this.vy + this.omega * rx;
      const vn = wvx * nx + wvy * ny;
      const vt = wvx * tx + wvy * ty;
      const fn = Math.max(0, 1250 * p - 78 * vn);
      let ft = 0;
      if (gas && i === 0) ft += 1050; // the rear wheel pulls
      if (gas && i === 1) ft += 350;
      if (brake) ft -= Math.sign(vt) * Math.min(Math.abs(vt) * 12, 1500);
      ft -= vt * 1.4; // rolling resistance
      const fx = fn * nx + ft * tx;
      const fy = fn * ny + ft * ty;
      ax += fx;
      ay += fy;
      // the push from the ground tilts the jeep, the push of the engine only a little (so it does not flip backwards at once)
      const tq = rx * (fn * ny) - ry * (fn * nx) + 0.3 * (rx * (ft * ty) - ry * (ft * tx));
      alpha += tq / 1500;
      if (i === 0) this.wheelSpin += (vt / 16) * h;
    }
    this.grounded = contacts > 0;
    // tilting in the air
    if (!this.grounded) {
      if (gas) alpha -= 7.5;
      if (brake) alpha += 7.5;
      alpha -= this.omega * 0.35;
      this.wheelSpin += (gas ? 18 : 6) * h;
    } else {
      alpha -= this.omega * 3.2; // the ground damps wobbling
    }
    // air drag keeps the top speed sensible
    ax -= this.vx * Math.abs(this.vx) * 0.0072;
    ay -= this.vy * Math.abs(this.vy) * 0.0016;
    this.vx += ax * h;
    this.vy += ay * h;
    this.omega += alpha * h;
    this.x += this.vx * h;
    this.y += this.vy * h;
    this.angle += this.omega * h;
    // the head
    const head = W(-4, -30);
    if (head.y + 7 > ground(head.x)) this.crashed = true;
    // never go backwards off the start
    if (this.x < START_X - 120) {
      this.x = START_X - 120;
      this.vx = Math.max(0, this.vx);
    }
  }
}
