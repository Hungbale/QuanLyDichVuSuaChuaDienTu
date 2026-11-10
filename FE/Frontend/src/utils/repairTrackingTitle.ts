export function repairTrackingTitle(type: string, details: string | null): string {
    const labels: Record<string, string> = {
        DEVICE_RECEIVED: "Tiếp nhận thiết bị",
        DIAGNOSIS_RECORDED: "Chẩn đoán thiết bị",
        QUOTE_CREATED: "Gửi báo giá",
        STATUS_UPDATED: `Cập nhật tiến độ${details ? `: ${details}` : ""}`,
        CUSTOMER_CANCELLATION_REQUESTED: "Khách hàng yêu cầu hủy lịch",
        CANCELLATION_APPROVED: "Đã duyệt yêu cầu hủy lịch",
        CANCELLATION_REJECTED: "Đã từ chối yêu cầu hủy lịch",
        PAYMENT_CREATED: "Tạo yêu cầu thanh toán",
        PAYMENT_CONFIRMED: "Xác nhận thanh toán",
        APPOINTMENT_CREATED: "Tạo lịch hẹn",
        APPOINTMENT_CONFIRMED: "Xác nhận lịch hẹn",
        CUSTOMER_CONFIRMED: "Khách hàng xác nhận báo giá",
        CUSTOMER_REJECTED: "Khách hàng từ chối báo giá",
        PAYMENT_PAID: "Đã xác nhận thanh toán",
        TICKET_COMPLETED: "Hoàn thành sửa chữa",
    };
    return labels[type] || "Cập nhật tiến độ sửa chữa";
}
