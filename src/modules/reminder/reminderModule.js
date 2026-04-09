/**
 * Reminder_Module — Pengingat minum obat dengan notifikasi push
 * Menyimpan data di localStorage dengan key 'pantas_reminders'
 */

const STORAGE_KEY = 'pantas_reminders';

// Internal map: reminderId → array of timeoutIds
const _scheduledTimeouts = {};

// ─── Internal store helpers ─────────────────────────────────────────────────

/**
 * Ambil array pengingat dari localStorage
 * @returns {Array} array of MedicationReminder
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
 * Simpan array pengingat ke localStorage
 * @param {Array} data array of MedicationReminder
 */
export function _setStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Notification helper ────────────────────────────────────────────────────

/**
 * Kirim notifikasi (Notification API atau console.log sebagai fallback)
 * @param {string} title
 * @param {string} body
 */
function sendNotification(title, body) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else {
    console.log(`[PANTAS Reminder] ${title}: ${body}`);
  }
}

// ─── scheduleNotification ───────────────────────────────────────────────────

/**
 * Jadwalkan notifikasi untuk setiap scheduledTime dalam reminder.
 * Setelah notifikasi dikirim, set re-notification 30 menit kemudian
 * jika lastStatus masih 'pending'.
 * @param {Object} reminder MedicationReminder
 */
export function scheduleNotification(reminder) {
  if (!reminder || !Array.isArray(reminder.scheduledTimes)) return;

  if (!_scheduledTimeouts[reminder.id]) {
    _scheduledTimeouts[reminder.id] = [];
  }

  for (const timeStr of reminder.scheduledTimes) {
    const msUntil = _msUntilNextOccurrence(timeStr);

    const mainTimeoutId = setTimeout(() => {
      // Ambil status terkini dari store
      const store = _getStore();
      const current = store.find((r) => r.id === reminder.id);
      if (!current || !current.isActive) return;

      sendNotification(
        `Waktunya minum obat: ${reminder.medicationName}`,
        `Dosis: ${reminder.dosage}`
      );

      // Re-notification setelah 30 menit jika masih 'pending'
      const reNotifyId = setTimeout(() => {
        const storeNow = _getStore();
        const latest = storeNow.find((r) => r.id === reminder.id);
        if (latest && latest.isActive && (!latest.lastStatus || latest.lastStatus === 'pending')) {
          sendNotification(
            `Pengingat ulang: ${reminder.medicationName}`,
            `Anda belum menandai obat ini. Dosis: ${reminder.dosage}`
          );
        }
      }, 30 * 60 * 1000);

      _scheduledTimeouts[reminder.id].push(reNotifyId);
    }, msUntil);

    _scheduledTimeouts[reminder.id].push(mainTimeoutId);
  }
}

/**
 * Hitung milidetik hingga kemunculan berikutnya dari waktu "HH:MM"
 * @param {string} timeStr format "HH:MM"
 * @returns {number} ms until next occurrence
 */
export function _msUntilNextOccurrence(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (target <= now) {
    // Sudah lewat hari ini, jadwalkan untuk besok
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

// ─── cancelNotification ─────────────────────────────────────────────────────

/**
 * Batalkan semua timeout yang dijadwalkan untuk reminderId
 * @param {string} reminderId
 */
export function cancelNotification(reminderId) {
  const timeouts = _scheduledTimeouts[reminderId];
  if (timeouts) {
    for (const id of timeouts) {
      clearTimeout(id);
    }
    delete _scheduledTimeouts[reminderId];
  }
}

// ─── CRUD Functions ─────────────────────────────────────────────────────────

/**
 * Tambah pengingat baru ke store dan jadwalkan notifikasi
 * @param {Object} reminder MedicationReminder
 */
export async function addReminder(reminder) {
  const store = _getStore();
  const newReminder = {
    ...reminder,
    isActive: reminder.isActive !== undefined ? reminder.isActive : true,
    lastStatus: reminder.lastStatus || 'pending',
  };
  store.push(newReminder);
  _setStore(store);
  scheduleNotification(newReminder);
}

/**
 * Nonaktifkan pengingat (set isActive: false) dan batalkan notifikasi.
 * Data tetap tersimpan untuk riwayat.
 * @param {string} reminderId
 */
export async function removeReminder(reminderId) {
  const store = _getStore();
  const idx = store.findIndex((r) => r.id === reminderId);
  if (idx !== -1) {
    store[idx] = { ...store[idx], isActive: false };
    _setStore(store);
  }
  cancelNotification(reminderId);
}

/**
 * Tandai pengingat dengan status 'taken' atau 'skipped'
 * @param {string} reminderId
 * @param {'taken'|'skipped'} status
 */
export async function markReminder(reminderId, status) {
  const store = _getStore();
  const idx = store.findIndex((r) => r.id === reminderId);
  if (idx !== -1) {
    store[idx] = { ...store[idx], lastStatus: status };
    _setStore(store);
  }
}

/**
 * Ambil semua pengingat yang aktif (isActive === true)
 * @returns {Array} array of active MedicationReminder
 */
export function getActiveReminders() {
  return _getStore().filter((r) => r.isActive === true);
}

// ─── SPA render function ─────────────────────────────────────────────────────

/**
 * Render halaman pengingat obat ke dalam container.
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
        <a href="#/reminders" class="sidebar-link active">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5 5 0 00-5 5v2.586l-.707.707A1 1 0 003 11h10a1 1 0 00.707-1.707L13 8.586V6a5 5 0 00-5-5zm0 13a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>
          Pengingat Obat
        </a>
        <a href="#/consultation" class="sidebar-link">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/></svg>
          Konsultasi
        </a>
      </div>
    </nav>
  </aside>
  <div class="main-content">
    <header class="topbar">
      <div class="topbar-left"><span class="topbar-title">Pengingat Obat</span></div>
    </header>
    <div class="page-content">
      <div class="placeholder-page">
        <div class="placeholder-icon">💊</div>
        <div class="placeholder-title">Pengingat Obat</div>
        <div class="placeholder-desc">Fitur pengingat jadwal minum obat akan tersedia di sini. Anda dapat menambahkan, mengelola, dan menerima notifikasi pengingat obat.</div>
      </div>
    </div>
  </div>
</div>`;
}
