# CHRONO-PHYSICS: RK4 Chaos, Double-Pendulum Swarm & N-Body Physics Engine

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6.svg)
![Physics Engine](https://img.shields.io/badge/Integrator-RK4%20(4th--Order%20Runge--Kutta)-06b6d4.svg)
![Hardware Acceleration](https://img.shields.io/badge/Rendering-Hardware--Accelerated%20Canvas%202D%2F3D-8b5cf6.svg)

> **Lead Computational Physics & Nonlinear Dynamics Architect:** **أ. طارق ابوعشي**

---

## 🌌 Overview

**CHRONO-PHYSICS** is a computational physics laboratory and non-linear dynamics visualization suite built with vanilla TypeScript and hardware-accelerated 2D/3D Canvas rendering. It integrates four distinct physical systems through an explicit **4th-Order Runge-Kutta (RK4)** numerical solver with adaptive micro-stepping ($dt_{sub} = 0.002\text{ s}$), achieving symplectic energy conservation with relative Hamiltonian drift $\Delta H / H_0 < 10^{-5}$.

Live Interactive Simulator: **[https://tareq0001.github.io/ChronoPhysics-Chaos-Kinematics-Engine/](https://tareq0001.github.io/ChronoPhysics-Chaos-Kinematics-Engine/)**

---

## ⚡ The Four Physical Engines

### 1. 🦋 Double-Pendulum Butterfly Effect Swarm (سرب البندول المزدوج الفوضوي)
- Solves coupled non-linear Euler-Lagrange equations of motion for $N = 1 \dots 30$ synchronized double pendulums.
- Initial perturbation $\Delta\theta_0 = 10^{-4}\text{ rad}$ manifests macroscopic deterministic divergence.
- Real-time estimation of the maximal Lyapunov exponent $\lambda(t) \approx \frac{1}{t}\ln\left(\frac{d(t)}{d(0)}\right)$.
- Additive blending photon trails (`globalCompositeOperation = 'lighter'`) with HSL chromatic dispersion.

### 2. 🪐 3-Body Gravitational Choreography (رقص الجاذبية للأجرام الثلاثة)
- Multi-body Newtonian gravity with Plummer softening parameter $\epsilon$ to eliminate singular close encounters.
- Canonical choreographic solutions:
  - **Chenciner & Montgomery Figure-8**: Three equal masses tracing a single planar eight-shaped loop.
  - **Lagrange Equilateral Triangle**: Rotating collinear/triangular barycentric balance.
  - **Chaotic Binary Slingshot**: Hyperbolic gravitational assist and three-body chaotic ejection.
- Dynamic spacetime fabric curvature deformation grid calculated from the total gravitational potential well $\Phi(\mathbf{x})$.
- Interactive mouse kinematics: click and drag to launch new celestial bodies into orbit.

### 3. 🌀 Lorenz 3D Strange Attractor (جاذب لورنز ثلاثي الأبعاد)
- 120–150 glowing orbital streamlines evolving through the 3D Lorenz atmospheric convection equations:
  $$\dot{x} = \sigma(y-x), \quad \dot{y} = x(\rho-z)-y, \quad \dot{z} = xy-\beta z$$
- Phase-space volume contraction $\nabla \cdot \mathbf{f} = -(\sigma + 1 + \beta) < 0$ onto a fractal manifold of Hausdorff dimension $D_H \approx 2.06$.
- Interactive 3D orbital camera controls: mouse drag elevation/azimuth rotation, scroll zoom, and inertial auto-rotation.

### 4. 🌊 Coupled Harmonic Wave Lattice (شبكة الموجات التوافقية المقترنة)
- 24 masses coupled through elastic springs exhibiting acoustic wave propagation and normal modes.
- Presets: Soliton Gaussian pulse, fundamental mode ($n=1$), higher harmonics ($n=2, 3$), dispersive wavepackets, and anti-phase optical branch.
- Demonstrates acoustic cutoff frequency $\omega_{max} = 2\sqrt{k_s/m}$.
- Interactive node plucking via direct mouse displacement.

---

## 🔬 Mathematical Dossier & Diagnostics

- **Poincaré Phase Space Portrait**: Live rendering of $(\theta_1, \omega_1)$ and $(\theta_2, \omega_2)$ or $(q, p)$ canonical coordinates.
- **Symplectic Energy Monitor**: Real-time kinetic energy ($T\%$) vs potential energy ($V\%$) meter with instantaneous drift ratio $|\Delta H / H_0|$.
- **FM Harmonic Audio Synthesizer**: Web Audio API pentatonic sound generator triggering subtle frequency-modulated chimes upon zero-crossings and energy peaks.
- **Theoretical Dossier Modal**: Comprehensive mathematical derivations including Euler-Lagrange equations, Runge-Kutta Butcher tableaux, and dispersion relations.

---

## 🚀 Building & Local Development

```bash
# Clone the repository
git clone https://github.com/Tareq0001/ChronoPhysics-Chaos-Kinematics-Engine.git
cd ChronoPhysics-Chaos-Kinematics-Engine

# Install dependencies
npm install

# Start development server
npm run dev

# Compile TypeScript and produce production build
npm run build
```

---

## 📜 Intellectual Property & Attribution

- **Concept, Architecture & Code:** **أ. طارق ابوعشي**
- **Role:** Lead Computational Physics & Nonlinear Dynamics Architect
- **License:** MIT License
