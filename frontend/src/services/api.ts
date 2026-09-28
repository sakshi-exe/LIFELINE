const API_BASE_URL = "http://localhost:5050";

export interface SensorPayload {
  device_id: string;
  gas: number;
  temperature: number;
  humidity: number;
  flame: boolean;
  motion: boolean;
  water: number;
}

export interface SensorResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Check whether the LIFELINE backend is online.
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Send sensor readings to the LIFELINE backend.
 */
export async function sendSensorData(
  payload: SensorPayload,
): Promise<SensorResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sensors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error || `Sensor request failed: ${response.status}`,
    );
  }

  return result;
}

/**
 * Get the latest sensor data for a device.
 */
export async function getSensorData(deviceId = "LIFELINE-001") {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/sensors/${deviceId}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sensor data: ${response.status}`);
  }

  return response.json();
}