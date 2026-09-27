/**
 * Your API, and the screen it feeds. The routing, the static file and the error envelope are
 * already here so you can spend your time on what the exercise is about.
 *
 * Four jobs, the last three answering 501 until you write them.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { ackEvent, ChannelRateLimitError, fetchEvents } from "./channel-client.ts";
import { normalizeChannelPayload, type BookingRecord } from "./domain.ts";
import { optional } from "./env.ts";
import { fail, notImplemented, send } from "./http/errors.ts";
import { submitToPms } from "./pms-client.ts";
import { get, has, list, upsert } from "./store.ts";

const PORT = Number(optional("PORT", "3000"));
/** El front es el otro módulo, al lado de este. Nadie sirve una página que no existe. */
const SCREEN = new URL("../../frontend/index.html", import.meta.url);
const MAX_SYNC_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 100;

const wait = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

async function synchronize(record: BookingRecord): Promise<void> {
    for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt += 1) {
        record.status = attempt === 1 ? "syncing" : "retrying";
        record.attempts = attempt;
        record.updatedAt = new Date().toISOString();
        upsert(record);

        try {
            const result = await submitToPms(record);
            if (result.ok) {
                record.status = "synced";
                record.lastError = null;
                record.pmsReference = result.pmsReference;
                record.updatedAt = new Date().toISOString();
                upsert(record);
                return;
            }

            record.lastError = `PMS answered ${result.status}`;
        } catch (error: unknown) {
            record.lastError = String(error);
        }

        if (attempt < MAX_SYNC_ATTEMPTS) {
            record.status = "retrying";
            record.updatedAt = new Date().toISOString();
            upsert(record);
            await wait(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
        }
    }

    record.status = "failed";
    record.updatedAt = new Date().toISOString();
    upsert(record);
}

/**
 * YOUR JOB (1 of 4): consume the sales channels. Called once when the server starts.
 *
 * Nobody calls you: you ask `fetchEvents` for what has come due and you tell the channel you
 * received it with `ackEvent`. A channel gives up on you if it waits more than 500ms for that
 * confirmation and hands you the same event again. The PMS the booking eventually has to reach takes
 * 3 to 5 seconds and fails a third of the time. The same `booking_id` can come in more than one event.
 * None of that is solved by confirming fast and forgetting about the rest: every booking has to
 * end up `synced` or `failed`, and a duplicate can never reach the PMS twice.
 */
function startChannelConsumer(): void {
    const queuedBookingIds = new Set<string>();

    const processEvent = (payload: unknown): void => {
        const booking = normalizeChannelPayload(payload);

        const record: BookingRecord = {
            ...booking,
            status: "pending",
            attempts: 0,
            lastError: null,
            pmsReference: null,
            updatedAt: new Date().toISOString(),
        };
        upsert(record);
        void synchronize(record).catch((error: unknown) => {
            process.stderr.write(`Could not synchronize booking ${record.id}: ${String(error)}\n`);
        });
    };

    const poll = async (): Promise<void> => {
        for (;;) {
            try {
                const page = await fetchEvents(1);
                for (const event of page.events) {
                    const acknowledgement = await ackEvent(event.eventId);
                    if (acknowledgement.ok) {
                        const rawPayload = event.payload as Record<string, unknown>;
                        const bookingId = rawPayload.booking_id;
                        if (
                            typeof bookingId !== "string" ||
                            has(bookingId) ||
                            queuedBookingIds.has(bookingId)
                        ) {
                            continue;
                        }
                        queuedBookingIds.add(bookingId);
                        void Promise.resolve()
                            .then(() => processEvent(event.payload))
                            .catch((error: unknown) => {
                                process.stderr.write(`Could not process channel event: ${String(error)}\n`);
                            })
                            .finally(() => {
                                queuedBookingIds.delete(bookingId);
                            });
                    }
                }
                    await wait(400);
            } catch (error: unknown) {
                process.stderr.write(`Could not poll channel events: ${String(error)}\n`);
                    await wait(error instanceof ChannelRateLimitError ? error.retryAfterMs : 1000);
            }
        }
    };

    void poll();
}

/** YOUR JOB (2 of 4): every booking, most recently updated first. */
async function listBookings(response: ServerResponse): Promise<void> {
    send(response, 200, { items: list() });
}

/** YOUR JOB (3 of 4): one booking, with its current sync status. */
async function bookingDetail(response: ServerResponse, id: string): Promise<void> {
    const record = get(id);
    if (!record) {
        fail(response, 404, "NOT_FOUND", "That booking does not exist.");
        return;
    }
    send(response, 200, record);
}

/**
 * YOUR JOB (4 of 4): "Forzar sincronización manual". Only makes sense on a booking that is
 * `failed`; what happens to any other status is your call.
 */
async function forceRetry(response: ServerResponse, id: string): Promise<void> {
    const record = get(id);
    if (!record) {
        fail(response, 404, "NOT_FOUND", "That booking does not exist.");
        return;
    }
    if (record.status !== "failed") {
        fail(response, 409, "NOT_FAILED", "Only failed bookings can be retried.");
        return;
    }

    record.status = "pending";
    record.attempts = 0;
    record.lastError = null;
    record.pmsReference = null;
    record.updatedAt = new Date().toISOString();
    upsert(record);
    void synchronize(record).catch((error: unknown) => {
        process.stderr.write(`Could not retry booking ${record.id}: ${String(error)}\n`);
    });
    send(response, 202, record);
}

const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
    const method = request.method ?? "GET";

    if (method === "GET" && url.pathname === "/health") {
        return send(response, 200, { ok: true });
    }

    if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        try {
            const page = readFileSync(SCREEN);
            response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
            return response.end(page);
        } catch {
            return fail(response, 500, "SCREEN_MISSING", `The screen is not at ${SCREEN.pathname}.`);
        }
    }

    if (method === "GET" && url.pathname === "/api/bookings") {
        return void listBookings(response).catch(() =>
            fail(response, 500, "UNEXPECTED", "Something broke inside."),
        );
    }

    const detail = url.pathname.match(/^\/api\/bookings\/([^/]+)$/);
    if (detail && method === "GET") {
        return void bookingDetail(response, detail[1]).catch(() =>
            fail(response, 500, "UNEXPECTED", "Something broke inside."),
        );
    }

    const retry = url.pathname.match(/^\/api\/bookings\/([^/]+)\/retry$/);
    if (retry && method === "POST") {
        return void forceRetry(response, retry[1]).catch(() =>
            fail(response, 500, "UNEXPECTED", "Something broke inside."),
        );
    }

    return fail(response, 404, "NOT_FOUND", "That route does not exist.");
});

server.listen(PORT, () => {
    process.stdout.write(`Listening on http://localhost:${PORT}\n`);
    startChannelConsumer();
});
