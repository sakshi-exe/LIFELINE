import { SensorData } from "../types/lifeline.types";

export function isValidDeviceId(value: string): boolean {
	return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function validateSensorPayload(value: unknown): value is SensorData {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const payload = value as Record<string, unknown>;
	const numericFields = ["gas", "temperature", "humidity"] as const;
	if (typeof payload.device_id !== "string" || !isValidDeviceId(payload.device_id)) {
		return false;
	}
	if (numericFields.some((field) => typeof payload[field] !== "number" || !Number.isFinite(payload[field]))) {
		return false;
	}
	if ((payload.gas as number) < 0 || (payload.gas as number) > 100) return false;
	if ((payload.humidity as number) < 0 || (payload.humidity as number) > 100) return false;
	if ((payload.temperature as number) < -40 || (payload.temperature as number) > 125) return false;
	if (typeof payload.flame !== "boolean" || typeof payload.motion !== "boolean") return false;
	if (payload.timestamp !== undefined && (typeof payload.timestamp !== "string" || Number.isNaN(Date.parse(payload.timestamp)))) {
		return false;
	}
	return true;
}

export const SENSOR_PAYLOAD_ERROR =
	"Expected device_id, gas/humidity (0-100), temperature (-40 to 125), flame, motion, and optional ISO timestamp";

export function parseListLimit(value: unknown, fallback = 20): number | null {
	if (value === undefined) {
		return fallback;
	}

	const limit = Number(value);
	return Number.isInteger(limit) && limit >= 1 && limit <= 100
		? limit
		: null;
}
