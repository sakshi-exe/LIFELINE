import { Request, Response } from "express";
import { handleEmergency } from "../services/emergency.service";
import {
	createEmergencyEvent,
	getActiveEmergencyEvent,
	getEmergencyEvents,
	getEventActions,
	resolveEmergencyEvent,
	saveDeviceStatus,
	saveEventAction,
} from "../services/supabase.service";
import { EmergencyType, RiskResult } from "../types/lifeline.types";
import { isValidDeviceId, parseListLimit } from "../utils/validators";

export async function getEmergencyEventsForDevice(req: Request, res: Response) {
	const { deviceId } = req.params;
	const limit = parseListLimit(req.query.limit);

	if (!isValidDeviceId(deviceId)) {
		return res.status(400).json({ success: false, message: "Invalid device ID" });
	}

	if (limit === null) {
		return res.status(400).json({ success: false, message: "Limit must be an integer from 1 to 100" });
	}

	try {
		const events = await getEmergencyEvents(deviceId, limit);
		return res.json({ success: true, data: events });
	} catch (error) {
		console.error("Emergency events fetch error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to fetch emergency events",
		});
	}
}

export async function getActiveEmergencyForDevice(req: Request, res: Response) {
	const { deviceId } = req.params;

	if (!isValidDeviceId(deviceId)) {
		return res.status(400).json({ success: false, message: "Invalid device ID" });
	}

	try {
		const event = await getActiveEmergencyEvent(deviceId);
		if (!event) {
			return res.status(404).json({ success: false, message: "No active emergency" });
		}
		return res.json({ success: true, data: event });
	} catch (error) {
		console.error("Active emergency fetch error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to fetch active emergency",
		});
	}
}

export async function getActionsForEvent(req: Request, res: Response) {
	const { eventId } = req.params;

	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
		return res.status(400).json({ success: false, message: "Invalid event ID" });
	}

	try {
		const actions = await getEventActions(eventId);
		return res.json({ success: true, data: actions });
	} catch (error) {
		console.error("Event actions fetch error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to fetch event actions",
		});
	}
}

export async function resolveEmergency(req: Request, res: Response) {
	const { eventId } = req.params;
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
		return res.status(400).json({ success: false, message: "Invalid event ID" });
	}

	try {
		const result = await resolveEmergencyEvent(eventId);
		if (!result) {
			return res.status(404).json({ success: false, message: "Emergency event not found" });
		}
		return res.json({ success: true, data: result.event, alreadyResolved: result.alreadyResolved });
	} catch (error) {
		console.error("Emergency resolve error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to resolve emergency",
		});
	}
}

export async function triggerManualEmergency(req: Request, res: Response) {
	const { deviceId } = req.params;

	if (!isValidDeviceId(deviceId)) {
		return res.status(400).json({ success: false, message: "Invalid device ID" });
	}

	const risk: RiskResult = {
		score: 100,
		severity: "CRITICAL",
		eventType: "MANUAL_EMERGENCY" satisfies EmergencyType,
	};

	try {
		const emergency = handleEmergency(deviceId, risk);
		const event = await createEmergencyEvent(deviceId, risk);
		const deviceStatus = emergency.deviceStatus
			? await saveDeviceStatus(emergency.deviceStatus)
			: null;
		const actions = event
			? await Promise.all(
					emergency.actions.map((action) => saveEventAction(event.id, action))
				)
			: [];

		return res.status(201).json({
			success: true,
			risk,
			emergency: { ...emergency, deviceStatus },
			event,
			actions,
		});
	} catch (error) {
		console.error("Manual emergency error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to trigger manual emergency",
		});
	}
}
