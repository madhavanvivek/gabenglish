import {placementConversationResponseSchema, type PlacementConversationRequest, type PlacementConversationResponse, type PlacementSessionStart} from "@gabenglish/contracts";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");

export class PlacementApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "PlacementApiError";
  }
}

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new PlacementApiError("The Gabenglish API is not configured. Set EXPO_PUBLIC_API_BASE_URL and restart the app.");
  }
  try {
    const parsed = new URL(API_BASE_URL);
    const localDevelopmentHost = typeof __DEV__ !== "undefined" && __DEV__
      && ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !localDevelopmentHost) {
      throw new Error("Use HTTPS outside the local development environment.");
    }
  } catch {
    throw new PlacementApiError("EXPO_PUBLIC_API_BASE_URL must be a valid HTTPS URL (HTTP is allowed for localhost and the Android emulator host during development).");
  }
  return API_BASE_URL;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${requireBaseUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "error" in payload
        && typeof payload.error === "object" && payload.error !== null && "message" in payload.error
        && typeof payload.error.message === "string"
        ? payload.error.message
        : `The assessment service returned an error (${response.status}).`;
      throw new PlacementApiError(message, response.status);
    }
    if (path.startsWith("/api/v1/placement/conversation/")) {
      const parsed = placementConversationResponseSchema.safeParse(payload);
      if (!parsed.success) throw new PlacementApiError("The assessment server returned an unexpected response. Please try again.");
      return parsed.data as T;
    }
    return payload as T;
  } catch (error) {
    if (error instanceof PlacementApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PlacementApiError("The server took too long to respond. Check your connection and try again.");
    }
    throw new PlacementApiError("Could not reach the Gabenglish server. Check your internet connection and API address.");
  } finally {
    clearTimeout(timeout);
  }
}

export function startPlacement(input: PlacementSessionStart) {
  return post<PlacementConversationResponse>("/api/v1/placement/conversation/start", input);
}

export function respondToPlacement(input: PlacementConversationRequest) {
  return post<PlacementConversationResponse>("/api/v1/placement/conversation/respond", input);
}
