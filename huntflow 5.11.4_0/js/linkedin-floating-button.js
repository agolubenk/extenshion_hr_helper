/**
 * Huntflow HR Helper — Floating Button for LinkedIn Profile Pages
 *
 * Adds a draggable floating button on LinkedIn profile pages (linkedin.com/in/*).
 * Clicking it opens the extension's popup — the SAME popup that appears when
 * clicking the toolbar icon — so the full candidate search/create flow runs.
 *
 * How the extension works (discovered by reading the minified source):
 *   - Popup file: popup/popup.html  (loads js/popup/popup.js, a webpack-bundled Vue app)
 *   - When the popup opens it sends {action:"open"} to the background service worker
 *   - Background injects content_scripts.js into the active tab
 *   - Popup calls chrome.tabs.sendMessage with {action:"PREPROCESS_CUSTOM_DATA"}
 *     to the content script, which extracts LinkedIn profile data
 *   - The popup then searches for the candidate in Huntflow and shows results
 *   - The popup resolves its target tab via chrome.tabs.query:
 *       • If window.location.search contains a ?url= param → queries tabs by URL
 *       • Otherwise → queries for the active tab in the current window
 *
 * Approach chosen:
 *   (a) Primary: ask background to call chrome.action.openPopup() (Chrome 127+)
 *       — opens the real popup anchored to the toolbar icon, identical UX
 *   (b) Fallback: open popup/popup.html?url=<linkedin_url> in a popup window
 *       — the ?url= param tells the popup which tab to target, so it finds
 *         the LinkedIn tab even though currentWindow differs
 */
(function () {
  "use strict";

  /* ── Guards ────────────────────────────────────────────────────────── */
  var IS_PROFILE_PAGE =
    location.href.includes("/in/") && !location.href.includes("/search/");
  if (!IS_PROFILE_PAGE) return;

  var BUTTON_ID = "hrhelper-linkedin-quick-btn";
  var TOOLTIP_TEXT = "Добавить в Huntflow";
  var STORAGE_POS_KEY = "hrhelper_quick_btn_pos";

  /* ── Helpers ───────────────────────────────────────────────────────── */
  function isExtensionContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  /* ── Open the extension popup ──────────────────────────────────────── */
  function openExtensionPopup() {
    if (!isExtensionContextValid()) return;

    // Try asking the background to open the real popup (Chrome 127+).
    // If that fails (older Chrome or API unavailable), fall back to
    // opening the popup URL in a standalone window.
    chrome.runtime.sendMessage({ action: "OPEN_POPUP" }, function (response) {
      if (chrome.runtime.lastError || !response || !response.success) {
        openPopupAsWindow();
      }
    });
  }

  function openPopupAsWindow() {
    if (!isExtensionContextValid()) return;
    try {
      var popupUrl = chrome.runtime.getURL("popup/popup.html");
      // Pass current page URL so the popup can find this tab
      popupUrl += "?url=" + encodeURIComponent(location.href);
      window.open(popupUrl, "huntflow_popup", "width=420,height=620,popup=yes");
    } catch (_) {
      // Last resort: do nothing — extension context may be dead
    }
  }

  /* ── UI ────────────────────────────────────────────────────────────── */
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    var wrapper = document.createElement("div");
    wrapper.id = BUTTON_ID;
    wrapper.style.cssText =
      "position:fixed!important;z-index:2147483647!important;top:20px!important;left:20px!important;" +
      "width:48px!important;height:48px!important;pointer-events:auto!important;";

    // Restore saved position
    try {
      var saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        var pos = JSON.parse(saved);
        if (pos.top != null) wrapper.style.top = pos.top + "px";
        if (pos.left != null) wrapper.style.left = pos.left + "px";
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

    // Click handler — open the extension popup
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openExtensionPopup();
    });

    wrapper.appendChild(btn);

    // Tooltip element
    var tooltip = document.createElement("div");
    tooltip.style.cssText =
      "all:initial!important;position:absolute!important;left:56px!important;top:50%!important;" +
      "transform:translateY(-50%)!important;background:#333!important;color:#fff!important;" +
      "font:600 12px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;" +
      "padding:6px 10px!important;border-radius:6px!important;white-space:nowrap!important;" +
      "pointer-events:none!important;opacity:0!important;transition:opacity .15s!important;z-index:1!important;";
    tooltip.textContent = TOOLTIP_TEXT;
    wrapper.appendChild(tooltip);

    btn.addEventListener("mouseenter", function () { tooltip.style.opacity = "1"; });
    btn.addEventListener("mouseleave", function () { tooltip.style.opacity = "0"; });

    // Drag support
    makeDraggable(wrapper);

    document.body.appendChild(wrapper);
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

  /* ── SPA navigation handling ───────────────────────────────────────── */
  var lastUrl = location.href;

  function onUrlChange() {
    var nowProfile = location.href.includes("/in/") && !location.href.includes("/search/");
    var el = document.getElementById(BUTTON_ID);

    if (!nowProfile) {
      if (el) el.style.display = "none";
      return;
    }

    if (el) {
      el.style.display = "";
    } else {
      createButton();
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
    if (document.getElementById(BUTTON_ID)) return;
    createButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
