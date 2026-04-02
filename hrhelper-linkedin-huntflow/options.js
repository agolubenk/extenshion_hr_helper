const HRH = window.__HRH__;
if (!HRH) {
  throw new Error("[HRHelper] shared/constants.js not loaded");
}
const OPTIONS_THEME_KEY = HRH.OPTIONS_THEME_KEY;
if (!OPTIONS_THEME_KEY) {
  throw new Error("[HRHelper] shared/constants.js not loaded (options keys missing)");
}

async function loadOptions() {
  const { baseUrl, apiToken, [OPTIONS_THEME_KEY]: theme } = await chrome.storage.sync.get({
    baseUrl: "https://hr.sftntx.com/",
    apiToken: "",
    [OPTIONS_THEME_KEY]: "system",
  });
  document.getElementById("baseUrl").value = baseUrl;
  document.getElementById("apiToken").value = apiToken;
  var integrationsLink = document.getElementById("options-integrations-link");
  if (integrationsLink) integrationsLink.href = (baseUrl.replace(/\/+$/, "") || "https://hr.sftntx.com") + "/accounts/integrations/";
  const themeValue = theme === "light" || theme === "dark" ? theme : "system";
  const radio = document.querySelector(`input[name="optionsTheme"][value="${themeValue}"]`);
  if (radio) radio.checked = true;
  applyTheme(themeValue);
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
  await chrome.storage.sync.set({ baseUrl, apiToken, [OPTIONS_THEME_KEY]: theme });
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
document.getElementById("openFlexibleSettings")?.addEventListener("click", () => {
  try {
    location.href = "flexible-settings.html";
  } catch (_) {}
});
document.querySelectorAll('input[name="optionsTheme"]').forEach((el) => {
  el.addEventListener("change", () => {
    const theme = document.querySelector('input[name="optionsTheme"]:checked')?.value || "system";
    chrome.storage.sync.set({ [OPTIONS_THEME_KEY]: theme });
    applyTheme(theme);
  });
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

// Collapsible sections
(function initCollapsibleSections() {
  const STORAGE_KEY = 'hrhelper_options_collapsed';
  const sections = document.querySelectorAll('.options-collapsible');
  const pageWrap = document.querySelector('.page-wrap');
  const panel = document.querySelector('.panel-settings');
  
  function toggleSection(section, collapsed) {
    const header = section.querySelector('.options-collapsible-header');
    if (collapsed) {
      section.classList.add('collapsed');
      header?.setAttribute('aria-expanded', 'false');
    } else {
      section.classList.remove('collapsed');
      header?.setAttribute('aria-expanded', 'true');
    }
  }
  
  function saveCollapsedState() {
    const state = {};
    sections.forEach((s) => {
      if (s.id) state[s.id] = s.classList.contains('collapsed');
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }
  
  function loadCollapsedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  }
  
  function updateLayoutMode() {
    if (!panel || !pageWrap) return;
    const viewportHeight = window.innerHeight;
    const maxHeight = viewportHeight - 48;
    const panelHeight = panel.scrollHeight;
    
    if (panelHeight > maxHeight) {
      pageWrap.classList.add('page-wrap--overflow');
    } else {
      pageWrap.classList.remove('page-wrap--overflow');
    }
  }
  
  function checkIfFitsAndCollapse() {
    if (!panel || !pageWrap) return;
    const viewportHeight = window.innerHeight;
    const maxHeight = viewportHeight - 48;
    
    // Сначала разворачиваем все секции для измерения
    sections.forEach((s) => toggleSection(s, false));
    
    let currentHeight = panel.scrollHeight;
    
    // Если всё влезает — центрируем (убираем класс overflow)
    if (currentHeight <= maxHeight) {
      pageWrap.classList.remove('page-wrap--overflow');
      saveCollapsedState();
      return;
    }
    
    // Если не влезает — добавляем класс overflow и сворачиваем сверху вниз
    pageWrap.classList.add('page-wrap--overflow');
    
    // Идём сверху вниз, сворачиваем пока не влезет
    for (const section of sections) {
      if (currentHeight <= maxHeight) break;
      
      const body = section.querySelector('.options-collapsible-body');
      if (!body) continue;
      
      // Измеряем высоту тела секции
      const bodyHeight = body.offsetHeight;
      toggleSection(section, true);
      currentHeight = panel.scrollHeight;
    }
    
    saveCollapsedState();
  }
  
  // Инициализация: загружаем сохранённое состояние или проверяем влезает ли
  const savedState = loadCollapsedState();
  if (savedState) {
    sections.forEach((s) => {
      if (s.id && savedState[s.id] !== undefined) {
        toggleSection(s, savedState[s.id]);
      }
    });
    // Обновляем режим layout после применения сохранённого состояния
    requestAnimationFrame(() => updateLayoutMode());
  }
  
  // Добавляем обработчики кликов
  sections.forEach((section) => {
    const header = section.querySelector('.options-collapsible-header');
    if (!header) return;
    header.addEventListener('click', () => {
      const isCollapsed = section.classList.contains('collapsed');
      toggleSection(section, !isCollapsed);
      saveCollapsedState();
      updateLayoutMode();
    });
  });
  
  // При первой загрузке проверяем, влезает ли контент
  // Если нет сохранённого состояния, автоматически сворачиваем что не влезло
  if (!savedState) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkIfFitsAndCollapse();
      });
    });
  }
})();