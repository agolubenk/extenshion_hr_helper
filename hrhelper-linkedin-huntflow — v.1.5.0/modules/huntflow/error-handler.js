/**
 * HuntflowErrorHandler — centralized error handling with context,
 * logging to chrome.storage, and user-friendly messages.
 */
class HuntflowErrorHandler {
  static handle(error, context) {
    const errorInfo = {
      message: error.message || String(error),
      stack: error.stack || '',
      context: context || 'unknown',
      timestamp: new Date().toISOString()
    };

    console.error('[Huntflow Error]', errorInfo);

    this.saveErrorLog(errorInfo);

    return this.getUserMessage(error);
  }

  static async saveErrorLog(errorInfo) {
    try {
      const data = await chrome.storage.local.get('huntflow_error_logs');
      const logs = data.huntflow_error_logs || [];
      logs.push(errorInfo);

      // Keep only last 50 errors
      const trimmed = logs.length > 50 ? logs.slice(-50) : logs;

      await chrome.storage.local.set({ huntflow_error_logs: trimmed });
    } catch (_) {
      // Storage write failed — nothing we can do
    }
  }

  static getUserMessage(error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network')) {
      return 'Network error. Please check your connection.';
    }

    if (msg.includes('401') || msg.includes('auth') || msg.includes('token')) {
      return 'Authentication failed. Please reconnect your Huntflow account.';
    }

    if (msg.includes('429') || msg.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (msg.includes('403') || msg.includes('forbidden')) {
      return 'Access denied. Check your Huntflow permissions.';
    }

    if (msg.includes('404')) {
      return 'Resource not found. The Huntflow endpoint may have changed.';
    }

    if (msg.includes('500') || msg.includes('server')) {
      return 'Huntflow server error. Please try again later.';
    }

    return 'An error occurred. Please try again.';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HuntflowErrorHandler;
}
