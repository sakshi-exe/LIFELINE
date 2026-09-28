import { Router } from "express";
import {
	getActionsForEvent,
	getActiveEmergencyForDevice,
	getEmergencyEventsForDevice,
	resolveEmergency,
	triggerManualEmergency,
} from "../controllers/emergency.controller";

const router = Router();

router.post("/:deviceId/manual", triggerManualEmergency);
router.patch("/:eventId/resolve", resolveEmergency);
router.get("/:deviceId/active", getActiveEmergencyForDevice);
router.get("/:eventId/actions", getActionsForEvent);
router.get("/:deviceId", getEmergencyEventsForDevice);

export default router;
