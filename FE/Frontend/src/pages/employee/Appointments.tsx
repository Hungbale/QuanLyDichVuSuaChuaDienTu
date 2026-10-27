import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { assignAppointmentApi, getAppointmentCancellationRequestsApi, getMyAssignedAppointmentGroupsApi, getPendingAppointmentsApi, reviewAppointmentCancellationApi } from "../../api/appointmentApi";
import type { AppointmentCancellationRequestRecord, AssignedAppointment } from "../../types/appointment";

function EmployeeAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<AssignedAppointment[]>([]);
    const [receivedAppointments, setReceivedAppointments] = useState<AssignedAppointment[]>([]);
    const [pendingAppointments, setPendingAppointments] = useState<AssignedAppointment[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState<AppointmentCancellationRequestRecord[]>([]);
    const [viewingAppointment, setViewingAppointment] = useState<AssignedAppointment | null>(null);
    const [workingId, setWorkingId] = useState<number | null>(null);
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAppointments = async (contactPhone?: string) => {
        setLoading(true);
        setError("");
        try {
            const [groups, pending, cancellations] = await Promise.all([
                getMyAssignedAppointmentGroupsApi(),
                getPendingAppointmentsApi(),
                getAppointmentCancellationRequestsApi(),
            ]);
            const normalizedPhone = contactPhone?.trim();
            setAppointments(normalizedPhone
                ? groups.actionRequired.filter((appointment) => appointment.contactPhone.includes(normalizedPhone))
                : groups.actionRequired);
            setReceivedAppointments(normalizedPhone
                ? groups.received.filter((appointment) => appointment.contactPhone.includes(normalizedPhone))
                : groups.received);
            setPendingAppointments(normalizedPhone ? pending.filter((appointment) => appointment.contactPhone.includes(normalizedPhone)) : pending);
            setCancellationRequests(cancellations);
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || "Không thể tải danh sách lịch hẹn.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAppointments();
    }, []);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void loadAppointments(phone);
    };

    const handleReset = () => {
        setPhone("");
        void loadAppointments();
    };

    const claimAppointment = async (id: number) => {
        setWorkingId(id); setError("");
        try { await assignAppointmentApi(id); await loadAppointments(phone); }
        catch (requestError: any) { setError(requestError.response?.data?.message || "Không thể nhận lịch hẹn."); }
        finally { setWorkingId(null); }
    };

    const reviewCancellation = async (id: number, decision: "APPROVE" | "REJECT") => {
        setWorkingId(id); setError("");
        try { await reviewAppointmentCancellationApi(id, decision); await loadAppointments(phone); }
        catch (requestError: any) { setError(requestError.response?.data?.message || "Không thể xử lý yêu cầu hủy."); }
        finally { setWorkingId(null); }
    };

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · ĐIỀU PHỐI</span>
                <h1>Lịch hẹn được phân công</h1>
                <p>Theo dõi các lịch hẹn hệ thống tự động giao cho bạn dựa trên khối lượng công việc.</p>
            </header>

            {error && <div className="error-message" role="alert">{error}</div>}

            <form className="appointment-search-panel" onSubmit={handleSearch}>
                <div className="appointment-form-group">
                    <label htmlFor="appointment-search-phone">Số điện thoại khách hàng</label>
                    <input
                        id="appointment-search-phone"
                        type="search"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Để trống để xem tất cả lịch hẹn"
                    />
                </div>
                <div className="appointment-search-actions">
                    <button className="secondary-button" type="button" onClick={handleReset} disabled={loading}>Xóa lọc</button>
                    <button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm lịch hẹn"}</button>
                </div>
            </form>

            <div className="appointment-results-heading">
                <div>
                    <h2>Lịch hẹn được giao cho tôi</h2>
                    <p>{loading ? "Đang lấy dữ liệu từ hệ thống..." : `${appointments.length} lịch hẹn`}</p>
                </div>
            </div>

            {loading ? (
                <div className="appointment-panel table-state">Đang tải lịch hẹn...</div>
            ) : appointments.length === 0 ? (
                <div className="appointment-panel appointment-empty-state">
                    <h2>Không tìm thấy lịch hẹn</h2>
                    <p>Thử tìm bằng số điện thoại khác hoặc xóa bộ lọc.</p>
                </div>
            ) : (
                <div className="appointment-panel appointment-table-container">
                    <table className="appointment-table">
                        <thead>
                            <tr>
                                <th>Lịch hẹn</th>
                                <th>Khách liên hệ</th>
                                <th>Thiết bị / dịch vụ</th>
                                <th>Hình thức</th>
                                <th>Trạng thái</th>
                                <th>Mô tả</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((appointment) => (
                                <tr key={appointment.id}>
                                    <td>
                                        <strong>#{appointment.id}</strong>
                                        <span>{new Date(`${appointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span>
                                        <span>{appointment.appointmentTime.slice(0, 5)}</span>
                                    </td>
                                    <td><strong>{appointment.contactPhone}</strong></td>
                                    <td>
                                        <strong>{appointment.device}</strong>
                                        <span>{appointment.serviceName || "Dịch vụ sửa chữa"}</span>
                                    </td>
                                    <td>
                                        <span>{appointment.serviceMethod === "HOME_PICKUP" ? "Nhận tại nhà" : "Mang đến cửa hàng"}</span>
                                        {appointment.pickupAddress && <span>{appointment.pickupAddress}</span>}
                                    </td>
                                    <td>
                                        <span className={`appointment-status ${appointment.status.toLowerCase()}`}>
                                            {appointment.status === "PENDING" ? "Chờ xác nhận" : appointment.status === "CANCELLED" ? "Đã hủy" : appointment.status}
                                        </span>
                                    </td>
                                    <td className="appointment-description-cell">{appointment.problemDescription}</td>
                                    <td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(appointment)}>Xem chi tiết</button>{appointment.status === "CONFIRMED" && <button className="primary-button" type="button" onClick={() => navigate(`/employee/receive-device?appointmentId=${appointment.id}`)}>Tiếp nhận thiết bị</button>}</div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {receivedAppointments.length > 0 && <>
                <div className="appointment-results-heading"><div><h2>Đã tiếp nhận thiết bị</h2><p>{receivedAppointments.length} lịch đã chuyển sang phiếu sửa chữa</p></div></div>
                <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách</th><th>Thiết bị / dịch vụ</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>{receivedAppointments.map((appointment) => <tr key={appointment.id}><td>#{appointment.id}</td><td>{appointment.customerName || appointment.contactPhone}</td><td>{appointment.device}<span>{appointment.serviceName}</span></td><td>{new Date(`${appointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} · {appointment.appointmentTime.slice(0, 5)}</td><td><span className="appointment-status confirmed">Đã tiếp nhận</span></td><td><button className="secondary-button" type="button" onClick={() => setViewingAppointment(appointment)}>Xem chi tiết</button></td></tr>)}</tbody></table></div>
            </>}
            {pendingAppointments.length > 0 && <>
                <div className="appointment-results-heading"><div><h2>Lịch hẹn đang chờ nhận</h2><p>{pendingAppointments.length} lịch</p></div></div>
                <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách</th><th>Thiết bị / dịch vụ</th><th>Thời gian</th><th>Thao tác</th></tr></thead><tbody>{pendingAppointments.map((appointment) => <tr key={appointment.id}><td>#{appointment.id}</td><td>{appointment.customerName || appointment.contactPhone}</td><td>{appointment.device}<span>{appointment.serviceName}</span></td><td>{new Date(`${appointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} · {appointment.appointmentTime.slice(0, 5)}</td><td><button className="primary-button" type="button" disabled={workingId === appointment.id} onClick={() => void claimAppointment(appointment.id)}>{workingId === appointment.id ? "Đang nhận..." : "Nhận lịch & phân công cho tôi"}</button></td></tr>)}</tbody></table></div>
            </>}
            {cancellationRequests.length > 0 && <>
                <div className="appointment-results-heading"><div><h2>Yêu cầu hủy lịch</h2><p>{cancellationRequests.length} yêu cầu</p></div></div>
                <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách</th><th>Thiết bị</th><th>Lý do</th><th>Thao tác</th></tr></thead><tbody>{cancellationRequests.map((request) => <tr key={request.appointmentId}><td>#{request.appointmentId}<span>{new Date(`${request.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span></td><td>{request.customerName}</td><td>{request.device}</td><td>{request.cancellationReason}</td><td><div className="repair-ticket-actions"><button className="primary-button" type="button" disabled={workingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "APPROVE")}>Duyệt</button><button className="secondary-button" type="button" disabled={workingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "REJECT")}>Từ chối</button></div></td></tr>)}</tbody></table></div>
            </>}
            {viewingAppointment && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingAppointment(null); }}>
                <section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="employee-appointment-detail-title">
                    <div className="modal-header"><div><h2 id="employee-appointment-detail-title">Chi tiết lịch hẹn #{viewingAppointment.id}</h2><p>{viewingAppointment.serviceName}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingAppointment(null)}>×</button></div>
                    <div className="appointment-details-grid">
                        <div><span>Khách hàng</span><strong>{viewingAppointment.customerName || "Khách vãng lai"}</strong></div>
                        <div><span>Trạng thái</span><strong>{viewingAppointment.status === "CONFIRMED" ? "Đã xác nhận" : viewingAppointment.status}</strong></div>
                        <div><span>Thời gian hẹn</span><strong>{new Date(`${viewingAppointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} · {viewingAppointment.appointmentTime.slice(0, 5)}</strong></div>
                        <div><span>Thiết bị</span><strong>{viewingAppointment.device}</strong></div>
                        <div><span>Số điện thoại liên hệ</span><strong>{viewingAppointment.contactPhone}</strong></div>
                        <div><span>Hình thức</span><strong>{viewingAppointment.serviceMethod === "HOME_PICKUP" ? "Nhận thiết bị tại nhà" : "Mang đến cửa hàng"}</strong></div>
                        {viewingAppointment.pickupAddress && <div className="appointment-detail-full"><span>Địa chỉ nhận thiết bị</span><strong>{viewingAppointment.pickupAddress}</strong></div>}
                        <div className="appointment-detail-full"><span>Mô tả tình trạng</span><strong>{viewingAppointment.problemDescription || "Không có mô tả"}</strong></div>
                    </div>
                    <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(null)}>Đóng</button></div>
                </section>
            </div>}
        </main>
    );
}

export default EmployeeAppointments;
