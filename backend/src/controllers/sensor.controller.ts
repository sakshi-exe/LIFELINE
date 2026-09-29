import { Request, Response } from "express";

import { calculateRisk } from "../engine/risk.engine";

import { handleEmergency } from "../services/emergency.service";

import {
  saveSensorReading,
  getLatestSensorReading,
  getSensorHistory,
  createEmergencyEvent,
  getActiveEmergencyEvent,
  resolveEmergencyEvent,
  saveDeviceStatus,
  saveEventAction,
} from "../services/supabase.service";
import {
  isValidDeviceId,
  parseListLimit,
  SENSOR_PAYLOAD_ERROR,
  validateSensorPayload,
} from "../utils/validators";

export async function receiveSensorData(
  req: Request,
  res: Response
) {
    if (!validateSensorPayload(req.body)) {
      return res.status(400).json({ success: false, message: SENSOR_PAYLOAD_ERROR });
    }

  try {
    const sensorData = req.body;

    // 1. Save raw sensor reading
    const reading = await saveSensorReading(sensorData);

    // 2. Calculate risk
    const risk = calculateRisk(sensorData);

    // 3. Execute emergency response if critical
    const emergency = handleEmergency(
      sensorData.device_id,
      risk
    );

    let event = null;
    let deviceStatus = null;

    const actions: unknown[] = [];

    // 4. Emergency event lifecycle
    if (
      emergency.triggered &&
      emergency.eventType
    ) {
      const activeEvent = await getActiveEmergencyEvent(
        sensorData.device_id
      );

      if (
        activeEvent &&
        activeEvent.event_type === emergency.eventType
      ) {
        // Same emergency is already active.
        // Do not create duplicate event/action records.
        event = activeEvent;

        console.log(
          `ℹ️ ${sensorData.device_id}: ${emergency.eventType} already ACTIVE`
        );
      } else {
        // New emergency detected.
        event = await createEmergencyEvent(
          sensorData.device_id,
          risk
        );

        if (emergency.deviceStatus) {
          deviceStatus = await saveDeviceStatus(
            emergency.deviceStatus
          );
        }

        if (event) {
          for (const action of emergency.actions) {
            const savedAction = await saveEventAction(
              event.id,
              action
            );

            actions.push(savedAction);
          }
        }
      }
    } else {
      // No emergency condition anymore.
      const activeEvent = await getActiveEmergencyEvent(
        sensorData.device_id
      );

      if (activeEvent) {
        const resolved = await resolveEmergencyEvent(
          activeEvent.id
        );

        if (resolved) {
          event = resolved.event;

          console.log(
            `✅ ${sensorData.device_id}: ${activeEvent.event_type} RESOLVED`
          );
        }
      }
    }

    return res.json({
      success: true,
      data: sensorData,
      reading,
      risk,
      emergency: {
        ...emergency,
        deviceStatus,
      },
      event,
      actions,
    });
  } catch (error) {
    console.error(
      "Sensor processing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to process sensor data",
    });
  }
}

export async function getLatestSensorData(
  req: Request,
  res: Response
) {
  try {
    const { deviceId } = req.params;

    if (!isValidDeviceId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    const reading =
      await getLatestSensorReading(deviceId);

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: `No sensor readings found for device ${deviceId}`,
      });
    }

      return res.json({
        success: true,
        data: reading,
        risk: reading ? calculateRisk(reading) : null,
      });
  } catch (error) {
    console.error(
      "Latest sensor fetch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch latest sensor data",
    });
  }
}

export async function getSensorHistoryData(
  req: Request,
  res: Response
) {
  const { deviceId } = req.params;
  const limit = parseListLimit(req.query.limit, 30);

  if (!isValidDeviceId(deviceId)) {
    return res.status(400).json({ success: false, message: "Invalid device ID" });
  }

  if (limit === null) {
    return res.status(400).json({ success: false, message: "Limit must be an integer from 1 to 100" });
  }

  try {
    const readings = await getSensorHistory(deviceId, limit);
    return res.json({ success: true, data: readings });
  } catch (error) {
    console.error("Sensor history fetch error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch sensor history",
    });
  }
}