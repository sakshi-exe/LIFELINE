import { Request, Response } from "express";
import { calculateRisk } from "../engine/risk.engine";
import { handleEmergency } from "../services/emergency.service";
import {
  saveSensorReading,
  createEmergencyEvent,
  saveDeviceStatus,
  saveEventAction,
} from "../services/supabase.service";

export async function receiveSensorData(
  req: Request,
  res: Response
) {
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

    // 4. Persist emergency event + actions
    if (emergency.triggered && emergency.eventType) {
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
    console.error("Sensor processing error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to process sensor data",
    });
  }
}
