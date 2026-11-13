/**
 * CHRONO-PHYSICS: High-Precision 4th-Order Runge-Kutta (RK4) Engine
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 *
 * Implements zero-allocation RK4 numerical integration with sub-stepping
 * for chaotic Hamiltonian and dissipative systems.
 */

// ==========================================
// 1. GENERIC HIGH-PERFORMANCE RK4 STEPPER
// ==========================================

export class RK4Stepper {
  private k1: Float64Array;
  private k2: Float64Array;
  private k3: Float64Array;
  private k4: Float64Array;
  private temp: Float64Array;

  constructor(public readonly size: number) {
    this.k1 = new Float64Array(size);
    this.k2 = new Float64Array(size);
    this.k3 = new Float64Array(size);
    this.k4 = new Float64Array(size);
    this.temp = new Float64Array(size);
  }

  /**
   * Performs an in-place RK4 step using pre-allocated buffers.
   * y_{n+1} = y_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
   */
  public step(
    state: Float64Array,
    dt: number,
    deriv: (s: Float64Array, ds: Float64Array) => void
  ): void {
    const n = this.size;
    const halfDt = dt * 0.5;

    // k1 = f(t, y)
    deriv(state, this.k1);

    // k2 = f(t + dt/2, y + dt/2 * k1)
    for (let i = 0; i < n; i++) {
      this.temp[i] = state[i] + halfDt * this.k1[i];
    }
    deriv(this.temp, this.k2);

    // k3 = f(t + dt/2, y + dt/2 * k2)
    for (let i = 0; i < n; i++) {
      this.temp[i] = state[i] + halfDt * this.k2[i];
    }
    deriv(this.temp, this.k3);

    // k4 = f(t + dt, y + dt * k3)
    for (let i = 0; i < n; i++) {
      this.temp[i] = state[i] + dt * this.k3[i];
    }
    deriv(this.temp, this.k4);

    // Final weighted state update
    const sixthDt = dt / 6.0;
    for (let i = 0; i < n; i++) {
      state[i] += sixthDt * (this.k1[i] + 2.0 * this.k2[i] + 2.0 * this.k3[i] + this.k4[i]);
    }
  }
}

// ==========================================
// 2. SYSTEM 1: DOUBLE-PENDULUM BUTTERFLY SWARM
// ==========================================

export interface PendulumBobPosition {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class DoublePendulumSwarmSystem {
  public swarmSize: number = 20;
  public l1: number = 1.0;
  public l2: number = 1.0;
  public m1: number = 1.0;
  public m2: number = 1.0;
  public gravity: number = 9.81;
  public damping: number = 0.0002;
  public basePerturbation: number = 0.0001; // 10^-4 rad

  // Array of states: each pendulum is [theta1, theta2, omega1, omega2]
  public states: Float64Array[] = [];
  private steppers: RK4Stepper[] = [];
  public trails: Array<Array<{ x: number; y: number }>> = [];
  public maxTrailLength: number = 180;

  // Telemetry metrics
  public kineticEnergy: number = 0;
  public potentialEnergy: number = 0;
  public totalEnergy: number = 0;
  public initialEnergy: number = 0;
  public energyDrift: number = 0;
  public lyapunovEstimate: number = 0;
  public elapsedTime: number = 0;
  private initialDivergence: number = 0.0001;

  constructor(count: number = 20) {
    this.setSwarmSize(count);
    this.reset(Math.PI * 0.55, Math.PI * 0.5);
  }

  public setSwarmSize(count: number): void {
    this.swarmSize = Math.max(1, Math.min(30, count));
    this.states = [];
    this.steppers = [];
    this.trails = [];
    for (let i = 0; i < this.swarmSize; i++) {
      this.states.push(new Float64Array(4));
      this.steppers.push(new RK4Stepper(4));
      this.trails.push([]);
    }
  }

  public reset(th1: number = Math.PI * 0.6, th2: number = Math.PI * 0.5): void {
    this.elapsedTime = 0;
    for (let i = 0; i < this.swarmSize; i++) {
      const dTheta = i * this.basePerturbation;
      this.states[i][0] = th1 + dTheta;
      this.states[i][1] = th2 + dTheta * 0.5;
      this.states[i][2] = 0.0;
      this.states[i][3] = 0.0;
      this.trails[i] = [];
    }

    this.initialDivergence = this.swarmSize > 1 ? this.calcDistance(0, 1) : 0.0001;
    this.initialEnergy = this.computeHamiltonian(this.states[0]);
    this.updateEnergyMetrics();
  }

  private calcDistance(idxA: number, idxB: number): number {
    const sA = this.states[idxA];
    const sB = this.states[idxB];
    const dth1 = sA[0] - sB[0];
    const dth2 = sA[1] - sB[1];
    const dom1 = sA[2] - sB[2];
    const dom2 = sA[3] - sB[3];
    return Math.sqrt(dth1 * dth1 + dth2 * dth2 + dom1 * dom1 + dom2 * dom2);
  }

  /**
   * Analytical equations of motion derived from Euler-Lagrange equations:
   * d/dt (dL/d(theta_dot)) - dL/d(theta) = 0
   */
  private getDerivatives(s: Float64Array, ds: Float64Array): void {
    const th1 = s[0];
    const th2 = s[1];
    const w1 = s[2];
    const w2 = s[3];

    const dTh = th1 - th2;
    const g = this.gravity;
    const m1 = this.m1;
    const m2 = this.m2;
    const l1 = this.l1;
    const l2 = this.l2;

    const mu = 1.0 + m1 / m2;
    const cosD = Math.cos(dTh);
    const sinD = Math.sin(dTh);
    const denom = mu - cosD * cosD;

    // Angular velocities
    ds[0] = w1;
    ds[1] = w2;

    // Angular accelerations
    const num1 = g * (Math.sin(th2) * cosD - mu * Math.sin(th1)) -
                 (l2 * w2 * w2 + l1 * w1 * w1 * cosD) * sinD;
    ds[2] = num1 / (l1 * denom) - this.damping * w1;

    const num2 = g * mu * (Math.sin(th1) * cosD - Math.sin(th2)) +
                 (mu * l1 * w1 * w1 + l2 * w2 * w2 * cosD) * sinD;
    ds[3] = num2 / (l2 * denom) - this.damping * w2;
  }

  public step(dt: number, subSteps: number = 8): void {
    const subDt = dt / subSteps;
    const boundDeriv = this.getDerivatives.bind(this);

    for (let s = 0; s < subSteps; s++) {
      for (let i = 0; i < this.swarmSize; i++) {
        this.steppers[i].step(this.states[i], subDt, boundDeriv);

        // Normalize angles to [-pi, pi] to avoid floating overflow in long runs
        this.states[i][0] = ((this.states[i][0] + Math.PI) % (2 * Math.PI)) - Math.PI;
        this.states[i][1] = ((this.states[i][1] + Math.PI) % (2 * Math.PI)) - Math.PI;
      }
      this.elapsedTime += subDt;
    }

    // Append trail points
    for (let i = 0; i < this.swarmSize; i++) {
      const pos = this.getPositions(i);
      this.trails[i].push({ x: pos.x2, y: pos.y2 });
      if (this.trails[i].length > this.maxTrailLength) {
        this.trails[i].shift();
      }
    }

    this.updateEnergyMetrics();

    // Compute Lyapunov exponent estimate lambda(t)
    if (this.swarmSize > 1 && this.elapsedTime > 0.1) {
      const dist = this.calcDistance(0, 1);
      if (dist > 1e-12 && this.initialDivergence > 1e-12) {
        this.lyapunovEstimate = Math.max(0, (1.0 / this.elapsedTime) * Math.log(dist / this.initialDivergence));
      }
    }
  }

  public getPositions(index: number): PendulumBobPosition {
    const s = this.states[index];
    const th1 = s[0];
    const th2 = s[1];

    const x1 = this.l1 * Math.sin(th1);
    const y1 = this.l1 * Math.cos(th1);
    const x2 = x1 + this.l2 * Math.sin(th2);
    const y2 = y1 + this.l2 * Math.cos(th2);

    return { x1, y1, x2, y2 };
  }

  public computeHamiltonian(s: Float64Array): number {
    const th1 = s[0];
    const th2 = s[1];
    const w1 = s[2];
    const w2 = s[3];

    const m1 = this.m1;
    const m2 = this.m2;
    const l1 = this.l1;
    const l2 = this.l2;
    const g = this.gravity;

    // Kinetic energy T
    const T = 0.5 * (m1 + m2) * l1 * l1 * w1 * w1 +
              0.5 * m2 * l2 * l2 * w2 * w2 +
              m2 * l1 * l2 * w1 * w2 * Math.cos(th1 - th2);

    // Potential energy V (reference y=0 at pivot, positive downward)
    const V = -(m1 + m2) * g * l1 * Math.cos(th1) - m2 * g * l2 * Math.cos(th2);

    return T + V;
  }

  private updateEnergyMetrics(): void {
    const s = this.states[0];
    const th1 = s[0];
    const th2 = s[1];
    const w1 = s[2];
    const w2 = s[3];

    const m1 = this.m1;
    const m2 = this.m2;
    const l1 = this.l1;
    const l2 = this.l2;
    const g = this.gravity;

    this.kineticEnergy = 0.5 * (m1 + m2) * l1 * l1 * w1 * w1 +
                         0.5 * m2 * l2 * l2 * w2 * w2 +
                         m2 * l1 * l2 * w1 * w2 * Math.cos(th1 - th2);

    this.potentialEnergy = -(m1 + m2) * g * l1 * Math.cos(th1) - m2 * g * l2 * Math.cos(th2);
    this.totalEnergy = this.kineticEnergy + this.potentialEnergy;

    if (Math.abs(this.initialEnergy) > 1e-6) {
      this.energyDrift = Math.abs(this.totalEnergy - this.initialEnergy) / Math.abs(this.initialEnergy);
    } else {
      this.energyDrift = 0;
    }
  }
}

// ==========================================
// 3. SYSTEM 2: 3-BODY GRAVITATIONAL CHOREOGRAPHY
// ==========================================

export interface CelestialBody {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

export type NBodyPresetType = 'figure8' | 'lagrange' | 'slingshot';

export class NBodySystem {
  public bodies: CelestialBody[] = [];
  public G: number = 1000.0;
  public softening: number = 12.0; // eps parameter to prevent infinite force
  public maxTrailLength: number = 240;
  public kineticEnergy: number = 0;
  public potentialEnergy: number = 0;
  public totalEnergy: number = 0;
  public initialEnergy: number = 0;
  public energyDrift: number = 0;
  public activePreset: NBodyPresetType = 'figure8';

  private stepper: RK4Stepper = new RK4Stepper(0);
  private stateBuffer: Float64Array = new Float64Array(0);

  constructor(preset: NBodyPresetType = 'figure8') {
    this.loadPreset(preset);
  }

  public loadPreset(preset: NBodyPresetType): void {
    this.activePreset = preset;
    this.bodies = [];

    if (preset === 'figure8') {
      // Chenciner & Montgomery Figure-8 (2000) choreography
      // Scaled for high visibility on screen
      const scale = 220;
      const vScale = 1.35;
      const m = 300.0;
      this.G = 1200.0;

      // Precision initial conditions
      const x1 = 0.97000436 * scale;
      const y1 = -0.24308753 * scale;
      const vx1 = 0.46620531 * scale * vScale * 0.01;
      const vy1 = 0.43236573 * scale * vScale * 0.01;

      this.bodies = [
        {
          id: 1,
          name: 'Chronos-α',
          x: x1,
          y: y1,
          vx: vx1,
          vy: vy1,
          mass: m,
          radius: 10,
          color: '#06b6d4', // Cyan
          trail: []
        },
        {
          id: 2,
          name: 'Chronos-β',
          x: -x1,
          y: -y1,
          vx: vx1,
          vy: vy1,
          mass: m,
          radius: 10,
          color: '#8b5cf6', // Violet
          trail: []
        },
        {
          id: 3,
          name: 'Chronos-γ',
          x: 0,
          y: 0,
          vx: -2 * vx1,
          vy: -2 * vy1,
          mass: m,
          radius: 10,
          color: '#f59e0b', // Gold
          trail: []
        }
      ];
    } else if (preset === 'lagrange') {
      // Lagrange Equilateral Triangle orbit around barycenter
      const R = 180;
      const m = 250.0;
      this.G = 1200.0;
      const omega = 0.012; // Angular velocity

      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      const colors = ['#06b6d4', '#10b981', '#f59e0b'];

      this.bodies = angles.map((ang, i) => ({
        id: i + 1,
        name: `Lagrange-${i + 1}`,
        x: R * Math.cos(ang),
        y: R * Math.sin(ang),
        vx: -omega * R * Math.sin(ang),
        vy: omega * R * Math.cos(ang),
        mass: m,
        radius: 9,
        color: colors[i],
        trail: []
      }));
    } else if (preset === 'slingshot') {
      // Chaotic Binary Pair with incoming intruder resulting in high-G ejection
      this.G = 1400.0;
      this.bodies = [
        {
          id: 1,
          name: 'Binary Core 1',
          x: -70,
          y: 0,
          vx: 0,
          vy: -2.8,
          mass: 500,
          radius: 12,
          color: '#06b6d4',
          trail: []
        },
        {
          id: 2,
          name: 'Binary Core 2',
          x: 70,
          y: 0,
          vx: 0,
          vy: 2.8,
          mass: 500,
          radius: 12,
          color: '#8b5cf6',
          trail: []
        },
        {
          id: 3,
          name: 'Hyperbolic Intruder',
          x: -280,
          y: -180,
          vx: 3.4,
          vy: 1.2,
          mass: 80,
          radius: 7,
          color: '#f43f5e', // Crimson neon
          trail: []
        }
      ];
    }

    this.reinitStepper();
    this.initialEnergy = this.computeEnergy();
    this.energyDrift = 0;
  }

  public addBody(x: number, y: number, vx: number, vy: number, mass: number = 200): void {
    const colors = ['#38bdf8', '#a855f7', '#fbbf24', '#34d399', '#f87171', '#ec4899'];
    const newBody: CelestialBody = {
      id: this.bodies.length + 1,
      name: `Entity-${this.bodies.length + 1}`,
      x,
      y,
      vx,
      vy,
      mass,
      radius: Math.max(6, Math.min(16, Math.cbrt(mass) * 1.8)),
      color: colors[this.bodies.length % colors.length],
      trail: []
    };
    this.bodies.push(newBody);
    this.reinitStepper();
    this.initialEnergy = this.computeEnergy();
  }

  private reinitStepper(): void {
    const stateSize = this.bodies.length * 4; // [x, y, vx, vy] for each
    this.stepper = new RK4Stepper(stateSize);
    this.stateBuffer = new Float64Array(stateSize);
  }

  public step(dt: number, subSteps: number = 8): void {
    if (this.bodies.length === 0) return;

    const n = this.bodies.length;
    // Pack current state
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      const idx = i * 4;
      this.stateBuffer[idx] = b.x;
      this.stateBuffer[idx + 1] = b.y;
      this.stateBuffer[idx + 2] = b.vx;
      this.stateBuffer[idx + 3] = b.vy;
    }

    const subDt = dt / subSteps;
    const derivFn = (s: Float64Array, ds: Float64Array) => {
      // zero derivative buffer
      ds.fill(0);

      // Positions update by velocities
      for (let i = 0; i < n; i++) {
        const idx = i * 4;
        ds[idx] = s[idx + 2];     // dx/dt = vx
        ds[idx + 1] = s[idx + 3]; // dy/dt = vy
      }

      // Gravitational accelerations between all pairs
      for (let i = 0; i < n; i++) {
        const iIdx = i * 4;
        const xi = s[iIdx];
        const yi = s[iIdx + 1];

        for (let j = i + 1; j < n; j++) {
          const jIdx = j * 4;
          const xj = s[jIdx];
          const yj = s[jIdx + 1];

          const dx = xj - xi;
          const dy = yj - yi;
          const distSq = dx * dx + dy * dy + this.softening * this.softening;
          const dist = Math.sqrt(distSq);
          const forceMag = this.G / (distSq * dist);

          const fx = forceMag * dx;
          const fy = forceMag * dy;

          // Body i accelerates toward body j (scaled by mj)
          ds[iIdx + 2] += fx * this.bodies[j].mass;
          ds[iIdx + 3] += fy * this.bodies[j].mass;

          // Body j accelerates toward body i (scaled by mi)
          ds[jIdx + 2] -= fx * this.bodies[i].mass;
          ds[jIdx + 3] -= fy * this.bodies[i].mass;
        }
      }
    };

    for (let s = 0; s < subSteps; s++) {
      this.stepper.step(this.stateBuffer, subDt, derivFn);
    }

    // Unpack updated state back to bodies
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      const idx = i * 4;
      b.x = this.stateBuffer[idx];
      b.y = this.stateBuffer[idx + 1];
      b.vx = this.stateBuffer[idx + 2];
      b.vy = this.stateBuffer[idx + 3];

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > this.maxTrailLength) {
        b.trail.shift();
      }
    }

    this.computeEnergy();
  }

  public computeEnergy(): number {
    let ke = 0;
    let pe = 0;
    const n = this.bodies.length;

    for (let i = 0; i < n; i++) {
      const b1 = this.bodies[i];
      const vSq = b1.vx * b1.vx + b1.vy * b1.vy;
      ke += 0.5 * b1.mass * vSq;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy + this.softening * this.softening);
        pe -= (this.G * b1.mass * b2.mass) / dist;
      }
    }

    this.kineticEnergy = ke;
    this.potentialEnergy = pe;
    this.totalEnergy = ke + pe;

    if (Math.abs(this.initialEnergy) > 1e-4) {
      this.energyDrift = Math.abs(this.totalEnergy - this.initialEnergy) / Math.abs(this.initialEnergy);
    }
    return this.totalEnergy;
  }

  /**
   * Evaluates gravitational potential at any grid point for spacetime fabric deformation
   */
  public getPotentialAt(x: number, y: number): number {
    let pot = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const dx = x - b.x;
      const dy = y - b.y;
      pot -= (this.G * b.mass * 0.05) / Math.sqrt(dx * dx + dy * dy + 400);
    }
    return pot;
  }
}

// ==========================================
// 4. SYSTEM 3: LORENZ 3D STRANGE ATTRACTOR
// ==========================================

export interface LorenzParticle {
  state: Float64Array; // [x, y, z]
  trail: Array<{ x: number; y: number; z: number }>;
  color: string;
}

export class LorenzSystem {
  public sigma: number = 10.0;
  public rho: number = 28.0;
  public beta: number = 8.0 / 3.0;
  public particleCount: number = 120;
  public maxTrailLength: number = 80;

  public particles: LorenzParticle[] = [];
  private steppers: RK4Stepper[] = [];

  // 3D Camera Controls
  public cameraAngleX: number = 0.35; // Elevation
  public cameraAngleY: number = 0.85; // Azimuth
  public autoRotate: boolean = true;
  public autoRotateSpeed: number = 0.003;
  public zoom: number = 14.0;

  constructor(count: number = 120) {
    this.particleCount = count;
    this.reset();
  }

  public reset(): void {
    this.particles = [];
    this.steppers = [];

    for (let i = 0; i < this.particleCount; i++) {
      // Tiny randomized perturbation around initial seed
      const jitter = 0.02;
      const pState = new Float64Array([
        0.1 + (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * jitter
      ]);

      const hue = Math.floor((i / this.particleCount) * 320);
      this.particles.push({
        state: pState,
        trail: [],
        color: `hsl(${hue}, 95%, 65%)`
      });
      this.steppers.push(new RK4Stepper(3));
    }
  }

  public step(dt: number, subSteps: number = 6): void {
    const subDt = dt / subSteps;
    const sig = this.sigma;
    const rho = this.rho;
    const bet = this.beta;

    const derivFn = (s: Float64Array, ds: Float64Array) => {
      const x = s[0];
      const y = s[1];
      const z = s[2];

      ds[0] = sig * (y - x);
      ds[1] = x * (rho - z) - y;
      ds[2] = x * y - bet * z;
    };

    for (let s = 0; s < subSteps; s++) {
      for (let i = 0; i < this.particles.length; i++) {
        this.steppers[i].step(this.particles[i].state, subDt, derivFn);
      }
    }

    // Append to 3D trail
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.trail.push({ x: p.state[0], y: p.state[1], z: p.state[2] });
      if (p.trail.length > this.maxTrailLength) {
        p.trail.shift();
      }
    }

    if (this.autoRotate) {
      this.cameraAngleY += this.autoRotateSpeed;
    }
  }

  /**
   * Projects a 3D point (x, y, z) into 2D canvas coordinates
   */
  public projectPoint(
    x: number,
    y: number,
    z: number,
    centerX: number,
    centerY: number
  ): { sx: number; sy: number; depth: number } {
    // Center Lorenz attractor around z = 24
    const cz = z - 24;

    // Rotate around Y axis (azimuth)
    const cosY = Math.cos(this.cameraAngleY);
    const sinY = Math.sin(this.cameraAngleY);
    const x1 = x * cosY - cz * sinY;
    const z1 = x * sinY + cz * cosY;

    // Rotate around X axis (elevation)
    const cosX = Math.cos(this.cameraAngleX);
    const sinX = Math.sin(this.cameraAngleX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Isometric perspective scaling
    const perspective = 300 / (300 + z2);
    const scale = this.zoom * perspective;

    return {
      sx: centerX + x1 * scale,
      sy: centerY - y2 * scale,
      depth: z2
    };
  }
}

// ==========================================
// 5. SYSTEM 4: COUPLED HARMONIC WAVE LATTICE
// ==========================================

export type WaveLatticePreset = 'gaussian' | 'standing1' | 'standing2' | 'standing3' | 'dispersive' | 'optical';

export class WaveLatticeSystem {
  public nodeCount: number = 24;
  public positions: Float64Array; // Displacement y_i
  public velocities: Float64Array; // Velocity v_i
  public springK: number = 180.0;
  public nodeMass: number = 1.0;
  public damping: number = 0.001;
  public boundary: 'fixed' | 'periodic' = 'fixed';

  public kineticEnergy: number = 0;
  public potentialEnergy: number = 0;
  public totalEnergy: number = 0;

  private stepper: RK4Stepper;
  private stateBuffer: Float64Array;

  constructor(count: number = 24) {
    this.nodeCount = count;
    this.positions = new Float64Array(count);
    this.velocities = new Float64Array(count);
    this.stateBuffer = new Float64Array(count * 2);
    this.stepper = new RK4Stepper(count * 2);
    this.loadPreset('gaussian');
  }

  public loadPreset(preset: WaveLatticePreset): void {
    const n = this.nodeCount;
    this.positions.fill(0);
    this.velocities.fill(0);

    const amplitude = 90.0;

    if (preset === 'gaussian') {
      // Gaussian traveling pulse
      const center = n * 0.25;
      const sigma = 2.2;
      for (let i = 0; i < n; i++) {
        const d = i - center;
        this.positions[i] = amplitude * Math.exp(-(d * d) / (2 * sigma * sigma));
      }
    } else if (preset === 'standing1') {
      // Fundamental normal mode n=1
      for (let i = 0; i < n; i++) {
        this.positions[i] = amplitude * Math.sin((Math.PI * (i + 1)) / (n + 1));
      }
    } else if (preset === 'standing2') {
      // 2nd harmonic mode n=2
      for (let i = 0; i < n; i++) {
        this.positions[i] = amplitude * Math.sin((2 * Math.PI * (i + 1)) / (n + 1));
      }
    } else if (preset === 'standing3') {
      // 3rd harmonic mode n=3
      for (let i = 0; i < n; i++) {
        this.positions[i] = amplitude * Math.sin((3 * Math.PI * (i + 1)) / (n + 1));
      }
    } else if (preset === 'dispersive') {
      // Superposition of two adjacent frequencies
      for (let i = 0; i < n; i++) {
        const x = (i + 1) / (n + 1);
        this.positions[i] = amplitude * 0.6 * (Math.sin(3 * Math.PI * x) + Math.sin(4 * Math.PI * x));
      }
    } else if (preset === 'optical') {
      // High-frequency anti-phase optical branch analog (+, -, +, -)
      for (let i = 0; i < n; i++) {
        this.positions[i] = amplitude * 0.7 * (i % 2 === 0 ? 1 : -1) * Math.sin((Math.PI * (i + 1)) / (n + 1));
      }
    }

    this.computeEnergy();
  }

  public step(dt: number, subSteps: number = 8): void {
    const n = this.nodeCount;
    for (let i = 0; i < n; i++) {
      this.stateBuffer[i] = this.positions[i];
      this.stateBuffer[n + i] = this.velocities[i];
    }

    const subDt = dt / subSteps;
    const derivFn = (s: Float64Array, ds: Float64Array) => {
      const k = this.springK;
      const m = this.nodeMass;
      const gamma = this.damping;

      for (let i = 0; i < n; i++) {
        // dy_i/dt = v_i
        ds[i] = s[n + i];

        // Neighbors displacements
        let left = 0;
        let right = 0;

        if (this.boundary === 'fixed') {
          left = i > 0 ? s[i - 1] : 0;
          right = i < n - 1 ? s[i + 1] : 0;
        } else {
          // periodic
          left = s[(i - 1 + n) % n];
          right = s[(i + 1) % n];
        }

        const force = -k * (s[i] - left) - k * (s[i] - right);
        // dv_i/dt = F/m - gamma * v
        ds[n + i] = force / m - gamma * s[n + i];
      }
    };

    for (let s = 0; s < subSteps; s++) {
      this.stepper.step(this.stateBuffer, subDt, derivFn);
    }

    for (let i = 0; i < n; i++) {
      this.positions[i] = this.stateBuffer[i];
      this.velocities[i] = this.stateBuffer[n + i];
    }

    this.computeEnergy();
  }

  public computeEnergy(): void {
    let ke = 0;
    let pe = 0;
    const n = this.nodeCount;
    const k = this.springK;
    const m = this.nodeMass;

    for (let i = 0; i < n; i++) {
      const v = this.velocities[i];
      ke += 0.5 * m * v * v;

      let left = 0;
      if (this.boundary === 'fixed') {
        left = i > 0 ? this.positions[i - 1] : 0;
      } else {
        left = this.positions[(i - 1 + n) % n];
      }
      const dx = this.positions[i] - left;
      pe += 0.5 * k * dx * dx;
    }

    // Right boundary spring for fixed ends
    if (this.boundary === 'fixed' && n > 0) {
      const lastDx = 0 - this.positions[n - 1];
      pe += 0.5 * k * lastDx * lastDx;
    }

    this.kineticEnergy = ke;
    this.potentialEnergy = pe;
    this.totalEnergy = ke + pe;
  }

  public pluckNode(index: number, displacement: number): void {
    if (index >= 0 && index < this.nodeCount) {
      this.positions[index] = displacement;
      this.velocities[index] = 0;
      // Slight spread to neighboring nodes for realistic elastic deformation
      if (index > 0) this.positions[index - 1] += displacement * 0.45;
      if (index < this.nodeCount - 1) this.positions[index + 1] += displacement * 0.45;
    }
  }
}
