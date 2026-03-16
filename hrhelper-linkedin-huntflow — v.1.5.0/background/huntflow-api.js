/**
 * Huntflow API handler for the background service worker.
 *
 * This file is loaded via importScripts() from background.js.
 * It uses the global __HRH__ namespace (self.__HRH__) to share
 * classes and state with the main service worker.
 */
(function () {
  "use strict";

  var g = typeof self !== "undefined" ? self : (typeof window !== "undefined" ? window : globalThis);
  var HRH = (g.__HRH__ = g.__HRH__ || {});

  /* ============================================================ */
  /*  HuntflowAuthManager                                         */
  /* ============================================================ */
  function HuntflowAuthManager() {
    this.token = null;
    this.accountId = null;
  }

  HuntflowAuthManager.prototype.initialize = function () {
    var self = this;
    return new Promise(function (resolve) {
      chrome.storage.local.get(["huntflow_token", "huntflow_account_id"], function (data) {
        self.token = data.huntflow_token || null;
        self.accountId = data.huntflow_account_id || null;
        resolve();
      });
    });
  };

  HuntflowAuthManager.prototype.authenticate = function (token) {
    var self = this;
    return fetch("https://api.huntflow.ai/v2/accounts", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "HR Helper Extension",
      },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Authentication failed (HTTP " + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        var items = data.items || data;
        var account = Array.isArray(items) && items.length > 0 ? items[0] : data;
        var accountId = account.id || account.account_id || null;

        if (!accountId) throw new Error("No account found");

        self.token = token;
        self.accountId = String(accountId);

        return new Promise(function (resolve) {
          chrome.storage.local.set(
            { huntflow_token: token, huntflow_account_id: self.accountId },
            function () {
              resolve({ success: true, accountId: self.accountId });
            }
          );
        });
      })
      .catch(function (err) {
        return { success: false, error: err.message };
      });
  };

  HuntflowAuthManager.prototype.isAuthenticated = function () {
    return !!(this.token && this.accountId);
  };

  HuntflowAuthManager.prototype.getToken = function () {
    return this.token;
  };

  HuntflowAuthManager.prototype.getAccountId = function () {
    return this.accountId;
  };

  HuntflowAuthManager.prototype.logout = function () {
    var self = this;
    self.token = null;
    self.accountId = null;
    return new Promise(function (resolve) {
      chrome.storage.local.remove(
        [
          "huntflow_token",
          "huntflow_account_id",
          "huntflow_default_vacancy",
          "huntflow_auto_save",
          "huntflow_notifications",
          "huntflow_error_logs",
        ],
        resolve
      );
    });
  };

  /* ============================================================ */
  /*  HuntflowAPIClient                                           */
  /* ============================================================ */
  function HuntflowAPIClient(authManager) {
    this.auth = authManager;
    this.baseURL = "https://api.huntflow.ai";
    this._retryCount = 2;
    this._retryDelay = 1000;
  }

  HuntflowAPIClient.prototype.getVacancies = function () {
    var accountId = this.auth.getAccountId();
    if (!accountId) return Promise.reject(new Error("Not authenticated"));
    return this._request("/v2/accounts/" + accountId + "/vacancies", { method: "GET" }).then(function (data) {
      var items = data.items || data;
      return Array.isArray(items)
        ? items.map(function (v) {
            return { id: v.id, position: v.position || v.name || "Vacancy #" + v.id };
          })
        : [];
    });
  };

  HuntflowAPIClient.prototype.saveCandidate = function (candidateData) {
    var self = this;
    var accountId = this.auth.getAccountId();
    if (!accountId) return Promise.reject(new Error("Not authenticated"));

    var vacancyId = candidateData.vacancy_id;
    var payload = {};
    Object.keys(candidateData).forEach(function (k) {
      if (k !== "vacancy_id") payload[k] = candidateData[k];
    });

    return this._request("/v2/accounts/" + accountId + "/applicants", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(function (result) {
      if (vacancyId && result.id) {
        return self._addToVacancy(result.id, vacancyId).then(function () {
          return result;
        });
      }
      return result;
    });
  };

  HuntflowAPIClient.prototype._addToVacancy = function (applicantId, vacancyId) {
    var accountId = this.auth.getAccountId();
    return this._request("/v2/accounts/" + accountId + "/applicants/" + applicantId + "/vacancy", {
      method: "POST",
      body: JSON.stringify({ vacancy: parseInt(vacancyId, 10), status: 1 }),
    });
  };

  HuntflowAPIClient.prototype._request = function (path, options, retriesLeft) {
    var self = this;
    if (typeof retriesLeft === "undefined") retriesLeft = this._retryCount;
    var token = this.auth.getToken();
    if (!token) return Promise.reject(new Error("No authentication token"));

    var url = this.baseURL + path;
    var fetchOptions = {
      method: options.method || "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "HR Helper Extension",
      },
    };
    if (options.body) fetchOptions.body = options.body;

    return fetch(url, fetchOptions).then(function (res) {
      if (res.ok) return res.json();

      if (retriesLeft > 0 && (res.status === 429 || res.status >= 500)) {
        var delay = res.status === 429 ? self._retryDelay * 2 : self._retryDelay;
        return new Promise(function (resolve) {
          setTimeout(resolve, delay);
        }).then(function () {
          return self._request(path, options, retriesLeft - 1);
        });
      }

      return res.text().then(function (body) {
        var msg = "HTTP " + res.status;
        try {
          var json = JSON.parse(body);
          msg = json.message || json.error || json.detail || msg;
        } catch (_) {}
        throw new Error(msg);
      });
    });
  };

  /* ============================================================ */
  /*  DataTransformer                                              */
  /* ============================================================ */
  function DataTransformer() {}

  DataTransformer.prototype.transformLinkedInToHuntflow = function (linkedinData) {
    var names = this._splitName(linkedinData.fullName || "");
    return {
      first_name: names.firstName || "Unknown",
      last_name: names.lastName || "",
      phone: this._extractPhone(linkedinData.contactInfo),
      email: this._extractEmail(linkedinData.contactInfo),
      position: linkedinData.headline || linkedinData.currentPosition || "",
      company: linkedinData.currentCompany || "",
      photo: linkedinData.profilePhoto ? { url: linkedinData.profilePhoto } : undefined,
      externals: [
        {
          data: { body: linkedinData.profileUrl || "", name: "LinkedIn" },
          auth_type: "NATIVE",
        },
      ],
      links: linkedinData.profileUrl ? [{ url: linkedinData.profileUrl, status: 200 }] : [],
      tags: this._generateTags(linkedinData),
    };
  };

  DataTransformer.prototype._splitName = function (fullName) {
    var parts = (fullName || "").trim().split(/\s+/);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
  };

  DataTransformer.prototype._extractPhone = function (contactInfo) {
    if (!contactInfo) return "";
    var m = contactInfo.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return m ? m[0] : "";
  };

  DataTransformer.prototype._extractEmail = function (contactInfo) {
    if (!contactInfo) return "";
    var m = contactInfo.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : "";
  };

  DataTransformer.prototype._generateTags = function (linkedinData) {
    var tags = [];
    if (linkedinData.location) tags.push({ name: linkedinData.location });
    if (Array.isArray(linkedinData.skills)) {
      linkedinData.skills.slice(0, 5).forEach(function (s) {
        tags.push({ name: s });
      });
    }
    tags.push({ name: "LinkedIn" });
    tags.push({ name: "HR Helper" });
    return tags;
  };

  /* ============================================================ */
  /*  HuntflowErrorHandler                                        */
  /* ============================================================ */
  var HuntflowErrorHandler = {};

  HuntflowErrorHandler.handle = function (error, context) {
    var info = {
      message: error.message || String(error),
      stack: error.stack || "",
      context: context || "",
      timestamp: new Date().toISOString(),
    };
    console.error("[Huntflow Error]", info);
    HuntflowErrorHandler.saveErrorLog(info);
    return HuntflowErrorHandler.getUserMessage(error);
  };

  HuntflowErrorHandler.saveErrorLog = function (errorInfo) {
    chrome.storage.local.get({ huntflow_error_logs: [] }, function (data) {
      var logs = data.huntflow_error_logs || [];
      logs.push(errorInfo);
      if (logs.length > 50) logs = logs.slice(-50);
      chrome.storage.local.set({ huntflow_error_logs: logs });
    });
  };

  HuntflowErrorHandler.getUserMessage = function (error) {
    var msg = (error.message || "").toLowerCase();
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return "Network error. Please check your connection.";
    }
    if (msg.includes("auth") || msg.includes("401") || msg.includes("403")) {
      return "Authentication failed. Please reconnect your Huntflow account.";
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    return "An error occurred. Please try again.";
  };

  /* ============================================================ */
  /*  VacancyCache                                                 */
  /* ============================================================ */
  function VacancyCache(ttlMs) {
    this._cache = null;
    this._cacheTime = 0;
    this._ttl = ttlMs || 300000;
  }

  VacancyCache.prototype.get = function (apiClient) {
    var self = this;
    var now = Date.now();
    if (self._cache && now - self._cacheTime < self._ttl) {
      return Promise.resolve(self._cache);
    }
    return apiClient.getVacancies().then(function (v) {
      self._cache = v;
      self._cacheTime = Date.now();
      return v;
    });
  };

  VacancyCache.prototype.invalidate = function () {
    this._cache = null;
    this._cacheTime = 0;
  };

  /* ============================================================ */
  /*  Expose on namespace                                          */
  /* ============================================================ */
  HRH.HuntflowAuthManager = HuntflowAuthManager;
  HRH.HuntflowAPIClient = HuntflowAPIClient;
  HRH.DataTransformer = DataTransformer;
  HRH.HuntflowErrorHandler = HuntflowErrorHandler;
  HRH.VacancyCache = VacancyCache;
})();
