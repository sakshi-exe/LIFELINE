import { Router } from "express";
import { receiveSensorData } from "../controllers/sensor.controller";

const router = Router();

router.post("/", receiveSensorData);

export default router;