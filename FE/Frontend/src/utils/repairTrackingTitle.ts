export function repairTrackingTitle(type: string, details: string | null, title?: string | null): string {
    const normalizedType = type.trim().toUpperCase();
    const detailText = details?.trim() || "";
    const combinedText = `${detailText} ${title || ""}`;
    if (/^COMPLETED\b/i.test(detailText)
        || (/thiết bị hoạt động bình thường\s*:\s*true/i.test(combinedText)
            && /chức năng chính hoạt động\s*:\s*true/i.test(combinedText)
            && /không có lỗi phát sinh\s*:\s*true/i.test(combinedText))) {
        return "Hoàn thành sửa chữa";
    }
    if (normalizedType.includes("STATUS") || normalizedType.includes("PROGRESS")) {
        const status = details?.trim().match(/^(SCHEDULED|RECEIVED|DIAGNOSING|WAITING_FOR_QUOTE_APPROVAL|REPAIRING|IN_PROGRESS|WAITING_FOR_PARTS|CANNOT_BE_REPAIRED|CUSTOMER_DECLINED|COMPLETED|CANCELLED)\b/i)?.[0];
        if (status) return `Cập nhật tiến độ: ${status.toUpperCase()}`;
        if (title?.trim()) return title.trim();
        return details?.trim() ? `Cập nhật tiến độ: ${details.trim()}` : "Cập nhật tiến độ sửa chữa";
    }
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
    return labels[type] || title?.trim() || (details?.trim() ? `Cập nhật tiến độ: ${details.trim()}` : "Cập nhật tiến độ sửa chữa");
}
