/**
 * HR Helper — content script для Facebook (facebook.com)
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

  var BUTTON_ATTR = 'data-hrhelper-facebook-btn';

  var FacebookParser = {
    extractName: function () {
      var h1 = document.querySelector('h1');
      if (h1) return (h1.textContent || '').trim();
      return '';
    },

    extractLocation: function () {
      var items = document.querySelectorAll('[data-pagelet="ProfileTilesFeed_0"] span, [role="main"] span');
      for (var i = 0; i < items.length; i++) {
        var text = (items[i].textContent || '').trim();
        if (/lives in|живёт в|город/i.test(text)) return text;
      }
      return '';
    },

    extractWork: function () {
      var items = document.querySelectorAll('[data-pagelet="ProfileTilesFeed_0"] span, [role="main"] span');
      for (var i = 0; i < items.length; i++) {
        var text = (items[i].textContent || '').trim();
        if (/works at|работает в/i.test(text)) return text;
      }
      return '';
    },

    extractEducation: function () {
      var items = document.querySelectorAll('[data-pagelet="ProfileTilesFeed_0"] span, [role="main"] span');
      for (var i = 0; i < items.length; i++) {
        var text = (items[i].textContent || '').trim();
        if (/studied at|учил|university|университет/i.test(text)) return text;
      }
      return '';
    },

    extractProfile: function () {
      var fullName = FacebookParser.extractName();
      var parts = fullName.split(/\s+/);
      return {
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        location: FacebookParser.extractLocation(),
        work: FacebookParser.extractWork(),
        education: FacebookParser.extractEducation(),
        profileUrl: location.href.split('?')[0],
        social: [{ type: 'facebook', value: location.href.split('?')[0] }]
      };
    }
  };

  function createHuntflowButton() {
    if (document.querySelector('[' + BUTTON_ATTR + ']')) return;

    // Facebook profile — ищем подходящее место для вставки
    var target = document.querySelector('[data-pagelet="ProfileActions"], [role="main"] h1');
    if (!target) return;

    var btn = document.createElement('button');
    btn.setAttribute(BUTTON_ATTR, '1');
    btn.textContent = 'Добавить в Huntflow';
    btn.style.cssText = 'display:block;width:auto;margin:12px 0;padding:10px 16px;border:none;border-radius:8px;background:#0a66c2;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:background .2s;';
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

        var profile = FacebookParser.extractProfile();
        var candidateData = {
          first_name: profile.first_name,
          last_name: profile.last_name,
          externals: [{ type: 'facebook', value: profile.profileUrl }],
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
          ErrorHandler.handle(err, 'facebook-create-candidate');
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

  // Facebook SPA — запуск с задержками для динамического контента
  function init() {
    if (!/facebook\.com/i.test(location.href)) return;

    setTimeout(createHuntflowButton, 2000);
    setTimeout(createHuntflowButton, 5000);

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

  g.__HRH__.FacebookParser = FacebookParser;
})();
