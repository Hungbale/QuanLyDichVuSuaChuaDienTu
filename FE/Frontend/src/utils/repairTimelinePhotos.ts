import type { RepairTrackingPhoto, RepairTrackingUpdate, RepairTimelineEvent } from "../types/repairTracking";

const normalized = (value: string | null | undefined) => (value || "").trim().toLocaleLowerCase();

/**
 * The API returns evidence on status updates, while completion is a separate
 * timeline event. Link by note first (completion note is copied to both
 * records), then use status and timestamp as a fallback.
 */
export function photosForRepairTimelineEvent(
    event: RepairTimelineEvent,
    updates: RepairTrackingUpdate[],
): RepairTrackingPhoto[] {
    if (!updates.length) return [];

    const eventNote = normalized(event.note);
    const eventTime = Date.parse(event.createdAt);
    const candidates = eventNote
        ? updates.filter((update) => normalized(update.note) === eventNote)
        : [];

    if (candidates.length) {
        return [...candidates].sort((a, b) => {
            const aTime = Date.parse(a.createdAt);
            const bTime = Date.parse(b.createdAt);
            return Math.abs(aTime - eventTime) - Math.abs(bTime - eventTime);
        })[0].photos || [];
    }

    const eventStatus = normalized(event.details);
    const sameStatus = updates.filter((update) => normalized(update.status) === eventStatus);
    const exactTime = sameStatus.find((update) => update.createdAt === event.createdAt);
    if (exactTime) return exactTime.photos || [];

    if (sameStatus.length && Number.isFinite(eventTime)) {
        const closest = [...sameStatus].sort((a, b) =>
            Math.abs(Date.parse(a.createdAt) - eventTime) - Math.abs(Date.parse(b.createdAt) - eventTime),
        )[0];
        return closest.photos || [];
    }

    return [];
}
