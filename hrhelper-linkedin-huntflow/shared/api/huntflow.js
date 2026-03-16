/**
 * HR Helper — Huntflow API module
 * Методы для создания/обновления кандидатов, добавления на вакансии, загрузки резюме
 * @fileoverview
 */
(function () {
  'use strict';
  var g = typeof window !== 'undefined' ? window : self;
  g.__HRH__ = g.__HRH__ || {};

  var apiFetch = g.__HRH__.apiFetch;

  function ensureApiFetch() {
    if (!apiFetch) {
      apiFetch = g.__HRH__.apiFetch;
    }
    if (!apiFetch) {
      throw new Error('[HRHelper] shared/api/client.js not loaded (apiFetch missing)');
    }
    return apiFetch;
  }

  /**
   * Создать кандидата в Huntflow
   * @param {Object} data — { first_name, last_name, middle_name, phone, email, position, company, money, birthday_day, birthday_month, birthday_year, photo, externals, social, links, experience, education, skills }
   */
  function createCandidate(data) {
    return ensureApiFetch()('/api/v1/huntflow/candidates/create/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Обновить кандидата
   * @param {string|number} candidateId
   * @param {Object} data
   */
  function updateCandidate(candidateId, data) {
    return ensureApiFetch()('/api/v1/huntflow/candidates/' + candidateId + '/update/', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Добавить кандидата на вакансию
   * @param {string|number} candidateId
   * @param {string|number} vacancyId
   * @param {string|number} statusId
   */
  function addToVacancy(candidateId, vacancyId, statusId) {
    return ensureApiFetch()('/api/v1/huntflow/candidates/add-to-vacancy/', {
      method: 'POST',
      body: JSON.stringify({
        candidate_id: candidateId,
        vacancy_id: vacancyId,
        status_id: statusId
      })
    });
  }

  /**
   * Загрузить файл резюме
   * @param {File} file
   * @param {string|number} candidateId
   */
  function uploadResume(file, candidateId) {
    var formData = new FormData();
    formData.append('file', file);
    if (candidateId) formData.append('candidate_id', candidateId);
    return ensureApiFetch()('/api/v1/huntflow/candidates/upload-resume/', {
      method: 'POST',
      body: formData
    });
  }

  /**
   * Распарсить резюме по URL
   * @param {string} url
   * @param {string} source — источник (linkedin, hh, etc.)
   */
  function parseResumeFromUrl(url, source) {
    return ensureApiFetch()('/api/v1/huntflow/parse-resume/', {
      method: 'POST',
      body: JSON.stringify({ url: url, source: source || 'unknown' })
    });
  }

  g.__HRH__.HuntflowAPI = {
    createCandidate: createCandidate,
    updateCandidate: updateCandidate,
    addToVacancy: addToVacancy,
    uploadResume: uploadResume,
    parseResumeFromUrl: parseResumeFromUrl
  };
})();
