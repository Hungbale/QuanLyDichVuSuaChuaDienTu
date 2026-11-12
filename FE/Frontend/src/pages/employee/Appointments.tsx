import { useEffect, useState, type FormEvent } from "react";
import { getAppointmentsApi } from "../../api/appointmentApi";
import type { Appointment } from "../../types/appointment";

function EmployeeAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAppointments = async (contactPhone?: string) => {
        setLoading(true);
        setError("");
        try {
            setAppointments(await getAppointmentsApi({
                contactPhone: contactPhone?.trim() || undefined,
            }));
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

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · ĐIỀU PHỐI</span>
                <h1>Tra cứu lịch hẹn</h1>
                <p>Xem lịch khách hàng và tra cứu nhanh theo số điện thoại liên hệ.</p>
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
                    <h2>Danh sách lịch hẹn</h2>
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
                                        <span>{appointment.service?.name || "Dịch vụ sửa chữa"}</span>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}

export default EmployeeAppointments;
