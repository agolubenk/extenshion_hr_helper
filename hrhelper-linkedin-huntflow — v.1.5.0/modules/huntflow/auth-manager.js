/**
 * HuntflowAuthManager — manages Huntflow API authentication.
 * Stores/loads token from chrome.storage.local, validates via API,
 * and provides auth state to other modules.
 */
class HuntflowAuthManager {
  constructor() {
    this.token = null;
    this.accountId = null;
  }

  async initialize() {
    const stored = await chrome.storage.local.get([
      'huntflow_token',
      'huntflow_account_id'
    ]);
    this.token = stored.huntflow_token || null;
    this.accountId = stored.huntflow_account_id || null;
  }

  async authenticate(token) {
    try {
      const response = await fetch('https://api.huntflow.ai/account/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'HR Helper Extension/2.0.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.token = token;
        this.accountId = data.accounts && data.accounts[0]
          ? data.accounts[0].id
          : null;

        await chrome.storage.local.set({
          huntflow_token: token,
          huntflow_account_id: this.accountId
        });

        return { success: true, accountId: this.accountId };
      }

      if (response.status === 401) {
        return { success: false, error: 'Invalid or expired token' };
      }

      return { success: false, error: `Authentication failed (HTTP ${response.status})` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  isAuthenticated() {
    return !!this.token && !!this.accountId;
  }

  getToken() {
    return this.token;
  }

  getAccountId() {
    return this.accountId;
  }

  async logout() {
    this.token = null;
    this.accountId = null;
    await chrome.storage.local.remove([
      'huntflow_token',
      'huntflow_account_id',
      'huntflow_default_vacancy',
      'huntflow_auto_save',
      'huntflow_notifications'
    ]);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HuntflowAuthManager;
}
