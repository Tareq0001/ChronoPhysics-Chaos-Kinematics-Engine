/**
 * CHRONO-PHYSICS: Mathematical Dossier & Theoretical Physics Reference Modal
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 */

export class MathDossierModal {
  private modalOverlay: HTMLElement | null = null;

  constructor() {
    this.createModal();
  }

  private createModal(): void {
    const overlay = document.createElement('div');
    overlay.id = 'math-dossier-modal';
    overlay.className = 'modal-overlay hidden';

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-badge">THEORETICAL DERIVATION DOSSIER</span>
            <h2>CHRONO-PHYSICS: Analytical Mechanics & Numerical Integration</h2>
            <p class="modal-author">Lead Computational Physics Architect: <strong>أ. طارق ابوعشي</strong></p>
          </div>
          <button id="close-modal-btn" class="close-btn" aria-label="Close Dossier">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body custom-scroll">
          <!-- SECTION 1 -->
          <div class="math-section">
            <div class="section-tag">FORMALISM I</div>
            <h3>Euler-Lagrange Non-Linear Double Pendulum Equations</h3>
            <p>
              The double pendulum is the canonical archetype of deterministic Hamiltonian chaos.
              With generalized coordinates $\\mathbf{q} = (\\theta_1, \\theta_2)^T$, the Lagrangian $\\mathcal{L} = T - V$ is defined as:
            </p>
            <div class="formula-box">
              <div class="formula-line">$$T = \\frac{1}{2}(m_1+m_2)l_1^2 \\dot{\\theta}_1^2 + \\frac{1}{2}m_2 l_2^2 \\dot{\\theta}_2^2 + m_2 l_1 l_2 \\dot{\\theta}_1 \\dot{\\theta}_2 \\cos(\\theta_1 - \\theta_2)$$</div>
              <div class="formula-line">$$V = -(m_1+m_2)g l_1 \\cos\\theta_1 - m_2 g l_2 \\cos\\theta_2$$</div>
            </div>
            <p>Applying the Euler-Lagrange equations $\\frac{d}{dt}\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot{\\theta}_i}\\right) - \\frac{\\partial \\mathcal{L}}{\\partial \\theta_i} = 0$, we arrive at the non-linear coupled angular accelerations:</p>
            <div class="formula-box highlight">
              <div class="formula-line">$$\\ddot{\\theta}_1 = \\frac{-g(2m_1+m_2)\\sin\\theta_1 - m_2 g\\sin(\\theta_1 - 2\\theta_2) - 2\\sin(\\Delta\\theta) m_2 (l_2\\dot{\\theta}_2^2 + l_1\\dot{\\theta}_1^2\\cos\\Delta\\theta)}{l_1 [2m_1+m_2 - m_2\\cos(2\\Delta\\theta)]}$$</div>
              <div class="formula-line">$$\\ddot{\\theta}_2 = \\frac{2\\sin(\\Delta\\theta)[\\dot{\\theta}_1^2 l_1(m_1+m_2) + g(m_1+m_2)\\cos\\theta_1 + \\dot{\\theta}_2^2 l_2 m_2\\cos(\\Delta\\theta)]}{l_2 [2m_1+m_2 - m_2\\cos(2\\Delta\\theta)]}$$</div>
            </div>
          </div>

          <!-- SECTION 2 -->
          <div class="math-section">
            <div class="section-tag">INTEGRATOR II</div>
            <h3>Classical 4th-Order Runge-Kutta (RK4) Butcher Tableau</h3>
            <p>
              To propagate the state vector $\\mathbf{y}(t) \\in \\mathbb{R}^d$ across time step $dt$ with local truncation error $\\mathcal{O}(dt^5)$, we deploy the classic explicit RK4 quadrature:
            </p>
            <div class="formula-box">
              <div class="formula-line">$$\\mathbf{k}_1 = \\mathbf{f}(t, \\mathbf{y}_n)$$</div>
              <div class="formula-line">$$\\mathbf{k}_2 = \\mathbf{f}\\left(t + \\frac{dt}{2}, \\; \\mathbf{y}_n + \\frac{dt}{2}\\mathbf{k}_1\\right)$$</div>
              <div class="formula-line">$$\\mathbf{k}_3 = \\mathbf{f}\\left(t + \\frac{dt}{2}, \\; \\mathbf{y}_n + \\frac{dt}{2}\\mathbf{k}_2\\right)$$</div>
              <div class="formula-line">$$\\mathbf{k}_4 = \\mathbf{f}(t + dt, \\; \\mathbf{y}_n + dt\\,\\mathbf{k}_3)$$</div>
              <div class="formula-line highlight-text">$$\\mathbf{y}_{n+1} = \\mathbf{y}_n + \\frac{dt}{6}(\\mathbf{k}_1 + 2\\mathbf{k}_2 + 2\\mathbf{k}_3 + \\mathbf{k}_4)$$</div>
            </div>
            <p>
              In our sub-stepping loop, each frame executes $8$ micro-steps ($dt_{sub} = 0.002\\text{ s}$), ensuring energy drift $\\frac{\\Delta H}{H_0} < 10^{-5}$ across thousands of dynamical cycles.
            </p>
          </div>

          <!-- SECTION 3 -->
          <div class="math-section">
            <div class="section-tag">GRAVITATION III</div>
            <h3>Chenciner-Montgomery N-Body Figure-8 & Softened Gravity</h3>
            <p>
              The Chenciner-Montgomery (2000) solution is a remarkable choreography where three equal celestial masses chase each other along a planar figure-eight loop. The pairwise Newtonian gravitational potential with Plummer softening $\\epsilon$ avoids singular close-range divergence:
            </p>
            <div class="formula-box">
              <div class="formula-line">$$\\mathbf{a}_i = \\sum_{j \\neq i} \\frac{G m_j (\\mathbf{r}_j - \\mathbf{r}_i)}{(|\\mathbf{r}_j - \\mathbf{r}_i|^2 + \\epsilon^2)^{3/2}}$$</div>
              <div class="formula-line">$$\\Phi(\\mathbf{x}) = -\\sum_{i=1}^N \\frac{G m_i}{\\sqrt{|\\mathbf{x} - \\mathbf{r}_i|^2 + \\epsilon^2}}$$</div>
            </div>
          </div>

          <!-- SECTION 4 -->
          <div class="math-section">
            <div class="section-tag">ATTRACTOR IV</div>
            <h3>Lorenz Strange Attractor & Maximal Lyapunov Exponent</h3>
            <p>
              The atmospheric convective model formulated by Edward Lorenz (1963) exhibits sensitive dependence on initial conditions:
            </p>
            <div class="formula-box">
              <div class="formula-line">$$\\dot{x} = \\sigma (y - x), \\quad \\dot{y} = x(\\rho - z) - y, \\quad \\dot{z} = x y - \\beta z$$</div>
              <div class="formula-line">$$\\nabla \\cdot \\mathbf{f} = \\frac{\\partial \\dot{x}}{\\partial x} + \\frac{\\partial \\dot{y}}{\\partial y} + \\frac{\\partial \\dot{z}}{\\partial z} = -(\\sigma + 1 + \\beta) < 0$$</div>
            </div>
            <p>
              Negative phase-space divergence implies volume contraction into a zero-measure fractal attractor of Hausdorff dimension $D_H \\approx 2.06$. The divergence rate between two infinitesimally close trajectories defines the maximal Lyapunov exponent:
            </p>
            <div class="formula-box highlight">
              <div class="formula-line">$$\\lambda = \\lim_{t \\to \\infty} \\frac{1}{t} \\ln\\left(\\frac{\\|\\delta(t)\\|}{\\|\\delta(0)\\|}\\right) \\approx 0.9056$$</div>
            </div>
          </div>

          <!-- SECTION 5 -->
          <div class="math-section">
            <div class="section-tag">ACOUSTICS V</div>
            <h3>Coupled Harmonic Lattice & Phonon Dispersion Relation</h3>
            <p>
              A 1D lattice of $N$ coupled harmonic oscillators connected by springs of stiffness $k_s$ obeys:
            </p>
            <div class="formula-box">
              <div class="formula-line">$$m \\ddot{y}_n = -k_s(2y_n - y_{n-1} - y_{n+1}) - \\gamma \\dot{y}_n$$</div>
              <div class="formula-line">$$\\omega(k) = 2\\sqrt{\\frac{k_s}{m}} \\left|\\sin\\left(\\frac{k a}{2}\\right)\\right|$$</div>
            </div>
            <p>
              This yields an acoustic cutoff frequency $\\omega_{max} = 2\\sqrt{k_s/m}$, above which evanescent attenuation prevents wave propagation.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <span class="footer-note">Architected with Pure TypeScript & Canvas 2D/3D &bull; Zero External Math Dependencies</span>
          <button id="close-modal-bottom-btn" class="action-btn">Close Dossier</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalOverlay = overlay;

    // Event listeners
    const closeTop = overlay.querySelector('#close-modal-btn');
    const closeBottom = overlay.querySelector('#close-modal-bottom-btn');

    closeTop?.addEventListener('click', () => this.hide());
    closeBottom?.addEventListener('click', () => this.hide());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        this.hide();
      }
    });
  }

  public show(): void {
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  public hide(): void {
    if (this.modalOverlay) {
      this.modalOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }
}
