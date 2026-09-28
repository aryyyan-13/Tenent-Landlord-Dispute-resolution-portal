import React from 'react';

const STATUS_STYLES = {
  Filed: { bg: '#EFEDE6', text: '#5B5546', border: '#C9C2AE' },
  'Under Review': { bg: '#F3E8D8', text: '#8A5A22', border: '#B8863B' },
  Mediation: { bg: '#F3E8D8', text: '#8A5A22', border: '#B8863B' },
  Resolved: { bg: '#E6EFE9', text: '#2E5B45', border: '#3F7A5E' },
  Escalated: { bg: '#F3E2E2', text: '#7A2E2E', border: '#A23B3B' },
  Closed: { bg: '#E7E9EB', text: '#3D5266', border: '#8A99A8' }
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Filed;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium border"
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {status}
    </span>
  );
}

export function statusColor(status) {
  return (STATUS_STYLES[status] || STATUS_STYLES.Filed).border;
}
