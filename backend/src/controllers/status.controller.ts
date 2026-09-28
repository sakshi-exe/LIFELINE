import { Request, Response } from "express";
import { getStoredDeviceStatus } from "../services/supabase.service";
import { isValidDeviceId } from "../utils/validators";

export async function getDeviceStatus(req: Request, res: Response) {
	const { deviceId } = req.params;

	if (!isValidDeviceId(deviceId)) {
		return res.status(400).json({ success: false, message: "Invalid device ID" });
	}

	try {
		const status = await getStoredDeviceStatus(deviceId);
		if (!status) {
			return res.status(404).json({ success: false, message: "Device status not found" });
		}
		return res.json({ success: true, data: status });
	} catch (error) {
		console.error("Device status fetch error:", error);
		return res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Failed to fetch device status",
		});
	}
}
