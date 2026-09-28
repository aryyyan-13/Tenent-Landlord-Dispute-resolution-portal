/**
 * Validates that a proposedResolutionJson payload matches the fixed schema
 * defined in the implementation plan §4.1.
 *
 * Returns null if valid, or an error message string if invalid.
 *
 * @param {unknown} json
 * @returns {string|null}
 */
function validateProposedResolution(json) {
  if (!json || typeof json !== 'object') {
    return 'proposedResolutionJson must be an object.';
  }
  if (!Array.isArray(json.obligations) || json.obligations.length === 0) {
    return 'proposedResolutionJson.obligations must be a non-empty array.';
  }
  const VALID_PARTIES = ['tenant', 'landlord'];
  for (let i = 0; i < json.obligations.length; i++) {
    const ob = json.obligations[i];
    if (!ob || typeof ob !== 'object') {
      return `obligations[${i}] must be an object.`;
    }
    if (!VALID_PARTIES.includes(ob.party)) {
      return `obligations[${i}].party must be "tenant" or "landlord".`;
    }
    if (typeof ob.action !== 'string' || !ob.action.trim()) {
      return `obligations[${i}].action must be a non-empty string.`;
    }
    if (!ob.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(ob.due_date)) {
      return `obligations[${i}].due_date must be an ISO date string (YYYY-MM-DD).`;
    }
    if (ob.amount !== null && ob.amount !== undefined && typeof ob.amount !== 'number') {
      return `obligations[${i}].amount must be a number or null.`;
    }
  }
  if (json.additional_terms !== null && json.additional_terms !== undefined && typeof json.additional_terms !== 'string') {
    return 'proposedResolutionJson.additional_terms must be a string or null.';
  }
  if (json.compliance_review_date !== null && json.compliance_review_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(json.compliance_review_date)) {
      return 'proposedResolutionJson.compliance_review_date must be an ISO date string or null.';
    }
  }
  return null;
}

module.exports = { validateProposedResolution };
