export interface RepairIntakeRequest {
    serialNumber?: string;
    appearanceCondition: string;
    includedAccessories?: string;
    customerReportedIssue?: string;
    intakeNote?: string;
}

export interface RepairIntakeReceipt {
    id: number;
    ticketId: number;
    ticketCode: string;
    customerName: string;
    device: string;
    serialNumber: string | null;
    appearanceCondition: string;
    includedAccessories: string | null;
    customerReportedIssue: string | null;
    intakeNote: string | null;
    receivedBy: string;
    receivedAt: string;
    photos: { fileName: string; contentType: string; dataUri: string }[];
}
