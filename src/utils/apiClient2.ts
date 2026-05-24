import { useState, useEffect } from "react";
import axios, { AxiosResponse } from "axios";

type FetchResult<T = any> = {
    data: T | null;
    error: string | null;
    status: number;
};

// Regular function for direct API calls
export const fetchWithCookie = async <T = any>(
    url: string,
    method: string = "GET",
    body?: unknown,
): Promise<FetchResult<T>> => {
    try {
        const response: AxiosResponse<T> = await axios({
            url,
            method,
            headers: {
                "Content-Type": "application/json",
                "x-forwarded-host": "sls.vowerp.co.in",
            },
            withCredentials: true,
            data: body,
            validateStatus: (status) => status >= 200 && status < 500,
        });
        const isSuccess = response.status >= 200 && response.status < 300;
        if (!isSuccess) {
            let message: string | null = null;
            const payload = response.data as unknown;
            if (payload && typeof payload === "object") {
                const detail = (payload as { detail?: unknown }).detail;
                if (typeof detail === "string") {
                    message = detail;
                }
            }
            if (!message) {
                message = `Request failed with status ${response.status}`;
            }
            return { data: null, error: message, status: response.status };
        }

        return { data: response.data ?? null, error: null, status: response.status };
    } catch (err: unknown) {
        // Normalize error to string
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error in fetchWithCookie for ${url}:`, message);
        return { data: null, error: message, status: 0 };
    }
};

// Hook version for components
export const useDataWithCookie = <T = any>(
    url: string,
    method: "GET" | "POST" = "GET",
    body?: unknown,
) => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            const result = await fetchWithCookie<T>(url, method, body);
            if (!mounted) return;
            setData(result.data);
            setError(result.error);
            setLoading(false);
        };

        fetchData();
        return () => {
            mounted = false;
        };
        // stringify body so identity changes don't retrigger unnecessarily
    }, [url, method, JSON.stringify(body ?? null)]);

    return { data, error, loading } as const;
};

export default useDataWithCookie;