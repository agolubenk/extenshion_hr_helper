# HR Helper — расширение Chrome

**HR Helper** (v2.1.0) — расширение для Chrome, которое связывает кандидатов из LinkedIn, hh.ru, rabota.by, Telegram и Facebook с карточками в Huntflow и даёт быстрый доступ к действиям прямо со страницы профиля, резюме, календаря или видеозвонка.

## Возможности

| Площадка | Функции |
|----------|---------|
| **LinkedIn** | Кнопка «Huntflow» на профилях и в переписке: сохранить связь профиль → кандидат в Huntflow, открыть карточку, менять статус и причину отказа, добавлять на вакансии. Расширенный парсинг профиля (опыт, образование, навыки, языки, сертификаты). Кнопка «Создать кандидата» для новых профилей. |
| **Huntflow** | На карточке кандидата: плавающее окно с контактами (Telegram, LinkedIn, WhatsApp, Viber и др.), копирование ФИО, телефона, email, ссылки на вакансию. Модальное окно выбора вакансии для добавления кандидата. |
| **hh.ru / rabota.by** | На странице резюме: привязать ссылку Huntflow, подтянуть данные кандидата из Huntflow и показывать их под заголовком резюме. Расширенный парсинг: зарплата, гражданство, разрешение на работу, релокация, командировки, график, ключевые навыки. |
| **Telegram** | На страницах t.me и web.telegram.org: извлечение профиля (имя, телефон, био, username) и кнопка «Добавить в Huntflow» для создания кандидата. |
| **Facebook** | На страницах профилей facebook.com: извлечение данных (имя, локация, работа, образование) и кнопка «Добавить в Huntflow». |
| **Google Calendar** | В событии: кнопки быстрого контакта (мессенджеры, LinkedIn) и копирование ссылок. |
| **Google Meet** | Во время созвона: копирование текста по грейду, ссылок Scorecard и кандидата в Huntflow. |
| **Google Drive** | На страницах документов, таблиц и презентаций Google: интеграция с HR Helper. |

Расширение работает с сервером HR Helper. В настройках задаются **Base URL** (по умолчанию `https://hr.sftntx.com`) и **API Token**. Связи LinkedIn↔Huntflow и резюме↔Huntflow отображаются в интерфейсе HR Helper.

## Быстрый старт

1. Установите расширение из папки (Chrome → «Расширения» → «Режим разработчика» → «Загрузить распакованное расширение»).
2. Откройте страницу настроек расширения (правый клик по иконке → «Параметры» или «Options»).
3. Укажите **Base URL HRHelper** (если используется свой сервер) и **API Token** (получить можно по ссылке из подсказки на странице настроек).
4. Сохраните настройки. На странице настроек отображается статус подключения (успешно/ошибка).
5. Откройте профиль в LinkedIn — должна появиться кнопка «Huntflow» и контекстный попап при клике по иконке расширения.

Подробная настройка и описание интерфейса — в [Руководстве пользователя](USER_GUIDE.md).

## Структура проекта

```
hrhelper-linkedin-huntflow/
├── manifest.json              # Manifest V3
├── background.js              # Service worker (API прокси)
├── content.js                 # LinkedIn профили и переписка
├── content-resume.js          # hh.ru / rabota.by резюме
├── content-huntflow.js        # Huntflow карточки кандидатов
├── content-calendar.js        # Google Calendar
├── content-meet.js            # Google Meet
├── content-gdrive.js          # Google Drive
├── content-telegram.js        # Telegram (web + t.me)
├── content-facebook.js        # Facebook профили
├── popup.html / popup.js      # Popup расширения
├── options.html / options.js  # Страница настроек
├── shared/
│   ├── constants.js           # Константы, namespace __HRH__
│   ├── api/
│   │   ├── client.js          # apiFetch — прокси через background
│   │   ├── huntflow.js        # Huntflow API (кандидаты, вакансии, резюме)
│   │   └── status.js          # Статусы кандидатов
│   ├── utils/
│   │   ├── debounce.js        # Debounce для наблюдателей
│   │   ├── token.js           # Работа с токенами
│   │   ├── url.js             # URL утилиты
│   │   ├── date.js            # Форматирование дат
│   │   ├── color.js           # CSS-переменные тем
│   │   └── error-handler.js   # Централизованная обработка ошибок
│   └── domain/
│       └── status-logic.js    # Бизнес-логика статусов
├── modules/
│   ├── linkedin-parser.js     # Расширенный парсинг LinkedIn
│   ├── linkedin-profile.js    # UI профиля LinkedIn
│   └── linkedin-messaging.js  # UI переписки LinkedIn
├── icons/                     # Иконки расширения
└── docs/                      # Документация
```

## API Endpoints

Расширение взаимодействует с сервером HR Helper через следующие эндпоинты:

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/v1/huntflow/candidates/create/` | Создание кандидата в Huntflow |
| PATCH | `/api/v1/huntflow/candidates/{id}/update/` | Обновление кандидата |
| POST | `/api/v1/huntflow/candidates/add-to-vacancy/` | Добавление кандидата на вакансию |
| POST | `/api/v1/huntflow/upload-resume/` | Загрузка резюме |
| POST | `/api/v1/huntflow/parse-resume/` | Парсинг резюме по URL |
| GET | `/api/v1/huntflow/vacancies/` | Список вакансий |
| GET | `/api/v1/status/` | Статус кандидата |
| GET | `/api/v1/status-multi/` | Множественный статус |
| POST | `/api/v1/telemetry/error/` | Телеметрия ошибок |

## Документация

| Документ | Описание |
|----------|----------|
| [Индекс документации](INDEX.md) | Навигация по всей документации. |
| [Руководство пользователя](USER_GUIDE.md) | Настройка, интерфейс, темы, поддержанные страницы. |
| [Архитектура](ARCHITECTURE.md) | Устройство расширения: модули, API, хранение данных. |
| [История версий](old/CHANGELOG.md) | Сводка изменений по версиям. |

## Требования

- Браузер с поддержкой Manifest V3 (Chrome, Edge и др.).
- Доступ к серверу HR Helper (Base URL) и валидный API Token.
- Разрешённые домены: LinkedIn, Huntflow, hh.ru, rabota.by, Telegram, Facebook, Google Calendar, Google Meet, Google Drive, hr.sftntx.com (или ваш Base URL).

## Лицензия

MIT

## Версия

Текущая версия: **2.1.0** (см. `manifest.json`).
