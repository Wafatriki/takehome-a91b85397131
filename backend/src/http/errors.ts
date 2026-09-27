/**
 * The shape every error answer has. It comes written so all your errors look the same without
 * you having to think about it.
 */
import type { ServerResponse } from "node:http";

export function send(response: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body, null, 2);
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(payload);
}

export function fail(response: ServerResponse, status: number, code: string, message: string): void {
    send(response, status, { error: { code, message } });
}

export function notImplemented(response: ServerResponse, what: string): void {
    fail(response, 501, "NOT_IMPLEMENTED", `${what} is not written yet.`);
}
