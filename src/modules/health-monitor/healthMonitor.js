/**
 * Health Monitor — mengelola penerimaan dan pemrosesan data biometrik dari smartwatch.
 */

import eventBus from '../../utils/eventBus.js';
import * as smartwatchAdapter from './smartwatchAdapter.js';

// Internal state
let _connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'error'
let _lastReading = { heartRate: null, bloodPressure: null };
let _intervalId = null;

// Simple UUID fallback (crypto.randomUUID when available, otherwise manual)
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_USER_ID = 'user-001';

/**
 * Process a heart rate reading.
 * @param {number} bpm
 * @param {Date} timestamp
 * @returns {HeartRateReading}
 */
export function processHeartRate(bpm, timestamp) {
  return {
    id: generateId(),
    userId: DEFAULT_USER_ID,
    bpm,
    timestamp,
    source: 'smartwatch',
    isAbnormal: bpm < 50 || bpm > 100,
  };
}

/**
 * Process a blood pressure reading.
 * @param {number} systolic
 * @param {number} diastolic
 * @param {Date} timestamp
 * @returns {BloodPressureReading}
 */
export function processBloodPressure(systolic, diastolic, timestamp) {
  let riskLevel;
  if (systolic > 140 || diastolic > 90) {
    riskLevel = 'hypertension';
  } else if (systolic > 120 || diastolic > 80) {
    riskLevel = 'elevated';
  } else {
    riskLevel = 'normal';
  }

  return {
    id: generateId(),
    userId: DEFAULT_USER_ID,
    systolic,
    diastolic,
    timestamp,
    source: 'smartwatch',
    riskLevel,
  };
}

/**
 * Get the current smartwatch connection status.
 * @returns {'connected' | 'disconnected' | 'error'}
 */
export function getConnectionStatus() {
  return _connectionStatus;
}

/**
 * Get the last known readings (never null if data was received before).
 * @returns {{ heartRate: HeartRateReading | null, bloodPressure: BloodPressureReading | null }}
 */
export function getLastReading() {
  return { ..._lastReading };
}

/**
 * For testing: allows setting connection status externally.
 * @param {'connected' | 'disconnected' | 'error'} status
 */
export function setConnectionStatus(status) {
  _connectionStatus = status;
}

/**
 * Start polling the smartwatch adapter at the given interval.
 * Updates internal state and emits 'health:update' via eventBus.
 * @param {number} intervalMs
 */
export function startMonitoring(intervalMs) {
  if (_intervalId !== null) {
    stopMonitoring();
  }

  _intervalId = setInterval(() => {
    const raw = smartwatchAdapter.generateReading();

    if (raw === null) {
      // Disconnection detected — keep last reading, update status
      _connectionStatus = 'disconnected';
      eventBus.emit('health:update', {
        connectionStatus: _connectionStatus,
        lastReading: getLastReading(),
      });
      return;
    }

    // Connected — process and store readings
    _connectionStatus = 'connected';

    const heartRate = processHeartRate(raw.bpm, raw.timestamp);
    const bloodPressure = processBloodPressure(raw.systolic, raw.diastolic, raw.timestamp);

    _lastReading = { heartRate, bloodPressure };

    eventBus.emit('health:update', {
      connectionStatus: _connectionStatus,
      lastReading: getLastReading(),
    });
  }, intervalMs);
}

/**
 * Stop the monitoring interval.
 */
export function stopMonitoring() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}
