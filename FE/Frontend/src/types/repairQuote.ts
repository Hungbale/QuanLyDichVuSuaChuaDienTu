export interface RepairQuoteItemRequest {
    name: string;
    quantity: number;
    unitPrice: number;
}

export interface RepairQuoteItem extends RepairQuoteItemRequest {
    id: number;
    lineTotal: number;
}

export interface RepairQuoteRequest {
    items: RepairQuoteItemRequest[];
}

export interface RepairQuote {
    id: number;
    quoteCode: string;
    repairTicketId: number;
    ticketCode: string;
    customerName: string;
    items: RepairQuoteItem[];
    totalAmount: number;
    status: "SENT" | "ACCEPTED" | "REJECTED" | string;
    createdAt: string;
}
