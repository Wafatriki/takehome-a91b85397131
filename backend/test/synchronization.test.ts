import { test } from "node:test";
import assert from "node:assert/strict";
import type { BookingRecord } from "../src/domain.ts";
import { createBookingProcessor } from "../src/booking-processor.ts";
import { MAX_SYNC_ATTEMPTS, synchronize } from "../src/synchronization.ts";

const payload = {
    booking_id: "booking_duplicate",
    channel: "booking",
    guest_name: "Ada Lovelace",
    check_in: "2026-10-01",
    check_out: "2026-10-04",
    total_price: 300,
    currency: "EUR",
};

function record(): BookingRecord {
    return {
        id: "booking_failed",
        channel: "booking",
        guestName: "Ada Lovelace",
        checkIn: "2026-10-01",
        checkOut: "2026-10-04",
        totalPrice: 300,
        currency: "EUR",
        status: "pending",
        attempts: 0,
        lastError: null,
        pmsReference: null,
        updatedAt: new Date().toISOString(),
    };
}

test("the same booking_id is processed and sent to the PMS only once", async () => {
    const records = new Map<string, BookingRecord>();
    let pmsCalls = 0;
    const process = createBookingProcessor({
        has: (id) => records.has(id),
        save: (booking) => records.set(booking.id, booking),
        synchronize: async () => {
            pmsCalls += 1;
        },
    });

    await Promise.all([process(payload), process(payload)]);

    assert.equal(records.size, 1);
    assert.equal(pmsCalls, 1);
});

test("a booking becomes failed after all PMS attempts fail", async () => {
    const booking = record();
    let pmsCalls = 0;

    await synchronize(
        booking,
        async () => {
            pmsCalls += 1;
            return { ok: false, status: 500 };
        },
        () => undefined,
        async () => undefined,
    );

    assert.equal(pmsCalls, MAX_SYNC_ATTEMPTS);
    assert.equal(booking.status, "failed");
    assert.equal(booking.attempts, MAX_SYNC_ATTEMPTS);
});