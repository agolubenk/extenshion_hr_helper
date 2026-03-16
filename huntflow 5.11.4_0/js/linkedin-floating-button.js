/**
 * Huntflow HR Helper — Floating Button for LinkedIn Profile Pages
 *
 * Adds a permanently visible floating button on LinkedIn profile pages
 * (linkedin.com/in/*). On click it opens the extension's popup (popup.html)
 * as a standalone window — exactly replicating the toolbar-icon experience.
 *
 * The popup's own getTab() helper already supports a ?url= query-param,
 * so we pass the current LinkedIn URL to let the popup resolve the correct tab.
 *
 * Communication with the background service worker:
 *   content script  →  { action: "OPEN_POPUP_WINDOW", url: <linkedin_url> }
 *   background.js   →  chrome.windows.create({ url: popup.html?url=..., type: "popup" })
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

  /* ── UI ────────────────────────────────────────────────────────────── */
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    var wrapper = document.createElement("div");
    wrapper.id = BUTTON_ID;

    // Restore saved position or default to top-left
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

    // Click → open the extension popup as a window
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPopupWindow();
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

  /* ── Open popup as a window ─────────────────────────────────────────── */
  function openPopupWindow() {
    if (!isExtensionContextValid()) {
      console.warn("[HRHelper] Extension context invalidated, cannot open popup.");
      return;
    }

    var linkedinUrl = location.href;

    // Send message to background.js to open popup/popup.html as a window.
    // Background handler: "OPEN_POPUP_WINDOW"
    chrome.runtime.sendMessage(
      { action: "OPEN_POPUP_WINDOW", url: linkedinUrl },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn("[HRHelper] sendMessage error:", chrome.runtime.lastError.message);
          // Fallback: try opening popup directly (works if popup.html is
          // listed in web_accessible_resources or opened via extension URL)
          fallbackOpenPopup(linkedinUrl);
        }
      }
    );
  }

  /** Fallback: open the popup URL directly using chrome.runtime.getURL */
  function fallbackOpenPopup(linkedinUrl) {
    try {
      var popupUrl = chrome.runtime.getURL("popup/popup.html") + "?url=" + encodeURIComponent(linkedinUrl);
      window.open(popupUrl, "huntflow_popup", "width=420,height=620,scrollbars=yes,resizable=yes");
    } catch (err) {
      console.error("[HRHelper] Fallback popup open failed:", err);
    }
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

  /* ── SPA navigation ─────────────────────────────────────────────────── */
  var lastUrl = location.href;

  function onUrlChange() {
    var nowProfile = location.href.includes("/in/") && !location.href.includes("/search/");
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
