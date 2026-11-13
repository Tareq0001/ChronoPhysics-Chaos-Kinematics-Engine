/**
 * CHRONO-PHYSICS: Primary High-Precision Simulation Canvas
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 *
 * 60+ FPS Hardware-accelerated 2D/3D Canvas with Additive Blending,
 * Neon Glow Photons, Gravitational Spacetime Mesh & Full Interactive Kinematics.
 */

import {
  DoublePendulumSwarmSystem,
  NBodySystem,
  LorenzSystem,
  WaveLatticeSystem
} from '../engine/rk4Solvers';
import { HarmonicAudioEngine } from '../engine/harmonicAudio';

export type ActiveSystemMode = 'double_pendulum' | 'n_body' | 'lorenz' | 'wave_lattice';

export class PhysicsArenaCanvas {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: HarmonicAudioEngine;

  // Active System State
  public mode: ActiveSystemMode = 'double_pendulum';
  public doublePendulum: DoublePendulumSwarmSystem;
  public nBody: NBodySystem;
  public lorenz: LorenzSystem;
  public waveLattice: WaveLatticeSystem;

  // Global Physics Controls
  public timeDilation: number = 1.0;
  public isPaused: boolean = false;
  public showSpacetimeGrid: boolean = true;
  public showVelocityVectors: boolean = true;
  public showCenterOfMass: boolean = true;

  // Interaction State
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private currentMouseX: number = 0;
  private currentMouseY: number = 0;
  private draggedEntityId: number | null = null;
  private draggedBobIndex: number | null = null; // 1 for bob1, 2 for bob2

  // Display Scaling
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, audio: HarmonicAudioEngine) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Cannot acquire 2D context');
    this.ctx = context;
    this.audio = audio;

    // Initialize systems
    this.doublePendulum = new DoublePendulumSwarmSystem(20);
    this.nBody = new NBodySystem('figure8');
    this.lorenz = new LorenzSystem(120);
    this.waveLattice = new WaveLatticeSystem(24);

    this.setupResize();
    this.setupInteractions();
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
    setTimeout(resize, 50);
  }

  private setupInteractions(): void {
    const getPos = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      this.isDragging = true;
      this.dragStartX = pos.x;
      this.dragStartY = pos.y;
      this.currentMouseX = pos.x;
      this.currentMouseY = pos.y;

      const cx = this.width / 2;
      const cy = this.height / 2;

      if (this.mode === 'double_pendulum') {
        // Check if clicking near bob 1 or bob 2 of base pendulum
        const p0 = this.doublePendulum.getPositions(0);
        const scale = Math.min(this.width, this.height) * 0.22;
        const pivotY = this.height * 0.32;
        const b1x = cx + p0.x1 * scale;
        const b1y = pivotY + p0.y1 * scale;
        const b2x = cx + p0.x2 * scale;
        const b2y = pivotY + p0.y2 * scale;

        const d1 = Math.hypot(pos.x - b1x, pos.y - b1y);
        const d2 = Math.hypot(pos.x - b2x, pos.y - b2y);

        if (d2 < 30) {
          this.draggedBobIndex = 2;
        } else if (d1 < 30) {
          this.draggedBobIndex = 1;
        } else {
          this.draggedBobIndex = 2; // Default to grabbing tip
        }
      } else if (this.mode === 'n_body') {
        // Check if clicked an existing body
        this.draggedEntityId = null;
        for (const b of this.nBody.bodies) {
          const bx = cx + b.x;
          const by = cy + b.y;
          if (Math.hypot(pos.x - bx, pos.y - by) < b.radius + 10) {
            this.draggedEntityId = b.id;
            break;
          }
        }
      } else if (this.mode === 'wave_lattice') {
        // Find nearest lattice node
        const n = this.waveLattice.nodeCount;
        const spacing = (this.width - 120) / (n - 1);
        let nearestIdx = -1;
        let minDist = 40;
        for (let i = 0; i < n; i++) {
          const nx = 60 + i * spacing;
          const ny = cy - this.waveLattice.positions[i];
          const dist = Math.hypot(pos.x - nx, pos.y - ny);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = i;
          }
        }
        if (nearestIdx !== -1) {
          this.draggedEntityId = nearestIdx;
          this.waveLattice.pluckNode(nearestIdx, cy - pos.y);
          this.audio.triggerPulse(0.7, 3);
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      this.currentMouseX = pos.x;
      this.currentMouseY = pos.y;

      const cx = this.width / 2;
      const cy = this.height / 2;

      if (this.mode === 'double_pendulum' && this.draggedBobIndex) {
        const scale = Math.min(this.width, this.height) * 0.22;
        const pivotY = this.height * 0.32;
        const relX = (pos.x - cx) / scale;
        const relY = (pos.y - pivotY) / scale;

        if (this.draggedBobIndex === 1) {
          const th1 = Math.atan2(relX, relY);
          this.doublePendulum.reset(th1, this.doublePendulum.states[0][1]);
        } else {
          const th1 = Math.atan2(relX * 0.5, relY * 0.5);
          const th2 = Math.atan2(relX, relY);
          this.doublePendulum.reset(th1, th2);
        }
      } else if (this.mode === 'lorenz') {
        // Orbit controls: delta X rotates azimuth, delta Y rotates elevation
        const dx = pos.x - this.dragStartX;
        const dy = pos.y - this.dragStartY;
        this.lorenz.cameraAngleY += dx * 0.008;
        this.lorenz.cameraAngleX = Math.max(-1.4, Math.min(1.4, this.lorenz.cameraAngleX + dy * 0.008));
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
      } else if (this.mode === 'wave_lattice' && this.draggedEntityId !== null) {
        this.waveLattice.pluckNode(this.draggedEntityId, cy - pos.y);
      }
    });

    window.addEventListener('mouseup', () => {
      if (!this.isDragging) return;

      const cx = this.width / 2;
      const cy = this.height / 2;

      if (this.mode === 'n_body' && this.draggedEntityId === null) {
        // Finished dragging aim vector -> Spawn new body!
        const dx = this.currentMouseX - this.dragStartX;
        const dy = this.currentMouseY - this.dragStartY;
        const spawnX = this.dragStartX - cx;
        const spawnY = this.dragStartY - cy;
        const vx = -dx * 0.04; // Aim drag creates velocity in release direction
        const vy = -dy * 0.04;
        this.nBody.addBody(spawnX, spawnY, vx, vy, 180);
        this.audio.triggerPulse(0.85, 4);
      }

      this.isDragging = false;
      this.draggedEntityId = null;
      this.draggedBobIndex = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode === 'lorenz') {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.lorenz.zoom = Math.max(5, Math.min(40, this.lorenz.zoom * delta));
      }
    }, { passive: false });
  }

  public setMode(mode: ActiveSystemMode): void {
    this.mode = mode;
  }

  /**
   * Main Simulation Step & Render Frame
   */
  public updateAndRender(): void {
    const dt = 0.016 * this.timeDilation;

    if (!this.isPaused) {
      if (this.mode === 'double_pendulum') {
        this.doublePendulum.step(dt, 8);
        // Trigger subtle audio when base bob passes vertical center
        const th2 = this.doublePendulum.states[0][1];
        const w2 = Math.abs(this.doublePendulum.states[0][3]);
        if (Math.abs(th2) < 0.1 && w2 > 1.5) {
          this.audio.triggerPulse(Math.min(1.0, w2 / 10), 0);
        }
      } else if (this.mode === 'n_body') {
        this.nBody.step(dt, 8);
        // Audio note on high acceleration or close flyby
        const ke = this.nBody.kineticEnergy;
        if (ke > 1500) {
          this.audio.triggerPulse(Math.min(1.0, ke / 4000), 2);
        }
      } else if (this.mode === 'lorenz') {
        this.lorenz.step(dt, 6);
      } else if (this.mode === 'wave_lattice') {
        this.waveLattice.step(dt, 8);
        const maxAmp = Math.abs(this.waveLattice.positions[Math.floor(this.waveLattice.nodeCount / 2)]);
        if (maxAmp > 20) {
          this.audio.triggerPulse(Math.min(1.0, maxAmp / 80), 1);
        }
      }
    }

    this.render();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background with deep quantum lab dark cosmos #060913
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    if (this.mode === 'double_pendulum') {
      this.renderDoublePendulum();
    } else if (this.mode === 'n_body') {
      this.renderNBody();
    } else if (this.mode === 'lorenz') {
      this.renderLorenz();
    } else if (this.mode === 'wave_lattice') {
      this.renderWaveLattice();
    }

    // Overlay interactive drag indicator for N-Body launcher
    if (this.isDragging && this.mode === 'n_body' && this.draggedEntityId === null) {
      this.renderAimLauncher();
    }
  }

  // ==========================================
  // RENDER SYSTEM 1: DOUBLE-PENDULUM SWARM
  // ==========================================
  private renderDoublePendulum(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const pivotY = this.height * 0.32;
    const scale = Math.min(this.width, this.height) * 0.22;
    const swarm = this.doublePendulum;

    // Draw Quantum Coordinate Grid & Circles in background
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);

    // Concentric orbital bounds
    ctx.beginPath();
    ctx.arc(cx, pivotY, (swarm.l1 + swarm.l2) * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, pivotY, swarm.l1 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Axis lines
    ctx.beginPath();
    ctx.moveTo(cx, pivotY - (swarm.l1 + swarm.l2) * scale - 20);
    ctx.lineTo(cx, pivotY + (swarm.l1 + swarm.l2) * scale + 20);
    ctx.moveTo(cx - (swarm.l1 + swarm.l2) * scale - 20, pivotY);
    ctx.lineTo(cx + (swarm.l1 + swarm.l2) * scale + 20, pivotY);
    ctx.stroke();
    ctx.restore();

    // Draw Trails with Additive Blending (globalCompositeOperation = 'lighter')
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < swarm.swarmSize; i++) {
      const trail = swarm.trails[i];
      if (trail.length < 2) continue;

      const hue = Math.floor((i / swarm.swarmSize) * 310);
      ctx.lineWidth = i === 0 ? 2.5 : 1.5;

      ctx.beginPath();
      for (let j = 0; j < trail.length; j++) {
        const pt = trail[j];
        const px = cx + pt.x * scale;
        const py = pivotY + pt.y * scale;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = `hsla(${hue}, 95%, 60%, 0.65)`;
      ctx.stroke();
    }
    ctx.restore();

    // Draw Ghost Rods for the rest of the swarm (subtle ethereal glow)
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 1; i < swarm.swarmSize; i++) {
      const pos = swarm.getPositions(i);
      const x1 = cx + pos.x1 * scale;
      const y1 = pivotY + pos.y1 * scale;
      const x2 = cx + pos.x2 * scale;
      const y2 = pivotY + pos.y2 * scale;
      const hue = Math.floor((i / swarm.swarmSize) * 310);

      ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.18)`;
      ctx.beginPath();
      ctx.moveTo(cx, pivotY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Mini tip bobs
      ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.8)`;
      ctx.beginPath();
      ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw Master (Base) Pendulum prominently
    const p0 = swarm.getPositions(0);
    const b1x = cx + p0.x1 * scale;
    const b1y = pivotY + p0.y1 * scale;
    const b2x = cx + p0.x2 * scale;
    const b2y = pivotY + p0.y2 * scale;

    ctx.save();
    // Arm 1
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, pivotY);
    ctx.lineTo(b1x, b1y);
    ctx.stroke();

    // Arm 2
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.lineTo(b2x, b2y);
    ctx.stroke();

    // Center pivot bearing
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(cx, pivotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bob 1 (Mid joint)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(b1x, b1y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b1x, b1y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bob 2 (End effector)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(b2x, b2y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b2x, b2y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Velocity Vectors
    if (this.showVelocityVectors) {
      const s0 = swarm.states[0];
      const vx1 = swarm.l1 * s0[2] * Math.cos(s0[0]) * 15;
      const vy1 = -swarm.l1 * s0[2] * Math.sin(s0[0]) * 15;
      this.drawArrow(b1x, b1y, b1x + vx1, b1y + vy1, '#38bdf8');

      const vx2 = vx1 + swarm.l2 * s0[3] * Math.cos(s0[1]) * 15;
      const vy2 = vy1 - swarm.l2 * s0[3] * Math.sin(s0[1]) * 15;
      this.drawArrow(b2x, b2y, b2x + vx2, b2y + vy2, '#fbbf24');
    }

    // Center of Mass Marker
    if (this.showCenterOfMass) {
      const comX = (swarm.m1 * p0.x1 + swarm.m2 * p0.x2) / (swarm.m1 + swarm.m2);
      const comY = (swarm.m1 * p0.y1 + swarm.m2 * p0.y2) / (swarm.m1 + swarm.m2);
      const px = cx + comX * scale;
      const py = pivotY + comY * scale;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 9, py);
      ctx.lineTo(px + 9, py);
      ctx.moveTo(px, py - 9);
      ctx.lineTo(px, py + 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==========================================
  // RENDER SYSTEM 2: 3-BODY GRAVITATIONAL
  // ==========================================
  private renderNBody(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const nbody = this.nBody;

    // 1. Spacetime Curvature Warp Grid
    if (this.showSpacetimeGrid) {
      ctx.save();
      const gridSize = 18;
      const stepX = this.width / gridSize;
      const stepY = this.height / gridSize;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;

      // Horizontal warped lines
      for (let j = 0; j <= gridSize; j++) {
        ctx.beginPath();
        for (let i = 0; i <= gridSize; i++) {
          const gx = i * stepX;
          const gy = j * stepY;
          const pot = nbody.getPotentialAt(gx - cx, gy - cy);
          // Warp toward mass well
          const wy = gy + Math.min(30, Math.max(-30, pot * 0.035));
          if (i === 0) ctx.moveTo(gx, wy);
          else ctx.lineTo(gx, wy);
        }
        ctx.stroke();
      }

      // Vertical warped lines
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        for (let j = 0; j <= gridSize; j++) {
          const gx = i * stepX;
          const gy = j * stepY;
          const pot = nbody.getPotentialAt(gx - cx, gy - cy);
          const wx = gx + Math.min(30, Math.max(-30, pot * 0.035));
          if (j === 0) ctx.moveTo(wx, gy);
          else ctx.lineTo(wx, gy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Glowing Orbital Trails
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of nbody.bodies) {
      if (b.trail.length < 2) continue;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = b.color;
      ctx.beginPath();
      for (let i = 0; i < b.trail.length; i++) {
        const pt = b.trail[i];
        const px = cx + pt.x;
        const py = cy + pt.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 3. Celestial Bodies & Glow Halos
    for (const b of nbody.bodies) {
      const bx = cx + b.x;
      const by = cy + b.y;

      ctx.save();
      // Outer Glow Halo
      const grad = ctx.createRadialGradient(bx, by, b.radius * 0.5, bx, by, b.radius * 3.0);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, b.radius * 3.0, 0, Math.PI * 2);
      ctx.fill();

      // Solid Planet Core
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // White Hot Center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Velocity Vector Arrow
      if (this.showVelocityVectors) {
        const arrowLen = 14;
        this.drawArrow(bx, by, bx + b.vx * arrowLen, by + b.vy * arrowLen, b.color);
      }

      // Name Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(b.name, bx + b.radius + 6, by + 3);
      ctx.restore();
    }

    // 4. Center of Mass (Barycenter)
    if (this.showCenterOfMass && nbody.bodies.length > 0) {
      let totalM = 0;
      let comX = 0;
      let comY = 0;
      for (const b of nbody.bodies) {
        totalM += b.mass;
        comX += b.mass * b.x;
        comY += b.mass * b.y;
      }
      comX /= totalM;
      comY /= totalM;

      const px = cx + comX;
      const py = cy + comY;

      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - 10, py);
      ctx.lineTo(px + 10, py);
      ctx.moveTo(px, py - 10);
      ctx.lineTo(px, py + 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ==========================================
  // RENDER SYSTEM 3: LORENZ 3D ATTRACTOR
  // ==========================================
  private renderLorenz(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const lorenz = this.lorenz;

    // Depth Grid Floor
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;
    for (let r = 50; r <= 250; r += 50) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + 140, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Render Trajectories with Additive Photon Blending
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < lorenz.particles.length; i++) {
      const p = lorenz.particles[i];
      if (p.trail.length < 2) continue;

      ctx.lineWidth = 1.6;
      ctx.strokeStyle = p.color;
      ctx.beginPath();

      for (let j = 0; j < p.trail.length; j++) {
        const pt = p.trail[j];
        const proj = lorenz.projectPoint(pt.x, pt.y, pt.z, cx, cy);
        if (j === 0) ctx.moveTo(proj.sx, proj.sy);
        else ctx.lineTo(proj.sx, proj.sy);
      }
      ctx.stroke();

      // Current particle head
      const head = p.trail[p.trail.length - 1];
      const hProj = lorenz.projectPoint(head.x, head.y, head.z, cx, cy);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hProj.sx, hProj.sy, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Attractor Fixed Points (Wing Centers) C+ and C-
    const rho = lorenz.rho;
    const beta = lorenz.beta;
    if (rho > 1) {
      const xStar = Math.sqrt(beta * (rho - 1));
      const zStar = rho - 1;

      const p1 = lorenz.projectPoint(xStar, xStar, zStar, cx, cy);
      const p2 = lorenz.projectPoint(-xStar, -xStar, zStar, cx, cy);

      ctx.save();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.beginPath();
      ctx.arc(p1.sx, p1.sy, 4, 0, Math.PI * 2);
      ctx.arc(p2.sx, p2.sy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ==========================================
  // RENDER SYSTEM 4: COUPLED WAVE LATTICE
  // ==========================================
  private renderWaveLattice(): void {
    const ctx = this.ctx;
    const cy = this.height / 2;
    const lattice = this.waveLattice;
    const n = lattice.nodeCount;
    const padding = 70;
    const spacing = (this.width - padding * 2) / (n - 1);

    // Equilibrium Horizon Line
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, cy);
    ctx.lineTo(this.width - padding, cy);
    ctx.stroke();
    ctx.restore();

    // Draw Springs between consecutive masses
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 2;

    for (let i = 0; i < n - 1; i++) {
      const x1 = padding + i * spacing;
      const y1 = cy - lattice.positions[i];
      const x2 = padding + (i + 1) * spacing;
      const y2 = cy - lattice.positions[i + 1];

      // Zig-zag spring segment
      const coils = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let c = 1; c <= coils; c++) {
        const t = c / (coils + 1);
        const sx = x1 + (x2 - x1) * t;
        const sy = y1 + (y2 - y1) * t + (c % 2 === 0 ? 8 : -8);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Mass Nodes with Phase and Velocity Indication
    for (let i = 0; i < n; i++) {
      const nx = padding + i * spacing;
      const ny = cy - lattice.positions[i];
      const v = lattice.velocities[i];

      // Color mapping: Cyan to Violet based on vertical velocity
      const vNorm = Math.max(-1, Math.min(1, v / 30));
      const hue = vNorm > 0 ? 190 : 270;
      const light = 50 + Math.abs(vNorm) * 25;

      ctx.save();
      // Glow circle
      ctx.fillStyle = `hsla(${hue}, 90%, ${light}%, 0.9)`;
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();

      // White Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity Arrow
      if (this.showVelocityVectors && Math.abs(v) > 2) {
        this.drawArrow(nx, ny, nx, ny - v * 0.6, '#fbbf24');
      }

      // Node Index
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, nx, cy + 30);
      ctx.restore();
    }
  }

  // ==========================================
  // HELPER UTILITIES
  // ==========================================
  private drawArrow(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const ctx = this.ctx;
    const headLen = 7;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);

    if (len < 3) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderAimLauncher(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(this.dragStartX, this.dragStartY);
    ctx.lineTo(this.currentMouseX, this.currentMouseY);
    ctx.stroke();

    // Virtual spawn body
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(this.dragStartX, this.dragStartY, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Release velocity indicator
    const dx = this.currentMouseX - this.dragStartX;
    const dy = this.currentMouseY - this.dragStartY;
    this.drawArrow(this.dragStartX, this.dragStartY, this.dragStartX - dx, this.dragStartY - dy, '#10b981');
    ctx.restore();
  }
}
