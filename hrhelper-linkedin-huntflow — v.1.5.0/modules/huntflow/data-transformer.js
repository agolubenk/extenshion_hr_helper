/**
 * DataTransformer — transforms LinkedIn profile data into Huntflow API format.
 * Handles name splitting, contact extraction, tag generation.
 */
class DataTransformer {
  /**
   * Transform LinkedIn profile data to Huntflow candidate format.
   * @param {Object} linkedinData - Parsed LinkedIn profile data
   * @returns {Object} Huntflow-compatible candidate object
   */
  transformLinkedInToHuntflow(linkedinData) {
    const nameParts = this._splitName(linkedinData.fullName || '');

    return {
      first_name: nameParts.firstName || 'Unknown',
      last_name: nameParts.lastName || '',
      phone: this._extractPhone(linkedinData.contactInfo),
      email: this._extractEmail(linkedinData.contactInfo),
      position: linkedinData.headline || linkedinData.currentPosition || '',
      company: linkedinData.currentCompany || '',
      photo: linkedinData.profilePhoto
        ? { url: linkedinData.profilePhoto }
        : undefined,
      externals: [{
        data: {
          body: linkedinData.profileUrl || '',
          name: 'LinkedIn'
        },
        auth_type: 'NATIVE'
      }],
      links: linkedinData.profileUrl
        ? [{ url: linkedinData.profileUrl, status: 200 }]
        : [],
      tags: this._generateTags(linkedinData)
    };
  }

  _splitName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  _extractPhone(contactInfo) {
    if (!contactInfo) return '';
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}/;
    const match = contactInfo.match(phoneRegex);
    return match ? match[0].trim() : '';
  }

  _extractEmail(contactInfo) {
    if (!contactInfo) return '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = contactInfo.match(emailRegex);
    return match ? match[0] : '';
  }

  _generateTags(linkedinData) {
    const tags = [];

    if (linkedinData.location) {
      tags.push({ name: linkedinData.location });
    }

    if (Array.isArray(linkedinData.skills)) {
      linkedinData.skills.slice(0, 5).forEach(skill => {
        tags.push({ name: skill });
      });
    }

    tags.push({ name: 'LinkedIn' });
    tags.push({ name: 'HR Helper' });

    return tags;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataTransformer;
}
