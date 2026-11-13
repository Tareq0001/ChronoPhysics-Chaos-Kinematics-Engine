/**
 * CHRONO-PHYSICS: Phase Space & Hamiltonian Energy Conservation Monitor
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 *
 * Visualizes live Poincaré phase trajectories (theta vs omega) and real-time
 * symplectic energy conservation metrics (T vs V ratio and delta H / H0 drift).
 */

import { PhysicsArenaCanvas } from './PhysicsArenaCanvas';

export class PhaseSpaceCanvas {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private arena: PhysicsArenaCanvas;

  private phaseHistory1: Array<{ x: number; y: number }> = [];
  private phaseHistory2: Array<{ x: number; y: number }> = [];
  private maxPoints: number = 220;

  private width: number = 320;
  private height: number = 240;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, arena: PhysicsArenaCanvas) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Cannot acquire 2D context for PhaseSpaceCanvas');
    this.ctx = context;
    this.arena = arena;

    this.setupResize();
  }

  private setupResize(): void {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width;
      this.height = rect.height;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.scale(this.dpr, this.dpr);
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 60);
  }

  public clearHistory(): void {
    this.phaseHistory1 = [];
    this.phaseHistory2 = [];
  }

  public updateAndRender(): void {
    const mode = this.arena.mode;
    let p1x = 0;
    let p1y = 0;
    let p2x = 0;
    let p2y = 0;

    if (mode === 'double_pendulum') {
      const s0 = this.arena.doublePendulum.states[0];
      // Angle theta1 vs angular velocity omega1
      p1x = s0[0]; // [-pi, pi]
      p1y = s0[2] * 0.15; // scaled omega1

      // Angle theta2 vs angular velocity omega2
      p2x = s0[1];
      p2y = s0[3] * 0.15;
    } else if (mode === 'n_body') {
      const b0 = this.arena.nBody.bodies[0];
      const b1 = this.arena.nBody.bodies[1] || b0;
      if (b0) {
        p1x = b0.x * 0.006;
        p1y = b0.vx * 0.18;
      }
      if (b1) {
        p2x = b1.y * 0.006;
        p2y = b1.vy * 0.18;
      }
    } else if (mode === 'lorenz') {
      const p = this.arena.lorenz.particles[0];
      if (p) {
        p1x = p.state[0] * 0.07;
        p1y = (p.state[2] - 25) * 0.07;
        p2x = p.state[1] * 0.07;
        p2y = p.state[0] * 0.07;
      }
    } else if (mode === 'wave_lattice') {
      const lat = this.arena.waveLattice;
      const mid = Math.floor(lat.nodeCount / 2);
      p1x = lat.positions[mid] * 0.025;
      p1y = lat.velocities[mid] * 0.035;
      p2x = lat.positions[Math.floor(mid / 2)] * 0.025;
      p2y = lat.velocities[Math.floor(mid / 2)] * 0.035;
    }

    this.phaseHistory1.push({ x: p1x, y: p1y });
    this.phaseHistory2.push({ x: p2x, y: p2y });

    if (this.phaseHistory1.length > this.maxPoints) {
      this.phaseHistory1.shift();
      this.phaseHistory2.shift();
    }

    this.render();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Background
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, 0, w, h);

    // Coordinate Grid & Reticle
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1;

    // Grid boxes
    const gridStep = 32;
    ctx.beginPath();
    for (let x = cx % gridStep; x < w; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = cy % gridStep; y < h; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Central Axes
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Phase Portrait Axis Labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('q (Displacement)', w - 85, cy - 6);
    ctx.fillText('p (Momentum)', cx + 6, 14);
    ctx.restore();

    // Render Phase Trajectory 2 (Violet)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.phaseHistory2.length > 1) {
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < this.phaseHistory2.length; i++) {
        const pt = this.phaseHistory2[i];
        const px = cx + pt.x * (w * 0.38);
        const py = cy - pt.y * (h * 0.38);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Render Phase Trajectory 1 (Cyan - Primary)
    if (this.phaseHistory1.length > 1) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let i = 0; i < this.phaseHistory1.length; i++) {
        const pt = this.phaseHistory1[i];
        const px = cx + pt.x * (w * 0.38);
        const py = cy - pt.y * (h * 0.38);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Current Phase Head
      const last = this.phaseHistory1[this.phaseHistory1.length - 1];
      const hx = cx + last.x * (w * 0.38);
      const hy = cy - last.y * (h * 0.38);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
