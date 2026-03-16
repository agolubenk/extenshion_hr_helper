const HRH = window.__HRH__;
if (!HRH) {
  throw new Error("[HRHelper] shared/constants.js not loaded");
}
const OPTIONS_THEME_KEY = HRH.OPTIONS_THEME_KEY;
const ACTIVE_PAGES_KEY = HRH.ACTIVE_PAGES_KEY;
const DEFAULT_ACTIVE_PAGES = HRH.DEFAULT_ACTIVE_PAGES;
if (!OPTIONS_THEME_KEY || !ACTIVE_PAGES_KEY || !DEFAULT_ACTIVE_PAGES) {
  throw new Error("[HRHelper] shared/constants.js not loaded (options/active keys missing)");
}

async function loadOptions() {
  const { baseUrl, apiToken, [OPTIONS_THEME_KEY]: theme, [ACTIVE_PAGES_KEY]: activePages } = await chrome.storage.sync.get({
    baseUrl: "https://hr.sftntx.com/",
    apiToken: "",
    [OPTIONS_THEME_KEY]: "system",
    [ACTIVE_PAGES_KEY]: DEFAULT_ACTIVE_PAGES,
  });
  document.getElementById("baseUrl").value = baseUrl;
  document.getElementById("apiToken").value = apiToken;
  var integrationsLink = document.getElementById("options-integrations-link");
  if (integrationsLink) integrationsLink.href = (baseUrl.replace(/\/+$/, "") || "https://hr.sftntx.com") + "/accounts/integrations/";
  const themeValue = theme === "light" || theme === "dark" ? theme : "system";
  const radio = document.querySelector(`input[name="optionsTheme"][value="${themeValue}"]`);
  if (radio) radio.checked = true;
  applyTheme(themeValue);
  const pages = { ...DEFAULT_ACTIVE_PAGES, ...(activePages || {}) };
  document.querySelectorAll(".options-page-btn[data-page]").forEach((btn) => {
    const key = btn.getAttribute("data-page");
    const on = !!pages[key];
    btn.classList.toggle("options-page-on", on);
    btn.classList.toggle("options-page-off", !on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  updateConnectionStatus(baseUrl, apiToken);
}

/** Проверяет подключение по токену и отображает статус на странице настроек */
async function updateConnectionStatus(baseUrl, apiToken) {
  const el = document.getElementById("options-connection-status");
  if (!el) return;
  const url = (baseUrl || "").trim().replace(/\/+$/, "") || "https://hr.sftntx.com";
  const token = normalizeToken(apiToken || "");

  if (!token) {
    el.style.display = "none";
    el.textContent = "";
    el.className = "options-connection-status";
    return;
  }

  el.style.display = "block";
  el.textContent = "Проверка подключения…";
  el.className = "options-connection-status";

  try {
    const res = await fetch(`${url}/api/v1/accounts/users/profile_dashboard/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const data = json.data || json;
      const user = data.user || data;
      const name =
        user.email ||
        user.username ||
        (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : "") ||
        user.username ||
        "";
      el.className = "options-connection-status connected";
      el.textContent = name ? `Подключение выполнено. Выполнен вход как ${name}.` : "Подключение выполнено.";
    } else {
      el.className = "options-connection-status error";
      if (res.status === 401) {
        el.textContent = "Подключение не выполнено. Токен недействителен или истёк.";
      } else if (res.status === 403) {
        el.textContent = "Подключение не выполнено. Доступ запрещён.";
      } else {
        el.textContent = `Подключение не выполнено. Ошибка ${res.status}. Проверьте Base URL и токен.`;
      }
    }
  } catch (e) {
    el.className = "options-connection-status error";
    el.textContent = "Подключение не выполнено. Проверьте сеть и Base URL.";
  }
}

const normalizeToken = window.__HRH__.normalizeToken;

async function saveOptions() {
  const baseUrl = (document.getElementById("baseUrl").value || "")
    .trim()
    .replace(/\/+$/, "");
  const apiToken = normalizeToken(document.getElementById("apiToken").value || "");
  const status = document.getElementById("status");

  if (!baseUrl) {
    status.textContent = "Укажите base URL.";
    status.className = "hint err";
    return;
  }

  if (!apiToken) {
    status.textContent = "Укажите API Token.";
    status.className = "hint err";
    return;
  }

  const themeRadio = document.querySelector('input[name="optionsTheme"]:checked');
  const theme = themeRadio ? themeRadio.value : "system";
  const activePages = { ...DEFAULT_ACTIVE_PAGES };
  document.querySelectorAll(".options-page-btn[data-page]").forEach((btn) => {
    const key = btn.getAttribute("data-page");
    if (key) activePages[key] = btn.classList.contains("options-page-on");
  });
  await chrome.storage.sync.set({ baseUrl, apiToken, [OPTIONS_THEME_KEY]: theme, [ACTIVE_PAGES_KEY]: activePages });
  applyTheme(theme);
  status.textContent = "Сохранено.";
  status.className = "hint ok";
  setTimeout(() => (status.textContent = ""), 1500);
  updateConnectionStatus(baseUrl, apiToken);
}

function applyTheme(theme) {
  document.body.classList.remove("options-theme-light", "options-theme-dark", "options-theme-system");
  document.body.classList.add("options-theme-" + (theme || "system"));
}

document.getElementById("save").addEventListener("click", saveOptions);
document.querySelectorAll('input[name="optionsTheme"]').forEach((el) => {
  el.addEventListener("change", () => {
    const theme = document.querySelector('input[name="optionsTheme"]:checked')?.value || "system";
    chrome.storage.sync.set({ [OPTIONS_THEME_KEY]: theme });
    applyTheme(theme);
  });
});
document.getElementById("options-pages-row")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".options-page-btn[data-page]");
  if (!btn) return;
  const on = btn.classList.contains("options-page-on");
  btn.classList.toggle("options-page-on", !on);
  btn.classList.toggle("options-page-off", on);
  btn.setAttribute("aria-pressed", !on ? "true" : "false");
  const activePages = { ...DEFAULT_ACTIVE_PAGES };
  document.querySelectorAll(".options-page-btn[data-page]").forEach((b) => {
    const key = b.getAttribute("data-page");
    if (key) activePages[key] = b.classList.contains("options-page-on");
  });
  chrome.storage.sync.set({ [ACTIVE_PAGES_KEY]: activePages });
});
loadOptions();

const manifest = chrome.runtime?.getManifest?.();
if (manifest && typeof manifest.version === "string") {
  const el = document.getElementById("extension-version");
  if (el) el.textContent = manifest.version;
}

try {
  const wikiIcon = document.getElementById("wiki-pill-icon");
  if (wikiIcon && typeof chrome.runtime.getURL === "function") {
    wikiIcon.src = chrome.runtime.getURL("icons/icon-32.png");
  }
} catch (_) {}
/* ────────────────────────────────────────────────────────────
 *  Huntflow Settings Integration
 * ──────────────────────────────────────────────────────────── */

var HuntflowSettings = (function () {
  "use strict";

  function HuntflowSettings() {
    this._connectBtn = document.getElementById("huntflow-connect-btn");
    this._disconnectBtn = document.getElementById("huntflow-disconnect-btn");
    this._tokenInput = document.getElementById("huntflowToken");
    this._authStatus = document.getElementById("huntflow-auth-status");
    this._vacancySelect = document.getElementById("huntflow-default-vacancy");
    this._autoSave = document.getElementById("huntflow-auto-save");
    this._notifications = document.getElementById("huntflow-notifications");
    this._testBtn = document.getElementById("huntflow-test-btn");
    this._refreshBtn = document.getElementById("huntflow-refresh-btn");
    this._dashboardBtn = document.getElementById("huntflow-dashboard-btn");

    if (!this._connectBtn) return; // Huntflow section not present

    this._attachEventListeners();
    this._loadSettings();
  }

  HuntflowSettings.prototype._attachEventListeners = function () {
    var self = this;

    this._connectBtn.addEventListener("click", function () { self._connectHuntflow(); });
    this._disconnectBtn.addEventListener("click", function () { self._disconnectHuntflow(); });
    this._testBtn.addEventListener("click", function () { self._testConnection(); });
    this._refreshBtn.addEventListener("click", function () { self._refreshVacancies(); });
    this._dashboardBtn.addEventListener("click", function () {
      window.open("https://huntflow.ai", "_blank");
    });

    this._vacancySelect.addEventListener("change", function () {
      chrome.storage.local.set({ huntflow_default_vacancy: self._vacancySelect.value });
    });
    this._autoSave.addEventListener("change", function () {
      chrome.storage.local.set({ huntflow_auto_save: self._autoSave.checked });
    });
    this._notifications.addEventListener("change", function () {
      chrome.storage.local.set({ huntflow_notifications: self._notifications.checked });
    });
  };

  HuntflowSettings.prototype._loadSettings = async function () {
    try {
      var settings = await chrome.storage.local.get([
        "huntflow_token",
        "huntflow_account_id",
        "huntflow_default_vacancy",
        "huntflow_auto_save",
        "huntflow_notifications"
      ]);

      var isConnected = !!settings.huntflow_token && !!settings.huntflow_account_id;
      this._updateAuthStatus(isConnected);

      this._autoSave.checked = !!settings.huntflow_auto_save;
      this._notifications.checked = settings.huntflow_notifications !== false;

      if (isConnected) {
        await this._loadVacancies();
        if (settings.huntflow_default_vacancy) {
          this._vacancySelect.value = settings.huntflow_default_vacancy;
        }
      }
    } catch (e) {
      console.error("[HRHelper] Failed to load Huntflow settings:", e);
    }
  };

  HuntflowSettings.prototype._loadVacancies = async function () {
    try {
      var response = await chrome.runtime.sendMessage({ type: "HUNTFLOW_GET_VACANCIES" });
      if (response && response.success && Array.isArray(response.vacancies)) {
        var saved = this._vacancySelect.value;
        this._vacancySelect.innerHTML = '<option value="">Не выбрана</option>';
        response.vacancies.forEach(function (v) {
          var opt = document.createElement("option");
          opt.value = v.id;
          opt.textContent = v.position || v.text || ("Вакансия #" + v.id);
          this._vacancySelect.appendChild(opt);
        }.bind(this));
        if (saved) this._vacancySelect.value = saved;
      }
    } catch (e) {
      console.error("[HRHelper] Failed to load vacancies:", e);
    }
  };

  HuntflowSettings.prototype._connectHuntflow = async function () {
    var token = (this._tokenInput.value || "").trim();
    if (!token) {
      this._showAuthMessage("Введите API токен Huntflow.", "error");
      return;
    }

    this._connectBtn.disabled = true;
    this._connectBtn.textContent = "Подключение…";

    try {
      var response = await chrome.runtime.sendMessage({
        type: "HUNTFLOW_AUTHENTICATE",
        token: token
      });

      if (response && response.success) {
        this._updateAuthStatus(true);
        await this._loadVacancies();
        this._showAuthMessage("Подключение к Huntflow выполнено.", "connected");
      } else {
        this._showAuthMessage(
          "Не удалось подключиться: " + ((response && response.error) || "Неизвестная ошибка"),
          "error"
        );
      }
    } catch (e) {
      this._showAuthMessage("Ошибка: " + e.message, "error");
    } finally {
      this._connectBtn.disabled = false;
      this._connectBtn.textContent = "Подключить Huntflow";
    }
  };

  HuntflowSettings.prototype._disconnectHuntflow = async function () {
    if (!confirm("Отключить Huntflow? Токен будет удалён.")) return;

    try {
      await chrome.runtime.sendMessage({ type: "HUNTFLOW_LOGOUT" });
      this._updateAuthStatus(false);
      this._tokenInput.value = "";
      this._vacancySelect.innerHTML = '<option value="">Не выбрана</option>';
      this._showAuthMessage("Huntflow отключен.", "error");
    } catch (e) {
      this._showAuthMessage("Ошибка: " + e.message, "error");
    }
  };

  HuntflowSettings.prototype._testConnection = async function () {
    this._testBtn.disabled = true;
    this._testBtn.textContent = "Проверка…";

    try {
      var response = await chrome.runtime.sendMessage({ type: "HUNTFLOW_GET_VACANCIES" });
      if (response && response.success) {
        var count = (response.vacancies || []).length;
        this._showAuthMessage("Соединение установлено. Найдено вакансий: " + count + ".", "connected");
      } else {
        this._showAuthMessage(
          "Соединение не установлено: " + ((response && response.error) || "Неизвестная ошибка"),
          "error"
        );
      }
    } catch (e) {
      this._showAuthMessage("Ошибка: " + e.message, "error");
    } finally {
      this._testBtn.disabled = false;
      this._testBtn.textContent = "Тест соединения";
    }
  };

  HuntflowSettings.prototype._refreshVacancies = async function () {
    this._refreshBtn.disabled = true;
    this._refreshBtn.textContent = "Обновление…";

    try {
      await chrome.runtime.sendMessage({ type: "HUNTFLOW_REFRESH_VACANCIES" });
      await this._loadVacancies();
      this._showAuthMessage("Вакансии обновлены.", "connected");
    } catch (e) {
      this._showAuthMessage("Ошибка: " + e.message, "error");
    } finally {
      this._refreshBtn.disabled = false;
      this._refreshBtn.textContent = "Обновить вакансии";
    }
  };

  HuntflowSettings.prototype._updateAuthStatus = function (isConnected) {
    if (isConnected) {
      this._connectBtn.style.display = "none";
      this._disconnectBtn.style.display = "inline-block";
      this._tokenInput.disabled = true;
    } else {
      this._connectBtn.style.display = "inline-block";
      this._disconnectBtn.style.display = "none";
      this._tokenInput.disabled = false;
    }
  };

  HuntflowSettings.prototype._showAuthMessage = function (text, type) {
    if (!this._authStatus) return;
    this._authStatus.style.display = "block";
    this._authStatus.textContent = text;
    this._authStatus.className = "huntflow-auth-status " + (type || "");
    clearTimeout(this._authStatusTimer);
    this._authStatusTimer = setTimeout(function () {
      this._authStatus.style.display = "none";
    }.bind(this), 5000);
  };

  return HuntflowSettings;
})();

// Initialize Huntflow settings
new HuntflowSettings();
