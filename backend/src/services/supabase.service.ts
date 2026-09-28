import { supabase } from "../config/supabase";
import {
  DeviceStatusRecord,
  DeviceStatus,
  EmergencyEventRecord,
  EventActionRecord,
  ResolveEmergencyResult,
  SensorReadingRecord,
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
      created_at: data.timestamp || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to save sensor reading: ${error.message}`
    );
  }

  return reading;
}

export async function getLatestSensorReading(
  deviceId: string
): Promise<SensorReadingRecord | null> {
  const { data: reading, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch latest sensor reading: ${error.message}`
    );
  }

  return reading as SensorReadingRecord | null;
}

export async function getSensorHistory(
  deviceId: string,
  limit: number
): Promise<SensorReadingRecord[]> {
  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch sensor history: ${error.message}`);
  }

  return (data ?? []) as SensorReadingRecord[];
}

export async function getEmergencyEvents(
  deviceId: string,
  limit: number
): Promise<EmergencyEventRecord[]> {
  const { data, error } = await supabase
    .from("emergency_events")
    .select("*")
    .eq("device_id", deviceId)
    .order("triggered_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch emergency events: ${error.message}`);
  }

  const events = (data ?? []) as EmergencyEventRecord[];
  if (events.length === 0) return events;

  const { data: actionRows, error: actionError } = await supabase
    .from("event_actions")
    .select("event_id")
    .in("event_id", events.map((event) => event.id));

  if (actionError) {
    throw new Error(`Failed to fetch event action counts: ${actionError.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of actionRows ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return events.map((event) => ({ ...event, action_count: counts.get(event.id) ?? 0 }));
}

export async function getActiveEmergencyEvent(
  deviceId: string
): Promise<EmergencyEventRecord | null> {
  const { data, error } = await supabase
    .from("emergency_events")
    .select("*")
    .eq("device_id", deviceId)
    .eq("status", "ACTIVE")
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active emergency: ${error.message}`);
  }

  return data as EmergencyEventRecord | null;
}

export async function resolveEmergencyEvent(
  eventId: string
): Promise<ResolveEmergencyResult | null> {
  const { data: updated, error: updateError } = await supabase
    .from("emergency_events")
    .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("status", "ACTIVE")
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to resolve emergency: ${updateError.message}`);
  }

  if (updated) {
    return { event: updated as EmergencyEventRecord, alreadyResolved: false };
  }

  const { data: existing, error: selectError } = await supabase
    .from("emergency_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to look up emergency: ${selectError.message}`);
  }

  if (!existing) {
    return null;
  }

  const event = existing as EmergencyEventRecord;
  return event.status === "RESOLVED"
    ? { event, alreadyResolved: true }
    : null;
}

export async function getStoredDeviceStatus(
  deviceId: string
): Promise<DeviceStatusRecord | null> {
  const { data, error } = await supabase
    .from("device_status")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch device status: ${error.message}`);
  }

  return data as DeviceStatusRecord | null;
}

export async function getEventActions(
  eventId: string
): Promise<EventActionRecord[]> {
  const { data, error } = await supabase
    .from("event_actions")
    .select("*")
    .eq("event_id", eventId)
    .order("executed_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch event actions: ${error.message}`);
  }

  return (data ?? []) as EventActionRecord[];
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
    throw new Error(
      `Failed to create emergency event: ${error.message}`
    );
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
    throw new Error(
      `Failed to save device status: ${error.message}`
    );
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
    throw new Error(
      `Failed to save event action: ${error.message}`
    );
  }

  return data;
}