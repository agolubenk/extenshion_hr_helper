Я изучил оба расширения досконально. Вот полный переписанный вариант на **Vanilla JS** — без Vue, без webpack, без зависимостей — с полным сохранением логики и со стилями из `hrhelper-linkedin-huntflow`.

***

## Структура нового расширения

```
huntflow-vanilla/
├── manifest.json
├── popup/
│   └── popup.html
├── css/
│   └── style.css
├── js/
│   ├── popup.js          ← главный файл (заменяет весь Vue-бандл)
│   ├── background.js     ← без изменений (оригинальный)
│   ├── content_scripts.js       ← без изменений
│   ├── content_scripts_main.js  ← без изменений
│   ├── hh.js             ← без изменений
│   └── facebook.js       ← без изменений
├── _locales/
│   ├── ru/messages.json
│   └── en/messages.json
├── fonts/  ← скопировать из оригинала
├── icons/  ← скопировать из оригинала
└── img/    ← скопировать из оригинала
```

***

## `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "short_name": "__MSG_shortName__",
  "description": "__MSG_extensionDescription__",
  "version": "5.12.0",
  "default_locale": "ru",
  "minimum_chrome_version": "116",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs2R5Rc1bQ/Sm9tdRdYektMD+Lh3axHs/qfpkbWIRKgbg/gMeXimABz+tU4On31amN3B117EsLeR4mL3o+SNxSOUABo9ty8DVa0WJlOpSrPuyDvcGlLA01/9lQuEUA+lIC7BRYFyXzogGw4zr6pr5t9wADGvBMUj+r16gnimn232r5xgHqmbSckjm/fS58+edg+G8LdR6VBQuqZmN+LVYspfuBMSX3u6ucCeq7dfa301/cwoOC4qcVBxYWwmrS8yEYu4GLmGhdu2UsoZeoKz0yCjbyF1QeXz7+txYMxEHVFroSZSzwmMourPpkRf0vrf9hFJE2hJk9crjsTIF4j71PwIDAQAB",
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/128.png",
    "default_title": "__MSG_actionTitle__"
  },
  "background": {
    "service_worker": "js/background.js",
    "type": "module"
  },
  "commands": {
    "_execute_action": {
      "description": "__MSG_actionTitle__",
      "suggested_key": {
        "default": "Alt+S",
        "mac": "Alt+S"
      }
    }
  },
  "content_scripts": [
    {
      "js": ["js/content_scripts.js"],
      "matches": ["*://*/*"]
    },
    {
      "js": ["js/content_scripts_main.js"],
      "matches": ["*://*/*"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "host_permissions": [
    "https://huntflow.ru/*",
    "https://*.huntflow.dev/*",
    "https://*.huntflow.ai/*",
    "https://*.huntflow.kz/*",
    "https://*.huntflow.uz/*",
    "https://*.huntflow.ru/*",
    "http://*/*",
    "https://*/*"
  ],
  "icons": {
    "16": "icons/16.png",
    "32": "icons/32.png",
    "64": "icons/64.png",
    "128": "icons/128.png"
  },
  "permissions": [
    "scripting", "activeTab", "storage",
    "downloads", "cookies", "tabs", "debugger"
  ],
  "update_url": "https://clients2.google.com/service/update2/crx",
  "web_accessible_resources": [
    {
      "matches": ["*://*/*"],
      "resources": ["css/*", "img/*", "fonts/*"]
    },
    {
      "matches": ["*://*/*"],
      "resources": ["js/hh.js", "js/facebook.js"]
    }
  ]
}
```

***

## `popup/popup.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title></title>
  <link href="/css/style.css" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  <script src="/js/popup.js"></script>
</body>
</html>
```

***

## `css/style.css`

```css
/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               Raleway, Arial, Tahoma, Verdana, sans-serif;
  font-size: 14px;
  margin: 0;
  padding: 0;
  background: #fff;
  color: #333;
  min-width: 200px;
}

body.is-mobile { width: 100% !important; }

/* ===== LAYOUT ===== */
.hf-layout {
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  font-size: 16px;
  text-align: left;
  width: 760px;
  margin: 0 auto;
  display: flex;
  flex-grow: 1;
  flex-shrink: 0;
  background: #fff;
  position: relative;
  min-height: 200px;
}
@media (max-width: 500px) {
  .hf-layout { width: 100%; }
}

/* ===== HEADER ===== */
.hf-header {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
  width: 200px;
  padding: 150px 20px 30px;
  text-align: center;
  color: #fff;
  font-size: 14px;
  line-height: 18px;
}
.hf-header h2 { font-size: 21px; line-height: 25px; margin: 0; }
.hf-header p  { margin: 0; }
.hf-header--green  { background: linear-gradient(180deg, #7ac016, #6bb600); }
.hf-header--orange { background: #ec7e00; }
.hf-header--green  .hf-header__icon-stroke { stroke: #a8d940; }
.hf-header--orange .hf-header__icon-stroke { stroke: #ff9f32; }

.hf-header__icon {
  position: absolute;
  left: 50%;
  top: 50px;
  transform: translateX(-50%);
}

@media (max-width: 500px) {
  .hf-header { width: 100%; padding: 130px 20px 30px; }
  .hf-header h2 { margin: 0 0 10px; }
  .hf-header__icon { top: 30px; }
}

/* ===== FOOTER ===== */
.hf-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0;
  margin-top: 15px;
}

/* ===== FORM LAYOUT ===== */
.hf-form-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.hf-form {
  flex: 1;
  padding: 20px 20px 0 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hf-form h3 {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #929097;
  margin: 0 0 6px 0;
}

/* ===== BUTTONS ===== */
.hf-btn {
  box-sizing: border-box;
  margin: 0;
  border-radius: 3px;
  vertical-align: top;
  outline: 0 none;
  display: inline-block;
  padding: 8px 15px 7px 15px;
  position: relative;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 11px;
  line-height: 13px;
  font-weight: 700;
  color: #fff;
  border: none;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  transition: opacity 0.15s;
}
.hf-btn:hover { opacity: 0.85; }
.hf-btn--black { background: #000; border: 1px solid #000; }
.hf-btn--white { background: #fff; color: #000; border: 1px solid #ccc; }
.hf-btn--white:hover { background: #f5f5f5; }

/* link-button */
a.hf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* close button */
.hf-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.7);
  padding: 4px;
  line-height: 0;
  z-index: 10;
  transition: color 0.15s;
}
.hf-close-btn:hover { color: #fff; }
.hf-close-btn svg { display: block; }

/* ===== INPUT & TEXTAREA ===== */
.hf-input {
  font-size: 16px;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  font-weight: normal;
  width: 100%;
  padding: 4px 25px 5px 15px;
  box-sizing: border-box;
  margin: 0;
  border-radius: 3px;
  vertical-align: top;
  outline: 0 none;
  display: inline-block;
  line-height: 19px;
  background-color: #f2f2f2;
  background-image: none;
  border: 1px solid #e3e3e3;
}
.hf-input:focus { border-color: #2cc8df; }

.hf-textarea {
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  font-size: 16px;
  display: inline-block;
  width: 100%;
  max-width: 100%;
  min-height: 68px;
  max-height: 296px;
  padding: 4px 15px 5px 15px;
  box-sizing: border-box;
  margin: 0;
  border-radius: 3px;
  border: 1px solid #e3e3e3;
  vertical-align: top;
  outline: 0 none;
  line-height: 19px;
  background: #f2f2f2;
  resize: none;
}
.hf-textarea:focus { border-color: #2cc8df; }
.hf-textarea:disabled { color: #ccc; cursor: default; }

/* ===== AUTOCOMPLETE / DROPDOWN ===== */
.hf-autocomplete {
  position: relative;
  width: 100%;
}

.hf-autocomplete__placeholder {
  width: 100%;
  box-shadow: none;
  box-sizing: border-box;
  height: 30px;
  position: relative;
  cursor: default;
  user-select: none;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f2f2f2;
  padding: 4px 25px 5px 15px;
  margin: 0;
  border-radius: 3px;
  vertical-align: top;
  outline: 0 none;
  display: inline-block;
  line-height: 19px;
  border: 1px solid #e3e3e3;
  font-size: 16px;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  color: #333;
}
.hf-autocomplete__placeholder::after {
  content: "";
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAKCAYAAAC0VX7mAAAAAXNSR0IArs4c6QAAAGtJREFUKBVjtDCxa2BgYKxnoAr438j85NnDAzJS8oxAQx0oM/N/44kzhxqYQYZQbijEMJBZYAMpMxRhGIqB5BmKahi2gaQZimkYVgOJMxS7YTgNxG8obsPwGojdUPyGgfQQBUCJH5IBCCsHAIH3SFgZMLOVAAAAAElFTkSuQmCC");
  background-repeat: no-repeat;
  background-size: 10px 5px;
  width: 10px;
  height: 5px;
  position: absolute;
  top: 12px;
  right: 8px;
}

.hf-dropdown {
  position: absolute;
  width: 550px;
  height: auto;
  z-index: 1000;
  background-color: #fff;
  max-height: 342px;
  top: 0;
  left: 0;
  border-radius: 3px;
  box-shadow: 0 0 25px 0 rgba(0,0,0,.15);
  overflow: hidden;
  will-change: transform;
  display: none;
}
.hf-dropdown--big   { width: 550px; transform: translate3d(170px, 102px, 0); }
.hf-dropdown--small { width: 400px; transform: translate3d(240px, 142px, 0); }
.hf-dropdown--tags  { width: 300px; max-height: 276px; transform: translate3d(240px, 169px, 0); }
.hf-dropdown.is-open { display: block; }

/* ===== LIST ITEMS ===== */
.hf-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.hf-list-item {
  height: 60px;
  text-align: left;
  list-style: none;
  position: relative;
  padding-left: 34px;
  outline: none;
  display: flex;
  align-items: center;
  padding-right: 20px;
  margin: 0;
  text-decoration: none;
  font-size: 16px;
  letter-spacing: 0;
  cursor: default;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
  border-bottom: 1px solid #ebebeb;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
}
.hf-list-item:hover { background-color: #f6f6f6; }
.hf-list-item.is-disabled { color: #ccc; }
.hf-list-item.is-small { height: 42px; }

.hf-list-item__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.hf-list-item__subtitle {
  margin-top: -2px;
  line-height: 18px;
  font-size: 14px;
  display: block;
  color: #929097;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* list header row */
.hf-list-header {
  text-align: left;
  list-style: none;
  position: relative;
  padding-left: 34px;
  outline: none;
  height: 39px;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  font-weight: 700;
  font-size: 11px;
  line-height: 18px;
  color: #929097;
  padding-top: 15px;
  padding-bottom: 6px;
  text-transform: uppercase;
  border-bottom: none;
  box-sizing: border-box;
  border-top: 1px solid #ebebeb;
  display: block;
}

/* search input inside dropdown */
.hf-dropdown__search-wrap {
  padding: 10px;
  border-bottom: 1px solid #ebebeb;
}
.hf-dropdown__search {
  width: 100%;
  font-size: 16px;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
  padding: 4px 15px 5px 15px;
  border-radius: 3px;
  border: 1px solid #e3e3e3;
  background: #f2f2f2;
  outline: none;
  box-sizing: border-box;
}
.hf-dropdown__search:focus { border-color: #2cc8df; }

/* no results */
.hf-dropdown__empty {
  margin: 0;
  font-size: 16px;
  line-height: 42px;
  padding-left: 34px;
  color: #929097;
}

/* ===== TAGS ===== */
.hf-tags-bar {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  padding: 8px 0 4px;
}

.hf-tag-btn {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  font-size: 11px;
  line-height: 13px;
  text-transform: uppercase;
  box-sizing: border-box;
  display: inline-block;
  margin: 0;
  padding: 4px 7px 3px 7px;
  cursor: pointer;
  outline: 0 none;
  user-select: none;
  border: 0 none;
  background-color: #eee;
  border-radius: 3px;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
}
.hf-tag-btn.is-selected { background-color: #2cc8df; color: #fff; }
.hf-tag-btn:hover { background-color: #ddd; }
.hf-tag-btn.is-selected:hover { background-color: #25b5ca; }

.hf-tags-list {
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 42px;
  max-height: 200px;
  overflow: auto;
}

.hf-tag-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid #ebebeb;
  height: 42px;
  position: relative;
}
.hf-tag-item:hover { background-color: #f6f6f6; }

.hf-tag-item__label {
  list-style: none;
  position: relative;
  padding-left: 35px;
  outline: none;
  display: block;
  padding-right: 20px;
  margin: 0;
  text-decoration: none;
  line-height: 42px;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
}

.hf-tag-item__check {
  position: absolute;
  left: 13px;
  top: 13px;
  width: 15px;
  height: 15px;
  display: none;
  background-image: url(../img/checked-item-mark.svg);
  background-repeat: no-repeat;
}
.hf-tag-item.is-selected .hf-tag-item__check { display: block; }

.hf-tag-item__dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
}

/* tags reset button */
.hf-tags-reset {
  width: 100%;
  margin: 0;
  border: none;
  box-shadow: none;
  background: none;
  height: 15px;
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 11px;
  line-height: 13px;
  letter-spacing: .3px;
  text-transform: uppercase;
  color: #666;
  cursor: pointer;
  padding: 4px 15px 11px 15px;
  border-bottom: 1px solid #ebebeb;
  font-family: Raleway, Arial, Tahoma, Verdana, sans-serif;
}
.hf-tags-reset:hover { color: #333; }

/* ===== SAVE STATE (generic state screen) ===== */
.hf-state {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 200px;
}

.hf-state__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 10px;
  text-align: center;
}

.hf-state__icon {
  margin-bottom: 10px;
}

.hf-state__title {
  font-size: 21px;
  line-height: 25px;
  font-weight: 700;
  margin: 0;
  color: #333;
  text-align: center;
}

.hf-state__message {
  font-size: 14px;
  line-height: 20px;
  color: #666;
  text-align: center;
  padding: 0 20px 10px;
  margin: 0;
}
.hf-state__message a { color: #2cc8df; }

.hf-state__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px 20px 20px;
  justify-content: center;
}

.hf-state__company {
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: #929097;
  margin: 8px 0 0;
}

/* ===== LOADING DOTS ===== */
.hf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 6px;
}

.hf-loading__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2cc8df;
  animation: hf-bounce 1.2s infinite ease-in-out both;
}
.hf-loading__dot:nth-child(1) { animation-delay: -0.32s; }
.hf-loading__dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes hf-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* ===== FORM SECTION DIVIDER ===== */
.hf-form__delimeter { height: 5px; }

/* ===== FORM RIGHT PANEL ===== */
.hf-form-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== APP ROOT ===== */
#app {
  position: relative;
}

.hf-root {
  position: relative;
  width: 760px;
  min-height: 200px;
  display: flex;
  background: #fff;
  overflow: hidden;
}

@media (max-width: 500px) {
  .hf-root { width: 100%; flex-direction: column; }
}

/* close btn in corner */
.hf-root__close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.8);
  padding: 4px;
  line-height: 0;
  z-index: 20;
  transition: color 0.15s;
}
.hf-root__close:hover { color: #fff; }
.hf-root__close svg { display: block; }

/* hidden click counter button */
.hf-hidden-btn {
  position: absolute;
  bottom: 0; left: 0;
  width: 20px; height: 20px;
  opacity: 0;
  cursor: default;
  border: none;
  background: transparent;
}
```

***

## `js/popup.js`

```javascript
/**
 * Huntflow 5.12 — Vanilla JS переписанный popup
 * Полная замена Vue-бандла. Логика 1-в-1 с оригиналом.
 */

// ─── Константы состояний ────────────────────────────────────────────────────
const STATES = {
  LOADING:        'loading',
  VACANCY:        'vacancy',
  NEED_LOGIN:     'need_login',
  NEED_SOCIAL:    'need_social',
  UNKNOWN:        'unknown',
  ACTIVATE:       'activate',
  LIMIT:          'limit',
  WELCOME:        'welcome',
};

const ACTIONS = {
  OPEN:              'open',
  FETCH:             'fetch',
  PING:              'PING',
  PONG:              'PONG',
  SAVE_INITIAL_VALUES: 'SAVE_INITIAL_VALUES',
  VACANCY_SAVED:     'VACANCY_SAVED',
  GET_BASE_URL:      'GET_BASE_URL',
  SET_BASE_URL:      'SET_BASE_URL',
  GET_INITIAL_VALUES:'GET_INITIAL_VALUES',
  SET_ICON:          'SET_ICON',
  GET_LANG:          'GET_LANG',
  SAVE_APPLICANT:    'SAVE_APPLICANT',
  GET_ORG_ID:        'GET_ORG_ID',
  PREPROCESS_HH_LETTER: 'PREPROCESS_CUSTOM_DATA',
};

// ─── i18n ─────────────────────────────────────────────────────────────────────
const MESSAGES = {
  ru: {
    'actionTitle':               'Сохранить кандидата',
    'vacancy_apply':             'Взять на вакансию',
    'button.view':               'Смотреть',
    'button.check':              'Проверить',
    'button.copy_link':          'Копировать ссылку',
    'button.copied':             'Скопировано',
    'button.signin':             'Войти',
    'button.save_without_adding':'Сохранить без добавления',
    'button.close':              'Закрыть',
    'button.connect':            'Подключить',
    'button.reconnect':          'Переподключить',
    'comment':                   'Комментарий по вакансии о кандидате',
    'huntflow':                  'Хантфлоу',
    'title.applicant_saved':     'Кандидат сохранен',
    'title.duplicated_applicant':'Похожий кандидат уже есть в\u00a0базе',
    'title.not_saved':           'Не сохранено',
    'title.signin':              'Войдите в Хантфлоу',
    'title.something_went_wrong':'Что-то пошло не так',
    'title.add':                 'Добавить метку',
    'vacancy.list.my':           'Мои вакансии',
    'vacancy.list.other':        'Вакансии коллег',
    'vacancy.alreadyAdded':      'Уже на вакансии',
    'autocomplete.not_found':    'Ничего не найдено',
    'autocomplete.reset':        'Сбросить выбор',
    'autocomplete.multivacancy': 'Мультивакансия',
    'enter.search.keyword':      'Введите запрос',
    'find_and_save_from_sites':  'Сохраняйте кандидатов с 20+ работных сайтов.',
    'find_and_save_from_sites.bad-save': 'Этот сайт не поддерживается Хантфлоу.',
    'find_and_save_from_sites.bad-save-resume': 'Недостаточно информации о кандидате.<br>Добавьте кандидата вручную.',
    'failed_to_save':            'Сохранить кандидата не удалось, обновите страницу и попробуйте ещё раз.',
    'failed_to_save.open_contacts': 'Открыть контакты',
    'signin':                    'Войдите в ваш аккаунт Хантфлоу, чтобы сохранять кандидатов.',
    'only.for.nested.vacancy':   'Только для вложенных вакансий',
    'only.from.huntflow.interface': 'Только из интерфейса Хантфлоу',
    'need-permissions.title':    'Разрешите доступ',
    'need-permissions.descr':    'Для работы расширения необходим доступ к вашему домену Хантфлоу.',
    'need-permissions.button':   'Разрешить',
    'limits-reached.title':      'Лимит исчерпан',
    'limits-reached.descr':      'Вы достигли лимита сохранений.',
    'limits-reached.button':     'Закрыть',
    'welcome.title.button_works':'Кнопка работает волшебно',
    'welcome.title.save_error':  'Не сохранено',
    'welcome.title.save_error_resume': 'Не удалось сохранить кандидата',
    'title.connect_social_account': 'Для сохранения кандидатов подключите ваш аккаунт {name} в настройках Хантфлоу',
  },
  en: {
    'actionTitle':               'Save applicant',
    'vacancy_apply':             'Add to vacancy',
    'button.view':               'View',
    'button.check':              'Check',
    'button.copy_link':          'Copy link',
    'button.copied':             'Copied',
    'button.signin':             'Sign in',
    'button.save_without_adding':'Save without adding',
    'button.close':              'Close',
    'button.connect':            'Connect',
    'button.reconnect':          'Reconnect',
    'comment':                   'Comment',
    'huntflow':                  'Huntflow',
    'title.applicant_saved':     'Applicant saved',
    'title.duplicated_applicant':'Similar applicant is found in\u00a0your Huntflow',
    'title.not_saved':           'Not saved',
    'title.signin':              'Sign in Huntflow',
    'title.something_went_wrong':'Something went wrong',
    'title.add':                 'Add tag',
    'vacancy.list.my':           'My Vacancies',
    'vacancy.list.other':        'Other Vacancies',
    'vacancy.alreadyAdded':      'Already added',
    'autocomplete.not_found':    'Nothing found',
    'autocomplete.reset':        'Reset select',
    'autocomplete.multivacancy': 'Multivacancy',
    'enter.search.keyword':      'Enter keyword',
    'find_and_save_from_sites':  'Save candidates from 20+ job sites.',
    'find_and_save_from_sites.bad-save': 'Saving from this site is not supported.',
    'find_and_save_from_sites.bad-save-resume': 'Not enough information about the applicant.<br>Add applicant manually.',
    'failed_to_save':            'Failed to save CV. Please, reload the page and try one more time.',
    'failed_to_save.open_contacts': 'Open contacts',
    'signin':                    'Sign in to your Huntflow account to save candidates.',
    'only.for.nested.vacancy':   'Only for nested vacancy',
    'only.from.huntflow.interface': 'Only from Huntflow interface',
    'need-permissions.title':    'Allow access',
    'need-permissions.descr':    'The extension needs access to your Huntflow domain.',
    'need-permissions.button':   'Allow',
    'limits-reached.title':      'Limit reached',
    'limits-reached.descr':      'You have reached the save limit.',
    'limits-reached.button':     'Close',
    'welcome.title.button_works':'This plugin works fine',
    'welcome.title.save_error':  'Not saved',
    'welcome.title.save_error_resume': 'Failed to save an applicant',
    'title.connect_social_account': 'To save candidates, connect your {name} account in the Huntflow settings',
  },
};

// ─── Утилиты ──────────────────────────────────────────────────────────────────
let _lang = 'ru';

function t(key, vars = {}) {
  const dict = MESSAGES[_lang] || MESSAGES['ru'];
  let msg = dict[key] || MESSAGES['ru'][key] || key;
  Object.entries(vars).forEach(([k, v]) => {
    msg = msg.replace(`{${k}}`, v);
  });
  return msg;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function svgClose() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="19" height="18"
    viewBox="0 0 19 18" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M17.0488 0.586609L18.4134 2.04872L10.9657 8.99997L18.4135 15.9512L17.0488
         17.4134L9.50006 10.3679L1.95131 17.4134L0.58667 15.9512L8.03447 8.99997L0.586704
         2.04872L1.95134 0.586609L9.50006 7.63208L17.0488 0.586609Z" fill="currentColor"/>
  </svg>`;
}

function svgHuntflow() {
  return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none"
    xmlns="http://www.w3.org/2000/svg" role="presentation">
    <rect class="hf-header__icon-stroke" x="1.5" y="1.5" width="77" height="77"
      rx="38.5" stroke="#A8D940" stroke-width="3"/>
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M40 12C24.536 12 12 24.536 12 40C12 55.464 24.536 68 40 68
         C55.464 68 68 55.464 68 40C68 24.536 55.464 12 40 12ZM36 28V36H28V28H36Z
         M28 44H36V52H28V44ZM44 28H52V36H44V28ZM52 44V52H44V44H52Z" fill="#fff"/>
  </svg>`;
}

// ─── API helpers (проксируют через background.js) ─────────────────────────────
function sendMsg(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(response);
    });
  });
}

async function getBaseUrl() {
  const res = await sendMsg({ action: ACTIONS.GET_BASE_URL });
  return res && res.data ? res.data : '';
}

async function getLang() {
  try {
    const res = await sendMsg({ action: ACTIONS.GET_LANG });
    return res && res.data ? res.data : null;
  } catch { return null; }
}

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

async function saveApplicant(url, tabId, noCache, extraHeaders) {
  return sendMsg({
    action: ACTIONS.SAVE_APPLICANT,
    data: { url, tabId, noCache, extraHeaders }
  });
}

async function searchVacancies(context, params) {
  return sendMsg({ action: 'searchVacancies', data: { context, params } });
}

async function getAccountTags(context) {
  return sendMsg({ action: 'getAccountTags', data: { context } });
}

async function getRejections(context) {
  return sendMsg({ action: 'getRejections', data: { context } });
}

async function getApplicantTags(context, id) {
  return sendMsg({ action: 'getApplicantTags', data: { context, id } });
}

async function getInitialValues() {
  return sendMsg({ action: ACTIONS.GET_INITIAL_VALUES });
}

async function saveVacancy(data) {
  return sendMsg({ action: 'saveVacancy', data });
}

async function saveTags(data) {
  return sendMsg({ action: 'saveTags', data });
}

async function getOrganizationId(tabId) {
  return sendMsg({ action: ACTIONS.GET_ORG_ID, data: { tabId } });
}

function isHHDomain(url) {
  return url && (url.includes('hh.ru') || url.includes('rabota.by'));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const localStore = {
  get(key)       { return new Promise(r => chrome.storage.local.get(key, r)); },
  set(obj)       { return new Promise(r => chrome.storage.local.set(obj, r)); },
  remove(key)    { return new Promise(r => chrome.storage.local.remove(key, r)); },
};

// ─── Состояние приложения ────────────────────────────────────────────────────
const App = {
  baseUrl:         '',
  companyName:     '',
  data:            { state: '' },
  initialState:    {},
  isLoading:       false,
  noCache:         false,
  clickCount:      0,
  clickTimeout:    null,
  // form state
  form: {
    comment:   '',
    status:    null,
    vacancy:   null,
    rejection: null,
    tags:      [],
  },
  // cached dropdown data
  vacancies:  [],
  statuses:   [],
  rejections: [],
  tags:       [],
};

// ─── Render Root ─────────────────────────────────────────────────────────────
function renderApp() {
  const root = document.getElementById('app');
  root.innerHTML = '';

  const wrap = el('div', 'hf-root');
  root.appendChild(wrap);

  // Close button (positioned absolute top-right in header area)
  const closeBtn = el('button', 'hf-root__close');
  closeBtn.type = 'button';
  closeBtn.innerHTML = svgClose();
  closeBtn.addEventListener('click', handleClose);
  wrap.appendChild(closeBtn);

  // Hidden debug button
  const hiddenBtn = el('button', 'hf-hidden-btn');
  hiddenBtn.addEventListener('click', onHiddenButtonClick);
  wrap.appendChild(hiddenBtn);

  // State machine
  const state = App.data.state;

  if (App.isLoading || !state || state === STATES.LOADING) {
    wrap.appendChild(renderLoading());
    return;
  }

  switch (state) {
    case STATES.ACTIVATE:
      wrap.appendChild(renderNeedPermissions());
      break;
    case STATES.VACANCY:
      wrap.appendChild(renderSaveForm());
      break;
    case STATES.UNKNOWN:
      wrap.appendChild(renderUnknown());
      break;
    case STATES.NEED_SOCIAL:
      wrap.appendChild(renderNeedSocial());
      break;
    case STATES.NEED_LOGIN:
      wrap.appendChild(renderNeedLogin());
      break;
    case STATES.LIMIT:
      wrap.appendChild(renderLimitsReached());
      break;
    default:
      wrap.appendChild(renderWelcome());
  }
}

// ─── Loading ─────────────────────────────────────────────────────────────────
function renderLoading() {
  const layout = el('div', 'hf-layout');
  const loader = el('div', 'hf-loading');
  loader.setAttribute('data-qa', 'loader');
  for (let i = 0; i < 3; i++) {
    loader.appendChild(el('div', 'hf-loading__dot'));
  }
  layout.appendChild(loader);
  return layout;
}

// ─── SaveState template (обёртка для всех экранов-состояний) ─────────────────
function renderSaveState({ title, icon, message, footer, company }) {
  const layout = el('div', 'hf-layout');
  const state  = el('div', 'hf-state');

  // header
  const header = el('header', 'hf-state__header');
  if (icon) {
    const iconWrap = el('div', 'hf-state__icon');
    iconWrap.innerHTML = icon;
    header.appendChild(iconWrap);
  }
  const h2 = el('h2', 'hf-state__title');
  h2.setAttribute('data-qa', 'state_title');
  h2.innerHTML = title || '';
  header.appendChild(h2);
  state.appendChild(header);

  // message
  const msg = el('p', 'hf-state__message');
  msg.setAttribute('data-qa', 'state_message');
  msg.innerHTML = message || '';
  state.appendChild(msg);

  // footer
  const foot = el('footer', 'hf-state__footer');
  if (footer) footer(foot);
  if (company) {
    const comp = el('p', 'hf-state__company');
    comp.setAttribute('data-qa', 'state_company');
    comp.textContent = company;
    foot.appendChild(comp);
  }
  state.appendChild(foot);

  layout.appendChild(state);
  return layout;
}

// ─── Header (зелёный/оранжевый блок слева) ───────────────────────────────────
function renderHeader({ title, color = 'green' }) {
  const header = el('header', `hf-header hf-header--${color}`);

  const iconWrap = el('div', 'hf-header__icon');
  iconWrap.innerHTML = svgHuntflow();
  header.appendChild(iconWrap);

  const h2 = el('h2');
  h2.setAttribute('data-qa', 'title');
  h2.innerHTML = title || '';
  header.appendChild(h2);

  if (App.companyName) {
    const p = el('p');
    p.textContent = App.companyName;
    header.appendChild(p);
  }

  return header;
}

// ─── SAVE FORM (главная форма) ────────────────────────────────────────────────
function renderSaveForm() {
  const data = App.data.data || {};
  const isNew   = !!data.new;
  const color   = isNew ? 'green' : 'orange';
  const title   = isNew
    ? t('title.applicant_saved')
    : t('title.duplicated_applicant');

  const layout = el('div', 'hf-layout');

  // Левая колонка — header
  layout.appendChild(renderHeader({ title, color }));

  // Правая колонка — форма
  const right = el('div', 'hf-form-right');

  const form = el('form', 'hf-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
  });

  // Заголовок формы
  const formTitle = el('h3');
  formTitle.textContent = t('vacancy_apply');
  form.appendChild(formTitle);

  // Vacancy autocomplete
  if (data.context) {
    const vacancyWrap = el('div');
    vacancyWrap.setAttribute('data-qa', 'vacancy');
    vacancyWrap.appendChild(
      renderAutocomplete({
        id:          'vacancy',
        value:       App.form.vacancy,
        placeholder: App.form.vacancy ? App.form.vacancy.position : '',
        size:        'big',
        onOpen:      openVacancyDropdown,
      })
    );
    form.appendChild(vacancyWrap);
  }

  // Status autocomplete
  const statusWrap = el('div');
  statusWrap.setAttribute('data-qa', 'status');
  statusWrap.appendChild(
    renderAutocomplete({
      id:          'status',
      value:       App.form.status,
      placeholder: App.form.status ? App.form.status.name : '',
      size:        'small',
      onOpen:      openStatusDropdown,
    })
  );
  form.appendChild(statusWrap);

  // Rejections (только если статус — trash)
  if (isTrashStatus()) {
    const rejWrap = el('div');
    rejWrap.setAttribute('data-qa', 'rejections');
    rejWrap.id = 'rejections-wrap';
    rejWrap.appendChild(
      renderAutocomplete({
        id:          'rejections',
        value:       App.form.rejection,
        placeholder: App.form.rejection ? App.form.rejection.name : '',
        size:        'small',
        onOpen:      openRejectionsDropdown,
      })
    );
    form.appendChild(rejWrap);
  }

  // Comment textarea
  const commentWrap = el('div');
  commentWrap.setAttribute('data-qa', 'comment');
  const textarea = el('textarea', 'hf-textarea');
  textarea.id    = 'comment';
  textarea.rows  = 9;
  textarea.placeholder = t('comment');
  textarea.value = App.form.comment;
  textarea.autofocus = true;
  textarea.addEventListener('input', () => {
    App.form.comment = textarea.value;
    persistForm();
  });
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
  });
  commentWrap.appendChild(textarea);
  form.appendChild(commentWrap);

  // Tags
  const tagsWrap = el('div');
  tagsWrap.setAttribute('data-qa', 'tags');
  tagsWrap.appendChild(renderTagsComponent());
  form.appendChild(tagsWrap);

  // Footer buttons
  const footer = el('div', 'hf-footer');

  const btnSubmit = el('button', 'hf-btn hf-btn--black');
  btnSubmit.type = 'submit';
  btnSubmit.setAttribute('data-qa', 'hire_for_vacancy');
  btnSubmit.textContent = t('vacancy_apply');
  footer.appendChild(btnSubmit);

  footer.appendChild(el('div', 'hf-form__delimeter'));

  const vacancyLink = getVacancyLink();
  if (vacancyLink) {
    const linkBtn = el('a', 'hf-btn hf-btn--black');
    linkBtn.href   = vacancyLink;
    linkBtn.target = '_blank';
    linkBtn.setAttribute('data-qa', 'show_applicant');
    linkBtn.textContent = data.double ? t('button.check') : t('button.view');
    linkBtn.addEventListener('click', handleClose);
    footer.appendChild(linkBtn);

    const copyLinkBtn = el('button', 'hf-btn hf-btn--black');
    copyLinkBtn.type = 'button';
    copyLinkBtn.setAttribute('data-qa', 'copy_applicant_link');
    copyLinkBtn.title = t('button.copy_link');
    copyLinkBtn.innerHTML = '📋';
    copyLinkBtn.addEventListener('click', () => {
      function highlight() {
        copyLinkBtn.style.backgroundColor = '#28a745';
        copyLinkBtn.style.color = '#fff';
        setTimeout(() => {
          copyLinkBtn.style.backgroundColor = '';
          copyLinkBtn.style.color = '';
        }, 500);
      }
      navigator.clipboard.writeText(vacancyLink).then(highlight).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = vacancyLink;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          highlight();
        } catch (e) {}
        ta.remove();
      });
    });
    footer.appendChild(copyLinkBtn);
  }

  const btnClose = el('button', 'hf-btn hf-btn--white');
  btnClose.type = 'button';
  btnClose.setAttribute('data-qa', 'save_without_hire');
  btnClose.textContent = t('button.save_without_adding');
  btnClose.addEventListener('click', handleClose);
  footer.appendChild(btnClose);

  form.appendChild(footer);
  right.appendChild(form);
  layout.appendChild(right);

  return layout;
}

// ─── Autocomplete component ───────────────────────────────────────────────────
function renderAutocomplete({ id, value, placeholder, size, onOpen }) {
  const wrap = el('div', 'hf-autocomplete');
  wrap.id = `ac-${id}`;

  const ph = el('div', 'hf-autocomplete__placeholder');
  ph.setAttribute('data-qa', `${id}-placeholder`);
  ph.textContent = placeholder || value || '';
  ph.addEventListener('click', () => onOpen(wrap));
  wrap.appendChild(ph);

  const dropdown = el('div', `hf-dropdown hf-dropdown--${size}`);
  dropdown.id = `dropdown-${id}`;
  wrap.appendChild(dropdown);

  return wrap;
}

// ─── Открытие dropdown вакансий ───────────────────────────────────────────────
function openVacancyDropdown(wrapEl) {
  const dd = wrapEl.querySelector('.hf-dropdown');
  closeAllDropdowns();
  dd.classList.add('is-open');
  dd.innerHTML = '';

  const searchWrap = el('div', 'hf-dropdown__search-wrap');
  const searchInput = el('input', 'hf-dropdown__search');
  searchInput.placeholder = t('enter.search.keyword');
  searchInput.type = 'text';
  searchWrap.appendChild(searchInput);
  dd.appendChild(searchWrap);

  const list = el('ul', 'hf-list');
  dd.appendChild(list);

  function renderVacancyList(items) {
    list.innerHTML = '';
    if (!items.length) {
      const empty = el('p', 'hf-dropdown__empty', t('autocomplete.not_found'));
      list.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      if (item.type === 'header') {
        const hdr = el('li', 'hf-list-header', item.position);
        list.appendChild(hdr);
        return;
      }
      const li = el('li', 'hf-list-item');
      li.setAttribute('data-qa', 'vacancy-item');

      const main = el('span', 'hf-list-item__text');
      main.textContent = item.position || item.name || '';

      if (item.department) {
        const sub = el('span', 'hf-list-item__subtitle');
        sub.textContent = item.department;
        const textWrap = el('div');
        textWrap.style.flex = '1';
        textWrap.style.overflow = 'hidden';
        textWrap.appendChild(main);
        textWrap.appendChild(sub);
        li.appendChild(textWrap);
      } else {
        li.appendChild(main);
      }

      li.addEventListener('click', () => {
        handleVacancyChange(item);
        dd.classList.remove('is-open');
        const ph = wrapEl.querySelector('.hf-autocomplete__placeholder');
        if (ph) ph.textContent = item.position || item.name || '';
      });
      list.appendChild(li);
    });
  }

  // Load vacancies
  loadVacancies('').then(items => {
    renderVacancyList(items);
  });

  searchInput.addEventListener('input', debounce(() => {
    loadVacancies(searchInput.value).then(renderVacancyList);
  }, 300));

  searchInput.focus();
  document.addEventListener('click', onOutsideClick);

  function onOutsideClick(e) {
    if (!wrapEl.contains(e.target)) {
      dd.classList.remove('is-open');
      document.removeEventListener('click', onOutsideClick);
    }
  }
}

// ─── Открытие dropdown статусов ───────────────────────────────────────────────
function openStatusDropdown(wrapEl) {
  const dd = wrapEl.querySelector('.hf-dropdown');
  closeAllDropdowns();
  dd.classList.add('is-open');
  dd.innerHTML = '';

  const data  = App.data.data || {};
  const items = (data.vacancy_statuses || []).filter(s => !s.virtual);

  const list = el('ul', 'hf-list');

  // Reset option
  const resetLi = el('li', 'hf-list-item is-small');
  resetLi.textContent = t('autocomplete.reset');
  resetLi.addEventListener('click', () => {
    App.form.status = items[0] || null;
    updatePlaceholder(wrapEl, App.form.status ? App.form.status.name : '');
    dd.classList.remove('is-open');
    persistForm();
    reRenderFormIfNeeded();
  });
  list.appendChild(resetLi);

  items.forEach(item => {
    const li = el('li', 'hf-list-item is-small');
    li.textContent = item.name || '';
    if (App.form.status && App.form.status.id === item.id) li.style.fontWeight = '700';
    li.addEventListener('click', () => {
      App.form.status = item;
      updatePlaceholder(wrapEl, item.name);
      dd.classList.remove('is-open');
      persistForm();
      reRenderFormIfNeeded();
    });
    list.appendChild(li);
  });

  dd.appendChild(list);

  document.addEventListener('click', onOutsideClick);
  function onOutsideClick(e) {
    if (!wrapEl.contains(e.target)) {
      dd.classList.remove('is-open');
      document.removeEventListener('click', onOutsideClick);
    }
  }
}

// ─── Dropdown отказов ─────────────────────────────────────────────────────────
function openRejectionsDropdown(wrapEl) {
  const dd = wrapEl.querySelector('.hf-dropdown');
  closeAllDropdowns();
  dd.classList.add('is-open');
  dd.innerHTML = '';

  const items = App.rejections || [];
  const list  = el('ul', 'hf-list');

  items.forEach(item => {
    const li = el('li', 'hf-list-item is-small');
    li.textContent = item.name || '';
    li.addEventListener('click', () => {
      App.form.rejection = item;
      updatePlaceholder(wrapEl, item.name);
      dd.classList.remove('is-open');
      persistForm();
    });
    list.appendChild(li);
  });

  if (!items.length) {
    list.appendChild(el('p', 'hf-dropdown__empty', t('autocomplete.not_found')));
  }

  dd.appendChild(list);

  document.addEventListener('click', onOutsideClick);
  function onOutsideClick(e) {
    if (!wrapEl.contains(e.target)) {
      dd.classList.remove('is-open');
      document.removeEventListener('click', onOutsideClick);
    }
  }
}

// ─── Tags component ───────────────────────────────────────────────────────────
function renderTagsComponent() {
  const data  = App.data.data || {};
  const items = data.tags || [];

  const wrap = el('div');
  wrap.id = 'tags-component';

  // Selected tags bar
  const bar = el('div', 'hf-tags-bar');
  bar.id = 'tags-bar';

  function updateBar() {
    bar.innerHTML = '';
    const selectedTags = items.filter(tag => App.form.tags.includes(tag.id));
    selectedTags.forEach(tag => {
      const btn = el('span', 'hf-tag-btn is-selected');
      btn.textContent  = tag.name || '';
      btn.style.backgroundColor = tag.color || '#eee';
      btn.title = 'Снять метку';
      btn.addEventListener('click', () => {
        App.form.tags = App.form.tags.filter(id => id !== tag.id);
        updateBar();
        submitTags(App.form.tags);
        persistForm();
      });
      bar.appendChild(btn);
    });
    if (!selectedTags.length) {
      const hint = el('span');
      hint.style.fontSize   = '12px';
      hint.style.color      = '#929097';
      hint.style.lineHeight = '22px';
      hint.textContent = t('title.add') + '...';
      bar.appendChild(hint);
    }
  }

  // Tags dropdown trigger
  const trigger = el('div', 'hf-autocomplete');
  trigger.style.marginTop = '4px';

  const ph = el('div', 'hf-autocomplete__placeholder');
  ph.textContent = t('title.add');
  trigger.appendChild(ph);

  const dd = el('div', 'hf-dropdown hf-dropdown--tags');
  trigger.appendChild(dd);

  ph.addEventListener('click', () => {
    if (dd.classList.contains('is-open')) {
      dd.classList.remove('is-open');
      return;
    }
    closeAllDropdowns();
    dd.classList.add('is-open');
    dd.innerHTML = '';

    // Reset button
    const resetBtn = el('button', 'hf-tags-reset');
    resetBtn.textContent = t('autocomplete.reset');
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      App.form.tags = [];
      updateBar();
      submitTags([]);
      persistForm();
      dd.classList.remove('is-open');
    });
    dd.appendChild(resetBtn);

    const tagsList = el('ul', 'hf-tags-list');
    items.forEach(tag => {
      const isSelected = App.form.tags.includes(tag.id);
      const li = el('li', `hf-tag-item${isSelected ? ' is-selected' : ''}`);

      const check = el('span', 'hf-tag-item__check');
      li.appendChild(check);

      const label = el('span', 'hf-tag-item__label');
      label.textContent = tag.name || '';
      li.appendChild(label);

      if (tag.color) {
        const dot = el('span', 'hf-tag-item__dot');
        dot.style.backgroundColor = tag.color;
        li.appendChild(dot);
      }

      li.addEventListener('click', () => {
        if (isSelected) {
          App.form.tags = App.form.tags.filter(id => id !== tag.id);
          li.classList.remove('is-selected');
        } else {
          App.form.tags = [...App.form.tags, tag.id];
          li.classList.add('is-selected');
        }
        updateBar();
        submitTags(App.form.tags);
        persistForm();
      });

      tagsList.appendChild(li);
    });

    if (!items.length) {
      tagsList.appendChild(el('p', 'hf-dropdown__empty', t('autocomplete.not_found')));
    }

    dd.appendChild(tagsList);

    document.addEventListener('click', onOutsideClick);
    function onOutsideClick(e) {
      if (!trigger.contains(e.target)) {
        dd.classList.remove('is-open');
        document.removeEventListener('click', onOutsideClick);
      }
    }
  });

  updateBar();
  wrap.appendChild(bar);
  wrap.appendChild(trigger);
  return wrap;
}

// ─── NeedLogin ────────────────────────────────────────────────────────────────
function renderNeedLogin() {
  const loginUrl = App.baseUrl ? App.baseUrl + '/account/login/' : 'https://huntflow.ru';
  return renderSaveState({
    title:   t('title.signin'),
    icon:    svgHuntflow(),
    message: t('signin'),
    footer:  (foot) => {
      const a = el('a', 'hf-btn hf-btn--black');
      a.href   = loginUrl;
      a.target = '_blank';
      a.setAttribute('data-qa', 'login-link');
      a.textContent = t('button.signin');
      foot.appendChild(a);
    },
  });
}

// ─── NeedPermissions ──────────────────────────────────────────────────────────
function renderNeedPermissions() {
  return renderSaveState({
    title:   t('need-permissions.title'),
    icon:    svgHuntflow(),
    message: t('need-permissions.descr'),
    footer:  (foot) => {
      const btn = el('button', 'hf-btn hf-btn--black');
      btn.textContent = t('need-permissions.button');
      btn.addEventListener('click', handlePermissionsRequest);
      foot.appendChild(btn);
    },
  });
}

// ─── NeedSocial ───────────────────────────────────────────────────────────────
function renderNeedSocial() {
  const data = App.data.data || {};
  const name = data.social_name || '';
  const isReconnect = !!data.reconnect;

  const titleKey = isReconnect ? 'title.reconnect' : 'title.connect_social_account';
  return renderSaveState({
    title:   t(titleKey, { name }),
    icon:    svgHuntflow(),
    message: '',
    footer:  (foot) => {
      const btn = el('button', 'hf-btn hf-btn--black');
      btn.textContent = t(isReconnect ? 'button.reconnect' : 'button.connect');
      btn.addEventListener('click', handleClose);
      foot.appendChild(btn);
    },
  });
}

// ─── Unknown / error ──────────────────────────────────────────────────────────
function renderUnknown() {
  const data = App.data.data || {};
  const isBadSave   = data.state === 'bad-save';
  const isBadResume = data.state === 'bad-save-resume';

  const msgKey = isBadResume
    ? 'find_and_save_from_sites.bad-save-resume'
    : isBadSave
    ? 'find_and_save_from_sites.bad-save'
    : 'find_and_save_from_sites';

  const titleKey = data.not_saved
    ? 'title.not_saved'
    : 'title.something_went_wrong';

  return renderSaveState({
    title:   t(titleKey),
    icon:    svgHuntflow(),
    message: t(msgKey),
    footer:  (foot) => {
      const btn = el('button', 'hf-btn hf-btn--white');
      btn.textContent = t('button.close');
      btn.addEventListener('click', handleClose);
      foot.appendChild(btn);
    },
  });
}

// ─── Limits Reached ───────────────────────────────────────────────────────────
function renderLimitsReached() {
  return renderSaveState({
    title:   t('limits-reached.title'),
    icon:    svgHuntflow(),
    message: t('limits-reached.descr'),
    footer:  (foot) => {
      const btn = el('button', 'hf-btn hf-btn--white');
      btn.textContent = t('limits-reached.button');
      btn.addEventListener('click', handleClose);
      foot.appendChild(btn);
    },
  });
}

// ─── Welcome ──────────────────────────────────────────────────────────────────
function renderWelcome() {
  const state = App.data.state || '';
  let titleKey = 'welcome.title.button_works';
  if (state === 'save-error')       titleKey = 'welcome.title.save_error';
  if (state === 'save-error-resume') titleKey = 'welcome.title.save_error_resume';

  return renderSaveState({
    title:   t(titleKey),
    icon:    svgHuntflow(),
    message: t('find_and_save_from_sites'),
    footer:  (foot) => {
      const btn = el('button', 'hf-btn hf-btn--white');
      btn.textContent = t('button.close');
      btn.addEventListener('click', handleClose);
      foot.appendChild(btn);
    },
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
function handleClose() {
  setTimeout(() => window.close(), 100);
}

async function handlePermissionsRequest() {
  const granted = await chrome.permissions.request({
    origins: [App.baseUrl + '/*']
  });
  if (granted) await init();
}

function handleVacancyChange(vacancy) {
  App.form.vacancy = vacancy;
  setInitialStatus(vacancy);
  persistForm();
  // Re-render form to update status dropdown
  reRenderFormIfNeeded();
}

function handleSubmit() {
  const { form, data } = App;
  if (!form.vacancy || !form.status) return;

  const applicantVacancies = getApplicantVacanciesMap();
  const payload = {
    comment:         form.comment,
    vacancy:         form.vacancy.id,
    status:          form.status.id,
    applicant:       data.data.applicant,
    tags:            form.tags,
    rejectionReason: isTrashStatus() ? (form.rejection ? form.rejection.id : null) : null,
    isOnVacancy:     applicantVacancies.has(form.vacancy.id),
  };

  submitSave(payload);
}

async function submitSave(payload) {
  try {
    setLoading(true);
    const tab = await getActiveTab();
    await saveVacancy({
      data:        payload,
      context:     App.data.data.context,
      isOnVacancy: payload.isOnVacancy,
      tabId:       tab ? tab.id : null,
    });
    handleClose();
  } catch (err) {
    console.error('submitSave error', err);
    setLoading(false);
  }
}

async function submitTags(tagIds) {
  const data    = App.data.data || {};
  const tagData = tagIds.map(id => ({ tag: id }));
  try {
    await saveTags({
      context: data.context,
      data:    tagData,
      id:      data.applicant,
    });
  } catch (e) {
    console.error('saveTags error', e);
  }
}

function onHiddenButtonClick() {
  App.clickCount++;
  clearTimeout(App.clickTimeout);
  App.clickTimeout = setTimeout(() => { App.clickCount = 0; }, 1000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isTrashStatus() {
  return App.form.status && App.form.status.type === 'trash';
}

function isHiredStatus() {
  return App.form.status && App.form.status.type === 'hired';
}

function getVacancyLink() {
  const data = App.data.data || {};
  if (!data.context || !data.applicant) return null;
  const base = `${App.baseUrl}/my/${data.context}`;
  return data.double
    ? `${base}#/double/${data.applicant}/${data.double}`
    : `${base}#/applicants/filter/all/id/${data.applicant}`;
}

function getApplicantVacanciesMap() {
  const map  = new Map();
  const avs  = (App.data.data || {}).applicant_vacancies || [];
  avs.forEach(av => map.set(av.vacancy_id, av.status_id));
  return map;
}

function setInitialStatus(vacancy) {
  const data     = App.data.data || {};
  const statuses = (data.vacancy_statuses || []).filter(s => !s.virtual);

  if (vacancy && vacancy.account_vacancy_status_group) {
    const pipeline = (data.pipelines || []).find(p => p.id === vacancy.account_vacancy_status_group);
    if (pipeline) {
      const pipelineStatus = statuses.find(s =>
        pipeline.statuses.some(ps => ps.account_vacancy_status === s.id)
      );
      App.form.status = pipelineStatus || statuses[0] || null;
      return;
    }
  }
  App.form.status = statuses[0] || null;
}

function updatePlaceholder(wrapEl, text) {
  const ph = wrapEl.querySelector('.hf-autocomplete__placeholder');
  if (ph) ph.textContent = text;
}

function closeAllDropdowns() {
  document.querySelectorAll('.hf-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
}

function reRenderFormIfNeeded() {
  // Re-render only the form section to update rejection dropdown visibility
  const app = document.getElementById('app');
  if (!app) return;
  const state = App.data.state;
  if (state === STATES.VACANCY) renderApp();
}

async function persistForm() {
  const applicantId = (App.data.data || {}).applicant;
  if (!applicantId) return;
  await localStore.set({ [String(applicantId)]: JSON.stringify(App.form) });
}

async function loadVacancies(query) {
  const data    = App.data.data || {};
  const context = data.context;
  if (!context) return [];

  const params = {
    count: 100,
    parent: false,
    state: ['OPEN', 'HOLD'],
    ...(query ? { q: query } : {}),
  };

  const [myRes, otherRes] = await Promise.all([
    searchVacancies(context, { ...params, mine: true }).catch(() => ({ items: [] })),
    searchVacancies(context, { ...params, mine: false }).catch(() => ({ items: [] })),
  ]);

  const applicantVacanciesMap = getApplicantVacanciesMap();
  const statusMap = new Map(
    ((data.vacancy_statuses || [])).map(s => [s.id, s.name])
  );

  function processItems(items, label) {
    const sorted = sortVacancies(items);
    sorted.forEach(v => {
      if (applicantVacanciesMap.has(v.id)) {
        const sId = applicantVacanciesMap.get(v.id);
        v.position += ' — ' + t('vacancy.alreadyAdded');
        v.position += statusMap.has(sId) ? ` (${statusMap.get(sId)})` : '';
      }
    });
    if (!sorted.length) return [];
    return [{ id: label, position: label, type: 'header' }, ...sorted];
  }

  const myItems    = processItems(myRes.items || [], t('vacancy.list.my'));
  const otherItems = processItems(otherRes.items || [], t('vacancy.list.other'));

  App.vacancies = [...myItems, ...otherItems];

  // Set initial vacancy if not set
  if (!App.form.vacancy && App.vacancies.length > 1) {
    const first = App.vacancies.find(v => v.type !== 'header');
    if (first) {
      App.form.vacancy = first;
      setInitialStatus(first);
    }
  }

  return App.vacancies;
}

function sortVacancies(items) {
  return [...items].sort((a, b) => (a.position || '').localeCompare(b.position || '', 'ru'));
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function setLoading(val) {
  App.isLoading = val;
  renderApp();
}

// ─── Инициализация ────────────────────────────────────────────────────────────
async function init() {
  // Check permissions
  const hasPerms = await chrome.permissions.contains({ origins: [App.baseUrl + '/*'] });
  if (!hasPerms) {
    App.data = { state: STATES.ACTIVATE };
    renderApp();
    return;
  }

  // Try to get lang
  const langData = await getLang();
  if (langData) _lang = langData.startsWith('en') ? 'en' : 'ru';

  // Show loading after 200ms
  let loadingShown = false;
  const loadTimer = setTimeout(() => {
    loadingShown = true;
    App.isLoading = true;
    renderApp();
  }, 200);

  App.data = { state: STATES.LOADING };

  try {
    const tab = await getActiveTab();
    let extraHeaders = null;

    if (tab && isHHDomain(tab.url)) {
      try {
        const orgId = await getOrganizationId(tab.id);
        extraHeaders = { 'X-HH-Employer-ID': orgId };
      } catch (e) { /* ignore */ }
    }

    const response = await saveApplicant(
      tab ? tab.url : '',
      tab ? tab.id  : null,
      App.noCache,
      extraHeaders
    );

    if (!response) throw new Error('No response');

    // Set lang from response
    if (response.lang) {
      _lang = response.lang.startsWith('en') ? 'en' : 'ru';
    }

    // Set company name
    if (response.data && response.data.organization_name) {
      App.companyName = response.data.organization_name;
    }

    let tags      = [];
    let rejections = [];

    if (response.state === STATES.VACANCY) {
      const context = response.data.context;
      try {
        const [tagsRes, rejectionsRes, applicantTagsRes, initialVals] = await Promise.all([
          getAccountTags(context),
          getRejections(context),
          getApplicantTags(context, response.data.applicant),
          getInitialValues(),
        ]);

        tags       = tagsRes.items  || [];
        rejections = rejectionsRes.items || [];
        App.rejections = rejections;

        const applicantTagIds = (applicantTagsRes.items || []).map(t => t.tag);
        App.initialState = {
          ...(initialVals && initialVals.data ? initialVals.data : {}),
          tagIds: applicantTagIds,
        };
        App.noCache = false;
      } catch (e) {
        console.error('Tags/rejections load error:', e);
        if (!App.noCache) {
          App.noCache = true;
          clearTimeout(loadTimer);
          App.isLoading = false;
          return init();
        }
      }
    }

    App.data = {
      state: response.state,
      data:  {
        ...(response.data || {}),
        tags,
        rejections,
        cached: response.cached,
        lang:   response.lang || _lang,
      },
      nonce: response.nonce,
    };

    // Restore or init form state
    await restoreFormState();

  } catch (err) {
    console.error('init error', err);
    if (err && err.type === 'error' && err.reason === 'linkedin-limits') {
      App.data = { state: STATES.LIMIT };
    } else {
      App.data = { state: STATES.UNKNOWN };
    }
  }

  clearTimeout(loadTimer);
  App.isLoading = false;
  renderApp();
}

async function restoreFormState() {
  const data = App.data.data || {};
  const applicantId = String(data.applicant || '');
  if (!applicantId) return;

  // Clear cache if fresh save
  if (!data.cached) {
    await localStore.remove(applicantId);
  }

  // Set default rejection
  if (data.rejections && data.rejections.length) {
    App.form.rejection = data.rejections[0];
  }

  // Try to restore from storage
  const stored = await localStore.get(applicantId);
  if (stored && Object.keys(stored).length && stored[applicantId]) {
    try {
      App.form = JSON.parse(stored[applicantId]);
      return;
    } catch (e) { /* ignore bad data */ }
  }

  // Set initial tags from server
  const { tagIds } = App.initialState;
  const tags = data.tags || [];
  if (tagIds && tagIds.length) {
    App.form.tags = tagIds
      .map(id => {
        const tag = tags.find(tg => tg.id === id);
        return tag ? id : null;
      })
      .filter(Boolean);
  }

  // Set initial vacancy & status
  await loadVacancies('');
  if (App.initialState.vacancyId && App.vacancies.length) {
    const v = App.vacancies.find(v => v.id === App.initialState.vacancyId);
    if (v) {
      App.form.vacancy = v;
      setInitialStatus(v);
    }
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
(async () => {
  // Notify background that popup opened
  try {
    chrome.runtime.sendMessage({ action: ACTIONS.OPEN });
  } catch (e) { /* may fail on first load */ }

  // Detect mobile
  setTimeout(() => {
    document.body.classList.toggle(
      'is-mobile',
      window.innerWidth < 500 && window.innerWidth !== 25
    );
  }, 100);

  // Get base URL first, then init
  try {
    App.baseUrl = await getBaseUrl();
  } catch (e) {
    App.baseUrl = 'https://huntflow.ru';
  }

  // Render loading immediately
  renderApp();

  // Skip loading state if data not loaded
  if (App.data.state !== STATES.LOADING) {
    await init();
  } else {
    await init();
  }
})();
```

***

## `_locales/ru/messages.json`

```json
{
  "actionTitle":          { "message": "Сохранить кандидата" },
  "extensionName":        { "message": "Волшебная кнопка Хантфлоу" },
  "extensionDescription": { "message": "Профессиональный сервис для автоматизации рекрутинга" },
  "shortName":            { "message": "Волшебная кнопка" }
}
```

## `_locales/en/messages.json`

```json
{
  "actionTitle":          { "message": "Save applicant" },
  "extensionName":        { "message": "Huntflow Magic Button" },
  "extensionDescription": { "message": "Professional service for recruitment automation" },
  "shortName":            { "message": "Magic Button" }
}
```

***

## Что нужно скопировать из оригинала без изменений

| Файл/папка | Откуда |
|---|---|
| `js/background.js` | `huntflow 5.12/js/background.js` |
| `js/content_scripts.js` | `huntflow 5.12/js/content_scripts.js` |
| `js/content_scripts_main.js` | `huntflow 5.12/js/content_scripts_main.js` |
| `js/hh.js` | `huntflow 5.12/js/hh.js` |
| `js/facebook.js` | `huntflow 5.12/js/facebook.js` |
| `icons/` | `huntflow 5.12/icons/` |
| `img/` | `huntflow 5.12/img/` |
| `fonts/` | `huntflow 5.12/fonts/` |

***

## Ключевые решения при переписывании

**Состояния** — вместо реактивного `Vue.data` используется объект `App` как единое хранилище состояния. При изменении состояния вызывается `renderApp()`, который полностью перерисовывает интерфейс.

**Компоненты → функции** — каждый Vue-компонент (`VForm`, `VApp`, `NeedLogin`, `SaveState`, `VacancyAutocomplete`, `Tags`, `StatusAutocomplete` и т.д.) стал обычной JS-функцией, возвращающей DOM-узел.

**Логика автокомплита** — dropdown реализован через позиционирование через CSS-классы (`is-open`). Поиск вакансий с дебаунсом 300мс полностью воспроизводит оригинальное поведение.

**Персистентность формы** — `chrome.storage.local` используется точно так же, как в оригинале: сохраняет состояние формы по `applicant_id`, восстанавливает при повторном открытии.

**Стили** — CSS взят из дизайн-системы `hrhelper-linkedin-huntflow` (переменные цветов, типографика, кнопки, формы), но переменные класссов были заменены с хэшированных (`button_button_a0uYn`) на читаемые BEM-имена (`hf-btn`).