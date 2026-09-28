import { Request, Response } from "express";
import { calculateRisk } from "../engine/risk.engine";

export async function receiveSensorData(
  req: Request,
  res: Response
) {
  try {
    const sensorData = req.body;

    const risk = calculateRisk(sensorData);

    return res.json({
      success: true,
      data: sensorData,
      risk,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process sensor data",
    });
  }
}