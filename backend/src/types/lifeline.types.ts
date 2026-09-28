export type EmergencyType =
  | "GAS_LEAK"
  | "FIRE"
  | "INTRUSION"
  | "MANUAL_EMERGENCY";

export type Severity =
  | "NORMAL"
  | "WARNING"
  | "CRITICAL";

export interface SensorData {
  device_id: string;
  gas: number;
  temperature: number;
  humidity: number;
  flame: boolean;
  motion: boolean;
  timestamp?: string;
}

export interface RiskResult {
  score: number;
  severity: Severity;
  eventType?: EmergencyType;
}

export interface DeviceStatus {
  device_id: string;
  gas_valve: boolean;
  fan: boolean;
  power_isolation: boolean;
  door: boolean;
  alarm: boolean;
}

export interface SensorReadingRecord extends SensorData {
  id: string;
  created_at: string;
}

export interface EmergencyEventRecord {
  id: string;
  device_id: string;
  event_type: EmergencyType;
  severity: Severity;
  risk_score: number;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
  action_count?: number;
}

export interface ResolveEmergencyResult {
  event: EmergencyEventRecord;
  alreadyResolved: boolean;
}

export interface DeviceStatusRecord extends DeviceStatus {
  id: string;
  updated_at: string;
}

export interface EventActionRecord {
  id: string;
  event_id: string;
  action: string;
  status: string;
  executed_at: string;
}