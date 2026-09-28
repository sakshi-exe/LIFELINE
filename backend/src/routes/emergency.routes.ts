import { Router } from "express";
import {
	getActionsForEvent,
	getActiveEmergencyForDevice,
	getEmergencyEventsForDevice,
	triggerManualEmergency,
} from "../controllers/emergency.controller";

const router = Router();

router.post("/:deviceId/manual", triggerManualEmergency);
router.get("/:deviceId/active", getActiveEmergencyForDevice);
router.get("/:eventId/actions", getActionsForEvent);
router.get("/:deviceId", getEmergencyEventsForDevice);

export default router;
