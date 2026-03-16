# HR Helper v2.0.0 — LinkedIn to Huntflow

Chrome extension for recruiters. Integrates HR Helper and Huntflow ATS directly into LinkedIn profile pages.

## Features

### Existing (v1.x)
- Floating panel on LinkedIn profiles with candidate data from HR Helper
- Integration with rabota.by / hh.ru resume pages
- Google Calendar & Meet support (contacts, scorecard, reminders)
- Huntflow.ru content script (social buttons, floating panel)
- Google Drive / Docs resume parsing
- Dark theme support, per-page toggle, popup UI

### New in v2.0.0 — Huntflow API Integration
- **Save candidates to Huntflow** directly from LinkedIn via the floating panel
- **Huntflow section** in the floating panel: vacancy selector, save button, loading/success/error states
- **Authentication** via Huntflow API token (stored in `chrome.storage.local`)
- **Settings page**: new "Huntflow API" section — connect/disconnect, default vacancy, auto-save, notifications, quick actions
- **Keyboard shortcuts**: `Alt+H` (focus Huntflow section), `Alt+S` (quick save candidate)
- **Accessibility**: ARIA labels, roles, live regions, screen reader announcements
- **Performance**: vacancy caching (5-min TTL), debounced UI updates, retry logic with backoff
- **Error handling**: centralized handler, user-friendly messages, error log storage (last 50)
- **Desktop notifications** on save success/failure

## Installation

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `hrhelper-linkedin-huntflow — v.2.0.0/` directory
5. Open the extension settings (right-click icon → Options)
6. Enter your HR Helper Base URL and API Token
7. In the "Huntflow API" section, enter your Huntflow API token and click "Connect"

## File Structure

```
hrhelper-linkedin-huntflow — v.2.0.0/
├── manifest.json                    # v2.0.0, Manifest V3
├── background.js                    # Service worker (updated)
├── background/
│   └── huntflow-api.js              # Huntflow API modules for background
├── content/
│   └── huntflow-integration.js      # HuntflowButton content script
├── modules/
│   └── huntflow/                    # Standalone modules (for testing)
│       ├── auth-manager.js
│       ├── api-client.js
│       ├── data-transformer.js
│       └── error-handler.js
├── config/
│   └── huntflow-config.js           # Huntflow configuration constants
├── ui/
│   ├── styles/
│   │   └── huntflow-button.css      # Huntflow UI styles + animations
│   └── components/
│       └── huntflow-widget.html     # Widget HTML template
├── options.html                     # Settings page (updated)
├── options.js                       # Settings logic (updated)
├── options.css                      # Settings styles (updated)
├── tests/
│   └── huntflow-integration.test.js # Unit tests
└── (existing files unchanged)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+H`  | Focus Huntflow section in floating panel |
| `Alt+S`  | Quick save candidate to selected vacancy |

## Huntflow API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/accounts` | Authenticate & get account ID |
| GET | `/v2/accounts/{id}/vacancies` | List vacancies |
| POST | `/v2/accounts/{id}/applicants` | Create candidate |
| POST | `/v2/accounts/{id}/applicants/{id}/vacancy` | Attach candidate to vacancy |

## Testing

```bash
# Install dependencies
npm install --save-dev jest

# Run unit tests
npx jest tests/huntflow-integration.test.js
```

## Troubleshooting

- **"Not authenticated" in Huntflow section**: Open extension settings → Huntflow API → enter token → Connect
- **Vacancies not loading**: Click "Refresh Vacancies" in settings, or check your Huntflow API token permissions
- **Save fails with network error**: Check internet connection, retry with the "Retry" button
- **Rate limit error**: Wait a moment and retry; the extension includes automatic backoff logic

## Changelog

### v2.0.0 (16.03.2026)
- Huntflow API direct integration — save candidates from LinkedIn
- Huntflow section in floating panel (vacancy selector, states, animations)
- Settings page: Huntflow API section (auth, defaults, quick actions)
- Keyboard shortcuts (Alt+H, Alt+S) and ARIA accessibility
- Vacancy caching (5-min TTL), retry logic, centralized error handling
- Desktop notifications for save events

### v1.5.0 (02.04.2026)
- Google Drive / Docs integration for resume parsing
- Google Drive floating panel with candidate info
- Updated settings with Google Drive toggle

(See options.html changelog for full version history)
