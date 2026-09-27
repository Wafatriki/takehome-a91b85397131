/**
 * The two calls to the sales channels. They are written, and each one is written for a single
 * attempt: nothing here loops, waits or decides what to do with what it gets. Read them before you
 * build on them: what is missing is not marked with a TODO.
 */
import { optional } from "./env.ts";

const API_BASE = optional("API_BASE", "http://localhost:4000");
const API_TOKEN = optional("API_TOKEN", "wf_local");

export interface ChannelEvent {
    readonly eventId: string;
    readonly channel: string;
    readonly deliveryAttempt: number;
    /** What the channel sent, exactly as it sent it. */
    readonly payload: unknown;
}

export interface EventsPage {
    readonly events: readonly ChannelEvent[];
    readonly done: boolean;
}

const headers = { "content-type": "application/json", authorization: `Bearer ${API_TOKEN}` };

export class ChannelRateLimitError extends Error {
    readonly retryAfterMs: number;

    constructor(retryAfterMs: number) {
        super("The channel rate limit was reached");
        this.retryAfterMs = retryAfterMs;
    }
}

export async function fetchEvents(limit = 1): Promise<EventsPage> {
    const response = await fetch(`${API_BASE}/channels/events?limit=${limit}`, { headers });
    if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
        throw new ChannelRateLimitError(Math.max(1000, retryAfterSeconds * 1000));
    }
    if (!response.ok) throw new Error(`The channel answered ${response.status}`);
    return (await response.json()) as EventsPage;
}

export async function ackEvent(eventId: string): Promise<{ readonly ok: boolean; readonly status: number }> {
    const response = await fetch(`${API_BASE}/channels/events/${eventId}/ack`, { method: "POST", headers });
    return { ok: response.ok, status: response.status };
}
