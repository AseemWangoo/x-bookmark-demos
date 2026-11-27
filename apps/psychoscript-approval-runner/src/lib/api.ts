import type { Decision, MetaView, RunView } from "../../shared/types.ts"

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function fetchMeta(signal?: AbortSignal): Promise<MetaView> {
  return request<MetaView>("/api/meta", { signal })
}

export function fetchSample(signal?: AbortSignal): Promise<string> {
  return request<{ code: string }>("/api/sample", { signal }).then((body) => body.code)
}

export function startRun(code: string): Promise<RunView> {
  return request<RunView>("/api/runs", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}

export function fetchRun(id: string, signal?: AbortSignal): Promise<RunView> {
  return request<RunView>(`/api/runs/${id}`, { signal })
}

export function decideRun(id: string, decision: Decision): Promise<RunView> {
  return request<RunView>(`/api/runs/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  })
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(body, response.status))
  }
  return body as T
}

function errorMessage(body: unknown, status: number): string {
  if (body !== null && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error
  }
  return `Request failed (${status}).`
}
