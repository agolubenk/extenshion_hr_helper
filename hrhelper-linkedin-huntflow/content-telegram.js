/**
 * HR Helper — content script для Telegram (web.telegram.org, t.me)
 * Извлечение данных профиля и кнопка «Добавить в Huntflow»
 * @fileoverview
 */
(function () {
  'use strict';
  var g = typeof window !== 'undefined' ? window : self;
  var HRH = g.__HRH__;
  if (!HRH) {
    throw new Error('[HRHelper] shared/constants.js not loaded');
  }

  var HuntflowAPI = HRH.HuntflowAPI;
  var ErrorHandler = HRH.ErrorHandler;

  var BUTTON_ATTR = 'data-hrhelper-telegram-btn';

  var TelegramParser = {
    extractUsername: function () {
      var url = location.href;
      var m = url.match(/t\.me\/([a-zA-Z0-9_]+)/i);
      if (m) return m[1];
      // web.telegram.org — ищем в DOM
      var usernameEl = document.querySelector('.peer-username, .username, [class*="username"]');
      if (usernameEl) {
        var text = (usernameEl.textContent || '').trim().replace(/^@/, '');
        if (text) return text;
      }
      return null;
    },

    extractFullName: function () {
      // t.me page
      var nameEl = document.querySelector('.tgme_page_title span, .tgme_page_title');
      if (nameEl) return (nameEl.textContent || '').trim();
      // web.telegram.org
      var peerName = document.querySelector('.peer-title, .chat-info .info .title, [class*="peer-title"]');
      if (peerName) return (peerName.textContent || '').trim();
      return '';
    },

    extractPhone: function () {
      var phoneLink = document.querySelector('a[href^="tel:"]');
      if (phoneLink) return (phoneLink.textContent || phoneLink.href.replace('tel:', '')).trim();
      // web.telegram.org — ищем в info
      var phoneEl = document.querySelector('.phone-number, [class*="phone"]');
      if (phoneEl) return (phoneEl.textContent || '').trim();
      return '';
    },

    extractBio: function () {
      var bioEl = document.querySelector('.tgme_page_description, .peer-bio, [class*="bio"]');
      if (bioEl) return (bioEl.textContent || '').trim();
      return '';
    },

    extractPhotoUrl: function () {
      var img = document.querySelector('.tgme_page_photo_image img, .peer-photo img, .avatar-photo');
      if (img) return img.src || '';
      return '';
    },

    extractProfile: function () {
      var username = TelegramParser.extractUsername();
      var fullName = TelegramParser.extractFullName();
      var parts = fullName.split(/\s+/);
      return {
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        phone: TelegramParser.extractPhone(),
        bio: TelegramParser.extractBio(),
        photo: TelegramParser.extractPhotoUrl(),
        username: username,
        social: [{ type: 'telegram', value: username ? 'https://t.me/' + username : '' }]
      };
    }
  };

  function createHuntflowButton() {
    if (document.querySelector('[' + BUTTON_ATTR + ']')) return;

    var target = document.querySelector('.tgme_page_action, .peer-info, .chat-info');
    if (!target) return;

    var btn = document.createElement('button');
    btn.setAttribute(BUTTON_ATTR, '1');
    btn.textContent = 'Добавить в Huntflow';
    btn.style.cssText = 'display:block;width:100%;max-width:300px;margin:12px auto;padding:10px 16px;border:none;border-radius:8px;background:#0a66c2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:background .2s;';
    btn.addEventListener('mouseenter', function () { btn.style.background = '#004182'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = '#0a66c2'; });

    btn.addEventListener('click', async function () {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Создание...';
      btn.style.opacity = '0.7';

      try {
        if (!HuntflowAPI) {
          HuntflowAPI = g.__HRH__.HuntflowAPI;
        }
        if (!HuntflowAPI) throw new Error('HuntflowAPI not loaded');

        var profile = TelegramParser.extractProfile();
        var candidateData = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          externals: [{ type: 'telegram', value: profile.username ? 'https://t.me/' + profile.username : '' }],
          social: profile.social
        };

        var res = await HuntflowAPI.createCandidate(candidateData);
        var data = await res.json();

        if (res.ok && data && data.success !== false) {
          btn.textContent = '\u2713 Создано';
          btn.style.background = '#198754';
        } else {
          throw { message: (data && data.message) || 'Ошибка создания', status: res.status };
        }
      } catch (err) {
        btn.textContent = '\u2717 Ошибка';
        btn.style.background = '#dc3545';
        if (ErrorHandler) {
          ErrorHandler.handle(err, 'telegram-create-candidate');
        }
      }

      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = 'Добавить в Huntflow';
        btn.style.background = '#0a66c2';
        btn.style.opacity = '1';
      }, 2000);
    });

    target.parentNode.insertBefore(btn, target.nextSibling);
  }

  // Запуск с задержкой для динамического контента
  function init() {
    var isTelegram = /web\.telegram\.org|t\.me/i.test(location.href);
    if (!isTelegram) return;
    setTimeout(createHuntflowButton, 2000);
    // Наблюдатель за изменениями DOM
    var observer = new MutationObserver(function () {
      if (!document.querySelector('[' + BUTTON_ATTR + ']')) {
        createHuntflowButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  g.__HRH__.TelegramParser = TelegramParser;
})();
