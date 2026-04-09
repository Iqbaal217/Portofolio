/**
 * Home_Dashboard — mengintegrasikan semua modul untuk halaman utama PANTAS.
 */

import { startMonitoring } from '../health-monitor/healthMonitor.js';
import { analyzeRisk } from '../risk-engine/riskEngine.js';
import { renderHeartRateChart, renderBloodPressureChart } from '../chart-renderer/chartRenderer.js';
import { openCamera } from '../kalori-detector/kaloriDetector.js';
import eventBus from '../../utils/eventBus.js';

// HTML template dashboard
const DASHBOARD_HTML = `
<div class="dashboard">
  <header class="dashboard-header">
    <div class="header-left">
      <h1 class="app-title">PANTAS</h1>
      <span id="user-name" class="user-name"></span>
    </div>
    <div class="header-right">
      <span id="connection-status" class="connection-status disconnected">Terputus</span>
      <button id="logout-btn" class="btn btn-secondary">Keluar</button>
    </div>
  </header>

  <main class="dashboard-main">
    <!-- Kartu Ringkasan Kesehatan -->
    <section class="health-cards">
      <div class="card card-heart-rate">
        <h2 class="card-title">Detak Jantung</h2>
        <div class="card-value">
          <span id="bpm-value" class="metric-value">--</span>
          <span class="metric-unit">BPM</span>
        </div>
      </div>

      <div class="card card-blood-pressure">
        <h2 class="card-title">Tekanan Darah</h2>
        <div class="card-value">
          <span id="bp-value" class="metric-value">--/--</span>
          <span class="metric-unit">mmHg</span>
        </div>
      </div>

      <div class="card card-risk">
        <h2 class="card-title">Status Risiko PTM</h2>
        <div class="card-value">
          <span id="risk-level" class="risk-badge risk-low">Rendah</span>
        </div>
      </div>

      <div class="card card-camera">
        <h2 class="card-title">Deteksi Kalori</h2>
        <button id="camera-btn" class="btn btn-primary">Buka Kamera</button>
      </div>
    </section>

    <!-- Panel Detail Risiko -->
    <section id="risk-detail-panel" class="risk-detail-panel" style="display:none;">
      <h2 class="panel-title">Detail Analisis Risiko</h2>
      <p id="risk-description" class="risk-description"></p>
      <ul id="risk-recommendations" class="risk-recommendations"></ul>
      <button id="close-risk-detail" class="btn btn-secondary">Tutup</button>
    </section>

    <!-- Grafik Tren -->
    <section class="charts-section">
      <h2 class="section-title">Grafik Tren Kesehatan</h2>
      <div class="chart-container">
        <h3>Detak Jantung (24 Jam Terakhir)</h3>
        <div id="hr-chart-container" class="chart"></div>
      </div>
      <div class="chart-container">
        <h3>Tekanan Darah (7 Hari Terakhir)</h3>
        <div id="bp-chart-container" class="chart"></div>
      </div>
    </section>

    <!-- Navigasi -->
    <nav class="dashboard-nav">
      <a href="#/history" class="nav-link">Riwayat</a>
      <a href="#/reminders" class="nav-link">Pengingat Obat</a>
      <a href="#/consultation" class="nav-link">Konsultasi Dokter</a>
    </nav>
  </main>
</div>
`;

/**
 * Render dashboard HTML ke dalam container dan inisialisasi semua modul.
 * @param {HTMLElement} container
 */
export function render(container) {
  container.innerHTML = DASHBOARD_HTML;

  // Mulai monitoring setiap 30 detik
  startMonitoring(30000);

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
    }
  });

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
