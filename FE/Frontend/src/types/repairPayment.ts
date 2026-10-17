export type RepairPaymentMethod = "BANK_TRANSFER" | "CASH";

export interface RepairPayment {
    id: number;
    ticketCode: string;
    amount: number;
    status: "PENDING" | "PAID" | string;
    method: RepairPaymentMethod;
    dueDate: string;
    createdAt: string;
    paidAt: string | null;
}
