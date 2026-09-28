import { EventEmitter } from "node:events";
import { supabase } from "../config/supabase";

export type RealtimeState = "CONNECTING" | "CONNECTED" | "DEGRADED" | "DISCONNECTED";

export type RealtimeNotice =
	| { kind: "status"; status: RealtimeState }
	| { kind: "change"; table: string; deviceId?: string; createdAt: string };

const notices = new EventEmitter();
let started = false;
let currentStatus: RealtimeState = "CONNECTING";

function setStatus(status: RealtimeState): void {
	if (currentStatus === status) return;
	currentStatus = status;
	notices.emit("notice", { kind: "status", status } satisfies RealtimeNotice);
}

export function startRealtimeBridge(): void {
	if (started) return;
	started = true;

	let channel = supabase.channel("lifeline-backend-dashboard");
	for (const table of ["sensor_readings", "emergency_events", "device_status", "event_actions"]) {
		channel = channel.on(
			"postgres_changes",
			{ event: "*", schema: "public", table },
			(payload) => {
				const row = (payload.new && Object.keys(payload.new).length
					? payload.new
					: payload.old) as Record<string, unknown>;
				setStatus("CONNECTED");
				notices.emit("notice", {
					kind: "change",
					table,
					deviceId: typeof row.device_id === "string" ? row.device_id : undefined,
					createdAt: new Date().toISOString(),
				} satisfies RealtimeNotice);
			}
		);
	}

	channel.subscribe((status) => {
		if (status === "SUBSCRIBED") {
			setStatus("CONNECTING");
		} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
			setStatus("DEGRADED");
		} else if (status === "CLOSED") {
			setStatus("DISCONNECTED");
		}
	});
}

export function getRealtimeStatus(): RealtimeState {
	return currentStatus;
}

export function subscribeRealtime(listener: (notice: RealtimeNotice) => void): () => void {
	notices.on("notice", listener);
	return () => notices.off("notice", listener);
}