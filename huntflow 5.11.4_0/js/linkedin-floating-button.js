/**
 * Huntflow HR Helper — Floating Button for LinkedIn Profile Pages
 *
 * Adds a permanently visible floating button in the top-left corner of LinkedIn
 * profile pages (linkedin.com/in/*). On click it triggers the same candidate
 * creation / open-in-Huntflow logic that the main extension already uses.
 *
 * Communication with the background service worker uses the standard
 * { action: "fetch", payload } message format via chrome.runtime.sendMessage.
 * Clicking the button opens popup.html in a new tab via the "OPEN_POPUP_WINDOW"
 * message to the background service worker.
 */
(function () {
  "use strict";

  /* ── Guards ────────────────────────────────────────────────────────── */
  const IS_PROFILE_PAGE =
    location.href.includes("/in/") && !location.href.includes("/search/");
  if (!IS_PROFILE_PAGE) return;

  const BUTTON_ID = "hrhelper-linkedin-quick-btn";
  const TOOLTIP_TEXT = "Добавить в Huntflow";
  const STORAGE_POS_KEY = "hrhelper_quick_btn_pos";

  /* ── Helpers ───────────────────────────────────────────────────────── */
  function isExtensionContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  /**
   * Proxy an API request through the background service worker using the
   * existing "fetch" action that background.js already handles.
   * background.js prepends the base Huntflow URL and calls customFetch().
   */
  function apiFetch(path, init) {
    init = init || {};
    var method = init.method || "GET";
    if (!isExtensionContextValid()) {
      return Promise.resolve({ ok: false, data: null });
    }
    return new Promise(function (resolve, reject) {
      try {
        chrome.runtime.sendMessage(
          { action: "fetch", payload: { url: path.replace(/^\//, ""), method: method } },
          function (response) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            resolve({
              ok: !!(response && response.success),
              data: response && response.data ? response.data : null
            });
          }
        );
      } catch (err) { reject(err); }
    }).catch(function () {
      return { ok: false, data: null };
    });
  }

  /** Normalise a LinkedIn profile URL to https://www.linkedin.com/in/<slug> */
  function normalizeLinkedInProfileUrl(raw) {
    if (!raw) return null;
    try {
      var u = new URL(raw);
      if (!u.hostname.endsWith("linkedin.com")) return null;
      var m = u.pathname.match(/^\/in\/([A-Za-z0-9_-]+)/);
      if (!m) return null;
      return "https://www.linkedin.com/in/" + m[1];
    } catch (_) {
      return null;
    }
  }

  /* ── State ─────────────────────────────────────────────────────────── */
  var state = {
    profileUrl: null,
    huntflowUrl: null,
    saved: false,
    busy: false,
    status: "idle" // idle | loading | linked | error
  };

  /* ── UI ────────────────────────────────────────────────────────────── */
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    var shadow = document.createElement("div");
    shadow.id = BUTTON_ID;
    shadow.style.cssText =
      "position:fixed!important;z-index:2147483647!important;top:20px!important;left:20px!important;" +
      "width:48px!important;height:48px!important;pointer-events:auto!important;";
    // Restore saved position
    try {
      var saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        var pos = JSON.parse(saved);
        if (pos.top != null) shadow.style.top = pos.top + "px";
        if (pos.left != null) shadow.style.left = pos.left + "px";
      }
    } catch (_) {}

    var btn = document.createElement("button");
    btn.type = "button";
    btn.title = TOOLTIP_TEXT;
    btn.setAttribute("aria-label", TOOLTIP_TEXT);
    btn.style.cssText =
      "all:initial!important;display:flex!important;align-items:center!important;justify-content:center!important;" +
      "width:48px!important;height:48px!important;border-radius:50%!important;border:2px solid #0a66c2!important;" +
      "background:#fff!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(0,0,0,.25)!important;" +
      "transition:transform .15s ease,box-shadow .15s ease!important;padding:0!important;";

    var iconUrl = "";
    try { iconUrl = chrome.runtime.getURL("icons/64.png"); } catch (_) {}
    var img = document.createElement("img");
    img.src = iconUrl;
    img.alt = "Huntflow";
    img.style.cssText = "width:32px!important;height:32px!important;border-radius:50%!important;pointer-events:none!important;";
    btn.appendChild(img);

    // Hover effects
    btn.addEventListener("mouseenter", function () {
      btn.style.transform = "scale(1.1)";
      btn.style.boxShadow = "0 4px 16px rgba(0,0,0,.35)";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 2px 8px rgba(0,0,0,.25)";
    });

    // Click handler
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      onQuickButtonClick();
    });

    shadow.appendChild(btn);

    // Tooltip element
    var tooltip = document.createElement("div");
    tooltip.style.cssText =
      "all:initial!important;position:absolute!important;left:56px!important;top:50%!important;" +
      "transform:translateY(-50%)!important;background:#333!important;color:#fff!important;" +
      "font:600 12px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;" +
      "padding:6px 10px!important;border-radius:6px!important;white-space:nowrap!important;" +
      "pointer-events:none!important;opacity:0!important;transition:opacity .15s!important;z-index:1!important;";
    tooltip.textContent = TOOLTIP_TEXT;
    shadow.appendChild(tooltip);

    btn.addEventListener("mouseenter", function () { tooltip.style.opacity = "1"; });
    btn.addEventListener("mouseleave", function () { tooltip.style.opacity = "0"; });

    // Drag support
    makeDraggable(shadow);

    // Status indicator dot
    var dot = document.createElement("div");
    dot.className = "hrhelper-quick-dot";
    dot.style.cssText =
      "all:initial!important;position:absolute!important;bottom:2px!important;right:2px!important;" +
      "width:12px!important;height:12px!important;border-radius:50%!important;border:2px solid #fff!important;" +
      "background:#999!important;pointer-events:none!important;transition:background .2s!important;";
    shadow.appendChild(dot);

    document.body.appendChild(shadow);
    updateDot();
  }

  function updateDot() {
    var wrapper = document.getElementById(BUTTON_ID);
    if (!wrapper) return;
    var dot = wrapper.querySelector(".hrhelper-quick-dot");
    if (!dot) return;
    var colors = { idle: "#999", loading: "#f0ad4e", linked: "#28a745", error: "#dc3545" };
    dot.style.background = colors[state.status] || "#999";
  }

  function updateTooltip(text) {
    var wrapper = document.getElementById(BUTTON_ID);
    if (!wrapper) return;
    var tip = wrapper.querySelector("div[style*='white-space:nowrap']");
    if (tip) tip.textContent = text || TOOLTIP_TEXT;
  }

  /* ── Drag ──────────────────────────────────────────────────────────── */
  function makeDraggable(el) {
    var dragging = false, wasDragged = false, startX = 0, startY = 0, origX = 0, origY = 0;

    el.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      wasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDragged = true;
      el.style.left = (origX + dx) + "px";
      el.style.top = (origY + dy) + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!dragging) return;
      dragging = false;
      if (wasDragged) {
        // Save position
        try {
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({
            top: el.offsetTop,
            left: el.offsetLeft
          }));
        } catch (_) {}
      }
    });

    // Suppress click after drag
    el.addEventListener("click", function (e) {
      if (wasDragged) {
        e.stopImmediatePropagation();
        e.preventDefault();
        wasDragged = false;
      }
    }, true);
  }

  /* ── Core logic ────────────────────────────────────────────────────── */

  /**
   * Open the extension popup in a new popup-type window.
   * The popup's getTab() parses ?url= from the query string and uses
   * chrome.tabs.query({currentWindow:true, url:…}) to locate the LinkedIn
   * tab.  Because we open the popup as a new tab in the SAME browser
   * window, that query correctly finds the LinkedIn tab.
   */
  function openPopupWindow() {
    if (!isExtensionContextValid()) return;
    var linkedinUrl = location.href;
    chrome.runtime.sendMessage(
      { action: "OPEN_POPUP_WINDOW", linkedinUrl: linkedinUrl },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn("[HRHelper] Failed to open popup window:", chrome.runtime.lastError.message);
          state.status = "error";
          updateDot();
          updateTooltip("Не удалось открыть окно");
        }
      }
    );
  }

  async function onQuickButtonClick() {
    if (state.busy) return;

    // If already linked, open the Huntflow URL directly
    if (state.status === "linked" && state.huntflowUrl) {
      window.open(state.huntflowUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Open the popup in a new window — same flow as clicking the toolbar icon
    openPopupWindow();
  }

  /* ── Initial status check ──────────────────────────────────────────── */
  async function checkInitialStatus() {
    if (!isExtensionContextValid()) return;

    state.status = "loading";
    updateDot();

    try {
      var profileUrl = normalizeLinkedInProfileUrl(location.href);
      if (!profileUrl) {
        state.status = "idle";
        updateDot();
        return;
      }
      state.profileUrl = profileUrl;

      var q = new URLSearchParams();
      q.set("linkedin_url", profileUrl);
      var res = await apiFetch(
        "/api/v1/huntflow/linkedin-applicants/status/?" + q.toString(),
        { method: "GET" }
      );
      var data = res.data;

      if (res.ok && data && (data.app_url || data.target_url)) {
        state.huntflowUrl = data.app_url || data.target_url;
        state.saved = true;
        state.status = "linked";
        updateTooltip("Открыть в Huntflow");
      } else {
        state.status = "idle";
        updateTooltip(TOOLTIP_TEXT);
      }
    } catch (_) {
      state.status = "idle";
    }
    updateDot();
  }

  /* ── SPA navigation handling ───────────────────────────────────────── */
  var lastUrl = location.href;

  function onUrlChange() {
    var nowProfile = location.href.includes("/in/") && !location.href.includes("/search/");
    var wrapper = document.getElementById(BUTTON_ID);

    if (!nowProfile) {
      // Hide button on non-profile pages
      if (wrapper) wrapper.style.display = "none";
      return;
    }

    // Show button
    if (wrapper) {
      wrapper.style.display = "";
    } else {
      createButton();
    }

    // If URL actually changed, re-check status
    var newNorm = normalizeLinkedInProfileUrl(location.href);
    var oldNorm = state.profileUrl;
    if (newNorm !== oldNorm) {
      state.profileUrl = newNorm;
      state.huntflowUrl = null;
      state.saved = false;
      state.status = "idle";
      state.busy = false;
      updateDot();
      updateTooltip(TOOLTIP_TEXT);
      checkInitialStatus();
    }
  }

  // Observe SPA navigation (LinkedIn is an SPA)
  var observer = new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also listen for popstate / pushState
  window.addEventListener("popstate", function () {
    setTimeout(function () {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onUrlChange();
      }
    }, 100);
  });

  /* ── Bootstrap ─────────────────────────────────────────────────────── */
  function init() {
    // Don't duplicate
    if (document.getElementById(BUTTON_ID)) return;

    createButton();
    checkInitialStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
