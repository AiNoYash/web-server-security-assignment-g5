/**
 * ============================================================================
 * Inspector UI & SQL Formatter Module (Clean Light Theme)
 * Handles visual rendering of authentication state, executed query, and tokens.
 * ============================================================================
 */

const InspectorModule = {
  /**
   * Escapes HTML characters for safe rendering.
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /**
   * Formats and syntax-highlights SQL statements.
   * @param {string} query 
   * @returns {string}
   */
  formatSql(query) {
    if (!query) return '--';
    let escaped = this.escapeHtml(query);
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'ASC', 'DESC', 'LIMIT'];
    
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      escaped = escaped.replace(regex, `<span class="sql-keyword">${kw}</span>`);
    });

    // Highlight SQL comments (-- comment)
    escaped = escaped.replace(/(--.*$)/gm, `<span style="color: #94a3b8; font-style: italic;">$1</span>`);

    // Highlight parameter placeholders (?)
    escaped = escaped.replace(/\?/g, `<span class="sql-placeholder">?</span>`);

    return escaped;
  },

  /**
   * Renders the execution result in the Live Inspector Panel.
   * @param {number} httpStatus 
   * @param {any} data 
   * @param {'vulnerable' | 'secure'} mode 
   * @param {number} elapsed 
   * @param {string} [username]
   * @param {string} [password]
   */
  renderResult(httpStatus, data, mode, elapsed, username = '', password = '') {
    this.lastPayload = { mode, username, password };
    const copyCurlBtn = document.getElementById('btnCopyCurl');
    if (copyCurlBtn) copyCurlBtn.style.display = 'inline-flex';

    const banner = document.getElementById('statusBanner');
    const prefix = document.getElementById('statusPrefix');
    const title = document.getElementById('statusTitle');
    const desc = document.getElementById('statusDesc');
    const badges = document.getElementById('statusBadges');
    const sqlDisplay = document.getElementById('sqlDisplay');
    const paramsDisplay = document.getElementById('paramsDisplay');
    const rawJson = document.getElementById('rawJsonResponse');
    const modeBadge = document.getElementById('inspectModeBadge');
    const latency = document.getElementById('execLatency');

    modeBadge.innerText = mode === 'vulnerable'
      ? 'Endpoint: POST /login/vulnerable'
      : 'Endpoint: POST /login/secure';
      
    latency.innerText = `HTTP ${httpStatus} | ${elapsed}ms`;
    rawJson.innerText = JSON.stringify(data, null, 2);

    // Scenario 1: Malformed Syntax / Database Error (HTTP 400)
    if (httpStatus === 400 || data.error) {
      banner.className = 'status-banner error';
      if (prefix) prefix.innerText = 'SQL ERROR';
      title.innerText = 'Database Syntax Error (HTTP 400)';
      desc.innerText = data.error || data.message;
      badges.innerHTML = `<span class="role-tag" style="background: #fffbeb; color: #92400e; border-color: #fde68a;">SYNTAX EXCEPTION</span>`;

      const qText = typeof data.query_executed === 'string'
        ? data.query_executed
        : (data.query_executed?.template || '');
      sqlDisplay.innerHTML = this.formatSql(qText);
      paramsDisplay.style.display = 'none';
      this.scrollToInspector();
      return;
    }

    // Scenario 2: Authentication Granted
    if (data.authenticated && data.user) {
      banner.className = 'status-banner granted';
      if (prefix) prefix.innerText = 'GRANTED';
      title.innerText = `Access Granted: Logged in as '${data.user.username}'`;
      desc.innerText = `Matched User ID: #${data.user.id} | Account Role: ${data.user.role}`;

      badges.innerHTML = `
        <span class="role-tag">ROLE: ${data.user.role.toUpperCase()}</span>
        <span class="role-tag" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">AUTHENTICATED</span>
      `;
    } else {
      // Scenario 3: Authentication Denied
      banner.className = 'status-banner denied';
      if (prefix) prefix.innerText = 'DENIED';
      title.innerText = 'Access Denied';
      desc.innerText = data.message || 'No user record matched the submitted credentials.';
      badges.innerHTML = `<span class="role-tag" style="background: #fef2f2; color: #991b1b; border-color: #fecaca;">REJECTED</span>`;
    }

    // Render Query & Parameter Separation
    if (mode === 'vulnerable') {
      paramsDisplay.style.display = 'none';
      sqlDisplay.innerHTML = this.formatSql(data.query_executed);
    } else {
      sqlDisplay.innerHTML = this.formatSql(data.query_executed.template);
      paramsDisplay.style.display = 'block';
      const p0 = this.escapeHtml(data.query_executed.bound_parameters[0]);
      const p1 = this.escapeHtml(data.query_executed.bound_parameters[1]);
      paramsDisplay.innerHTML = `<strong>Bound Parameters:</strong> [0] = <span style="color:#f8fafc">"${p0}"</span>, [1] = <span style="color:#f8fafc">"${p1}"</span>`;
    }

    this.scrollToInspector();
  },

  /**
   * Renders in-panel execution results directly within the card.
   * @param {'vulnerable' | 'secure'} mode 
   * @param {number} httpStatus 
   * @param {any} data 
   * @param {number} elapsed 
   * @param {string} username 
   */
  renderPanelResult(mode, httpStatus, data, elapsed, username = '') {
    if (mode === 'vulnerable') {
      const panel = document.getElementById('vulnPanelResult');
      const tag = document.getElementById('vulnResultTag');
      const latency = document.getElementById('vulnLatency');
      const body = document.getElementById('vulnResultBody');
      const sql = document.getElementById('vulnExecutedSql');
      if (!panel) return;

      panel.style.display = 'block';
      if (latency) latency.innerText = `HTTP ${httpStatus} | ${elapsed}ms`;

      if (httpStatus === 400 || data.error) {
        panel.className = 'panel-result error';
        if (tag) tag.innerText = 'SQL SYNTAX ERROR';
        if (body) body.innerHTML = `Database Exception: ${this.escapeHtml(data.error || data.message)}`;
        if (sql) sql.innerHTML = this.formatSql(data.query_executed || '--');
      } else if (data.authenticated && data.user) {
        panel.className = 'panel-result attack-success';
        if (tag) tag.innerText = 'EXPLOIT SUCCEEDED (AUTH BYPASSED)';
        if (body) body.innerHTML = `Access Granted without valid password! Authenticated as <strong>${this.escapeHtml(data.user.username)}</strong> (Role: <span style="text-transform:uppercase">${this.escapeHtml(data.user.role)}</span>).`;
        if (sql) sql.innerHTML = this.formatSql(data.query_executed || '--');
      } else {
        panel.className = 'panel-result normal';
        if (tag) tag.innerText = 'AUTH FAILED';
        if (body) body.innerText = 'Authentication Failed: No user row matched query logic.';
        if (sql) sql.innerHTML = this.formatSql(data.query_executed || '--');
      }
    } else {
      const panel = document.getElementById('secPanelResult');
      const tag = document.getElementById('secResultTag');
      const latency = document.getElementById('secLatency');
      const body = document.getElementById('secResultBody');
      const sql = document.getElementById('secExecutedSql');
      const params = document.getElementById('secBoundParams');
      if (!panel) return;

      panel.style.display = 'block';
      if (latency) latency.innerText = `HTTP ${httpStatus} | ${elapsed}ms`;

      const template = data.query_executed?.template || 'SELECT id, username, role FROM users WHERE username = ? AND password = ?';
      const boundList = data.query_executed?.bound_parameters || [];
      if (sql) sql.innerHTML = this.formatSql(template);
      if (params) params.innerText = JSON.stringify(boundList);

      if (data.authenticated && data.user) {
        panel.className = 'panel-result normal';
        if (tag) tag.innerText = 'AUTHENTICATED';
        if (body) body.innerHTML = `Legitimate Login Successful: Authenticated as <strong>${this.escapeHtml(data.user.username)}</strong> (Role: ${this.escapeHtml(data.user.role)}).`;
      } else {
        const isAttackPayload = /['"-]|(\bOR\b)/i.test(username);
        if (isAttackPayload) {
          panel.className = 'panel-result attack-blocked';
          if (tag) tag.innerText = 'SQLi BLOCKED (SAFE FAILURE)';
          if (body) body.innerHTML = `Attack Defeated: Input was treated strictly as literal string parameter. Database query structure was not altered.`;
        } else {
          panel.className = 'panel-result normal';
          if (tag) tag.innerText = 'AUTH FAILED';
          if (body) body.innerText = 'Authentication Failed: Provided username and password did not match.';
        }
      }
    }
  },

  /**
   * Renders a network/client error in the inspector.
   * @param {Error} err 
   */
  renderClientError(err) {
    const banner = document.getElementById('statusBanner');
    const prefix = document.getElementById('statusPrefix');
    banner.className = 'status-banner error';
    if (prefix) prefix.innerText = 'CLIENT ERROR';
    document.getElementById('statusTitle').innerText = 'Client / Network Exception';
    document.getElementById('statusDesc').innerText = err.message;
    document.getElementById('rawJsonResponse').innerText = err.stack || err.message;
    this.scrollToInspector();
  },

  scrollToInspector() {
    const el = document.getElementById('inspectorCard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  /**
   * Copies the exact cURL command for the last executed request to clipboard.
   */
  copyCurl() {
    if (!this.lastPayload) {
      if (window.App) window.App.showToast('No request executed yet.');
      return;
    }
    const { mode, username, password } = this.lastPayload;
    const endpoint = mode === 'vulnerable' ? '/login/vulnerable' : '/login/secure';
    const payloadStr = JSON.stringify({ username, password });
    const curlCmd = `curl -X POST http://127.0.0.1:8000${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${payloadStr}'`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(curlCmd)
        .then(() => {
          if (window.App) window.App.showToast('cURL command copied to clipboard.');
        })
        .catch(() => {
          prompt('Copy cURL Command:', curlCmd);
        });
    } else {
      prompt('Copy cURL Command:', curlCmd);
    }
  }
};

// Export to window for browser script compatibility
window.InspectorModule = InspectorModule;
