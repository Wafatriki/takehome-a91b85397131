import type { BookingRecord } from "./domain.ts";
import { submitToPms, type PmsFailure, type PmsSuccess } from "./pms-client.ts";
import { upsert } from "./store.ts";

export const MAX_SYNC_ATTEMPTS = 4;
export const INITIAL_BACKOFF_MS = 100;

type SubmitToPms = (booking: BookingRecord) => Promise<PmsSuccess | PmsFailure>;
type SaveRecord = (record: BookingRecord) => void;
type Delay = (milliseconds: number) => Promise<void>;

const wait: Delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function synchronize(
    record: BookingRecord,
    submit: SubmitToPms = submitToPms,
    save: SaveRecord = upsert,
    delay: Delay = wait,
): Promise<void> {
    for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt += 1) {
        record.status = attempt === 1 ? "syncing" : "retrying";
        record.attempts = attempt;
        record.updatedAt = new Date().toISOString();
        save(record);

        try {
            const result = await submit(record);
            if (result.ok) {
                record.status = "synced";
                record.lastError = null;
                record.pmsReference = result.pmsReference;
                record.updatedAt = new Date().toISOString();
                save(record);
                return;
            }

            record.lastError = `PMS answered ${result.status}`;
        } catch (error: unknown) {
            record.lastError = String(error);
        }

        if (attempt < MAX_SYNC_ATTEMPTS) {
            record.status = "retrying";
            record.updatedAt = new Date().toISOString();
            save(record);
            await delay(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
        }
    }

    record.status = "failed";
    record.updatedAt = new Date().toISOString();
    save(record);
}
