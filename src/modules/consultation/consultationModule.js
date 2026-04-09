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
  container.innerHTML = `<div class="consultation-page"><h1>Jadwal Konsultasi</h1><p>Fitur jadwal konsultasi tersedia di sini.</p><a href="#/dashboard">Kembali</a></div>`;
}
