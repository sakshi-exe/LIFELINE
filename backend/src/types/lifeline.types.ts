export type EmergencyType =
  | "GAS_LEAK"
  | "FIRE"
  | "WATER_LEAK"
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
  water: number;
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