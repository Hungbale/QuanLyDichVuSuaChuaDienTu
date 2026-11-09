export interface ServiceReview {
    id: number;
    repairTicketId: number;
    ticketCode: string;
    serviceName: string | null;
    customerId: number;
    customerName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}

export interface ServiceReviewRequest {
    rating: number;
    comment?: string;
}
