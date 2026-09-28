import { Router } from "express";

import {
  receiveSensorData,
  getLatestSensorData,
  getSensorHistoryData,
} from "../controllers/sensor.controller";

const router = Router();

// Receive and process sensor data
router.post(
  "/",
  receiveSensorData
);

router.get("/history/:deviceId", getSensorHistoryData);

// Get latest sensor reading for a device
router.get(
  "/:deviceId",
  getLatestSensorData
);

export default router;