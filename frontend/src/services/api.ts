const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export interface SensorPayload {
  device_id: string;
  gas: number;
  temperature: number;
  humidity: number;
  flame: boolean;
  motion: boolean;
  water: number;
  timestamp?: string;
}

export interface SensorReading extends SensorPayload {
  id: string;
  created_at: string;
}

export interface EmergencyEvent {
  id: string;
  device_id: string;
  event_type: string;
  severity: "NORMAL" | "WARNING" | "CRITICAL";
  risk_score: number;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
}

export interface StoredDeviceStatus {
  id: string;
  device_id: string;
  gas_valve: boolean;
  fan: boolean;
  power_isolation: boolean;
  door: boolean;
  alarm: boolean;
  updated_at: string;
}

export interface EventAction {
  id: string;
  event_id: string;
  action: string;
  status: string;
  executed_at: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HealthResponse {
  success: boolean;
  service: string;
  status: string;
}

export interface SensorResponse extends ApiEnvelope<SensorReading> {}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const result = await response.json().catch(() => ({})) as {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new ApiError(
      result.message || result.error || `Request failed: ${response.status}`,
      response.status
    );
  }

  return result as T;
}

export function checkBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { signal });
}

export function sendSensorData(payload: SensorPayload): Promise<unknown> {
  return request("/api/v1/sensors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getSensorData(
  deviceId = "LIFELINE-001",
  signal?: AbortSignal
): Promise<SensorResponse> {
  return request(`/api/v1/sensors/${encodeURIComponent(deviceId)}`, { signal });
}

export async function getSensorHistory(
  deviceId: string,
  limit = 30,
  signal?: AbortSignal
): Promise<SensorReading[]> {
  const response = await request<ApiEnvelope<SensorReading[]>>(
    `/api/v1/sensors/history/${encodeURIComponent(deviceId)}?limit=${limit}`,
    { signal }
  );
  return response.data;
}

export async function getEmergencyEvents(
  deviceId: string,
  limit = 20,
  signal?: AbortSignal
): Promise<EmergencyEvent[]> {
  const response = await request<ApiEnvelope<EmergencyEvent[]>>(
    `/api/v1/events/${encodeURIComponent(deviceId)}?limit=${limit}`,
    { signal }
  );
  return response.data;
}

export async function getActiveEmergency(
  deviceId: string,
  signal?: AbortSignal
): Promise<EmergencyEvent | null> {
  try {
    const response = await request<ApiEnvelope<EmergencyEvent>>(
      `/api/v1/events/${encodeURIComponent(deviceId)}/active`,
      { signal }
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getDeviceStatus(
  deviceId: string,
  signal?: AbortSignal
): Promise<StoredDeviceStatus | null> {
  try {
    const response = await request<ApiEnvelope<StoredDeviceStatus>>(
      `/api/v1/device-status/${encodeURIComponent(deviceId)}`,
      { signal }
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getEventActions(
  eventId: string,
  signal?: AbortSignal
): Promise<EventAction[]> {
  const response = await request<ApiEnvelope<EventAction[]>>(
    `/api/v1/events/${encodeURIComponent(eventId)}/actions`,
    { signal }
  );
  return response.data;
}

export function triggerManualEmergency(deviceId: string): Promise<unknown> {
  return request(`/api/v1/events/${encodeURIComponent(deviceId)}/manual`, {
    method: "POST",
  });
}