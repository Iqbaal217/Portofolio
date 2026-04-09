/**
 * History — Halaman riwayat data kesehatan dengan filter jenis data dan rentang tanggal.
 */

import { getHistory } from '../health-repository/healthRepository.js';

// HTML template halaman riwayat
const HISTORY_HTML = `
<div class="history-page">
  <header class="page-header">
    <a href="#/dashboard" class="back-link">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3L4 8l6 5V3z"/></svg>
      Dashboard
    </a>
    <span class="page-title">Riwayat Kesehatan</span>
  </header>

  <main class="history-main">
    <div class="filter-section">
      <form id="filter-form" class="filter-form">
        <div class="filter-group">
          <label for="filter-type">Jenis Data</label>
          <select id="filter-type" name="filter-type">
            <option value="all">Semua</option>
            <option value="heart_rate">Detak Jantung</option>
            <option value="blood_pressure">Tekanan Darah</option>
            <option value="calorie">Kalori</option>
            <option value="risk_notification">Notifikasi Risiko</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="filter-start">Dari Tanggal</label>
          <input type="date" id="filter-start" name="filter-start" />
        </div>
        <div class="filter-group">
          <label for="filter-end">Sampai Tanggal</label>
          <input type="date" id="filter-end" name="filter-end" />
        </div>
        <button type="submit" id="filter-btn" class="btn btn-primary btn-sm" style="align-self:flex-end;">Terapkan</button>
      </form>
    </div>

    <div class="history-section">
      <div class="history-table-header">
        <span>Tipe</span>
        <span>Data</span>
        <span style="text-align:right;">Waktu</span>
      </div>
      <ul id="history-list" class="history-list"></ul>
    </div>
  </main>
</div>
`;

/**
 * Render halaman riwayat ke dalam container dan pasang event listener.
 * @param {HTMLElement} container
 */
export function render(container) {
  container.innerHTML = HISTORY_HTML;

  const form = container.querySelector('#filter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFilter();
    });
  }

  // Muat data awal (semua data)
  loadHistory({});
}

/**
 * Ambil riwayat dari health-repository dan render hasilnya.
 * @param {{ dataType?: string, startDate?: string, endDate?: string }} filter
 */
export async function loadHistory(filter) {
  const listEl = document.getElementById('history-list');
  const records = await getHistory(filter);
  renderHistoryList(records, listEl);
}

/**
 * Render array record kesehatan sebagai list item di dalam container.
 * @param {Array} records - array of health records
 * @param {HTMLElement} container - elemen target (#history-list)
 */
export function renderHistoryList(records, container) {
  if (!container) return;

  container.innerHTML = '';

  if (!records || records.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = 'Tidak ada data';
    container.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const dataType = record.dataType || _inferDataType(record);
    const timestamp = record.timestamp
      ? new Date(record.timestamp).toLocaleString('id-ID')
      : '-';

    const keyValues = _formatKeyValues(record, dataType);

    li.innerHTML = `
      <span class="history-type">${_labelForType(dataType)}</span>
      <span class="history-values">${keyValues}</span>
      <span class="history-timestamp">${timestamp}</span>
    `;

    container.appendChild(li);
  });
}

/**
 * Baca nilai filter dari form dan panggil loadHistory.
 */
export function applyFilter() {
  const typeEl = document.getElementById('filter-type');
  const startEl = document.getElementById('filter-start');
  const endEl = document.getElementById('filter-end');

  const filter = {
    dataType: typeEl ? typeEl.value : 'all',
    startDate: startEl && startEl.value ? startEl.value : undefined,
    endDate: endEl && endEl.value ? endEl.value : undefined,
  };

  loadHistory(filter);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _inferDataType(record) {
  if (record.bpm !== undefined) return 'heart_rate';
  if (record.systolic !== undefined) return 'blood_pressure';
  if (record.calories !== undefined) return 'calorie';
  if (record.riskLevel !== undefined) return 'risk_notification';
  return 'unknown';
}

function _labelForType(dataType) {
  const labels = {
    heart_rate: 'Detak Jantung',
    blood_pressure: 'Tekanan Darah',
    calorie: 'Kalori',
    risk_notification: 'Notifikasi Risiko',
  };
  return labels[dataType] || dataType;
}

function _formatKeyValues(record, dataType) {
  switch (dataType) {
    case 'heart_rate':
      return `${record.bpm} BPM`;
    case 'blood_pressure':
      return `${record.systolic}/${record.diastolic} mmHg`;
    case 'calorie':
      return `${record.calories} kkal — ${record.foodName || ''}`;
    case 'risk_notification':
      return `Risiko: ${record.riskLevel || '-'}`;
    default:
      return JSON.stringify(record);
  }
}
