export interface RepairTicket {
    id: number;
    ticketCode: string;
    customerId: number;
    customerName: string;
    device: string;
    receivedDate: string;
    status: string;
    technicianId: number | null;
    technicianName: string | null;
}

export interface RepairTicketRequest {
    customerId: number;
    device: string;
    receivedDate: string;
    status: string;
    technicianId?: number | null;
}

export interface RepairHistoryEntry {
    ticketCode: string;
    device: string;
    service: string | null;
    completedDate: string | null;
    cost: number | null;
    status: string;
}
