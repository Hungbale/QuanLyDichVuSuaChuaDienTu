import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppointmentForm from "../../components/common/AppointmentForm";
import {
    cancelAppointmentApi,
    getMyAppointmentsApi,
    updateAppointmentApi,
} from "../../api/appointmentApi";
import { getServicesApi } from "../../api/serviceApi";
import type { Appointment, AppointmentRequest } from "../../types/appointment";
import type { ServiceItem } from "../../types/service";

function formatAppointmentDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function methodLabel(method: Appointment["serviceMethod"]) {
    return method === "HOME_PICKUP" ? "Nhận thiết bị tại nhà" : "Mang đến cửa hàng";
}

function statusLabel(status: string) {
    if (status === "PENDING") return "Chờ xác nhận";
    if (status === "CANCELLED") return "Đã hủy";
    if (status === "CONFIRMED") return "Đã xác nhận";
    return status;
}

type AppointmentTab = "current" | "past" | "cancelled";

function appointmentTimestamp(appointment: Appointment) {
    return new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`).getTime();
}

function CustomerAppointments() {
    const location = useLocation();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string>(location.state?.success || "");
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [activeTab, setActiveTab] = useState<AppointmentTab>("current");

    const groupedAppointments = useMemo(() => {
        const now = Date.now();
        const current: Appointment[] = [];
        const past: Appointment[] = [];
        const cancelled: Appointment[] = [];

        appointments.forEach((appointment) => {
            if (appointment.status === "CANCELLED") {
                cancelled.push(appointment);
            } else if (appointmentTimestamp(appointment) < now) {
                past.push(appointment);
            } else {
                current.push(appointment);
            }
        });

        past.sort((a, b) => appointmentTimestamp(b) - appointmentTimestamp(a));
        cancelled.sort((a, b) => appointmentTimestamp(b) - appointmentTimestamp(a));
        return { current, past, cancelled };
    }, [appointments]);

    const visibleAppointments = groupedAppointments[activeTab];

    const loadAppointments = async () => {
        setLoading(true);
        setLoadFailed(false);
        setError("");
        try {
            const data = await getMyAppointmentsApi();
            setAppointments(Array.isArray(data) ? data : []);
        } catch (requestError: any) {
            setLoadFailed(true);
            const status = requestError.response?.status;
            const message = requestError.response?.data?.message;
            setError(
                status === 401
                    ? "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại để xem lịch hẹn."
                    : status === 403
                      ? "Tài khoản hiện tại không được phép xem lịch hẹn. Hãy đăng xuất rồi đăng nhập lại bằng tài khoản khách hàng."
                      : message || "Không thể tải lịch hẹn của bạn. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAppointments();
        getServicesApi({ status: "ACTIVE" })
            .then(setServices)
            .catch(() => setServices([]));
    }, []);

    useEffect(() => {
        if (location.state?.success) {
            setSuccess(location.state.success);
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    const handleUpdate = async (values: AppointmentRequest) => {
        if (!editingAppointment) return;
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await updateAppointmentApi(editingAppointment.id, values);
            setEditingAppointment(null);
            setSuccess("Cập nhật lịch hẹn thành công.");
            await loadAppointments();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || "Không thể cập nhật lịch hẹn.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (appointment: Appointment) => {
        if (!window.confirm(`Bạn có chắc muốn hủy lịch hẹn #${appointment.id}?`)) return;
        setError("");
        setSuccess("");
        try {
            await cancelAppointmentApi(appointment.id);
            setSuccess("Đã hủy lịch hẹn.");
            setActiveTab("cancelled");
            await loadAppointments();
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || "Không thể hủy lịch hẹn.");
        }
    };

    const beginEdit = (appointment: Appointment) => {
        if (services.length === 0) {
            setError("Không tải được danh sách dịch vụ để sửa lịch hẹn. Vui lòng tải lại trang.");
            return;
        }
        setError("");
        setEditingAppointment(appointment);
    };

    const editValues = (appointment: Appointment): AppointmentRequest => ({
        device: appointment.device,
        serviceId: appointment.service.id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime.slice(0, 5),
        serviceMethod: appointment.serviceMethod,
        contactPhone: appointment.contactPhone,
        problemDescription: appointment.problemDescription,
        pickupAddress: appointment.pickupAddress || "",
    });

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · LỊCH HẸN</span>
                <h1>Lịch hẹn của tôi</h1>
                <p>Theo dõi yêu cầu và chỉnh sửa hoặc hủy lịch đang chờ xác nhận.</p>
            </header>

            {success && <div className="success-message" role="status">{success}</div>}
            {error && <div className="error-message" role="alert">{error}</div>}

            {loading ? (
                <div className="appointment-panel table-state">Đang tải lịch hẹn...</div>
            ) : loadFailed ? (
                <div className="appointment-panel appointment-empty-state">
                    <h2>Chưa thể tải lịch hẹn</h2>
                    <p>Hệ thống chưa trả về danh sách. Thông báo phía trên giúp xác định lỗi phiên đăng nhập hoặc kết nối API.</p>
                    <button className="primary-button" onClick={() => void loadAppointments()}>
                        Thử tải lại
                    </button>
                </div>
            ) : (
                <>
                    <div className="appointment-tabs" role="tablist" aria-label="Phân loại lịch hẹn">
                        <button
                            id="appointments-current-tab"
                            className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "current"}
                            aria-controls="appointments-tab-panel"
                            onClick={() => setActiveTab("current")}
                        >
                            Hiện tại <span>{groupedAppointments.current.length}</span>
                        </button>
                        <button
                            id="appointments-past-tab"
                            className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "past"}
                            aria-controls="appointments-tab-panel"
                            onClick={() => setActiveTab("past")}
                        >
                            Đã qua <span>{groupedAppointments.past.length}</span>
                        </button>
                        <button
                            id="appointments-cancelled-tab"
                            className={activeTab === "cancelled" ? "appointment-tab active" : "appointment-tab"}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === "cancelled"}
                            aria-controls="appointments-tab-panel"
                            onClick={() => setActiveTab("cancelled")}
                        >
                            Đã hủy <span>{groupedAppointments.cancelled.length}</span>
                        </button>
                    </div>

                    <section className="appointment-tab-panel" id="appointments-tab-panel" role="tabpanel" aria-labelledby={`appointments-${activeTab}-tab`}>
                    {visibleAppointments.length === 0 ? (
                        <div className="appointment-panel appointment-empty-state">
                            <h2>{activeTab === "current" ? "Bạn chưa có lịch hẹn hiện tại" : activeTab === "past" ? "Chưa có lịch hẹn đã qua" : "Chưa có lịch hẹn đã hủy"}</h2>
                            <p>{activeTab === "current" ? "Xem danh sách dịch vụ để chọn dịch vụ và đặt lịch sửa chữa." : "Các lịch hẹn thuộc mục này sẽ xuất hiện tại đây."}</p>
                            {activeTab === "current" && (
                                <button className="primary-button" onClick={() => navigate("/customer/services")}>
                                    Xem dịch vụ
                                </button>
                            )}
                        </div>
                    ) : (
                    <section className="appointment-list" aria-label="Danh sách lịch hẹn">
                    {visibleAppointments.map((appointment) => (
                        <article className="appointment-card" key={appointment.id}>
                            <div className="appointment-card-top">
                                <div>
                                    <span className="appointment-card-reference">LỊCH HẸN #{appointment.id}</span>
                                    <h2>{appointment.service?.name || "Dịch vụ sửa chữa"}</h2>
                                </div>
                                <span className={`appointment-status ${appointment.status.toLowerCase()}`}>
                                    {statusLabel(appointment.status)}
                                </span>
                            </div>
                            <div className="appointment-details-grid">
                                <div><span>Thiết bị</span><strong>{appointment.device}</strong></div>
                                <div><span>Thời gian</span><strong>{formatAppointmentDate(appointment.appointmentDate)} · {appointment.appointmentTime.slice(0, 5)}</strong></div>
                                <div><span>Hình thức</span><strong>{methodLabel(appointment.serviceMethod)}</strong></div>
                                <div><span>Liên hệ</span><strong>{appointment.contactPhone}</strong></div>
                                {appointment.pickupAddress && <div className="appointment-detail-full"><span>Địa chỉ nhận</span><strong>{appointment.pickupAddress}</strong></div>}
                                <div className="appointment-detail-full"><span>Mô tả tình trạng</span><strong>{appointment.problemDescription}</strong></div>
                            </div>
                            {appointment.status === "PENDING" && (
                                <div className="appointment-card-actions">
                                    <button className="secondary-button" onClick={() => beginEdit(appointment)}>Chỉnh sửa</button>
                                    <button className="danger-button" onClick={() => void handleCancel(appointment)}>Hủy lịch</button>
                                </div>
                            )}
                        </article>
                    ))}
                    </section>
                    )}
                    </section>
                </>
            )}

            {editingAppointment && (
                <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !saving) setEditingAppointment(null);
                }}>
                    <section className="modal appointment-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-appointment-title">
                        <div className="modal-header">
                            <h2 id="edit-appointment-title">Chỉnh sửa lịch hẹn #{editingAppointment.id}</h2>
                            <button className="modal-close" type="button" onClick={() => setEditingAppointment(null)} disabled={saving} aria-label="Đóng">×</button>
                        </div>
                        <AppointmentForm
                            key={editingAppointment.id}
                            services={services}
                            initialValues={editValues(editingAppointment)}
                            submitting={saving}
                            submitLabel="Lưu thay đổi"
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingAppointment(null)}
                        />
                    </section>
                </div>
            )}
        </main>
    );
}

export default CustomerAppointments;
