/**
 * renderObligationsAsText
 *
 * Converts the fixed §4.1 structured JSON into a human-readable multi-line
 * string used as:
 *   1. mediation_sessions.proposed_resolution (legacy text column)
 *   2. The "Agreed terms" block in the settlement PDF
 *
 * Single source of truth — no hand-written narrative that can drift from
 * the structured data.
 *
 * @param {object|null} json - validated proposedResolutionJson
 * @returns {string}
 */
function renderObligationsAsText(json) {
  if (!json || !Array.isArray(json.obligations)) return '';

  const lines = json.obligations.map((ob, i) => {
    const partyLabel = ob.party.charAt(0).toUpperCase() + ob.party.slice(1);
    let line = `${i + 1}. ${partyLabel} to ${ob.action}`;
    if (ob.amount != null && ob.currency) {
      const formatted = new Intl.NumberFormat('en-IN').format(ob.amount);
      line += ` of ${ob.currency} ${formatted}`;
    }
    if (ob.due_date) {
      const d = new Date(ob.due_date + 'T00:00:00');
      line += ` by ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    line += '.';
    return line;
  });

  let text = lines.join('\n');

  if (json.additional_terms) {
    text += `\n\nAdditional terms: ${json.additional_terms}`;
  }
  if (json.compliance_review_date) {
    const rd = new Date(json.compliance_review_date + 'T00:00:00');
    text += `\n\nCompliance review date: ${rd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
  }

  return text;
}

module.exports = { renderObligationsAsText };
