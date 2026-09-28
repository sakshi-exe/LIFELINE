import { Request, Response } from "express";
import { calculateRisk } from "../engine/risk.engine";
import { handleEmergency } from "../services/emergency.service";

export async function receiveSensorData(
  req: Request,
  res: Response
) {
  try {
    const sensorData = req.body;

    const risk = calculateRisk(sensorData);

    const emergency = handleEmergency(
      sensorData.device_id,
      risk
    );

    return res.json({
      success: true,
      data: sensorData,
      risk,
      emergency,
    });

  } catch (error) {
    console.error("Sensor processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process sensor data",
    });
  }
}
