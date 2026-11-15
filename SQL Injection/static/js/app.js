/**
 * ============================================================================
 * Application Controller Module
 * Coordinates UI events, payload injection, side-by-side tests, and toasts.
 * ============================================================================
 */

const App = {
  /**
   * Displays a temporary notification toast.
   * @param {string} msg 
   */
  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  },

  /**
   * Loads a preset attack or legitimate payload into form fields.
   * @param {string} u Username
   * @param {string} p Password
   * @param {string} label Scenario label
   */
  loadPayload(u, p, label) {
    const vulnU = document.getElementById('vulnUsername');
    const vulnP = document.getElementById('vulnPassword');
    const secU = document.getElementById('secUsername');
    const secP = document.getElementById('secPassword');

    if (vulnU) vulnU.value = u;
    if (vulnP) vulnP.value = p;
    if (secU) secU.value = u;
    if (secP) secP.value = p;

    this.showToast(`Loaded payload: ${label}`);
  },

  /**
   * Submits credentials to either the vulnerable or secure endpoint.
   * @param {'vulnerable' | 'secure'} mode 
   */
  async submitLogin(mode) {
    const uId = mode === 'vulnerable' ? 'vulnUsername' : 'secUsername';
    const pId = mode === 'vulnerable' ? 'vulnPassword' : 'secPassword';

    const username = document.getElementById(uId).value;
    const password = document.getElementById(pId).value;

    try {
      let result;
      if (mode === 'vulnerable') {
        result = await window.ApiService.loginVulnerable(username, password);
      } else {
        result = await window.ApiService.loginSecure(username, password);
      }

      // Update both in-panel status card and the global inspector
      window.InspectorModule.renderPanelResult(
        mode,
        result.status,
        result.data,
        result.elapsed,
        username
      );

      window.InspectorModule.renderResult(
        result.status,
        result.data,
        mode,
        result.elapsed,
        username,
        password
      );
    } catch (err) {
      window.InspectorModule.renderClientError(err);
    }
  },

  /**
   * Executes both vulnerable and secure endpoints simultaneously with the current inputs
   * and renders comparative live results in both panels.
   */
  async testBoth() {
    this.showToast('Executing both endpoints simultaneously for live comparison...');
    const u = document.getElementById('vulnUsername').value;
    const p = document.getElementById('vulnPassword').value;

    // Synchronize secure form inputs
    const secU = document.getElementById('secUsername');
    const secP = document.getElementById('secPassword');
    if (secU) secU.value = u;
    if (secP) secP.value = p;

    try {
      // Execute both requests in parallel
      const [vulnRes, secRes] = await Promise.all([
        window.ApiService.loginVulnerable(u, p),
        window.ApiService.loginSecure(u, p)
      ]);

      // Render in-panel results for both cards side-by-side
      window.InspectorModule.renderPanelResult('vulnerable', vulnRes.status, vulnRes.data, vulnRes.elapsed, u);
      window.InspectorModule.renderPanelResult('secure', secRes.status, secRes.data, secRes.elapsed, u);

      // Render the vulnerable outcome in the execution inspector for cURL copying
      window.InspectorModule.renderResult(vulnRes.status, vulnRes.data, 'vulnerable', vulnRes.elapsed, u, p);

      this.showToast('Comparison completed: Check left and right panel outcomes!');
    } catch (err) {
      window.InspectorModule.renderClientError(err);
    }
  },

  /**
   * Calls the reset API and updates the UI state.
   */
  async resetDatabase() {
    const btn = document.getElementById('btnResetDb');
    if (!btn) return;

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>Resetting database...</span>';

    try {
      const data = await window.ApiService.resetDatabase();
      this.showToast(data.message || 'Database successfully restored to default seeded accounts!');
      this.loadPayload("admin' --", 'anything', 'Default Demo Payload');
    } catch (err) {
      alert('Failed to reset database: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  /**
   * Initializes DOM event bindings.
   */
  init() {
    // Form submissions
    const vulnForm = document.getElementById('vulnForm');
    if (vulnForm) {
      vulnForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitLogin('vulnerable');
      });
    }

    const secForm = document.getElementById('secForm');
    if (secForm) {
      secForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitLogin('secure');
      });
    }

    // Reset button
    const resetBtn = document.getElementById('btnResetDb');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetDatabase());
    }

    // Simultaneous comparison button
    const bothBtn = document.getElementById('btnTestBoth');
    if (bothBtn) {
      bothBtn.addEventListener('click', () => this.testBoth());
    }
  }
};

// Global expose and auto-initialization
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

