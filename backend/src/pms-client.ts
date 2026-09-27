/**
 * The call to the PMS. It is written, and it is written for exactly one attempt: no retry, no
 * backoff, no queue. Read it before touching it: what is missing is not marked with a TODO.
 */
import type { NormalizedBooking } from "./domain.ts";
import { optional } from "./env.ts";

const API_BASE = optional("API_BASE", "http://localhost:4000");
const API_TOKEN = optional("API_TOKEN", "wf_local");

export interface PmsSuccess {
    readonly ok: true;
    readonly pmsReference: string;
}

export interface PmsFailure {
    readonly ok: false;
    readonly status: number;
}

export async function submitToPms(booking: NormalizedBooking): Promise<PmsSuccess | PmsFailure> {
    const response = await fetch(API_BASE + "/pms/reservations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${API_TOKEN}` },
        body: JSON.stringify({
            bookingId: booking.id,
            channel: booking.channel,
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalPrice: booking.totalPrice,
            currency: booking.currency,
        }),
    });

    if (!response.ok) {
        return { ok: false, status: response.status };
    }

    const body = (await response.json()) as { reservationId: string };
    return { ok: true, pmsReference: body.reservationId };
}
