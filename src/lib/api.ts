"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Client-side gateway access — every call goes through /admin-api (the
// httpOnly-cookie proxy), so 401 here means "session expired": bounce to
// the login page.

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(status: number, payload: any) {
    super((payload && payload.message) || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/admin-api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store"
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, payload);
  }

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T,>(path: string, body?: any) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) })
};

// Simple data hook with manual refetch.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(path);
      if (seq.current === id) setData(result);
    } catch (e: any) {
      if (seq.current === id) setError(e.message || "Something went wrong.");
    } finally {
      if (seq.current === id) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}

// Read the role/email display cookies (set alongside the httpOnly token).
export function roleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)hn_role=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export function emailFromCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)hn_email=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
