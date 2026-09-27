import { normalizeChannelPayload, type BookingRecord } from "./domain.ts";
import { synchronize } from "./synchronization.ts";

interface BookingProcessorDependencies {
    has: (id: string) => boolean;
    save: (record: BookingRecord) => void;
    synchronize: (record: BookingRecord) => Promise<void>;
}

export function createBookingProcessor({ has, save, synchronize: sync }: BookingProcessorDependencies) {
    const queuedBookingIds = new Set<string>();

    return async (payload: unknown): Promise<void> => {
        const booking = normalizeChannelPayload(payload);
        if (has(booking.id) || queuedBookingIds.has(booking.id)) return;

        queuedBookingIds.add(booking.id);
        try {
            const record: BookingRecord = {
                ...booking,
                status: "pending",
                attempts: 0,
                lastError: null,
                pmsReference: null,
                updatedAt: new Date().toISOString(),
            };
            save(record);
            await sync(record);
        } finally {
            queuedBookingIds.delete(booking.id);
        }
    };
}

export const defaultBookingProcessor = (has: (id: string) => boolean, save: (record: BookingRecord) => void) =>
    createBookingProcessor({ has, save, synchronize });
