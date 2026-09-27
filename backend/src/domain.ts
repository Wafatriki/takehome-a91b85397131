/**
 * The shapes everything else here uses. The two channels are documented in the brief; how you
 * get from one of their payloads to this shape is not written anywhere, which is your job.
 */

export type Channel = "booking" | "airbnb";
export type SyncStatus = "pending" | "syncing" | "synced" | "retrying" | "failed";

export interface NormalizedBooking {
    readonly id: string;
    readonly channel: Channel;
    readonly guestName: string;
    readonly checkIn: string; // YYYY-MM-DD, always, regardless of channel
    readonly checkOut: string; // YYYY-MM-DD, always, regardless of channel
    readonly totalPrice: number;
    readonly currency: string;
}

export interface BookingRecord extends NormalizedBooking {
    status: SyncStatus;
    attempts: number;
    lastError: string | null;
    pmsReference: string | null;
    updatedAt: string;
}

/**
 * Unix seconds to `YYYY-MM-DD`, in UTC. It comes solved, and solved this way on purpose: with
 * `new Date(...)` and its local getters, the same instant lands on a different calendar day
 * depending on the machine's time zone, and `airbnb` sends exactly this kind of timestamp.
 */
export function toIsoDate(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * YOUR JOB: turn whatever a channel sent into `NormalizedBooking`.
 *
 * `booking` sends `check_in`/`check_out` as `YYYY-MM-DD` and the guest as `guest_name`. `airbnb`
 * sends them as Unix seconds and the guest as `guest.first_name` + `guest.last_name`. Both are
 * real payloads the mock sends; nothing here is hidden, it just is not written yet.
 */
export function normalizeChannelPayload(raw: unknown): NormalizedBooking {
    throw new Error("Not implemented");
}
