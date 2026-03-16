/**
 * Huntflow HR Helper — Floating Button for LinkedIn Profile Pages
 *
 * Adds a permanently visible, draggable floating button on LinkedIn profile
 * pages (linkedin.com/in/*).  Clicking the button programmatically opens the
 * real extension popup via chrome.action.openPopup() — exactly the same as
 * clicking the toolbar icon.
 */
(function () {
  "use strict";

  /* ── DISABLED: Floating button moved into HR Helper widget ──────── */
  /* The Huntflow popup button is now integrated into the HR Helper
     floating widget (hrhelper-linkedin-huntflow/content.js).
     This standalone floating button is no longer needed. */
  return;

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

  /* ── UI: create button ─────────────────────────────────────────────── */
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    var wrapper = document.createElement("div");
    wrapper.id = BUTTON_ID;

    // Restore saved position or use default (top-left)
    var posTop = 20, posLeft = 20;
    try {
      var saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        var pos = JSON.parse(saved);
        if (pos.top != null) posTop = pos.top;
        if (pos.left != null) posLeft = pos.left;
      }
    } catch (_) {}

    wrapper.style.cssText =
      "position:fixed!important;z-index:2147483647!important;" +
      "top:" + posTop + "px!important;left:" + posLeft + "px!important;" +
      "width:48px!important;height:48px!important;pointer-events:auto!important;";

    // Main button
    var btn = document.createElement("button");
    btn.type = "button";
    btn.title = TOOLTIP_TEXT;
    btn.setAttribute("aria-label", TOOLTIP_TEXT);
    btn.style.cssText =
      "all:initial!important;display:flex!important;align-items:center!important;justify-content:center!important;" +
      "width:48px!important;height:48px!important;border-radius:50%!important;border:2px solid #0a66c2!important;" +
      "background:#fff!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(0,0,0,.25)!important;" +
      "transition:transform .15s ease,box-shadow .15s ease!important;padding:0!important;";

    // Icon
    var iconUrl = "";
    try { iconUrl = chrome.runtime.getURL("icons/64.png"); } catch (_) {}
    var img = document.createElement("img");
    img.src = iconUrl;
    img.alt = "Huntflow";
    img.style.cssText =
      "width:32px!important;height:32px!important;border-radius:50%!important;pointer-events:none!important;";
    btn.appendChild(img);

    // Hover
    btn.addEventListener("mouseenter", function () {
      btn.style.transform = "scale(1.1)";
      btn.style.boxShadow = "0 4px 16px rgba(0,0,0,.35)";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 2px 8px rgba(0,0,0,.25)";
    });

    // Click → open REAL extension popup
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openExtensionPopup();
    });

    wrapper.appendChild(btn);

    // Tooltip
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

  /* ── Open the REAL extension popup ──────────────────────────────────── */
  /**
   * Sends a message to the background service worker asking it to call
   * chrome.action.openPopup() — this opens the actual extension popup
   * (the same one as clicking the toolbar icon).
   *
   * The popup then uses its own getTab() with {currentWindow:true, active:true}
   * to find the LinkedIn tab — which works because the popup opens in the
   * context of the same browser window.
   */
  function openExtensionPopup() {
    if (!isExtensionContextValid()) {
      console.warn("[HRHelper] Extension context invalidated.");
      return;
    }

    chrome.runtime.sendMessage(
      { action: "HRHELPER_OPEN_REAL_POPUP" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn("[HRHelper] Could not open popup:", chrome.runtime.lastError.message);
        }
      }
    );
  }

  /* ── Drag ──────────────────────────────────────────────────────────── */
  function makeDraggable(el) {
    var dragging = false, wasDragged = false;
    var startX = 0, startY = 0, origX = 0, origY = 0;

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
    var nowProfile =
      location.href.includes("/in/") && !location.href.includes("/search/");
    var wrapper = document.getElementById(BUTTON_ID);

    if (!nowProfile) {
      if (wrapper) wrapper.style.display = "none";
      return;
    }

    if (wrapper) {
      wrapper.style.display = "";
    } else {
      createButton();
    }
  }

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
