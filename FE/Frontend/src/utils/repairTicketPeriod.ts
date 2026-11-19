import type { RepairTicket } from "../types/repairTicket";

const pastRepairStatuses = [
    "COMPLETED",
    "Hoàn thành",
    "Đã kết thúc",
    "CANCELLED",
    "Đã hủy",
    "CUSTOMER_DECLINED",
    "Khách từ chối",
    "Khách đã từ chối",
];

export const isPastRepairStatus = (status: string) => pastRepairStatuses.includes(status);
export const isPastRepairTicket = (ticket: RepairTicket) => isPastRepairStatus(ticket.status);
