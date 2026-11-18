import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import EmployeeReceiveDevice from "./ReceiveDeviceModal";
import { getAppointmentCancellationRequestsApi, getMyAssignedAppointmentGroupsApi, reviewAppointmentCancellationApi } from "../../api/appointmentApi";
import type { AppointmentCancellationRequestRecord, AssignedAppointment } from "../../types/appointment";
import { statusLabel } from "../../utils/statusLabel";

function EmployeeAppointments() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [intakeTarget, setIntakeTarget] = useState<{ appointmentId?: string | null; ticketId?: string | null } | null>(null);
    const [successNotice, setSuccessNotice] = useState("");
    const [activeTab, setActiveTab] = useState<"assigned" | "received">("assigned");
    const [appointments, setAppointments] = useState<AssignedAppointment[]>([]);
    const [receivedAppointments, setReceivedAppointments] = useState<AssignedAppointment[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState<AppointmentCancellationRequestRecord[]>([]);
    const [viewingAppointment, setViewingAppointment] = useState<AssignedAppointment | null>(null);
    const [workingId, setWorkingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAppointments = async (contactPhone?: string) => {
        setLoading(true);
        setError("");
        try {
            const [groups, cancellations] = await Promise.all([
                getMyAssignedAppointmentGroupsApi(),
                getAppointmentCancellationRequestsApi(),
            ]);
            const query = contactPhone?.trim() || "";
            const normalizedQuery = query.toLocaleLowerCase("vi");
            const matchesCustomer = (appointment: AssignedAppointment) => !query
                || (appointment.customerName || "").toLocaleLowerCase("vi").includes(normalizedQuery)
                || appointment.contactPhone.includes(query);
            const newestFirst = (items: AssignedAppointment[]) => [...items].sort((a, b) =>
                `${b.appointmentDate}T${b.appointmentTime}`.localeCompare(`${a.appointmentDate}T${a.appointmentTime}`) || b.id - a.id);
            setAppointments(newestFirst(groups.actionRequired.filter(matchesCustomer)));
            setReceivedAppointments(newestFirst(groups.received.filter(matchesCustomer)));
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

    useEffect(() => {
        const appointmentId = searchParams.get("appointmentId");
        const ticketId = searchParams.get("ticketId");
        if (appointmentId || ticketId) {
            setIntakeTarget({ appointmentId, ticketId });
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void loadAppointments(searchQuery);
    };

    const handleReset = () => {
        setSearchQuery("");
        void loadAppointments();
    };

    const reviewCancellation = async (id: number, decision: "APPROVE" | "REJECT") => {
        setWorkingId(id); setError("");
        try { await reviewAppointmentCancellationApi(id, decision); await loadAppointments(searchQuery); }
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
            {successNotice && <div className="success-message" role="status">{successNotice}</div>}

            <form className="appointment-search-panel" onSubmit={handleSearch}>
                <div className="appointment-form-group">
                    <label htmlFor="appointment-search-phone">Tìm khách theo tên hoặc số điện thoại</label>
                    <input
                        id="appointment-search-phone"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Nhập tên hoặc số điện thoại khách hàng"
                    />
                </div>
                <div className="appointment-search-actions">
                    <button className="secondary-button" type="button" onClick={handleReset} disabled={loading}>Xóa lọc</button>
                    <button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm lịch hẹn"}</button>
                </div>
            </form>

            <div className="appointment-tabs" role="tablist" aria-label={"Ph\u00e2n lo\u1ea1i l\u1ecbch h\u1eb9n"}>
                <button className={activeTab === "assigned" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "assigned"} onClick={() => setActiveTab("assigned")}>{"L\u1ecbch h\u1eb9n \u0111\u01b0\u1ee3c giao"} <span>{appointments.length}</span></button>
                <button className={activeTab === "received" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "received"} onClick={() => setActiveTab("received")}>{"L\u1ecbch h\u1eb9n \u0111\u00e3 ti\u1ebfp nh\u1eadn"} <span>{receivedAppointments.length}</span></button>
            </div>
            <div className="appointment-results-heading"><div>
                <h2>{activeTab === "assigned" ? "L\u1ecbch h\u1eb9n \u0111\u01b0\u1ee3c giao cho t\u00f4i" : "L\u1ecbch h\u1eb9n \u0111\u00e3 ti\u1ebfp nh\u1eadn"}</h2>
                <p>{loading ? "\u0110ang t\u1ea3i d\u1eef li\u1ec7u..." : `${activeTab === "assigned" ? appointments.length : receivedAppointments.length} l\u1ecbch h\u1eb9n`}</p>
            </div></div>
            {activeTab === "assigned" ? (loading ? (
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
                                            {statusLabel(appointment.status)}
                                        </span>
                                    </td>
                                    <td className="appointment-description-cell">{appointment.problemDescription}</td>
                                    <td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(appointment)}>Xem chi tiết</button>{appointment.status === "CONFIRMED" && <button className="primary-button" type="button" onClick={() => { setError(""); setSuccessNotice(""); setIntakeTarget({ appointmentId: String(appointment.id) }); }}>Tiếp nhận thiết bị</button>}</div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )) : loading ? (
                <div className="appointment-panel table-state">{"\u0110ang t\u1ea3i l\u1ecbch h\u1eb9n \u0111\u00e3 ti\u1ebfp nh\u1eadn..."}</div>
            ) : receivedAppointments.length === 0 ? (
                <div className="appointment-panel appointment-empty-state"><h2>{"Ch\u01b0a c\u00f3 l\u1ecbch h\u1eb9n \u0111\u00e3 ti\u1ebfp nh\u1eadn"}</h2><p>{"L\u1ecbch h\u1eb9n s\u1ebd chuy\u1ec3n v\u00e0o m\u1ee5c n\u00e0y sau khi b\u1ea1n ti\u1ebfp nh\u1eadn thi\u1ebft b\u1ecb."}</p></div>
            ) : (
                <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>{"L\u1ecbch h\u1eb9n"}</th><th>{"Kh\u00e1ch"}</th><th>{"Thi\u1ebft b\u1ecb / d\u1ecbch v\u1ee5"}</th><th>{"Th\u1eddi gian"}</th><th>{"Tr\u1ea1ng th\u00e1i"}</th><th></th></tr></thead><tbody>{receivedAppointments.map((appointment) => <tr key={appointment.id}><td>#{appointment.id}</td><td>{appointment.customerName || appointment.contactPhone}</td><td>{appointment.device}<span>{appointment.serviceName}</span></td><td>{new Date(`${appointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} {"\u00b7"} {appointment.appointmentTime.slice(0, 5)}</td><td><span className="appointment-status confirmed">{"\u0110\u00e3 ti\u1ebfp nh\u1eadn"}</span></td><td><button className="secondary-button" type="button" onClick={() => setViewingAppointment(appointment)}>{"Xem chi ti\u1ebft"}</button></td></tr>)}</tbody></table></div>
            )}
            {cancellationRequests.length > 0 && <>
                <div className="appointment-results-heading"><div><h2>Yêu cầu hủy lịch</h2><p>{cancellationRequests.length} yêu cầu</p></div></div>
                <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách</th><th>Thiết bị</th><th>Lý do</th><th>Thao tác</th></tr></thead><tbody>{cancellationRequests.map((request) => <tr key={request.appointmentId}><td>#{request.appointmentId}<span>{new Date(`${request.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span></td><td>{request.customerName}</td><td>{request.device}</td><td>{request.cancellationReason}</td><td><div className="repair-ticket-actions"><button className="primary-button" type="button" disabled={workingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "APPROVE")}>Duyệt</button><button className="secondary-button" type="button" disabled={workingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "REJECT")}>Từ chối</button></div></td></tr>)}</tbody></table></div>
            </>}
            {intakeTarget && <EmployeeReceiveDevice
                appointmentId={intakeTarget.appointmentId}
                ticketId={intakeTarget.ticketId}
                onClose={() => setIntakeTarget(null)}
                onSuccess={(message) => {
                    setIntakeTarget(null);
                    setSuccessNotice(message);
                    void loadAppointments(searchQuery);
                }}
            />}
            {viewingAppointment && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingAppointment(null); }}>
                <section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="employee-appointment-detail-title">
                    <div className="modal-header"><div><h2 id="employee-appointment-detail-title">Chi tiết lịch hẹn #{viewingAppointment.id}</h2><p>{viewingAppointment.serviceName}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingAppointment(null)}>×</button></div>
                    <div className="appointment-details-grid">
                        <div><span>Khách hàng</span><strong>{viewingAppointment.customerName || "Khách vãng lai"}</strong></div>
                        <div><span>Trạng thái</span><strong>{statusLabel(viewingAppointment.status)}</strong></div>
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
