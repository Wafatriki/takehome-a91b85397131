import { test } from "node:test";
import assert from "node:assert/strict";
import { toIsoDate } from "../src/domain.ts";

// This one passes from the very first moment: it is your harness, so you do not start from zero.
test("a unix timestamp becomes YYYY-MM-DD regardless of the machine's time zone", () => {
    assert.equal(toIsoDate(1759276800), "2025-10-01");
    assert.equal(toIsoDate(0), "1970-01-01");
});

test("a booking payload keeps its dates and maps guest_name", async () => {
    const { normalizeChannelPayload } = await import("../src/domain.ts");

    assert.deepEqual(
        normalizeChannelPayload({
            booking_id: "booking_test",
            channel: "booking",
            guest_name: "Ada Lovelace",
            check_in: "2026-10-01",
            check_out: "2026-10-04",
            total_price: 300,
            currency: "EUR",
        }),
        {
            id: "booking_test",
            channel: "booking",
            guestName: "Ada Lovelace",
            checkIn: "2026-10-01",
            checkOut: "2026-10-04",
            totalPrice: 300,
            currency: "EUR",
        },
    );
});

// From here on, it is yours.
