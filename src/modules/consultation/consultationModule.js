/**
 * Consultation_Module — Manajemen jadwal konsultasi dokter
 * Menyimpan data di localStorage dengan key 'pantas_consultations'
 */

const STORAGE_KEY = 'pantas_consultations';

// Internal map: consultationId → timeoutId
export const _consultationTimeouts = {};

// ─── Internal store helpers ─────────────────────────────────────────────────

/**
 * Ambil array konsultasi dari localStorage
 * @returns {Array} array of ConsultationSchedule
 */
export function _getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Simpan array konsultasi ke localStorage
 * @param {Array} data array of ConsultationSchedule
 */
export function _setStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Reminder helpers ────────────────────────────────────────────────────────

/**
 * Hitung waktu pengingat: scheduledDate + scheduledTime - 1 jam
 * @param {Object} consultation ConsultationSchedule
 * @returns {Date} waktu pengingat (1 jam sebelum konsultasi)
 */
export function _getScheduledReminderTime(consultation) {
  const [hours, minutes] = consultation.scheduledTime.split(':').map(Number);
  const base = new Date(consultation.scheduledDate);
  base.setHours(hours, minutes, 0, 0);
  return new Date(base.getTime() - 60 * 60 * 1000);
}

/**
 * Jadwalkan pengingat otomatis 1 jam sebelum konsultasi
 * @param {Object} consultation ConsultationSchedule
 */
export function _scheduleConsultationReminder(consultation) {
  const reminderTime = _getScheduledReminderTime(consultation);
  const msUntil = reminderTime.getTime() - Date.now();

  if (msUntil <= 0) return; // Waktu sudah lewat, tidak perlu dijadwalkan

  const timeoutId = setTimeout(() => {
    const message = `Pengingat: Konsultasi dengan ${consultation.doctorName} (${consultation.specialization}) dalam 1 jam.`;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Pengingat Konsultasi PANTAS', { body: message });
    } else {
      console.log(`[PANTAS Consultation] ${message}`);
    }
  }, msUntil);

  _consultationTimeouts[consultation.id] = timeoutId;
}

/**
 * Batalkan pengingat konsultasi berdasarkan id
 * @param {string} id consultation id
 */
export function _cancelConsultationReminder(id) {
  if (_consultationTimeouts[id] !== undefined) {
    clearTimeout(_consultationTimeouts[id]);
    delete _consultationTimeouts[id];
  }
}

// ─── CRUD Functions ──────────────────────────────────────────────────────────

/**
 * Buat jadwal konsultasi baru dengan status 'upcoming'
 * @param {Object} consultation ConsultationSchedule
 */
export async function createConsultation(consultation) {
  const store = _getStore();
  const newConsultation = {
    ...consultation,
    status: 'upcoming',
    reminderSet: true,
  };
  store.push(newConsultation);
  _setStore(store);
  _scheduleConsultationReminder(newConsultation);
}

/**
 * Update field-field dari konsultasi yang ada
 * @param {string} id consultation id
 * @param {Object} updates partial ConsultationSchedule
 */
export async function updateConsultation(id, updates) {
  const store = _getStore();
  const idx = store.findIndex((c) => c.id === id);
  if (idx !== -1) {
    store[idx] = { ...store[idx], ...updates };
    _setStore(store);
  }
}

/**
 * Batalkan jadwal konsultasi: set status 'cancelled' dan hapus pengingat
 * @param {string} id consultation id
 */
export async function cancelConsultation(id) {
  const store = _getStore();
  const idx = store.findIndex((c) => c.id === id);
  if (idx !== -1) {
    store[idx] = { ...store[idx], status: 'cancelled', reminderSet: false };
    _setStore(store);
  }
  _cancelConsultationReminder(id);
}

/**
 * Ambil semua jadwal konsultasi mendatang (status === 'upcoming')
 * @returns {Array} array of upcoming ConsultationSchedule
 */
export function getUpcomingConsultations() {
  return _getStore().filter((c) => c.status === 'upcoming');
}

/**
 * Ambil riwayat konsultasi (status === 'completed' atau 'cancelled')
 * @returns {Array} array of completed/cancelled ConsultationSchedule
 */
export function getConsultationHistory() {
  return _getStore().filter((c) => c.status === 'completed' || c.status === 'cancelled');
}

/**
 * Ekspor jadwal konsultasi ke format iCal dan trigger download
 * @param {Object} consultation ConsultationSchedule
 * @returns {string} iCal format string
 */
export function exportToCalendar(consultation) {
  const [hours, minutes] = consultation.scheduledTime.split(':').map(Number);
  const start = new Date(consultation.scheduledDate);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 jam

  const formatDt = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PANTAS PTM Monitoring//ID',
    'BEGIN:VEVENT',
    `DTSTART:${formatDt(start)}`,
    `DTEND:${formatDt(end)}`,
    `SUMMARY:Konsultasi dengan ${consultation.doctorName}`,
    `DESCRIPTION:Spesialisasi: ${consultation.specialization}\\nMetode: ${consultation.method}${consultation.notes ? '\\nCatatan: ' + consultation.notes : ''}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  // Trigger download jika di browser
  if (typeof document !== 'undefined') {
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `konsultasi-${consultation.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return ical;
}

// ─── SPA render function ─────────────────────────────────────────────────────

/**
 * Render halaman jadwal konsultasi ke dalam container.
 * @param {HTMLElement} container
 */
export function render(container) {
  container.innerHTML = `
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">P</div>
      <div class="sidebar-title">PANTAS</div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Monitor</div>
        <a href="#/dashboard" class="sidebar-link">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/></svg>
          Dashboard
        </a>
        <a href="#/history" class="sidebar-link">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 7.75H5.5a.75.75 0 010-1.5h2.5V4.25a.75.75 0 011.5 0v4a.75.75 0 01-.75.75z"/></svg>
          Riwayat
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Manajemen</div>
        <a href="#/reminders" class="sidebar-link">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5 5 0 00-5 5v2.586l-.707.707A1 1 0 003 11h10a1 1 0 00.707-1.707L13 8.586V6a5 5 0 00-5-5zm0 13a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>
          Pengingat Obat
        </a>
        <a href="#/consultation" class="sidebar-link active">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/></svg>
          Konsultasi
        </a>
      </div>
    </nav>
  </aside>
  <div class="main-content">
    <header class="topbar">
      <div class="topbar-left"><span class="topbar-title">Jadwal Konsultasi</span></div>
    </header>
    <div class="page-content">
      <div class="placeholder-page">
        <div class="placeholder-icon">🩺</div>
        <div class="placeholder-title">Jadwal Konsultasi Dokter</div>
        <div class="placeholder-desc">Buat dan kelola jadwal konsultasi dengan dokter spesialis. Dapatkan pengingat otomatis 1 jam sebelum jadwal konsultasi Anda.</div>
      </div>
    </div>
  </div>
</div>`;
}
