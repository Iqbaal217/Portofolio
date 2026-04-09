/**
 * Smartwatch Adapter — mock data generator untuk simulasi data smartwatch.
 * Mensimulasikan pembacaan biometrik dari perangkat wearable.
 */

let _connected = true;

/**
 * Generate a mock biometric reading from the smartwatch.
 * Has a 10% chance of returning null to simulate disconnection.
 * @returns {{ bpm: number, systolic: number, diastolic: number, timestamp: Date } | null}
 */
export function generateReading() {
  // 10% chance of disconnection
  if (Math.random() < 0.1) {
    _connected = false;
    return null;
  }

  _connected = true;

  // bpm: 55–105 (occasionally abnormal: <50 or >100)
  const bpm = Math.floor(55 + Math.random() * 50); // 55–104

  // systolic: 110–150, diastolic: 70–95
  const systolic = Math.floor(110 + Math.random() * 40);
  const diastolic = Math.floor(70 + Math.random() * 25);

  return {
    bpm,
    systolic,
    diastolic,
    timestamp: new Date(),
  };
}

/**
 * Check whether the smartwatch is currently connected.
 * @returns {boolean}
 */
export function isConnected() {
  return _connected;
}
