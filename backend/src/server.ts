/**
 * Your API, and the screen it feeds. The routing, the static file and the error envelope are
 * already here so you can spend your time on what the exercise is about.
 *
 * Four jobs, the last three answering 501 until you write them.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { optional } from "./env.ts";
import { fail, notImplemented, send } from "./http/errors.ts";

const PORT = Number(optional("PORT", "3000"));
/** El front es el otro módulo, al lado de este. Nadie sirve una página que no existe. */
const SCREEN = new URL("../../frontend/index.html", import.meta.url);

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
    process.stdout.write("The channel consumer is not written yet.
");
}

/** YOUR JOB (2 of 4): every booking, most recently updated first. */
async function listBookings(response: ServerResponse): Promise<void> {
    notImplemented(response, "The list of bookings");
}

/** YOUR JOB (3 of 4): one booking, with its current sync status. */
async function bookingDetail(response: ServerResponse, id: string): Promise<void> {
    notImplemented(response, "The booking detail");
}

/**
 * YOUR JOB (4 of 4): "Forzar sincronización manual". Only makes sense on a booking that is
 * `failed`; what happens to any other status is your call.
 */
async function forceRetry(response: ServerResponse, id: string): Promise<void> {
    notImplemented(response, "Forcing a retry");
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
});
