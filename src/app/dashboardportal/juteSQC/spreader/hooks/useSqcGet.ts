"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";

/**
 * Minimal GET hook: fetches `url` (null → idle / cleared). The caller types the
 * FULL response body (including the {"data": ...} envelope) and unwraps it.
 * `refresh` refetches the same url. Mirrors the per-endpoint hooks used by the
 * spinning SQC page, generalised so each tab doesn't need its own hook file.
 */
export function useSqcGet<T>(url: string | null) {
	const [data, setData] = React.useState<T | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!url) {
			setData(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		void fetchWithCookie<T>(url, "GET").then(({ data: resp, error: err }) => {
			if (cancelled) return;
			if (err) {
				setError(err);
				setData(null);
			} else {
				setError(null);
				setData(resp);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [url, version]);

	return { data, loading, error, refresh };
}
