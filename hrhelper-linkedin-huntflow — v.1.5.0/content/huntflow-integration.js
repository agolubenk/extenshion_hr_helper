/**
 * HuntflowButton — UI component for the Huntflow section inside the
 * existing HR Helper floating panel on LinkedIn profile pages.
 *
 * Loaded as a content script (not an ES module).
 * Communicates with the background worker via chrome.runtime.sendMessage.
 */
(function () {
  "use strict";

  var HRH = window.__HRH__ || {};
  var HF = (HRH.HUNTFLOW = HRH.HUNTFLOW || {});
  var MSG = (HF.MESSAGE_TYPES = HF.MESSAGE_TYPES || {
    CHECK_AUTH: "HUNTFLOW_CHECK_AUTH",
    AUTHENTICATE: "HUNTFLOW_AUTHENTICATE",
    GET_VACANCIES: "HUNTFLOW_GET_VACANCIES",
    SAVE_CANDIDATE: "HUNTFLOW_SAVE_CANDIDATE",
    LOGOUT: "HUNTFLOW_LOGOUT",
  });
  var UI_CONSTANTS = HF.UI || { SUCCESS_RESET_MS: 3000, DEBOUNCE_MS: 300 };

  /* ------------------------------------------------------------------ */
  /*  Vacancy cache (content-side, mirrors background TTL)              */
  /* ------------------------------------------------------------------ */
  var _vacancyCache = null;
  var _vacancyCacheTime = 0;
  var VACANCY_CACHE_TTL = (HF.CACHE && HF.CACHE.VACANCY_TTL_MS) || 300000;

  /* ------------------------------------------------------------------ */
  /*  Simple debounce                                                    */
  /* ------------------------------------------------------------------ */
  function debounce(fn, wait) {
    var timer;
    return function () {
      var ctx = this,
        args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  /* ------------------------------------------------------------------ */
  /*  HuntflowButton class                                              */
  /* ------------------------------------------------------------------ */
  function HuntflowButton(floatingPanel) {
    this.panel = floatingPanel;
    this.container = null;
    this.state = "checking"; // checking | not-authenticated | idle | loading | success | error
    this.vacancies = [];
    this.selectedVacancy = null;
    this.errorMessage = "";
    this.savedCandidateUrl = "";
    this._debouncedRender = debounce(this._rerender.bind(this), UI_CONSTANTS.DEBOUNCE_MS);
  }

  /* ---------- public api ---------- */

  HuntflowButton.prototype.initialize = function () {
    var self = this;
    this._injectSection();
    this._checkAuth().then(function (authenticated) {
      if (authenticated) {
        self.state = "idle";
        self._loadVacancies().then(function () {
          self._rerender();
          self._attachEventListeners();
        });
      } else {
        self.state = "not-authenticated";
        self._rerender();
        self._attachEventListeners();
      }
    });
    this._addKeyboardShortcuts();
    this._addAccessibility();
  };

  /* ---------- dom injection ---------- */

  HuntflowButton.prototype._injectSection = function () {
    var section = document.createElement("div");
    section.className = "huntflow-section";
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", "Huntflow integration");
    section.innerHTML =
      '<div class="huntflow-header">' +
      '  <svg class="huntflow-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '    <rect width="20" height="20" rx="4" fill="#667eea"/>' +
      '    <text x="10" y="14" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">H</text>' +
      "  </svg>" +
      '  <span class="huntflow-title">Save to Huntflow</span>' +
      "</div>" +
      '<div class="huntflow-content" aria-live="polite"></div>';

    var header = this.panel.querySelector(".hrhelper-widget-header, .panel-header, [class*=header]");
    if (header) {
      header.insertAdjacentElement("afterend", section);
    } else {
      this.panel.prepend(section);
    }
    this.container = section;
  };

  /* ---------- rendering ---------- */

  HuntflowButton.prototype._rerender = function () {
    if (!this.container) return;
    var content = this.container.querySelector(".huntflow-content");
    if (!content) return;
    content.innerHTML = this._renderContent();
    this._attachEventListeners();
    this._announceState();
  };

  HuntflowButton.prototype._renderContent = function () {
    switch (this.state) {
      case "checking":
        return (
          '<div class="huntflow-loading">' +
          '  <div class="spinner"></div>' +
          "  <p>Checking Huntflow connection\u2026</p>" +
          "</div>"
        );

      case "not-authenticated":
        return (
          '<div class="huntflow-auth">' +
          "  <p>Connect your Huntflow account to save candidates</p>" +
          '  <button class="btn-huntflow-connect" id="huntflow-connect-btn" aria-label="Connect Huntflow account">' +
          "    \uD83D\uDD10 Connect Huntflow" +
          "  </button>" +
          "</div>"
        );

      case "loading":
        return (
          '<div class="huntflow-loading">' +
          '  <div class="spinner"></div>' +
          "  <p>Saving to Huntflow\u2026</p>" +
          "</div>"
        );

      case "success":
        return (
          '<div class="huntflow-success">' +
          '  <div class="success-icon">\u2705</div>' +
          "  <p>Candidate saved successfully!</p>" +
          (this.savedCandidateUrl
            ? '<button class="btn-view-huntflow" id="huntflow-view-btn" aria-label="View candidate in Huntflow">View in Huntflow</button>'
            : "") +
          "</div>"
        );

      case "error":
        return (
          '<div class="huntflow-error">' +
          '  <div class="error-icon">\u274C</div>' +
          "  <p>" +
          this._escapeHtml(this.errorMessage || "An error occurred") +
          "</p>" +
          '  <button class="btn-retry" id="huntflow-retry-btn" aria-label="Retry saving candidate">Retry</button>' +
          "</div>"
        );

      default:
        // idle — ready to save
        return (
          '<div class="huntflow-form">' +
          '  <div class="form-group">' +
          '    <label for="vacancy-select">Select Vacancy:</label>' +
          '    <select id="vacancy-select" class="vacancy-dropdown" aria-label="Select vacancy">' +
          '      <option value="">No specific vacancy</option>' +
          this.vacancies
            .map(function (v) {
              return '<option value="' + v.id + '">' + this._escapeHtml(v.position) + "</option>";
            }.bind(this))
            .join("") +
          "    </select>" +
          "  </div>" +
          '  <button class="btn-huntflow-save" id="huntflow-save-btn" aria-label="Save candidate to Huntflow">' +
          "    \uD83D\uDCBE Save Candidate" +
          "  </button>" +
          "</div>"
        );
    }
  };

  /* ---------- event listeners ---------- */

  HuntflowButton.prototype._attachEventListeners = function () {
    if (!this.container) return;
    var self = this;

    var connectBtn = this.container.querySelector("#huntflow-connect-btn");
    if (connectBtn) {
      connectBtn.addEventListener("click", function () {
        self._openSettings();
      });
    }

    var saveBtn = this.container.querySelector("#huntflow-save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        self._saveCandidate();
      });
    }

    var retryBtn = this.container.querySelector("#huntflow-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        self._saveCandidate();
      });
    }

    var viewBtn = this.container.querySelector("#huntflow-view-btn");
    if (viewBtn) {
      viewBtn.addEventListener("click", function () {
        if (self.savedCandidateUrl) {
          window.open(self.savedCandidateUrl, "_blank");
        }
      });
    }

    var vacancySelect = this.container.querySelector("#vacancy-select");
    if (vacancySelect) {
      vacancySelect.addEventListener("change", function (e) {
        self.selectedVacancy = e.target.value || null;
      });
      // Restore selection if we have a default
      if (self.selectedVacancy && vacancySelect.querySelector('option[value="' + self.selectedVacancy + '"]')) {
        vacancySelect.value = self.selectedVacancy;
      }
    }
  };

  /* ---------- core actions ---------- */

  HuntflowButton.prototype._checkAuth = function () {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({ type: MSG.CHECK_AUTH }, function (response) {
          resolve(response && response.authenticated);
        });
      } catch (_) {
        resolve(false);
      }
    });
  };

  HuntflowButton.prototype._loadVacancies = function () {
    var self = this;
    var now = Date.now();

    if (_vacancyCache && now - _vacancyCacheTime < VACANCY_CACHE_TTL) {
      self.vacancies = _vacancyCache;
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({ type: MSG.GET_VACANCIES }, function (response) {
          if (response && response.success && Array.isArray(response.vacancies)) {
            self.vacancies = response.vacancies;
            _vacancyCache = response.vacancies;
            _vacancyCacheTime = Date.now();
          }
          // Load default vacancy from storage
          chrome.storage.local.get("huntflow_default_vacancy", function (data) {
            if (data && data.huntflow_default_vacancy) {
              self.selectedVacancy = data.huntflow_default_vacancy;
            }
            resolve();
          });
        });
      } catch (_) {
        resolve();
      }
    });
  };

  HuntflowButton.prototype._saveCandidate = function () {
    var self = this;
    self._setState("loading");

    var candidateData = self._gatherCandidateData();

    chrome.runtime.sendMessage(
      {
        type: MSG.SAVE_CANDIDATE,
        data: {
          candidate: candidateData,
          vacancyId: self.selectedVacancy || null,
        },
      },
      function (result) {
        if (result && result.success) {
          self.savedCandidateUrl = result.candidateUrl || "";
          self._setState("success");
          setTimeout(function () {
            self._setState("idle");
          }, UI_CONSTANTS.SUCCESS_RESET_MS);
        } else {
          self._setState("error", (result && result.error) || "Failed to save candidate");
        }
      }
    );
  };

  HuntflowButton.prototype._gatherCandidateData = function () {
    // Collect data from the LinkedIn page and/or the HR Helper panel
    var data = {};

    // Try to get data from the HR Helper global state
    if (window.__HRH__ && window.__HRH__.currentProfile) {
      return window.__HRH__.currentProfile;
    }

    // Fallback: scrape basic info from the page
    var nameEl = document.querySelector("h1.text-heading-xlarge, h1.inline.t-24, .pv-text-details__left-panel h1");
    if (nameEl) data.fullName = nameEl.textContent.trim();

    var headlineEl = document.querySelector(".text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium");
    if (headlineEl) data.headline = headlineEl.textContent.trim();

    var locationEl = document.querySelector(".text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel span.text-body-small");
    if (locationEl) data.location = locationEl.textContent.trim();

    var photoEl = document.querySelector(".pv-top-card-profile-picture__image, .profile-photo-edit__preview, img.pv-top-card-profile-picture__image--show");
    if (photoEl) data.profilePhoto = photoEl.src;

    data.profileUrl = window.location.href.split("?")[0];

    // Try to get current company from experience section
    var expEl = document.querySelector(".pv-text-details__right-panel .inline-show-more-text, .experience-group-header, [data-field='experience_company']");
    if (expEl) data.currentCompany = expEl.textContent.trim();

    return data;
  };

  /* ---------- state management ---------- */

  HuntflowButton.prototype._setState = function (newState, errorMessage) {
    this.state = newState;
    this.errorMessage = errorMessage || "";
    this._debouncedRender();
  };

  /* ---------- navigation ---------- */

  HuntflowButton.prototype._openSettings = function () {
    chrome.runtime.sendMessage({ type: "HRHELPER_OPEN_OPTIONS", tab: "huntflow" });
  };

  /* ---------- accessibility ---------- */

  HuntflowButton.prototype._addKeyboardShortcuts = function () {
    var self = this;
    document.addEventListener("keydown", function (e) {
      // Alt+H - focus Huntflow section
      if (e.altKey && (e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (self.container) {
          self.container.scrollIntoView({ behavior: "smooth" });
          var btn = self.container.querySelector("button");
          if (btn) btn.focus();
        }
      }
      // Alt+S - quick save
      if (e.altKey && (e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        var saveBtn = document.getElementById("huntflow-save-btn");
        if (saveBtn && !saveBtn.disabled) {
          saveBtn.click();
        }
      }
    });
  };

  HuntflowButton.prototype._addAccessibility = function () {
    if (!this.container) return;
    this.container.setAttribute("tabindex", "-1");
  };

  HuntflowButton.prototype._announceState = function () {
    var message = "";
    switch (this.state) {
      case "loading":
        message = "Saving candidate to Huntflow";
        break;
      case "success":
        message = "Candidate saved successfully";
        break;
      case "error":
        message = "Error: " + this.errorMessage;
        break;
    }
    if (!message) return;
    var announcer = document.createElement("div");
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    announcer.className = "sr-only";
    announcer.textContent = message;
    document.body.appendChild(announcer);
    setTimeout(function () {
      announcer.remove();
    }, 1000);
  };

  /* ---------- utils ---------- */

  HuntflowButton.prototype._escapeHtml = function (str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  /* ------------------------------------------------------------------ */
  /*  Bootstrap: wait for the floating panel then attach                */
  /* ------------------------------------------------------------------ */
  function waitForPanel(callback, maxAttempts) {
    var attempts = 0;
    var max = maxAttempts || 50;
    var interval = setInterval(function () {
      attempts++;
      var panel =
        document.querySelector(".hrhelper-widget") ||
        document.querySelector(".hrhelper-floating-panel") ||
        document.querySelector("[class*='hrhelper']");
      if (panel) {
        clearInterval(interval);
        callback(panel);
      } else if (attempts >= max) {
        clearInterval(interval);
      }
    }, 500);
  }

  function init() {
    // Only run on LinkedIn profile pages
    if (!/linkedin\.com\/in\//i.test(window.location.href)) return;

    waitForPanel(function (panel) {
      var btn = new HuntflowButton(panel);
      btn.initialize();
      // Expose for debugging / other modules
      window.__HRH__ = window.__HRH__ || {};
      window.__HRH__._huntflowButton = btn;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for testing
  if (typeof module !== "undefined" && module.exports) {
    module.exports = HuntflowButton;
  }
})();
