import { Request, Response } from "express";
import { isValidDeviceId } from "../utils/validators";
import { getRealtimeStatus, subscribeRealtime } from "../services/realtime.service";

export function streamRealtime(req: Request, res: Response): void {
	const requestedDeviceId = req.query.deviceId;
	if (requestedDeviceId !== undefined &&
		(typeof requestedDeviceId !== "string" || !isValidDeviceId(requestedDeviceId))) {
		res.status(400).json({ success: false, message: "Invalid device ID" });
		return;
	}

	const deviceId = requestedDeviceId as string | undefined;
	res.status(200).set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
	});
	res.flushHeaders();
	res.write(`data: ${JSON.stringify({ kind: "status", status: getRealtimeStatus() })}\n\n`);

	const unsubscribe = subscribeRealtime((notice) => {
		if (notice.kind === "change" && deviceId && notice.deviceId && notice.deviceId !== deviceId) return;
		res.write(`data: ${JSON.stringify(notice)}\n\n`);
	});
	const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25000);

	res.on("close", () => {
		clearInterval(heartbeat);
		unsubscribe();
	});
}