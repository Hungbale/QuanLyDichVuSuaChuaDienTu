import type { RepairTicketActivity } from "../types/repairTicket";

const actionLabels: Record<string, string> = {
    DEVICE_RECEIVED: "Đã tiếp nhận thiết bị",
    DIAGNOSIS_RECORDED: "Đã lưu kết quả chẩn đoán",
    DIAGNOSIS_UPDATED: "Đã cập nhật kết quả chẩn đoán",
    TICKET_UPDATED: "Đã cập nhật thông tin phiếu",
    CUSTOMER_CANCELLATION_REQUESTED: "Khách hàng yêu cầu hủy lịch",
    CANCELLATION_APPROVED: "Đã duyệt yêu cầu hủy lịch",
    CANCELLATION_REJECTED: "Đã từ chối yêu cầu hủy lịch",
};

export function repairActivityLabel(activity: RepairTicketActivity): string {
    return actionLabels[activity.action] || activity.details || activity.action.replaceAll("_", " ");
}
