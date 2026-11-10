export interface RepairTrackingPhoto {
    fileName: string;
    contentType: string;
    dataUri: string;
}

export interface RepairTrackingUpdate {
    id: number;
    status: string;
    note: string | null;
    createdAt: string;
    employeeName: string;
    photos: RepairTrackingPhoto[];
}

export interface RepairTrackingDetails {
    ticketId: number;
    ticketCode: string;
    serviceName: string | null;
    device: string;
    currentStatus: string;
    updates: RepairTrackingUpdate[];
    timeline: RepairTimelineEvent[];
}

export interface RepairTimelineEvent {
    type: string;
    title: string;
    details: string | null;
    note: string | null;
    createdAt: string;
    actorName: string;
}
