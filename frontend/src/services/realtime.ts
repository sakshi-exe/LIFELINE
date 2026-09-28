import { API_BASE_URL } from "./api";

export type RealtimeConnectionState = "CONNECTING" | "CONNECTED" | "DEGRADED" | "DISCONNECTED";

type RealtimeMessage =
	| { kind: "status"; status: RealtimeConnectionState }
	| { kind: "change"; table: string; deviceId?: string; createdAt: string };

export function connectRealtime(options: {
	deviceId: string;
	onStateChange: (state: RealtimeConnectionState) => void;
	onChange: () => void;
}): () => void {
	const url = `${API_BASE_URL}/api/v1/realtime/stream?deviceId=${encodeURIComponent(options.deviceId)}`;
	const source = new EventSource(url);

	source.onmessage = (message) => {
		try {
			const data = JSON.parse(message.data) as RealtimeMessage;
			if (data.kind === "status") {
				options.onStateChange(data.status);
			} else {
				options.onChange();
			}
		} catch {
			options.onStateChange("DEGRADED");
		}
	};

	source.onerror = () => options.onStateChange("DISCONNECTED");
	return () => source.close();
}