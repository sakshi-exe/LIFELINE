import { Router } from "express";
import { getDeviceStatus } from "../controllers/status.controller";

const router = Router();

router.get("/:deviceId", getDeviceStatus);

export default router;
