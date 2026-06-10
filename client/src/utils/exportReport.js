import { API_BASE } from '../api.js';

export function downloadJsonBlob(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportJsonReport(userId) {
  const res = await fetch(`${API_BASE}/export/${userId}/json`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Export failed');
  }
  const data = await res.json();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJsonBlob(data, `mindwell-wellness-${stamp}.json`);
  return data;
}

export function openPrintableReport(userId) {
  const url = `${API_BASE}/export/${userId}/report`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
