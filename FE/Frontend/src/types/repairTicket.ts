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
    ticketId: number;
    ticketCode: string;
    bookedService: string | null;
    device: string;
    service: string | null;
    completedDate: string | null;
    cost: number | null;
    status: string;
}

export interface RepairTicketActivity {
    id: number;
    action: string;
    details: string | null;
    note: string | null;
    employeeName: string | null;
    createdAt: string;
}
