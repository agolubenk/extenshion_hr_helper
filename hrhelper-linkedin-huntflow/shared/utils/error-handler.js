/**
 * HR Helper — централизованный обработчик ошибок с toast-уведомлениями
 * @fileoverview
 */
(function () {
  'use strict';
  var g = typeof window !== 'undefined' ? window : self;
  g.__HRH__ = g.__HRH__ || {};

  var styleInjected = false;

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var style = document.createElement('style');
    style.textContent =
      '@keyframes hrhelper-toast-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}' +
      '@keyframes hrhelper-toast-out{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}' +
      '.hrhelper-toast-container{position:fixed;top:20px;right:20px;z-index:1000000;display:flex;flex-direction:column;gap:8px;pointer-events:none;}' +
      '.hrhelper-toast{pointer-events:auto;padding:12px 16px;border-radius:8px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.4;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:hrhelper-toast-in .3s ease-out;}' +
      '.hrhelper-toast.removing{animation:hrhelper-toast-out .3s ease-in forwards;}' +
      '.hrhelper-toast--error{background:#dc3545;color:#fff;}' +
      '.hrhelper-toast--success{background:#198754;color:#fff;}' +
      '.hrhelper-toast--warning{background:#fd7e14;color:#fff;}' +
      '.hrhelper-toast--info{background:#0a66c2;color:#fff;}';
    document.head.appendChild(style);
  }

  function getContainer() {
    var container = document.querySelector('.hrhelper-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'hrhelper-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function getUserMessage(error) {
    if (!error) return 'Произошла ошибка. Попробуйте ещё раз.';

    var msg = error.message || String(error);

    if (/network|fetch|net::ERR|Failed to fetch|Extension context invalidated/i.test(msg)) {
      return 'Ошибка сети. Проверьте подключение к интернету и попробуйте ещё раз.';
    }

    var status = error.status || 0;
    if (status === 401 || status === 403) {
      return 'Ошибка авторизации. Проверьте настройки токена в расширении.';
    }
    if (status === 404) {
      return 'Ресурс не найден. Проверьте URL и попробуйте ещё раз.';
    }
    if (status === 429) {
      return 'Слишком много запросов. Подождите немного и попробуйте ещё раз.';
    }
    if (status >= 500) {
      return 'Ошибка сервера. Попробуйте ещё раз позже.';
    }

    return 'Произошла ошибка. Попробуйте ещё раз.';
  }

  function showNotification(type, message) {
    injectStyles();
    var container = getContainer();
    var toast = document.createElement('div');
    toast.className = 'hrhelper-toast hrhelper-toast--' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('removing');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  function handle(error, context) {
    var ctx = context || 'unknown';
    console.error('[HRHelper ErrorHandler]', ctx, error);

    var userMsg = getUserMessage(error);
    showNotification('error', userMsg);

    sendTelemetry(error, ctx);
  }

  function sendTelemetry(error, context) {
    try {
      var apiFetch = g.__HRH__ && g.__HRH__.apiFetch;
      if (!apiFetch) return;
      var payload = {
        context: context || 'unknown',
        message: error && error.message ? error.message : String(error),
        status: error && error.status ? error.status : null,
        url: location.href,
        timestamp: new Date().toISOString()
      };
      apiFetch('/api/v1/telemetry/error/', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).catch(function () { /* silent */ });
    } catch (_) { /* silent */ }
  }

  g.__HRH__.ErrorHandler = {
    handle: handle,
    getUserMessage: getUserMessage,
    showNotification: showNotification,
    sendTelemetry: sendTelemetry
  };
})();
