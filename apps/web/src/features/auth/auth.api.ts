import type { AuthSessionResponse } from "./auth.types";

const API_BASE = "/api";

interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorResult = result as ApiErrorResponse | null;

    throw new Error(
      errorResult?.error?.message ??
        `Request failed with status ${response.status}`,
    );
  }

  return result as T;
}

export function loginRequest(
  email: string,
  password: string,
): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/me");
}

export function logoutRequest(): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}