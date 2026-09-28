export function isValidDeviceId(value: string): boolean {
	return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function parseListLimit(value: unknown, fallback = 20): number | null {
	if (value === undefined) {
		return fallback;
	}

	const limit = Number(value);
	return Number.isInteger(limit) && limit >= 1 && limit <= 100
		? limit
		: null;
}
