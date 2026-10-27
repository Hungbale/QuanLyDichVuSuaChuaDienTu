import { useEffect, useState, type FormEvent } from "react";
import { checkAppointmentAvailabilityApi } from "../../api/appointmentApi";
import type { AppointmentRequest } from "../../types/appointment";
import type { ServiceItem } from "../../types/service";

interface AppointmentFormProps {
    services: ServiceItem[];
    initialValues: AppointmentRequest;
    submitting: boolean;
    submitLabel: string;
    onSubmit: (values: AppointmentRequest) => void | Promise<void>;
    onCancel?: () => void;
    blockUnavailableSlot?: boolean;
}

function AppointmentForm({
    services,
    initialValues,
    submitting,
    submitLabel,
    onSubmit,
    onCancel,
    blockUnavailableSlot = false,
}: AppointmentFormProps) {
    const [values, setValues] = useState<AppointmentRequest>(initialValues);
    const [availability, setAvailability] = useState<{ available: boolean; remainingCapacity: number } | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availabilityError, setAvailabilityError] = useState("");

    useEffect(() => {
        if (!values.appointmentDate || !values.appointmentTime) return;
        let active = true;
        const timer = window.setTimeout(() => {
            setCheckingAvailability(true);
            setAvailabilityError("");
            checkAppointmentAvailabilityApi(values.appointmentDate, values.appointmentTime)
                .then((result) => { if (active) setAvailability(result); })
                .catch((error: any) => {
                    if (!active) return;
                    setAvailability(null);
                    setAvailabilityError(error.response?.data?.message || "Chưa kiểm tra được khung giờ này.");
                })
                .finally(() => { if (active) setCheckingAvailability(false); });
        }, 300);
        return () => { active = false; window.clearTimeout(timer); };
    }, [values.appointmentDate, values.appointmentTime]);

    const update = <K extends keyof AppointmentRequest>(
        field: K,
        value: AppointmentRequest[K]
    ) => {
        setValues((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (blockUnavailableSlot && availability?.available === false) {
            setAvailabilityError("Khung giờ này đã hết chỗ. Hãy chọn ngày hoặc giờ khác.");
            return;
        }
        void onSubmit({
            ...values,
            device: values.device.trim(),
            contactPhone: values.contactPhone.trim(),
            problemDescription: values.problemDescription.trim(),
            pickupAddress: values.serviceMethod === "HOME_PICKUP"
                ? values.pickupAddress?.trim()
                : "",
        });
    };

    return (
        <form className="appointment-form" onSubmit={handleSubmit}>
            <div className="appointment-form-grid">
                <div className="appointment-form-group">
                    <label htmlFor="appointment-device">Thiết bị</label>
                    <input
                        id="appointment-device"
                        value={values.device}
                        onChange={(event) => update("device", event.target.value)}
                        maxLength={200}
                        placeholder="Ví dụ: Laptop Dell Inspiron 15"
                        required
                    />
                </div>

                <div className="appointment-form-group appointment-form-full" aria-live="polite">
                    {checkingAvailability ? <small>Đang kiểm tra khung giờ...</small>
                        : availability ? <small className={availability.available ? "success-text" : "error-text"}>{availability.available ? `Còn ${availability.remainingCapacity} chỗ ở khung giờ này.` : "Khung giờ này đã hết chỗ."}</small>
                            : availabilityError ? <small className="error-text">{availabilityError}</small> : null}
                </div>

                <div className="appointment-form-group">
                    <label htmlFor="appointment-service">Dịch vụ</label>
                    <select
                        id="appointment-service"
                        value={values.serviceId || ""}
                        onChange={(event) => update("serviceId", Number(event.target.value))}
                        required
                    >
                        <option value="" disabled>Chọn dịch vụ sửa chữa</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name} · {service.price.toLocaleString("vi-VN")} đ
                            </option>
                        ))}
                    </select>
                </div>

                <div className="appointment-form-group">
                    <label htmlFor="appointment-date">Ngày hẹn</label>
                    <input
                        id="appointment-date"
                        type="date"
                        min={new Date().toLocaleDateString("en-CA")}
                        value={values.appointmentDate}
                        onChange={(event) => update("appointmentDate", event.target.value)}
                        required
                    />
                </div>

                <div className="appointment-form-group">
                    <label htmlFor="appointment-time">Giờ hẹn</label>
                    <input
                        id="appointment-time"
                        type="time"
                        value={values.appointmentTime}
                        onChange={(event) => update("appointmentTime", event.target.value)}
                        required
                    />
                </div>

                <div className="appointment-form-group">
                    <label htmlFor="appointment-phone">Số điện thoại liên hệ</label>
                    <input
                        id="appointment-phone"
                        type="tel"
                        value={values.contactPhone}
                        onChange={(event) => update("contactPhone", event.target.value)}
                        pattern="0[0-9]{9}"
                        title="Nhập 10 chữ số, bắt đầu bằng số 0"
                        placeholder="09xxxxxxxx"
                        required
                    />
                </div>

                <div className="appointment-form-group">
                    <label htmlFor="appointment-method">Hình thức tiếp nhận</label>
                    <select
                        id="appointment-method"
                        value={values.serviceMethod}
                        onChange={(event) => update(
                            "serviceMethod",
                            event.target.value as AppointmentRequest["serviceMethod"]
                        )}
                    >
                        <option value="STORE_DROP_OFF">Mang thiết bị đến cửa hàng</option>
                        <option value="HOME_PICKUP">Nhân viên đến nhận tại nhà</option>
                    </select>
                </div>

                {values.serviceMethod === "HOME_PICKUP" && (
                    <div className="appointment-form-group appointment-form-full">
                        <label htmlFor="appointment-address">Địa chỉ nhận thiết bị</label>
                        <input
                            id="appointment-address"
                            value={values.pickupAddress || ""}
                            onChange={(event) => update("pickupAddress", event.target.value)}
                            maxLength={500}
                            placeholder="Số nhà, đường, phường/xã, quận/huyện"
                            required
                        />
                    </div>
                )}

                <div className="appointment-form-group appointment-form-full">
                    <label htmlFor="appointment-problem">Mô tả tình trạng thiết bị</label>
                    <textarea
                        id="appointment-problem"
                        value={values.problemDescription}
                        onChange={(event) => update("problemDescription", event.target.value)}
                        rows={4}
                        maxLength={5000}
                        placeholder="Mô tả lỗi, thời điểm phát sinh và các biểu hiện đã gặp..."
                        required
                    />
                </div>
            </div>

            <div className="appointment-form-actions">
                {onCancel && (
                    <button className="secondary-button" type="button" onClick={onCancel} disabled={submitting}>
                        Đóng
                    </button>
                )}
                <button className="primary-button" type="submit" disabled={submitting || services.length === 0 || (blockUnavailableSlot && checkingAvailability)}>
                    {submitting ? "Đang lưu..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default AppointmentForm;
