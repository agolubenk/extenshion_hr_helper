/**
 * HR Helper — LinkedIn Profile Parser
 * Извлечение полных данных профиля: опыт, образование, навыки, языки, сертификаты
 * @fileoverview
 */
(function () {
  'use strict';
  var g = typeof window !== 'undefined' ? window : self;
  g.__HRH__ = g.__HRH__ || {};

  /**
   * Найти секцию профиля по названию (поддержка EN/RU)
   * @param {string} sectionName — например 'Experience' или 'Опыт работы'
   * @returns {Element|null}
   */
  function findSection(sectionName) {
    var names = Array.isArray(sectionName) ? sectionName : [sectionName];
    var sections = document.querySelectorAll('section.artdeco-card');
    for (var i = 0; i < sections.length; i++) {
      var heading = sections[i].querySelector('h2, .pvs-header__title span, div#' + CSS.escape(sectionName));
      if (!heading) continue;
      var text = (heading.textContent || '').trim().toLowerCase();
      for (var j = 0; j < names.length; j++) {
        if (text.includes(names[j].toLowerCase())) return sections[i];
      }
    }
    // Fallback: ищем по id секции
    for (var k = 0; k < names.length; k++) {
      var byId = document.getElementById(names[k]);
      if (byId) {
        var sec = byId.closest('section');
        if (sec) return sec;
      }
    }
    return null;
  }

  /**
   * Извлечь базовую информацию профиля
   */
  function extractBasicInfo() {
    var fullName = '';
    var h1 = document.querySelector('h1.text-heading-xlarge');
    if (h1) fullName = (h1.textContent || '').trim();

    var headline = '';
    var headlineEl = document.querySelector('.text-body-medium.break-words');
    if (headlineEl) headline = (headlineEl.textContent || '').trim();

    var location = '';
    var locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words');
    if (locationEl) location = (locationEl.textContent || '').trim();

    var profileUrl = '';
    try {
      profileUrl = window.location.href.split('?')[0].replace(/\/$/, '');
    } catch (_) {}

    return {
      fullName: fullName,
      headline: headline,
      location: location,
      profileUrl: profileUrl
    };
  }

  /**
   * Извлечь опыт работы
   */
  function extractExperience() {
    var section = findSection(['Experience', 'Опыт работы']);
    if (!section) return [];
    var items = section.querySelectorAll('li.artdeco-list__item, ul.pvs-list > li');
    var result = [];
    items.forEach(function (item) {
      var titleEl = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span');
      var companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      var dateEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
      var descEl = item.querySelector('.pvs-list__outer-container .pvs-list__item--with-top-padding span[aria-hidden="true"]');

      var title = titleEl ? (titleEl.textContent || '').trim() : '';
      var company = companyEl ? (companyEl.textContent || '').trim() : '';
      var dateRange = dateEl ? (dateEl.textContent || '').trim() : '';
      var description = descEl ? (descEl.textContent || '').trim() : '';

      if (title || company) {
        result.push({
          title: title,
          company: company,
          dateRange: dateRange,
          description: description
        });
      }
    });
    return result;
  }

  /**
   * Извлечь образование
   */
  function extractEducation() {
    var section = findSection(['Education', 'Образование']);
    if (!section) return [];
    var items = section.querySelectorAll('li.artdeco-list__item, ul.pvs-list > li');
    var result = [];
    items.forEach(function (item) {
      var schoolEl = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"], .t-bold span');
      var degreeEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      var dateEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

      var school = schoolEl ? (schoolEl.textContent || '').trim() : '';
      var degree = degreeEl ? (degreeEl.textContent || '').trim() : '';
      var dateRange = dateEl ? (dateEl.textContent || '').trim() : '';

      if (school) {
        result.push({
          school: school,
          degree: degree,
          dateRange: dateRange
        });
      }
    });
    return result;
  }

  /**
   * Извлечь навыки
   */
  function extractSkills() {
    var section = findSection(['Skills', 'Навыки']);
    if (!section) return [];
    var items = section.querySelectorAll('li.artdeco-list__item, ul.pvs-list > li');
    var result = [];
    items.forEach(function (item) {
      var nameEl = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span');
      if (nameEl) {
        var name = (nameEl.textContent || '').trim();
        if (name) result.push(name);
      }
    });
    return result;
  }

  /**
   * Извлечь языки
   */
  function extractLanguages() {
    var section = findSection(['Languages', 'Языки']);
    if (!section) return [];
    var items = section.querySelectorAll('li.artdeco-list__item, ul.pvs-list > li');
    var result = [];
    items.forEach(function (item) {
      var langEl = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span');
      var profEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      var language = langEl ? (langEl.textContent || '').trim() : '';
      var proficiency = profEl ? (profEl.textContent || '').trim() : '';
      if (language) {
        result.push({ language: language, proficiency: proficiency });
      }
    });
    return result;
  }

  /**
   * Извлечь лицензии и сертификаты
   */
  function extractCertifications() {
    var section = findSection(['Licenses & certifications', 'Лицензии и сертификаты']);
    if (!section) return [];
    var items = section.querySelectorAll('li.artdeco-list__item, ul.pvs-list > li');
    var result = [];
    items.forEach(function (item) {
      var nameEl = item.querySelector('.mr1.t-bold span[aria-hidden="true"], .t-bold span');
      var orgEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      var dateEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

      var name = nameEl ? (nameEl.textContent || '').trim() : '';
      var organization = orgEl ? (orgEl.textContent || '').trim() : '';
      var dateRange = dateEl ? (dateEl.textContent || '').trim() : '';

      if (name) {
        result.push({ name: name, organization: organization, dateRange: dateRange });
      }
    });
    return result;
  }

  /**
   * Извлечь полный профиль
   */
  function extractFullProfile() {
    var basic = extractBasicInfo();
    return {
      basic: basic,
      experience: extractExperience(),
      education: extractEducation(),
      skills: extractSkills(),
      languages: extractLanguages(),
      certifications: extractCertifications()
    };
  }

  g.__HRH__.LinkedInParser = {
    extractFullProfile: extractFullProfile,
    extractBasicInfo: extractBasicInfo,
    extractExperience: extractExperience,
    extractEducation: extractEducation,
    extractSkills: extractSkills,
    extractLanguages: extractLanguages,
    extractCertifications: extractCertifications,
    findSection: findSection
  };
})();
