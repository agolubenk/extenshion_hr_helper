/**
 * Huntflow integration configuration constants.
 * Shared between content scripts and background worker via __HRH__.
 */
(function () {
  var g = typeof window !== 'undefined' ? window : self;
  g.__HRH__ = g.__HRH__ || {};

  g.__HRH__.HUNTFLOW = {
    API_BASE_URL: 'https://api.huntflow.ai',
    DASHBOARD_URL: 'https://huntflow.ai',
    SETTINGS_URL: 'https://huntflow.ai/settings/api',

    STORAGE_KEYS: {
      TOKEN: 'huntflow_token',
      ACCOUNT_ID: 'huntflow_account_id',
      DEFAULT_VACANCY: 'huntflow_default_vacancy',
      AUTO_SAVE: 'huntflow_auto_save',
      NOTIFICATIONS: 'huntflow_notifications',
      ERROR_LOGS: 'huntflow_error_logs'
    },

    MESSAGE_TYPES: {
      CHECK_AUTH: 'HUNTFLOW_CHECK_AUTH',
      AUTHENTICATE: 'HUNTFLOW_AUTHENTICATE',
      GET_VACANCIES: 'HUNTFLOW_GET_VACANCIES',
      SAVE_CANDIDATE: 'HUNTFLOW_SAVE_CANDIDATE',
      LOGOUT: 'HUNTFLOW_LOGOUT'
    },

    CACHE: {
      VACANCY_TTL_MS: 5 * 60 * 1000 // 5 minutes
    },

    UI: {
      SUCCESS_RESET_MS: 3000,
      DEBOUNCE_MS: 300
    }
  };
})();
