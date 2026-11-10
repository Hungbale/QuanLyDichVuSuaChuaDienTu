const knownMessages: Array<[RegExp, string]> = [
    [/appointment date and time must be in the future/i, "Ngày hoặc giờ đặt lịch đã qua. Vui lòng chọn ngày và giờ khác trong tương lai."],
    [/selected appointment time is no longer available|appointment time.*no longer available/i, "Khung giờ này vừa được đặt hoặc không còn trống. Vui lòng chọn ngày hoặc giờ khác."],
    [/appointment.*(date|time).*(past|future)|past.*appointment/i, "Ngày hoặc giờ đặt lịch không hợp lệ. Vui lòng chọn ngày và giờ khác trong tương lai."],
    [/appointment.*(unavailable|not available|fully booked)|time slot.*(unavailable|not available|taken)/i, "Khung giờ này không còn trống. Vui lòng chọn ngày hoặc giờ khác."],
    [/service is not active|service.*inactive/i, "Dịch vụ hiện không hoạt động. Vui lòng chọn dịch vụ khác."],
    [/customerid is required when staff creates an appointment/i, "Vui lòng chọn khách hàng cho lịch hẹn."],
    [/invalid.*(date|time)|date.*invalid|time.*invalid/i, "Ngày hoặc giờ đặt lịch không hợp lệ. Vui lòng kiểm tra và chọn lại."],
    [/appointment.*already.*(cancel|received|converted)|cannot cancel.*(received|accepted)/i, "Lịch hẹn này đã được tiếp nhận hoặc không thể hủy. Vui lòng tải lại danh sách."],
    [/cancellation.*only.*confirmed|only.*cancel.*confirmed/i, "Chỉ có thể yêu cầu hủy lịch hẹn đã được xác nhận và chưa tiếp nhận thiết bị."],
    [/customer account is locked or inactive/i, "Tài khoản khách hàng đã bị khóa hoặc ngừng hoạt động."],
    [/employee account is locked or inactive/i, "Tài khoản nhân viên đã bị khóa hoặc ngừng hoạt động."],
    [/repair ticket.*not found|no repair ticket found/i, "Không tìm thấy phiếu sửa chữa."],
    [/appointment.*not found|appointment was not found/i, "Không tìm thấy lịch hẹn."],
    [/category.*not found/i, "Không tìm thấy danh mục dịch vụ."],
    [/service.*not found/i, "Không tìm thấy dịch vụ."],
    [/customer.*not found/i, "Không tìm thấy khách hàng."],
    [/employee.*not found|technician.*not found/i, "Không tìm thấy nhân viên."],
    [/no active technician is available/i, "Hiện không có nhân viên phù hợp để tiếp nhận công việc. Vui lòng chọn ngày hoặc giờ khác."],
    [/past appointments? cannot be assigned/i, "Không thể phân công lịch hẹn đã qua."],
    [/appointment must be linked to a customer/i, "Cần liên kết lịch hẹn với khách hàng trước khi xác nhận."],
    [/a new repair ticket must start in scheduled status/i, "Phiếu sửa chữa mới phải bắt đầu ở trạng thái chờ tiếp nhận."],
    [/use post .*intake to receive a device/i, "Hãy dùng chức năng tiếp nhận thiết bị để cập nhật phiếu."],
    [/use the intake, diagnosis, or quote api/i, "Hãy thực hiện chuyển trạng thái từ đúng bước tiếp nhận, chẩn đoán hoặc báo giá."],
    [/only the assigned (technician|employee)/i, "Chỉ nhân viên được phân công mới có thể xử lý phiếu này."],
    [/receive the device before recording a diagnosis/i, "Hãy tiếp nhận thiết bị trước khi lưu chẩn đoán."],
    [/diagnosis can only be recorded/i, "Chỉ có thể lưu chẩn đoán khi phiếu đã được tiếp nhận."],
    [/record the repair diagnosis before creating a quote/i, "Hãy lưu chẩn đoán trước khi tạo báo giá."],
    [/already has (a |an )?(quote|quotation)/i, "Phiếu sửa chữa này đã có báo giá."],
    [/quote .*already has a payment transaction/i, "Báo giá này đã có giao dịch thanh toán."],
    [/quote is no longer awaiting confirmation/i, "Báo giá không còn ở trạng thái chờ xác nhận."],
    [/attach between 1 and 5 photos/i, "Vui lòng đính kèm từ 1 đến 5 ảnh làm minh chứng."],
    [/only valid jpeg and png photos are supported/i, "Chỉ hỗ trợ ảnh định dạng JPEG hoặc PNG."],
    [/each photo.*(5 ?mb|5 ?megabyte)/i, "Mỗi ảnh không được vượt quá 5 MB."],
    [/category status must be active or inactive/i, "Trạng thái danh mục chỉ được là đang hoạt động hoặc ngừng hoạt động."],
    [/cannot activate a service in an inactive category/i, "Không thể kích hoạt dịch vụ thuộc danh mục đang ngừng hoạt động."],
    [/already in this status/i, "Phiếu hiện đã ở trạng thái này."],
];

const statusMessages: Record<number, string> = {
    400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền thực hiện thao tác này.",
    404: "Không tìm thấy dữ liệu yêu cầu.",
    405: "Thao tác này hiện không được hỗ trợ.",
    409: "Dữ liệu đang có xung đột. Vui lòng tải lại trang và thử lại.",
    413: "Tệp tải lên vượt quá dung lượng cho phép.",
    415: "Định dạng tệp tải lên không được hỗ trợ.",
    429: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
};

function hasVietnamese(text: string): boolean {
    return /[À-ỹĐđ]/.test(text);
}

export function translateApiError(value: unknown, status?: number): string {
    if (typeof value === "string" && value.trim()) {
        const message = value.trim();
        const mapped = knownMessages.find(([pattern]) => pattern.test(message));
        if (mapped) return mapped[1];
        // Preserve meaningful Vietnamese messages returned by the API.
        if (hasVietnamese(message)) return message;
    }

    if (status && statusMessages[status]) return statusMessages[status];
    if (status && status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
    return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export function translateValidationError(value: unknown): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const message = value.trim();
    const mapped = knownMessages.find(([pattern]) => pattern.test(message));
    if (mapped) return mapped[1];
    if (hasVietnamese(message)) return message;
    return undefined;
}

export function translateFieldError(field: string, value: unknown): string | undefined {
    const message = typeof value === "string" ? value.trim() : "";
    if (!message) return undefined;
    const translated = translateValidationError(message);
    if (translated) return translated;

    const fieldName = field.toLowerCase();
    const text = message.toLowerCase();
    if (/appointmentdate|appointment_date|date/.test(fieldName)) {
        if (/past|future|before|after|invalid|must be|must not|mustn't/.test(text)) {
            return "Ngày đặt lịch không hợp lệ hoặc đã qua. Vui lòng chọn ngày khác trong tương lai.";
        }
        return "Ngày đặt lịch chưa hợp lệ. Vui lòng kiểm tra và chọn lại.";
    }
    if (/appointmenttime|appointment_time|time/.test(fieldName)) {
        if (/past|future|before|after|invalid|must be|must not|mustn't/.test(text)) {
            return "Giờ đặt lịch không hợp lệ hoặc đã qua. Vui lòng chọn giờ khác.";
        }
        return "Giờ đặt lịch chưa hợp lệ. Vui lòng kiểm tra và chọn lại.";
    }
    const fieldLabels: Record<string, string> = {
        device: "Thiết bị",
        serviceid: "Dịch vụ",
        service_id: "Dịch vụ",
        contactphone: "Số điện thoại liên hệ",
        contact_phone: "Số điện thoại liên hệ",
        problemdescription: "Mô tả tình trạng thiết bị",
        problem_description: "Mô tả tình trạng thiết bị",
        pickupaddress: "Địa chỉ nhận thiết bị",
        pickup_address: "Địa chỉ nhận thiết bị",
        email: "Địa chỉ thư điện tử",
        password: "Mật khẩu",
        fullname: "Họ tên",
        full_name: "Họ tên",
    };
    const label = fieldLabels[fieldName];
    if (!label) return undefined;
    if (/required|must not be blank|must not be null|cannot be null|may not be empty|must not be empty/.test(text)) {
        return `Vui lòng nhập ${label.toLocaleLowerCase("vi-VN")}.`;
    }
    if (/invalid|must match|pattern/.test(text)) return `${label} chưa đúng định dạng. Vui lòng kiểm tra lại.`;
    if (/size|length|between/.test(text)) return `${label} chưa đáp ứng độ dài yêu cầu. Vui lòng kiểm tra lại.`;
    return undefined;
}
