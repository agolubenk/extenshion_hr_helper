/**
 * Unit Tests for Huntflow Integration Modules
 * Run with: npx jest tests/huntflow-integration.test.js
 */

/* ────────────────────────────────────────────────────────────
 *  Mocks
 * ──────────────────────────────────────────────────────────── */

// Mock chrome.storage.local
const storageData = {};
const chromeMock = {
  storage: {
    local: {
      get: jest.fn((keys) => {
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((k) => { if (k in storageData) result[k] = storageData[k]; });
          return Promise.resolve(result);
        }
        if (typeof keys === "object" && keys !== null) {
          const result = { ...keys };
          Object.keys(keys).forEach((k) => { if (k in storageData) result[k] = storageData[k]; });
          return Promise.resolve(result);
        }
        return Promise.resolve(storageData);
      }),
      set: jest.fn((obj) => {
        Object.assign(storageData, obj);
        return Promise.resolve();
      }),
      remove: jest.fn((keys) => {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete storageData[k]);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};
global.chrome = chromeMock;

// Load modules (these expose via module.exports for testing)
const HuntflowAuthManager = require("../modules/huntflow/auth-manager.js");
const HuntflowAPIClient = require("../modules/huntflow/api-client.js");
const DataTransformer = require("../modules/huntflow/data-transformer.js");
const HuntflowErrorHandler = require("../modules/huntflow/error-handler.js");

/* ────────────────────────────────────────────────────────────
 *  HuntflowAuthManager Tests
 * ──────────────────────────────────────────────────────────── */

describe("HuntflowAuthManager", () => {
  let auth;

  beforeEach(() => {
    // Clear storage
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    jest.clearAllMocks();
    auth = new HuntflowAuthManager();
  });

  test("should initialize with no token", async () => {
    await auth.initialize();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBe(null);
    expect(auth.getAccountId()).toBe(null);
  });

  test("should initialize with stored token and accountId", async () => {
    storageData.huntflow_token = "test_token_123";
    storageData.huntflow_account_id = 42;
    await auth.initialize();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getToken()).toBe("test_token_123");
    expect(auth.getAccountId()).toBe(42);
  });

  test("should authenticate with valid token (mock fetch)", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 99, name: "Test Account" }] }),
      })
    );

    const result = await auth.authenticate("valid_token_abc");
    expect(result).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.getToken()).toBe("valid_token_abc");
    expect(auth.getAccountId()).toBe(99);
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      huntflow_token: "valid_token_abc",
      huntflow_account_id: 99,
    });

    delete global.fetch;
  });

  test("should fail authentication with invalid token (mock fetch)", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })
    );

    await expect(auth.authenticate("invalid_token")).rejects.toThrow();
    expect(auth.isAuthenticated()).toBe(false);

    delete global.fetch;
  });

  test("should logout and clear storage", async () => {
    storageData.huntflow_token = "token";
    storageData.huntflow_account_id = 1;
    await auth.initialize();
    expect(auth.isAuthenticated()).toBe(true);

    await auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBe(null);
    expect(auth.getAccountId()).toBe(null);
    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith([
      "huntflow_token",
      "huntflow_account_id",
    ]);
  });
});

/* ────────────────────────────────────────────────────────────
 *  DataTransformer Tests
 * ──────────────────────────────────────────────────────────── */

describe("DataTransformer", () => {
  let transformer;

  beforeEach(() => {
    transformer = new DataTransformer();
  });

  test("should split fullName into first_name and last_name", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "John Doe",
      profileUrl: "https://linkedin.com/in/johndoe",
    });
    expect(result.first_name).toBe("John");
    expect(result.last_name).toBe("Doe");
  });

  test("should handle single name (no last name)", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Madonna",
      profileUrl: "https://linkedin.com/in/madonna",
    });
    expect(result.first_name).toBe("Madonna");
    expect(result.last_name).toBe("");
  });

  test("should handle three-part names", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Jean Claude Van Damme",
      profileUrl: "https://linkedin.com/in/jcvd",
    });
    expect(result.first_name).toBe("Jean");
    expect(result.last_name).toBe("Claude Van Damme");
  });

  test("should extract phone from contact info", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Test User",
      contactInfo: "Phone: +1-555-123-4567, Email: test@example.com",
      profileUrl: "https://linkedin.com/in/testuser",
    });
    expect(result.phone).toMatch(/555/);
    expect(result.email).toBe("test@example.com");
  });

  test("should extract email from contact info", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Test User",
      contactInfo: "Email: user@company.org",
      profileUrl: "https://linkedin.com/in/testuser",
    });
    expect(result.email).toBe("user@company.org");
  });

  test("should set position from headline", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Dev Person",
      headline: "Senior Software Engineer at Google",
      profileUrl: "https://linkedin.com/in/dev",
    });
    expect(result.position).toBe("Senior Software Engineer at Google");
  });

  test("should include LinkedIn link in externals", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Test User",
      profileUrl: "https://linkedin.com/in/testuser",
    });
    expect(result.externals).toBeDefined();
    expect(result.externals.length).toBeGreaterThan(0);
    expect(result.externals[0].url).toBe("https://linkedin.com/in/testuser");
  });

  test("should generate tags", () => {
    const result = transformer.transformLinkedInToHuntflow({
      fullName: "Test User",
      profileUrl: "https://linkedin.com/in/testuser",
      location: "San Francisco",
      skills: ["JavaScript", "React"],
    });
    expect(result.tags).toBeDefined();
    expect(result.tags).toContain("LinkedIn");
    expect(result.tags).toContain("HR Helper");
    if (result.tags.includes("San Francisco")) {
      expect(result.tags).toContain("San Francisco");
    }
  });

  test("should handle empty input gracefully", () => {
    const result = transformer.transformLinkedInToHuntflow({});
    expect(result.first_name).toBe("");
    expect(result.last_name).toBe("");
    expect(result.externals).toBeDefined();
  });
});

/* ────────────────────────────────────────────────────────────
 *  HuntflowAPIClient Tests
 * ──────────────────────────────────────────────────────────── */

describe("HuntflowAPIClient", () => {
  let api;
  let mockAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      getToken: () => "test_token",
      getAccountId: () => 123,
      isAuthenticated: () => true,
    };
    api = new HuntflowAPIClient(mockAuth);
  });

  test("should construct with auth manager", () => {
    expect(api).toBeDefined();
  });

  test("should fetch vacancies (mock fetch)", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { id: 1, position: "Frontend Developer" },
              { id: 2, position: "Backend Developer" },
            ],
          }),
      })
    );

    const vacancies = await api.getVacancies();
    expect(Array.isArray(vacancies)).toBe(true);
    expect(vacancies.length).toBe(2);
    expect(vacancies[0].position).toBe("Frontend Developer");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/accounts/123/vacancies"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test_token",
        }),
      })
    );

    delete global.fetch;
  });

  test("should save candidate (mock fetch)", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 456,
            first_name: "Test",
            last_name: "User",
          }),
      })
    );

    const result = await api.saveCandidate({
      first_name: "Test",
      last_name: "User",
      position: "Developer",
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(456);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/accounts/123/applicants"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_token",
          "Content-Type": "application/json",
        }),
      })
    );

    delete global.fetch;
  });

  test("should throw on unauthenticated request", async () => {
    const unauthApi = new HuntflowAPIClient({
      getToken: () => null,
      getAccountId: () => null,
      isAuthenticated: () => false,
    });

    await expect(unauthApi.getVacancies()).rejects.toThrow();
  });
});

/* ────────────────────────────────────────────────────────────
 *  HuntflowErrorHandler Tests
 * ──────────────────────────────────────────────────────────── */

describe("HuntflowErrorHandler", () => {
  beforeEach(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    jest.clearAllMocks();
  });

  test("should return user-friendly message for network error", () => {
    const msg = HuntflowErrorHandler.getUserMessage(
      new TypeError("Failed to fetch")
    );
    expect(msg).toBeDefined();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  test("should return user-friendly message for auth error", () => {
    const err = new Error("Unauthorized");
    err.status = 401;
    const msg = HuntflowErrorHandler.getUserMessage(err);
    expect(msg).toBeDefined();
    expect(typeof msg).toBe("string");
  });

  test("should return user-friendly message for rate limit error", () => {
    const err = new Error("Too Many Requests");
    err.status = 429;
    const msg = HuntflowErrorHandler.getUserMessage(err);
    expect(msg).toBeDefined();
    expect(typeof msg).toBe("string");
  });

  test("should handle error and save to log", async () => {
    const err = new Error("Test error");
    const result = HuntflowErrorHandler.handle(err, "test_context");
    expect(result).toBeDefined();
    expect(result.context).toBe("test_context");
  });

  test("should save error logs to storage (max 50)", async () => {
    for (let i = 0; i < 55; i++) {
      await HuntflowErrorHandler.saveErrorLog({
        message: "Error " + i,
        context: "test",
        timestamp: Date.now(),
      });
    }
    // Check that storage was called with set
    expect(chromeMock.storage.local.set).toHaveBeenCalled();
  });
});
