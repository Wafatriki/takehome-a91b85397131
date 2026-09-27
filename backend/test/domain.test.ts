import { test } from "node:test";
import assert from "node:assert/strict";
import { toIsoDate } from "../src/domain.ts";

// This one passes from the very first moment: it is your harness, so you do not start from zero.
test("a unix timestamp becomes YYYY-MM-DD regardless of the machine's time zone", () => {
    assert.equal(toIsoDate(1759276800), "2025-10-01");
    assert.equal(toIsoDate(0), "1970-01-01");
});

// From here on, it is yours.
