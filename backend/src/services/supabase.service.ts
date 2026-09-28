import { supabase } from "../config/supabase";
import {
  DeviceStatus,
  SensorData,
  RiskResult,
} from "../types/lifeline.types";

export async function saveSensorReading(
  data: SensorData
) {
  const { data: reading, error } = await supabase
    .from("sensor_readings")
    .insert({
      device_id: data.device_id,
      gas: data.gas,
      temperature: data.temperature,
      humidity: data.humidity,
      flame: data.flame,
      motion: data.motion,
      water: data.water,
      created_at: data.timestamp || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save sensor reading: ${error.message}`);
  }

  return reading;
}

export async function createEmergencyEvent(
  deviceId: string,
  risk: RiskResult
) {
  if (!risk.eventType) {
    return null;
  }

  const { data: event, error } = await supabase
    .from("emergency_events")
    .insert({
      device_id: deviceId,
      event_type: risk.eventType,
      severity: risk.severity,
      risk_score: risk.score,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create emergency event: ${error.message}`);
  }

  return event;
}

export async function saveDeviceStatus(
  status: DeviceStatus
) {
  const { data, error } = await supabase
    .from("device_status")
    .upsert(
      {
        device_id: status.device_id,
        gas_valve: status.gas_valve,
        fan: status.fan,
        power_isolation: status.power_isolation,
        door: status.door,
        alarm: status.alarm,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "device_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save device status: ${error.message}`);
  }

  return data;
}

export async function saveEventAction(
  eventId: string,
  action: string
) {
  const { data, error } = await supabase
    .from("event_actions")
    .insert({
      event_id: eventId,
      action,
      status: "EXECUTED",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save event action: ${error.message}`);
  }

  return data;
}
