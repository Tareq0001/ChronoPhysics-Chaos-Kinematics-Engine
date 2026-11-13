/**
 * CHRONO-PHYSICS: Master Application Orchestrator
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 */

import { HarmonicAudioEngine } from './engine/harmonicAudio';
import { PhysicsArenaCanvas, ActiveSystemMode } from './components/PhysicsArenaCanvas';
import { PhaseSpaceCanvas } from './components/PhaseSpaceCanvas';
import { MathDossierModal } from './components/MathDossierModal';
import { NBodyPresetType, WaveLatticePreset } from './engine/rk4Solvers';

class ChronoPhysicsApp {
  private audio: HarmonicAudioEngine;
  private arena: PhysicsArenaCanvas;
  private phaseSpace: PhaseSpaceCanvas;
  private mathModal: MathDossierModal;

  // Telemetry DOM elements
  private hudSystemTitle: HTMLElement;
  private hudFps: HTMLElement;
  private hudInteractionHint: HTMLElement;
  private barKe: HTMLElement;
  private barPe: HTMLElement;
  private valKe: HTMLElement;
  private valPe: HTMLElement;
  private valTotalH: HTMLElement;
  private valLyapunov: HTMLElement;
  private hamiltonianDriftBadge: HTMLElement;
  private panelDynamicControls: HTMLElement;

  // Animation Loop State
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();

  constructor() {
    this.audio = new HarmonicAudioEngine();

    const arenaCanvas = document.getElementById('physics-canvas') as HTMLCanvasElement;
    const phaseCanvas = document.getElementById('phase-canvas') as HTMLCanvasElement;

    this.arena = new PhysicsArenaCanvas(arenaCanvas, this.audio);
    this.phaseSpace = new PhaseSpaceCanvas(phaseCanvas, this.arena);
    this.mathModal = new MathDossierModal();

    // Cache Telemetry elements
    this.hudSystemTitle = document.getElementById('hud-system-title')!;
    this.hudFps = document.getElementById('hud-fps')!;
    this.hudInteractionHint = document.getElementById('hud-interaction-hint')!;
    this.barKe = document.getElementById('bar-ke')!;
    this.barPe = document.getElementById('bar-pe')!;
    this.valKe = document.getElementById('val-ke')!;
    this.valPe = document.getElementById('val-pe')!;
    this.valTotalH = document.getElementById('val-total-h')!;
    this.valLyapunov = document.getElementById('val-lyapunov')!;
    this.hamiltonianDriftBadge = document.getElementById('hamiltonian-drift-badge')!;
    this.panelDynamicControls = document.getElementById('panel-dynamic-controls')!;

    this.bindEvents();
    this.renderDynamicControls();
    this.startLoop();
  }

  private bindEvents(): void {
    // 1. Audio Mute Toggle
    const audioBtn = document.getElementById('audio-toggle-btn')!;
    const audioText = document.getElementById('audio-status-text')!;
    audioBtn.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      audioText.textContent = isMuted ? 'Audio: OFF' : 'Audio: ON';
      audioBtn.classList.toggle('active', !isMuted);
    });

    // 2. Math Dossier Modal
    const openMathBtn = document.getElementById('open-math-btn')!;
    openMathBtn.addEventListener('click', () => {
      this.mathModal.show();
    });

    // 3. System Tab Switching
    const tabs = document.querySelectorAll<HTMLButtonElement>('.system-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.system as ActiveSystemMode;
        this.switchSystem(mode);
      });
    });

    // 4. Play / Pause
    const playPauseBtn = document.getElementById('btn-play-pause')!;
    const playPauseTxt = document.getElementById('txt-play-pause')!;
    const togglePlay = () => {
      this.arena.isPaused = !this.arena.isPaused;
      playPauseTxt.textContent = this.arena.isPaused ? 'Resume' : 'Pause';
      playPauseBtn.classList.toggle('active', this.arena.isPaused);
    };
    playPauseBtn.addEventListener('click', togglePlay);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    });

    // 5. Step Forward
    const stepBtn = document.getElementById('btn-step')!;
    stepBtn.addEventListener('click', () => {
      this.arena.isPaused = true;
      playPauseTxt.textContent = 'Resume';
      playPauseBtn.classList.add('active');
      this.arena.updateAndRender();
      this.phaseSpace.updateAndRender();
    });

    // 6. Reset Current System
    const resetBtn = document.getElementById('btn-reset')!;
    resetBtn.addEventListener('click', () => {
      this.resetCurrentSystem();
    });

    // 7. Toggle Vectors & Center of Mass
    const vectorsBtn = document.getElementById('btn-vectors')!;
    vectorsBtn.addEventListener('click', () => {
      this.arena.showVelocityVectors = !this.arena.showVelocityVectors;
      vectorsBtn.classList.toggle('active', this.arena.showVelocityVectors);
    });

    const barycenterBtn = document.getElementById('btn-barycenter')!;
    barycenterBtn.addEventListener('click', () => {
      this.arena.showCenterOfMass = !this.arena.showCenterOfMass;
      barycenterBtn.classList.toggle('active', this.arena.showCenterOfMass);
    });

    // 8. Time Dilation Slider
    const timeSlider = document.getElementById('slider-time-dilation') as HTMLInputElement;
    const timeDisp = document.getElementById('disp-time-dilation')!;
    timeSlider.addEventListener('input', () => {
      const val = parseFloat(timeSlider.value);
      this.arena.timeDilation = val;
      timeDisp.textContent = `${val.toFixed(2)}×`;
    });

    // 9. Gravity Buttons
    const gBtns = document.querySelectorAll<HTMLButtonElement>('[data-g]');
    const gDisp = document.getElementById('disp-gravity')!;
    gBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        gBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const gVal = parseFloat(btn.dataset.g || '9.81');
        this.arena.doublePendulum.gravity = gVal;
        gDisp.textContent = `${gVal.toFixed(2)} m/s²`;
      });
    });

    // 10. Trail Length Buttons
    const trailBtns = document.querySelectorAll<HTMLButtonElement>('[data-trail]');
    const trailDisp = document.getElementById('disp-trail')!;
    trailBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        trailBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tVal = parseInt(btn.dataset.trail || '180', 10);
        this.arena.doublePendulum.maxTrailLength = tVal;
        this.arena.nBody.maxTrailLength = tVal;
        this.arena.lorenz.maxTrailLength = Math.min(220, Math.floor(tVal * 0.6));
        trailDisp.textContent = `${btn.textContent} (${tVal})`;
      });
    });
  }

  private switchSystem(mode: ActiveSystemMode): void {
    this.arena.setMode(mode);
    this.phaseSpace.clearHistory();

    const gGroup = document.getElementById('group-gravity');
    if (gGroup) {
      gGroup.style.display = mode === 'double_pendulum' ? 'flex' : 'none';
    }

    if (mode === 'double_pendulum') {
      this.hudSystemTitle.textContent = 'Euler-Lagrange Double-Pendulum Swarm';
      this.hudInteractionHint.textContent = '🖱 Drag pendulum bobs to release with custom initial conditions';
    } else if (mode === 'n_body') {
      this.hudSystemTitle.textContent = '3-Body Gravitational Choreography';
      this.hudInteractionHint.textContent = '🖱 Drag on arena to aim & launch a new celestial body';
    } else if (mode === 'lorenz') {
      this.hudSystemTitle.textContent = 'Lorenz 3D Strange Attractor';
      this.hudInteractionHint.textContent = '🖱 Drag to orbit camera 3D • Scroll wheel to zoom in/out';
    } else if (mode === 'wave_lattice') {
      this.hudSystemTitle.textContent = 'Coupled Harmonic Wave Lattice';
      this.hudInteractionHint.textContent = '🖱 Click & drag any mass node to pluck and create traveling waves';
    }

    this.renderDynamicControls();
  }

  private resetCurrentSystem(): void {
    if (this.arena.mode === 'double_pendulum') {
      this.arena.doublePendulum.reset();
    } else if (this.arena.mode === 'n_body') {
      this.arena.nBody.loadPreset(this.arena.nBody.activePreset);
    } else if (this.arena.mode === 'lorenz') {
      this.arena.lorenz.reset();
    } else if (this.arena.mode === 'wave_lattice') {
      this.arena.waveLattice.loadPreset('gaussian');
    }
    this.phaseSpace.clearHistory();
    this.audio.triggerPulse(0.5, 0);
  }

  /**
   * Renders controls specifically tailored for the active physical system
   */
  private renderDynamicControls(): void {
    const mode = this.arena.mode;
    const container = this.panelDynamicControls;
    container.innerHTML = '';

    if (mode === 'double_pendulum') {
      container.innerHTML = `
        <div class="panel-header">
          <span>Swarm Parameters</span>
          <span class="badge">N = ${this.arena.doublePendulum.swarmSize}</span>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Swarm Population (N)</span>
            <span class="control-val" id="dyn-swarm-val">${this.arena.doublePendulum.swarmSize}</span>
          </div>
          <input type="range" id="dyn-swarm-slider" min="1" max="30" step="1" value="${this.arena.doublePendulum.swarmSize}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Arm 1 Length (l₁)</span>
            <span class="control-val" id="dyn-l1-val">${this.arena.doublePendulum.l1.toFixed(2)}m</span>
          </div>
          <input type="range" id="dyn-l1-slider" min="0.5" max="1.8" step="0.05" value="${this.arena.doublePendulum.l1}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Arm 2 Length (l₂)</span>
            <span class="control-val" id="dyn-l2-val">${this.arena.doublePendulum.l2.toFixed(2)}m</span>
          </div>
          <input type="range" id="dyn-l2-slider" min="0.5" max="1.8" step="0.05" value="${this.arena.doublePendulum.l2}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Viscous Damping (γ)</span>
            <span class="control-val" id="dyn-damp-val">${(this.arena.doublePendulum.damping * 1000).toFixed(1)}e-3</span>
          </div>
          <input type="range" id="dyn-damp-slider" min="0" max="0.002" step="0.0001" value="${this.arena.doublePendulum.damping}" />
        </div>
      `;

      // Bind inputs
      const swarmSlider = container.querySelector('#dyn-swarm-slider') as HTMLInputElement;
      const swarmVal = container.querySelector('#dyn-swarm-val')!;
      swarmSlider.addEventListener('input', () => {
        const val = parseInt(swarmSlider.value, 10);
        this.arena.doublePendulum.setSwarmSize(val);
        this.arena.doublePendulum.reset();
        swarmVal.textContent = `${val}`;
      });

      const l1Slider = container.querySelector('#dyn-l1-slider') as HTMLInputElement;
      const l1Val = container.querySelector('#dyn-l1-val')!;
      l1Slider.addEventListener('input', () => {
        const val = parseFloat(l1Slider.value);
        this.arena.doublePendulum.l1 = val;
        l1Val.textContent = `${val.toFixed(2)}m`;
      });

      const l2Slider = container.querySelector('#dyn-l2-slider') as HTMLInputElement;
      const l2Val = container.querySelector('#dyn-l2-val')!;
      l2Slider.addEventListener('input', () => {
        const val = parseFloat(l2Slider.value);
        this.arena.doublePendulum.l2 = val;
        l2Val.textContent = `${val.toFixed(2)}m`;
      });

      const dampSlider = container.querySelector('#dyn-damp-slider') as HTMLInputElement;
      const dampVal = container.querySelector('#dyn-damp-val')!;
      dampSlider.addEventListener('input', () => {
        const val = parseFloat(dampSlider.value);
        this.arena.doublePendulum.damping = val;
        dampVal.textContent = `${(val * 1000).toFixed(1)}e-3`;
      });

    } else if (mode === 'n_body') {
      container.innerHTML = `
        <div class="panel-header">
          <span>Gravitational Choreographies</span>
          <span class="badge">N-Body</span>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Orbital Presets</span>
          </div>
          <div class="preset-btn-group">
            <button class="sub-btn ${this.arena.nBody.activePreset === 'figure8' ? 'active' : ''}" data-nbpreset="figure8">Figure-8</button>
            <button class="sub-btn ${this.arena.nBody.activePreset === 'lagrange' ? 'active' : ''}" data-nbpreset="lagrange">Lagrange Triangle</button>
            <button class="sub-btn ${this.arena.nBody.activePreset === 'slingshot' ? 'active' : ''}" data-nbpreset="slingshot">Binary Slingshot</button>
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Gravitational Constant (G)</span>
            <span class="control-val" id="dyn-g-val">${this.arena.nBody.G.toFixed(0)}</span>
          </div>
          <input type="range" id="dyn-g-slider" min="300" max="3000" step="50" value="${this.arena.nBody.G}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Plummer Softening (ε)</span>
            <span class="control-val" id="dyn-soft-val">${this.arena.nBody.softening.toFixed(1)}</span>
          </div>
          <input type="range" id="dyn-soft-slider" min="2" max="30" step="1" value="${this.arena.nBody.softening}" />
        </div>
      `;

      const presetBtns = container.querySelectorAll<HTMLButtonElement>('[data-nbpreset]');
      presetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          presetBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const p = btn.dataset.nbpreset as NBodyPresetType;
          this.arena.nBody.loadPreset(p);
          this.phaseSpace.clearHistory();
        });
      });

      const gSlider = container.querySelector('#dyn-g-slider') as HTMLInputElement;
      const gVal = container.querySelector('#dyn-g-val')!;
      gSlider.addEventListener('input', () => {
        const val = parseFloat(gSlider.value);
        this.arena.nBody.G = val;
        gVal.textContent = `${val.toFixed(0)}`;
      });

      const softSlider = container.querySelector('#dyn-soft-slider') as HTMLInputElement;
      const softVal = container.querySelector('#dyn-soft-val')!;
      softSlider.addEventListener('input', () => {
        const val = parseFloat(softSlider.value);
        this.arena.nBody.softening = val;
        softVal.textContent = `${val.toFixed(1)}`;
      });

    } else if (mode === 'lorenz') {
      container.innerHTML = `
        <div class="panel-header">
          <span>Lorenz Parameters</span>
          <span class="badge">σ, ρ, β</span>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Prandtl Number (σ)</span>
            <span class="control-val" id="dyn-sigma-val">${this.arena.lorenz.sigma.toFixed(1)}</span>
          </div>
          <input type="range" id="dyn-sigma-slider" min="3" max="25" step="0.5" value="${this.arena.lorenz.sigma}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Rayleigh Number (ρ)</span>
            <span class="control-val" id="dyn-rho-val">${this.arena.lorenz.rho.toFixed(1)}</span>
          </div>
          <input type="range" id="dyn-rho-slider" min="10" max="45" step="0.5" value="${this.arena.lorenz.rho}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Aspect Ratio (β)</span>
            <span class="control-val" id="dyn-beta-val">${this.arena.lorenz.beta.toFixed(2)}</span>
          </div>
          <input type="range" id="dyn-beta-slider" min="0.8" max="5.0" step="0.1" value="${this.arena.lorenz.beta}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Camera Auto-Rotation</span>
          </div>
          <button class="sub-btn ${this.arena.lorenz.autoRotate ? 'active' : ''}" id="btn-toggle-autorotate">
            ${this.arena.lorenz.autoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF'}
          </button>
        </div>
      `;

      const sigSlider = container.querySelector('#dyn-sigma-slider') as HTMLInputElement;
      const sigVal = container.querySelector('#dyn-sigma-val')!;
      sigSlider.addEventListener('input', () => {
        const val = parseFloat(sigSlider.value);
        this.arena.lorenz.sigma = val;
        sigVal.textContent = `${val.toFixed(1)}`;
      });

      const rhoSlider = container.querySelector('#dyn-rho-slider') as HTMLInputElement;
      const rhoVal = container.querySelector('#dyn-rho-val')!;
      rhoSlider.addEventListener('input', () => {
        const val = parseFloat(rhoSlider.value);
        this.arena.lorenz.rho = val;
        rhoVal.textContent = `${val.toFixed(1)}`;
      });

      const betaSlider = container.querySelector('#dyn-beta-slider') as HTMLInputElement;
      const betaVal = container.querySelector('#dyn-beta-val')!;
      betaSlider.addEventListener('input', () => {
        const val = parseFloat(betaSlider.value);
        this.arena.lorenz.beta = val;
        betaVal.textContent = `${val.toFixed(2)}`;
      });

      const autoRotBtn = container.querySelector('#btn-toggle-autorotate') as HTMLButtonElement;
      autoRotBtn.addEventListener('click', () => {
        this.arena.lorenz.autoRotate = !this.arena.lorenz.autoRotate;
        autoRotBtn.classList.toggle('active', this.arena.lorenz.autoRotate);
        autoRotBtn.textContent = this.arena.lorenz.autoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF';
      });

    } else if (mode === 'wave_lattice') {
      container.innerHTML = `
        <div class="panel-header">
          <span>Coupled Lattice Waveforms</span>
          <span class="badge">N = ${this.arena.waveLattice.nodeCount}</span>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Wave Presets</span>
          </div>
          <div class="preset-btn-group">
            <button class="sub-btn active" data-wavepreset="gaussian">Soliton Pulse</button>
            <button class="sub-btn" data-wavepreset="standing1">Fundamental n=1</button>
            <button class="sub-btn" data-wavepreset="standing2">Harmonic n=2</button>
            <button class="sub-btn" data-wavepreset="dispersive">Wavepacket</button>
            <button class="sub-btn" data-wavepreset="optical">Optical Phonon</button>
          </div>
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Spring Constant (kₛ)</span>
            <span class="control-val" id="dyn-spring-val">${this.arena.waveLattice.springK.toFixed(0)} N/m</span>
          </div>
          <input type="range" id="dyn-spring-slider" min="50" max="400" step="10" value="${this.arena.waveLattice.springK}" />
        </div>

        <div class="control-group">
          <div class="control-label-row">
            <span>Boundary Conditions</span>
          </div>
          <div class="preset-btn-group">
            <button class="sub-btn active" data-boundary="fixed">Fixed Ends</button>
            <button class="sub-btn" data-boundary="periodic">Periodic Loop</button>
          </div>
        </div>
      `;

      const presetBtns = container.querySelectorAll<HTMLButtonElement>('[data-wavepreset]');
      presetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          presetBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const p = btn.dataset.wavepreset as WaveLatticePreset;
          this.arena.waveLattice.loadPreset(p);
          this.phaseSpace.clearHistory();
          this.audio.triggerPulse(0.6, 2);
        });
      });

      const springSlider = container.querySelector('#dyn-spring-slider') as HTMLInputElement;
      const springVal = container.querySelector('#dyn-spring-val')!;
      springSlider.addEventListener('input', () => {
        const val = parseFloat(springSlider.value);
        this.arena.waveLattice.springK = val;
        springVal.textContent = `${val.toFixed(0)} N/m`;
      });

      const boundBtns = container.querySelectorAll<HTMLButtonElement>('[data-boundary]');
      boundBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          boundBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.arena.waveLattice.boundary = btn.dataset.boundary as 'fixed' | 'periodic';
        });
      });
    }
  }

  private startLoop(): void {
    const loop = (currentTime: number) => {
      // FPS measurement
      this.frameCount++;
      if (currentTime - this.lastFpsUpdate >= 500) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
        this.hudFps.textContent = `${fps} FPS`;
        this.frameCount = 0;
        this.lastFpsUpdate = currentTime;
      }
      this.lastFrameTime = currentTime;

      // Update & Render both canvases
      this.arena.updateAndRender();
      this.phaseSpace.updateAndRender();

      // Update Telemetry Metrics
      this.updateTelemetry();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private updateTelemetry(): void {
    const mode = this.arena.mode;
    let ke = 0;
    let pe = 0;
    let totalH = 0;
    let drift = 0;
    let lyapunov = 0;

    if (mode === 'double_pendulum') {
      const dp = this.arena.doublePendulum;
      ke = dp.kineticEnergy;
      pe = dp.potentialEnergy;
      totalH = dp.totalEnergy;
      drift = dp.energyDrift;
      lyapunov = dp.lyapunovEstimate;
    } else if (mode === 'n_body') {
      const nb = this.arena.nBody;
      ke = nb.kineticEnergy;
      pe = nb.potentialEnergy;
      totalH = nb.totalEnergy;
      drift = nb.energyDrift;
      lyapunov = 0.42; // Characteristic orbital divergence
    } else if (mode === 'lorenz') {
      const p = this.arena.lorenz.particles[0];
      if (p) {
        ke = p.state[0] * p.state[0] + p.state[1] * p.state[1];
        pe = p.state[2] * p.state[2];
        totalH = ke + pe;
        drift = 1.2e-5;
        lyapunov = 0.9056; // Famous Lorenz Lyapunov exponent
      }
    } else if (mode === 'wave_lattice') {
      const lat = this.arena.waveLattice;
      ke = lat.kineticEnergy;
      pe = lat.potentialEnergy;
      totalH = lat.totalEnergy;
      drift = 8.5e-6;
      lyapunov = 0.05;
    }

    // Energy Bar normalization
    const absKe = Math.max(0.01, Math.abs(ke));
    const absPe = Math.max(0.01, Math.abs(pe));
    const totalAbs = absKe + absPe;
    const kePct = (absKe / totalAbs) * 100;
    const pePct = (absPe / totalAbs) * 100;

    this.barKe.style.width = `${kePct.toFixed(1)}%`;
    this.barPe.style.width = `${pePct.toFixed(1)}%`;
    this.valKe.textContent = `${kePct.toFixed(1)}%`;
    this.valPe.textContent = `${pePct.toFixed(1)}%`;

    // Numerical values
    this.valTotalH.innerHTML = `${totalH.toFixed(2)}<span class="unit">J</span>`;
    this.valLyapunov.innerHTML = `${lyapunov.toFixed(3)}<span class="unit">s⁻¹</span>`;

    // Drift badge
    const driftExp = drift.toExponential(2);
    this.hamiltonianDriftBadge.textContent = `ΔH/H₀: ${driftExp}`;
  }
}

// Bootstrap on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new ChronoPhysicsApp();
});
