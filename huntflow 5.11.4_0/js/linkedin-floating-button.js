/**
 * Huntflow HR Helper — Floating Button for LinkedIn Profile Pages
 *
 * Adds a permanently visible floating button in the top-left corner of LinkedIn
 * profile pages (linkedin.com/in/*). On click it triggers the same candidate
 * creation / open-in-Huntflow logic that the main extension already uses.
 *
 * Communication with the background service worker uses the standard
 * { type: "HRHELPER_API", payload } message format via chrome.runtime.sendMessage.
 */
(function () {
  "use strict";

  /* ── Guards ────────────────────────────────────────────────────────── */
  const IS_PROFILE_PAGE =
    location.href.includes("/in/") && !location.href.includes("/search/");
  if (!IS_PROFILE_PAGE) return;

  const BUTTON_ID = "hrhelper-linkedin-quick-btn";
  const POPUP_OVERLAY_ID = "hrhelper-linkedin-popup-overlay";
  const STORAGE_POS_KEY = "hrhelper_quick_btn_pos";

  /* ── Helpers ───────────────────────────────────────────────────────── */
  function isExtensionContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function apiFetch(path, init) {
    init = init || {};
    var method = init.method || "GET";
    var body = init.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = undefined; }
    }
    if (!isExtensionContextValid()) {
      return Promise.resolve({ ok: false, status: 0, json: function () { return Promise.resolve({ success: false, message: "Extension context invalidated." }); } });
    }
    return new Promise(function (resolve, reject) {
      try {
        chrome.runtime.sendMessage(
          { type: "HRHELPER_API", payload: { path: path, method: method, body: body } },
          function (response) {
            if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
            var r = response;
            resolve({
              ok: !!(r && r.ok),
              status: (r && r.status) || 0,
              json: function () { return Promise.resolve(r && r.json != null ? r.json : null); }
            });
          }
        );
      } catch (err) { reject(err); }
    }).catch(function () {
      return { ok: false, status: 0, json: function () { return Promise.resolve(null); } };
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
    btn.setAttribute("aria-label", "Huntflow");
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

  /* ── Popup overlay (same tab, under button) ─────────────────────────── */
  function positionPanelUnderButton(panel) {
    var btn = document.getElementById(BUTTON_ID);
    if (!btn || !panel) return;
    var rect = btn.getBoundingClientRect();
    var gap = 8;
    var w = 400;
    var h = Math.min(600, window.innerHeight - rect.bottom - gap - 20);
    var top = rect.bottom + gap;
    var left = rect.left;
    if (left + w > window.innerWidth) left = window.innerWidth - w - 10;
    if (left < 10) left = 10;
    if (top + h > window.innerHeight - 10) top = Math.max(10, rect.top - h - gap);
    panel.style.top = top + "px";
    panel.style.left = left + "px";
    panel.style.width = w + "px";
    panel.style.height = h + "px";
  }

  function showPopupInTab() {
    var overlay = document.getElementById(POPUP_OVERLAY_ID);
    if (overlay) {
      var wasHidden = overlay.style.display === "none";
      overlay.style.display = wasHidden ? "block" : "none";
      if (wasHidden) {
        var panel = overlay.querySelector("div[data-hrhelper-panel]");
        if (panel) positionPanelUnderButton(panel);
      }
      return;
    }
    overlay = document.createElement("div");
    overlay.id = POPUP_OVERLAY_ID;
    overlay.style.cssText =
      "position:fixed!important;inset:0!important;z-index:2147483646!important;" +
      "background:rgba(0,0,0,.4)!important;pointer-events:auto!important;";
    var panel = document.createElement("div");
    panel.setAttribute("data-hrhelper-panel", "1");
    panel.style.cssText =
      "position:fixed!important;width:400px!important;max-width:95vw!important;" +
      "height:600px!important;max-height:90vh!important;background:#fff!important;" +
      "border-radius:12px!important;box-shadow:0 8px 32px rgba(0,0,0,.25)!important;" +
      "overflow:hidden!important;";
    positionPanelUnderButton(panel);
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Закрыть");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      "position:absolute!important;top:8px!important;right:8px!important;z-index:10!important;" +
      "width:32px!important;height:32px!important;border:none!important;background:rgba(0,0,0,.08)!important;" +
      "border-radius:50%!important;font:24px/1 sans-serif!important;cursor:pointer!important;" +
      "color:#333!important;display:flex!important;align-items:center!important;justify-content:center!important;";
    closeBtn.addEventListener("click", function () {
      overlay.style.display = "none";
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.style.display = "none";
    });
    var iframe = document.createElement("iframe");
    try {
      iframe.src = chrome.runtime.getURL("popup/popup.html");
    } catch (_) {}
    iframe.style.cssText =
      "width:100%!important;height:100%!important;border:none!important;display:block!important;";
    panel.appendChild(closeBtn);
    panel.appendChild(iframe);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
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
  async function onQuickButtonClick() {
    if (state.busy) return;

    // If already linked, open the Huntflow URL directly
    if (state.status === "linked" && state.huntflowUrl) {
      window.open(state.huntflowUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Show popup in the same tab as overlay (iframe)
    showPopupInTab();

    // Otherwise, try to make the existing floating widget visible and focused
    // First try: find and click the existing extension's action button
    var existingBtn = document.querySelector(".hrhelper-action-btn");
    if (existingBtn) {
      existingBtn.click();
      return;
    }

    // Second try: make the existing floating widget visible
    var existingWidget = document.querySelector("[data-hrhelper-floating='true']");
    if (existingWidget) {
      existingWidget.style.display = "";
      existingWidget.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Also update storage to mark it as visible
      try {
        chrome.storage.local.set({ hrhelper_linkedin_floating_hidden: false });
      } catch (_) {}
      return;
    }

    // Third try: send a message to trigger floating widget display
    // This uses the same message format the popup uses
    try {
      chrome.storage.local.set({ hrhelper_linkedin_floating_hidden: false });
    } catch (_) {}

    // If no existing widget, we trigger the status check ourselves and
    // provide the same UX: open Huntflow if linked, or show the set-link
    // API call flow
    state.busy = true;
    state.status = "loading";
    updateDot();

    try {
      var profileUrl = normalizeLinkedInProfileUrl(location.href);
      if (!profileUrl) {
        state.status = "error";
        updateDot();
        return;
      }

      var q = new URLSearchParams();
      q.set("linkedin_url", profileUrl);
      var res = await apiFetch(
        "/api/v1/huntflow/linkedin-applicants/status/?" + q.toString(),
        { method: "GET" }
      );
      var data = await res.json();

      if (res.ok && data) {
        if (data.app_url || data.target_url) {
          // Candidate already exists in Huntflow
          state.huntflowUrl = data.app_url || data.target_url;
          state.saved = true;
          state.status = "linked";
          updateDot();
          window.open(state.huntflowUrl, "_blank", "noopener,noreferrer");
        } else {
          // Candidate not yet in Huntflow — make the extension's widget visible
          state.status = "idle";
          updateDot();

          // Attempt to show the extension's floating widget
          try {
            chrome.storage.local.set({ hrhelper_linkedin_floating_hidden: false });
          } catch (_) {}
          // Re-check for the widget (might appear after storage update)
          setTimeout(function () {
            var w = document.querySelector("[data-hrhelper-floating='true']");
            if (w) {
              w.style.display = "";
              w.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }, 300);
        }
      } else {
        state.status = "error";
        updateDot();
      }
    } catch (err) {
      state.status = "error";
      updateDot();
    } finally {
      state.busy = false;
    }
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
      var data = await res.json();

      if (res.ok && data && (data.app_url || data.target_url)) {
        state.huntflowUrl = data.app_url || data.target_url;
        state.saved = true;
        state.status = "linked";
      } else {
        state.status = "idle";
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
