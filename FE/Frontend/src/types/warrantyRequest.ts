export type WarrantyRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | string;

export interface WarrantyRequest {
    id: number;
    repairTicketId: number;
    ticketCode: string;
    device: string;
    serviceName: string | null;
    customerId: number;
    customerName: string;
    reason: string;
    description: string | null;
    attachmentFileName: string | null;
    attachmentContentType: string | null;
    hasAttachment: boolean;
    status: WarrantyRequestStatus;
    resolutionNote: string | null;
    processedByEmployeeId: number | null;
    processedByEmployeeName: string | null;
    createdAt: string;
    processedAt: string | null;
}

export interface WarrantyRequestCreate {
    ticketCode: string;
    reason: string;
    description?: string;
    attachment?: File;
}
