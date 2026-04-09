/**
 * Home_Dashboard — mengintegrasikan semua modul untuk halaman utama PANTAS.
 */

import { connectSmartwatch, disconnectSmartwatch, startMonitoring } from '../health-monitor/healthMonitor.js';
import { analyzeRisk } from '../risk-engine/riskEngine.js';
import { analyzeLongitudinal, recordReading, getLifestyleGuide } from '../risk-engine/longitudinalAnalysis.js';
import { getProfile, calculateGeneticRiskScore, getSatuSehatRecord } from '../user-profile/userProfile.js';
import { renderHeartRateChart, renderBloodPressureChart } from '../chart-renderer/chartRenderer.js';
import { openCamera } from '../kalori-detector/kaloriDetector.js';
import eventBus from '../../utils/eventBus.js';

// HTML template dashboard
const DASHBOARD_HTML = `
<div class="app-shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">P</div>
      <div class="sidebar-title">PANTAS</div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Monitor</div>
        <a href="#/dashboard" class="sidebar-link active">
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
        <a href="#/consultation" class="sidebar-link">
          <svg class="sidebar-link-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/></svg>
          Konsultasi
        </a>
      </div>
    </nav>
    <div class="sidebar-footer">
      <button id="logout-btn" class="btn btn-ghost btn-full" style="justify-content:flex-start;gap:8px;font-size:0.8rem;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3v-1.5H3.5v-9H6V2zm4.854 2.646l3.5 3.5a.5.5 0 010 .708l-3.5 3.5-1.061-1.061L11.94 9H6V7h5.94L9.793 4.707l1.061-1.061z"/></svg>
        Keluar
      </button>
    </div>
  </aside>

  <!-- Main -->
  <div class="main-content">
    <header class="topbar">
      <div class="topbar-left">
        <span class="topbar-title">Dashboard</span>
      </div>
      <div class="topbar-right">
        <span id="connection-status" class="connection-status disconnected">
          <span class="dot"></span>Terputus
        </span>
        <button id="connect-btn" class="btn btn-primary btn-sm">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 1a.5.5 0 01.5.5V3h6V1.5a.5.5 0 011 0V3h1a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h1V1.5a.5.5 0 01.5-.5z"/></svg>
          Hubungkan Smartwatch
        </button>
      </div>
    </header>

    <div class="page-content">
      <!-- Metric Cards -->
      <div class="health-cards">
        <div class="card card-heart-rate">
          <div class="card-label">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-6-4.686-6-8a6 6 0 0112 0c0 3.314-6 8-6 8z"/></svg>
            Detak Jantung
          </div>
          <div>
            <span id="bpm-value" class="metric-value">--</span>
            <span class="metric-unit">BPM</span>
          </div>
          <div class="card-footer">Pembaruan setiap 30 detik</div>
        </div>

        <div class="card card-blood-pressure">
          <div class="card-label">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3z"/></svg>
            Tekanan Darah
          </div>
          <div>
            <span id="bp-value" class="metric-value">--/--</span>
            <span class="metric-unit">mmHg</span>
          </div>
          <div class="card-footer">Sistolik / Diastolik</div>
        </div>

        <div class="card card-risk">
          <div class="card-label">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L1 14h14L8 1zm0 3l5.5 9.5h-11L8 4z"/></svg>
            Risiko PTM
          </div>
          <div style="margin-top:6px;">
            <span id="risk-level" class="risk-badge risk-low" style="cursor:pointer;">Rendah</span>
          </div>
          <div class="card-footer">Klik untuk detail</div>
        </div>

        <div class="card card-camera">
          <div class="card-label">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 3L9 1H7L5.5 3H2a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1h-3.5zM8 12a3 3 0 110-6 3 3 0 010 6z"/></svg>
            Deteksi Kalori
          </div>
          <div style="margin-top:8px;">
            <button id="camera-btn" class="btn btn-primary btn-sm">Buka Kamera</button>
          </div>
          <div class="card-footer">Analisis makanan via AI</div>
        </div>
      </div>

      <!-- Risk Detail Panel -->
      <div id="risk-detail-panel" class="risk-detail-panel" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div class="panel-title">Detail Analisis Risiko</div>
          <button id="close-risk-detail" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <p id="risk-description" class="risk-description"></p>
        <ul id="risk-recommendations" class="risk-recommendations"></ul>
      </div>

      <!-- Charts -->
      <div class="section-title">Grafik Tren</div>
      <div class="charts-section">
        <div class="chart-container">
          <div class="chart-header">
            <span class="chart-title">Detak Jantung — 24 Jam</span>
          </div>
          <div id="hr-chart-container" class="chart"></div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <span class="chart-title">Tekanan Darah — 7 Hari</span>
          </div>
          <div id="bp-chart-container" class="chart"></div>
        </div>
      </div>

      <!-- AI Longitudinal Analysis Panel -->
      <div class="section-title">Analisis AI — Tren 7 Hari</div>
      <div id="longitudinal-panel" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
        <!-- Genetic Risk Score -->
        <div class="card" style="border-left:3px solid var(--accent);">
          <div class="card-label">Skor Risiko Genetik</div>
          <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:8px;">
            <span id="genetic-score" class="metric-value" style="font-size:1.75rem;">--</span>
            <span class="metric-unit">/100</span>
          </div>
          <div id="genetic-bar" style="height:4px;border-radius:2px;background:var(--border);margin-bottom:8px;">
            <div id="genetic-bar-fill" style="height:100%;border-radius:2px;background:var(--accent);width:0%;transition:width 0.8s ease;"></div>
          </div>
          <div id="genetic-desc" class="card-footer">Berdasarkan riwayat keluarga & gaya hidup</div>
        </div>

        <!-- Trend Summary -->
        <div class="card">
          <div class="card-label">Rata-rata 7 Hari</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-3);">Sistolik rata-rata</span>
              <span id="avg-systolic" style="color:var(--text-2);font-weight:600;">--</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-3);">Diastolik rata-rata</span>
              <span id="avg-diastolic" style="color:var(--text-2);font-weight:600;">--</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-3);">BPM rata-rata</span>
              <span id="avg-bpm" style="color:var(--text-2);font-weight:600;">--</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-3);">Tren sistolik</span>
              <span id="systolic-trend" style="font-weight:600;">--</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detected Patterns -->
      <div id="patterns-section" style="display:none;margin-bottom:20px;">
        <div class="section-title">Pola Risiko Terdeteksi</div>
        <div id="patterns-list" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>

      <!-- SATU SEHAT Integration Status -->
      <div id="satusehat-panel" style="display:none;margin-bottom:20px;">
        <div class="card" style="border-left:3px solid var(--green);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:0.8rem;font-weight:600;color:var(--text);">🏥 SATU SEHAT</span>
            <span class="badge badge-green" style="font-size:0.65rem;">Tersinkronisasi</span>
          </div>
          <div id="satusehat-info" style="font-size:0.78rem;color:var(--text-3);line-height:1.6;"></div>
        </div>
      </div>

      <!-- Lifestyle Guide Panel -->
      <div id="lifestyle-section" style="margin-bottom:20px;">
        <div class="section-title">Panduan Gaya Hidup Sehat</div>
        <div id="lifestyle-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;"></div>
        <div id="lifestyle-content"></div>
      </div>
    </div>
  </div>
</div>
`;

/**
 * Render dashboard HTML ke dalam container dan inisialisasi semua modul.
 * @param {HTMLElement} container
 */
export function render(container) {
  container.innerHTML = DASHBOARD_HTML;

  // Subscribe ke event health:connection untuk update status badge
  eventBus.on('health:connection', ({ status, mode, deviceName }) => {
    const statusEl = document.getElementById('connection-status');
    const connectBtn = document.getElementById('connect-btn');
    if (statusEl) {
      if (status === 'connected') {
        const label = mode === 'bluetooth' ? (deviceName || 'Smartwatch') : 'Simulasi';
        statusEl.innerHTML = `<span class="dot"></span>${label}`;
        statusEl.className = 'connection-status connected';
      } else {
        statusEl.innerHTML = `<span class="dot"></span>Terputus`;
        statusEl.className = 'connection-status disconnected';
      }
    }
    if (connectBtn && status === 'disconnected') {
      connectBtn.textContent = 'Hubungkan Smartwatch';
      connectBtn.classList.add('btn-primary');
      connectBtn.classList.remove('btn-ghost');
      connectBtn.disabled = false;
    }
  });

  // Subscribe ke event health:update
  eventBus.on('health:update', (data) => {
    const { connectionStatus, lastReading } = data;

    updateHealthDisplay({
      connectionStatus,
      heartRate: lastReading?.heartRate,
      bloodPressure: lastReading?.bloodPressure,
    });

    // Analisis risiko jika ada data
    if (lastReading?.heartRate || lastReading?.bloodPressure) {
      const assessment = analyzeRisk({
        heartRate: lastReading.heartRate,
        bloodPressure: lastReading.bloodPressure,
      });
      updateRiskDisplay(assessment);

      // Rekam ke trend buffer dan jalankan analisis longitudinal
      recordReading(lastReading.heartRate, lastReading.bloodPressure);
      const longitudinal = analyzeLongitudinal({
        heartRate: lastReading.heartRate,
        bloodPressure: lastReading.bloodPressure,
      });
      updateLongitudinalPanel(longitudinal);
    }
  });

  // Tombol connect smartwatch
  const connectBtn = container.querySelector('#connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Menghubungkan...';

      const result = await connectSmartwatch();

      if (result.success) {
        const label = result.mode === 'bluetooth'
          ? `${result.deviceName || 'Smartwatch'}`
          : 'Simulasi Aktif';
        connectBtn.textContent = label;
        connectBtn.classList.remove('btn-primary');
        connectBtn.classList.add('btn-ghost');
        connectBtn.disabled = false;

        // Klik lagi = disconnect
        connectBtn.addEventListener('click', () => {
          disconnectSmartwatch();
        }, { once: true });
      } else {
        connectBtn.textContent = 'Hubungkan Smartwatch';
        connectBtn.disabled = false;
      }
    });
  }

  // Tombol logout
  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      import('../auth/auth.js').then(({ logout }) => logout());
    });
  }

  // Tombol kamera
  const cameraBtn = container.querySelector('#camera-btn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', async () => {
      try {
        await openCamera();
      } catch (err) {
        console.error('[Dashboard] Kamera gagal dibuka:', err);
      }
    });
  }

  // Inisialisasi panel longitudinal dengan data yang sudah ada
  const initialLongitudinal = analyzeLongitudinal();
  updateLongitudinalPanel(initialLongitudinal);

  // Render lifestyle guide
  const profile = getProfile();
  renderLifestyleGuide(profile);

  // Update topbar dengan nama pengguna
  const topbarTitle = container.querySelector('.topbar-title');
  if (topbarTitle && profile.name) {
    topbarTitle.textContent = `Dashboard — ${profile.name}`;
  }

  // Toggle panel detail risiko
  const riskBadge = container.querySelector('#risk-level');
  if (riskBadge) {
    riskBadge.addEventListener('click', () => {
      const panel = container.querySelector('#risk-detail-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // Tombol tutup panel risiko
  const closeBtn = container.querySelector('#close-risk-detail');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const panel = container.querySelector('#risk-detail-panel');
      if (panel) panel.style.display = 'none';
    });
  }
}

/**
 * Update tampilan data kesehatan di DOM.
 * @param {{ heartRate?: object, bloodPressure?: object, connectionStatus?: string }} data
 */
export function updateHealthDisplay(data) {
  const { heartRate, bloodPressure, connectionStatus } = data || {};

  // Update BPM
  const bpmEl = document.getElementById('bpm-value');
  if (bpmEl && heartRate?.bpm !== undefined) {
    bpmEl.textContent = heartRate.bpm;
  }

  // Update tekanan darah
  const bpEl = document.getElementById('bp-value');
  if (bpEl && bloodPressure?.systolic !== undefined && bloodPressure?.diastolic !== undefined) {
    bpEl.textContent = `${bloodPressure.systolic}/${bloodPressure.diastolic}`;
  }

  // Update status koneksi
  const statusEl = document.getElementById('connection-status');
  if (statusEl && connectionStatus !== undefined) {
    statusEl.textContent = connectionStatus === 'connected' ? 'Terhubung' : 'Terputus';
    statusEl.className = `connection-status ${connectionStatus}`;
  }
}

/**
 * Update tampilan badge risiko di DOM.
 * @param {object} assessment - RiskAssessment
 */
function updateRiskDisplay(assessment) {
  const riskEl = document.getElementById('risk-level');
  if (!riskEl || !assessment) return;

  const labelMap = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
  riskEl.textContent = labelMap[assessment.riskLevel] || assessment.riskLevel;
  riskEl.className = `risk-badge risk-${assessment.riskLevel}`;
}

/**
 * Tampilkan panel detail risiko dengan deskripsi dan rekomendasi.
 * @param {object} assessment - RiskAssessment
 */
export function showRiskDetail(assessment) {
  const panel = document.getElementById('risk-detail-panel');
  const descEl = document.getElementById('risk-description');
  const recEl = document.getElementById('risk-recommendations');

  if (!panel || !assessment) return;

  if (descEl) {
    descEl.textContent = assessment.description || '';
  }

  if (recEl) {
    recEl.innerHTML = '';
    const recommendations = assessment.recommendations || [];
    recommendations.forEach((rec) => {
      const li = document.createElement('li');
      li.textContent = rec;
      recEl.appendChild(li);
    });
  }

  panel.style.display = 'block';
}

/**
 * Inisialisasi grafik tren menggunakan Chart_Renderer.
 * @param {Array} heartRateData - HeartRateReading[]
 * @param {Array} bloodPressureData - BloodPressureReading[]
 */
export function initCharts(heartRateData, bloodPressureData) {
  renderHeartRateChart('hr-chart-container', heartRateData || [], '24h');
  renderBloodPressureChart('bp-chart-container', bloodPressureData || [], '7d');
}

/**
 * Render panduan gaya hidup sehat berdasarkan profil pengguna.
 * Menampilkan tab per PTM dengan tips spesifik per kategori.
 * @param {object} profile
 */
export function renderLifestyleGuide(profile) {
  const tabsEl   = document.getElementById('lifestyle-tabs');
  const contentEl = document.getElementById('lifestyle-content');
  if (!tabsEl || !contentEl) return;

  const guides = getLifestyleGuide(profile);
  if (!guides.length) return;

  let activeIdx = 0;

  const priorityColor = {
    high:   'var(--red)',
    medium: 'var(--yellow)',
    low:    'var(--green)',
  };

  const renderTab = (idx) => {
    activeIdx = idx;
    const guide = guides[idx];

    // Update tab styles
    tabsEl.querySelectorAll('.lifestyle-tab').forEach((t, i) => {
      t.style.background    = i === idx ? 'var(--accent-soft)' : 'var(--surface-2)';
      t.style.borderColor   = i === idx ? 'rgba(37,99,235,0.3)' : 'var(--border)';
      t.style.color         = i === idx ? 'var(--accent)' : 'var(--text-2)';
    });

    // Render content
    contentEl.innerHTML = `
      <div class="card" style="border-left:3px solid ${priorityColor[guide.priority]};">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;">
          <span style="font-size:1.4rem;">${guide.icon}</span>
          <div>
            <div style="font-size:0.875rem;font-weight:600;color:var(--text);margin-bottom:3px;">${guide.ptm}</div>
            <div style="font-size:0.78rem;color:var(--text-3);line-height:1.5;">${guide.summary}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
          ${guide.categories.map(cat => `
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
              <div style="font-size:0.75rem;font-weight:600;color:var(--text-2);margin-bottom:8px;display:flex;align-items:center;gap:5px;">
                <span>${cat.icon}</span> ${cat.title}
              </div>
              <ul style="display:flex;flex-direction:column;gap:5px;">
                ${cat.tips.map(tip => `
                  <li style="font-size:0.775rem;color:var(--text-3);line-height:1.5;padding-left:10px;position:relative;">
                    <span style="position:absolute;left:0;color:var(--accent);">·</span>
                    ${tip}
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  // Render tabs
  tabsEl.innerHTML = guides.map((g, i) => `
    <button class="lifestyle-tab btn btn-sm" data-idx="${i}" style="
      gap:5px;
      background:${i === 0 ? 'var(--accent-soft)' : 'var(--surface-2)'};
      border:1px solid ${i === 0 ? 'rgba(37,99,235,0.3)' : 'var(--border)'};
      color:${i === 0 ? 'var(--accent)' : 'var(--text-2)'};
    ">
      <span>${g.icon}</span> ${g.ptm}
    </button>
  `).join('');

  tabsEl.querySelectorAll('.lifestyle-tab').forEach(btn => {
    btn.addEventListener('click', () => renderTab(parseInt(btn.dataset.idx)));
  });

  renderTab(0);
}

/**
 * Update panel analisis longitudinal AI.
 * @param {object} longitudinal - hasil analyzeLongitudinal()
 */
export function updateLongitudinalPanel(longitudinal) {
  if (!longitudinal) return;

  // Genetic score
  const scoreEl = document.getElementById('genetic-score');
  const barFill  = document.getElementById('genetic-bar-fill');
  const descEl   = document.getElementById('genetic-desc');
  if (scoreEl) scoreEl.textContent = longitudinal.geneticScore;
  if (barFill) {
    barFill.style.width = `${longitudinal.geneticScore}%`;
    barFill.style.background = longitudinal.geneticScore >= 70
      ? 'var(--red)' : longitudinal.geneticScore >= 40
      ? 'var(--yellow)' : 'var(--green)';
  }
  if (descEl) {
    const label = longitudinal.geneticScore >= 70 ? 'Risiko Tinggi'
      : longitudinal.geneticScore >= 40 ? 'Risiko Sedang' : 'Risiko Rendah';
    descEl.textContent = `${label} — ${longitudinal.trends.daysAnalyzed} hari dianalisis`;
  }

  // Trend averages
  const t = longitudinal.trends;
  const set = (id, val, unit = '') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null ? `${val}${unit}` : '--';
  };
  set('avg-systolic',  t.avgSystolic,  ' mmHg');
  set('avg-diastolic', t.avgDiastolic, ' mmHg');
  set('avg-bpm',       t.avgBpm,       ' BPM');

  const trendEl = document.getElementById('systolic-trend');
  if (trendEl) {
    trendEl.textContent = t.systolicTrend === 'rising' ? '↑ Meningkat' : '→ Stabil';
    trendEl.style.color = t.systolicTrend === 'rising' ? 'var(--red)' : 'var(--green)';
  }

  // Detected patterns
  const patternsSection = document.getElementById('patterns-section');
  const patternsList    = document.getElementById('patterns-list');
  if (longitudinal.patterns.length > 0 && patternsSection && patternsList) {
    patternsSection.style.display = 'block';
    patternsList.innerHTML = longitudinal.patterns.map(p => `
      <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${p.severity === 'high' ? 'var(--red)' : 'var(--yellow)'};border-radius:var(--radius);display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:0.7rem;font-weight:600;padding:2px 7px;border-radius:var(--radius-full);background:${p.severity === 'high' ? 'var(--red-soft)' : 'var(--yellow-soft)'};color:${p.severity === 'high' ? 'var(--red)' : 'var(--yellow)'};flex-shrink:0;">${p.ptmType}</span>
        <span style="font-size:0.8rem;color:var(--text-2);line-height:1.5;">${p.message}</span>
      </div>
    `).join('');
  }

  // SATU SEHAT panel
  const satuSehat = getSatuSehatRecord();
  const ssPanel   = document.getElementById('satusehat-panel');
  const ssInfo    = document.getElementById('satusehat-info');
  if (satuSehat && ssPanel && ssInfo) {
    ssPanel.style.display = 'block';
    const meds = satuSehat.medications?.map(m => `${m.name} (${m.frequency})`).join(', ') || '-';
    const diag = satuSehat.diagnoses?.map(d => d.name).join(', ') || '-';
    ssInfo.innerHTML = `
      <div>Diagnosa: <strong style="color:var(--text-2);">${diag}</strong></div>
      <div>Obat rutin: <strong style="color:var(--text-2);">${meds}</strong></div>
      <div>Terakhir sinkron: ${new Date(satuSehat.syncedAt).toLocaleDateString('id-ID')}</div>
    `;
  }
}
