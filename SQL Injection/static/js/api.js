/**
 * ============================================================================
 * API Service Module
 * Handles all network requests to the FastAPI backend endpoints.
 * ============================================================================
 */

const ApiService = {
  /**
   * Submits credentials to the vulnerable endpoint (f-string interpolation).
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{ status: number, data: any, elapsed: number }>}
   */
  async loginVulnerable(username, password) {
    const startTime = performance.now();
    const response = await fetch('/login/vulnerable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const elapsed = Math.round(performance.now() - startTime);
    const data = await response.json();
    return { status: response.status, data, elapsed };
  },

  /**
   * Submits credentials to the secure endpoint (parameterized queries).
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{ status: number, data: any, elapsed: number }>}
   */
  async loginSecure(username, password) {
    const startTime = performance.now();
    const response = await fetch('/login/secure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const elapsed = Math.round(performance.now() - startTime);
    const data = await response.json();
    return { status: response.status, data, elapsed };
  },

  /**
   * Triggers a database reset and reseeding of the default laboratory users.
   * @returns {Promise<any>}
   */
  async resetDatabase() {
    const response = await fetch('/reset', { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to reset database: HTTP ${response.status}`);
    }
    return await response.json();
  },

  /**
   * Fetches the current list of users from the SQLite database.
   * @returns {Promise<Array<{ id: number, username: string, role: string }>>}
   */
  async fetchUsers() {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error(`Failed to fetch users: HTTP ${response.status}`);
    }
    return await response.json();
  }
};

// Export to window for browser script compatibility
window.ApiService = ApiService;

