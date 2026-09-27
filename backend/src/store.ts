/**
 * Where the state of each booking lives while the process is up. In memory, on purpose: the
 * brief does not ask for a database, and adding one would spend your time on plumbing instead of
 * on what this exercise is about.
 *
 * Written and complete. What you decide to call, and when, is what the exercise measures.
 */
import type { BookingRecord } from "./domain.ts";

const records = new Map<string, BookingRecord>();

export function upsert(record: BookingRecord): void {
    records.set(record.id, record);
}

export function get(id: string): BookingRecord | undefined {
    return records.get(id);
}

export function list(): BookingRecord[] {
    return [...records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function has(id: string): boolean {
    return records.has(id);
}

/** Only for the check: starts every run from an empty store. */
export function clear(): void {
    records.clear();
}
