/**
 * HuntflowAPIClient — handles all Huntflow API requests.
 * Provides methods for vacancies and candidate management
 * with retry logic and rate limiting.
 */
class HuntflowAPIClient {
  constructor(authManager) {
    this.auth = authManager;
    this.baseURL = 'https://api.huntflow.ai';
    this._retryCount = 2;
    this._retryDelay = 1000;
  }

  async getVacancies() {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await this._request(
      `/account/${this.auth.getAccountId()}/vacancies`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch vacancies (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.items || data;
  }

  async saveCandidate(candidateData) {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const { vacancy_id, ...applicantPayload } = candidateData;

    const applicantResponse = await this._request(
      `/account/${this.auth.getAccountId()}/applicants`,
      {
        method: 'POST',
        body: JSON.stringify(applicantPayload)
      }
    );

    if (!applicantResponse.ok) {
      const errBody = await applicantResponse.json().catch(() => null);
      const errMsg = errBody && errBody.errors
        ? JSON.stringify(errBody.errors)
        : `HTTP ${applicantResponse.status}`;
      throw new Error(`Failed to create candidate: ${errMsg}`);
    }

    const applicant = await applicantResponse.json();

    if (vacancy_id) {
      await this._addToVacancy(applicant.id, vacancy_id);
    }

    return applicant;
  }

  async _addToVacancy(applicantId, vacancyId) {
    const response = await this._request(
      `/account/${this.auth.getAccountId()}/applicants/${applicantId}/vacancy`,
      {
        method: 'POST',
        body: JSON.stringify({
          vacancy: vacancyId,
          status: 1,
          comment: 'Added via HR Helper Extension'
        })
      }
    );

    if (!response.ok) {
      console.warn('[Huntflow] Failed to add candidate to vacancy:', response.status);
    }

    return response.json().catch(() => null);
  }

  async _request(path, options = {}, retriesLeft) {
    if (retriesLeft === undefined) retriesLeft = this._retryCount;

    const url = `${this.baseURL}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.auth.getToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HR Helper Extension/2.0.0'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
      });

      if (response.status === 429 && retriesLeft > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        await this._sleep(retryAfter * 1000);
        return this._request(path, options, retriesLeft - 1);
      }

      if (response.status >= 500 && retriesLeft > 0) {
        await this._sleep(this._retryDelay);
        return this._request(path, options, retriesLeft - 1);
      }

      return response;
    } catch (error) {
      if (retriesLeft > 0) {
        await this._sleep(this._retryDelay);
        return this._request(path, options, retriesLeft - 1);
      }
      throw error;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HuntflowAPIClient;
}
