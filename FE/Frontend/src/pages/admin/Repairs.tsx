import { useEffect, useState, type FormEvent } from "react";
import { createRepairTicketApi, getRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import { getAppointmentsApi } from "../../api/appointmentApi";
import { getCustomersApi } from "../../api/customerApi";
import { getEmployeesApi } from "../../api/employeeApi";
import type { Appointment } from "../../types/appointment";
import type { Customer } from "../../types/customer";
import type { Employee } from "../../types/employee";
import type { RepairTicket, RepairTicketRequest } from "../../types/repairTicket";

type RepairsTab = "appointments" | "repairs";
type TicketForm = { customerId: string; device: string; receivedDate: string; status: string; technicianId: string };
const emptyForm: TicketForm = { customerId: "", device: "", receivedDate: new Date().toISOString().slice(0, 10), status: "Đã tiếp nhận", technicianId: "" };
const statusOptions = ["Đã tiếp nhận", "Đang kiểm tra", "Chờ báo giá", "Chờ khách xác nhận", "Đang sửa", "Hoàn thành", "Khách từ chối", "Đã hủy"];
const errorMessage = (error: any, fallback: string) => error.response?.data?.message || error.response?.data?.error || fallback;

function AdminRepairs() {
    const [activeTab, setActiveTab] = useState<RepairsTab>("appointments");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [phone, setPhone] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [form, setForm] = useState<TicketForm>(emptyForm);
    const [editing, setEditing] = useState<RepairTicket | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadAppointments = async (contactPhone?: string) => {
        setLoading(true); setError("");
        try { setAppointments(await getAppointmentsApi({ contactPhone: contactPhone?.trim() || undefined })); }
        catch (e: any) { setError(errorMessage(e, "Không thể tải lịch đặt của khách hàng.")); }
        finally { setLoading(false); }
    };
    const loadTickets = async (search?: string) => {
        setLoading(true); setError("");
        try { setTickets(await getRepairTicketsApi(search)); }
        catch (e: any) { setError(errorMessage(e, "Không thể tải danh sách phiếu sửa chữa.")); }
        finally { setLoading(false); }
    };

    useEffect(() => { void loadAppointments(); }, []);
    useEffect(() => {
        if (activeTab !== "repairs") return;
        void loadTickets();
        Promise.all([getCustomersApi(), getEmployeesApi()]).then(([customerList, employeeList]) => {
            setCustomers(customerList); setEmployees(employeeList);
        }).catch((e: any) => setError(errorMessage(e, "Không thể tải danh sách khách hàng hoặc nhân viên.")));
    }, [activeTab]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void loadTickets(keyword); };
    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowEditor(true); setNotice(""); setError(""); };
    const openEdit = (ticket: RepairTicket) => {
        setEditing(ticket); setShowEditor(true); setNotice(""); setError("");
        setForm({ customerId: String(ticket.customerId), device: ticket.device, receivedDate: ticket.receivedDate, status: ticket.status, technicianId: ticket.technicianId ? String(ticket.technicianId) : "" });
    };
    const saveTicket = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        const request: RepairTicketRequest = {
            customerId: Number(form.customerId), device: form.device.trim(), receivedDate: form.receivedDate, status: form.status,
            technicianId: form.technicianId ? Number(form.technicianId) : null,
        };
        try {
            if (editing) await updateRepairTicketApi(editing.id, request);
            else await createRepairTicketApi(request);
            setNotice(editing ? "Đã cập nhật phiếu sửa chữa." : "Đã tạo phiếu sửa chữa.");
            setEditing(null); setShowEditor(false); setForm(emptyForm); await loadTickets(keyword);
        } catch (e: any) { setError(errorMessage(e, "Không thể lưu phiếu sửa chữa.")); }
        finally { setSaving(false); }
    };

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · ADMIN</span>
                <h1>Quản lý sửa chữa</h1>
                <p>Tra cứu lịch khách đặt và quản lý các phiếu sửa chữa trong hệ thống.</p>
            </header>

            <div className="repair-management-tabs" role="tablist" aria-label="Nội dung quản lý sửa chữa">
                <button type="button" role="tab" aria-selected={activeTab === "appointments"} className={activeTab === "appointments" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("appointments"); setError(""); setNotice(""); }}>Lịch đặt của khách</button>
                <button type="button" role="tab" aria-selected={activeTab === "repairs"} className={activeTab === "repairs" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("repairs"); setError(""); setNotice(""); }}>Phiếu sửa chữa</button>
            </div>

            {activeTab === "appointments" ? (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <form className="appointment-search-panel" onSubmit={(e) => { e.preventDefault(); void loadAppointments(phone); }}>
                        <div className="appointment-form-group"><label htmlFor="admin-appointment-phone">Số điện thoại khách hàng</label><input id="admin-appointment-phone" type="search" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Để trống để xem tất cả lịch đặt" /></div>
                        <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setPhone(""); void loadAppointments(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm lịch đặt"}</button></div>
                    </form>
                    <div className="appointment-results-heading"><div><h2>Danh sách lịch khách đặt</h2><p>{loading ? "Đang lấy dữ liệu..." : `${appointments.length} lịch đặt`}</p></div></div>
                    {loading ? <div className="appointment-panel table-state">Đang tải lịch đặt...</div> : appointments.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không tìm thấy lịch đặt</h2><p>Thử tìm bằng số điện thoại khác hoặc xóa bộ lọc.</p></div> : (
                        <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách liên hệ</th><th>Thiết bị / dịch vụ</th><th>Hình thức</th><th>Trạng thái</th><th>Mô tả tình trạng</th></tr></thead><tbody>
                            {appointments.map((a) => <tr key={a.id}><td><strong>#{a.id}</strong><span>{new Date(`${a.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span><span>{a.appointmentTime.slice(0, 5)}</span></td><td><strong>{a.contactPhone}</strong></td><td><strong>{a.device}</strong><span>{a.service?.name || "Dịch vụ sửa chữa"}</span></td><td><span>{a.serviceMethod === "HOME_PICKUP" ? "Nhận tại nhà" : "Mang đến cửa hàng"}</span>{a.pickupAddress && <span>{a.pickupAddress}</span>}</td><td><span className={`appointment-status ${a.status.toLowerCase()}`}>{a.status === "PENDING" ? "Chờ xác nhận" : a.status === "CANCELLED" ? "Đã hủy" : a.status}</span></td><td className="appointment-description-cell">{a.problemDescription}</td></tr>)}
                        </tbody></table></div>
                    )}
                </section>
            ) : (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
                    <form className="appointment-search-panel" onSubmit={submitSearch}><div className="appointment-form-group"><label htmlFor="ticket-search">Tra cứu phiếu sửa chữa</label><input id="ticket-search" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mã phiếu, tên, mã hoặc số điện thoại khách" /></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setKeyword(""); void loadTickets(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>Tìm phiếu</button><button className="primary-button" type="button" onClick={openCreate}>Tạo phiếu</button></div></form>
                    <div className="appointment-results-heading"><div><h2>Danh sách phiếu sửa chữa</h2><p>{loading ? "Đang lấy dữ liệu..." : `${tickets.length} phiếu`}</p></div></div>
                    {showEditor && <form className="appointment-panel ticket-editor" onSubmit={saveTicket}><h2>{editing ? `Cập nhật ${editing.ticketCode}` : "Tạo phiếu sửa chữa"}</h2><div className="appointment-form-grid">
                        <div className="appointment-form-group"><label htmlFor="ticket-customer">Khách hàng</label><select id="ticket-customer" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}><option value="">Chọn khách hàng</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.customerCode} · {c.fullName} · {c.phone}</option>)}</select></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-device">Thiết bị</label><input id="ticket-device" required maxLength={200} value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-date">Ngày tiếp nhận</label><input id="ticket-date" type="date" required value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-status">Trạng thái</label><select id="ticket-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></div>
                        <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-technician">Kỹ thuật viên phụ trách</label><select id="ticket-technician" value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Chưa phân công</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.fullName}</option>)}</select></div>
                    </div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setEditing(null); setShowEditor(false); setForm(emptyForm); }}>Đóng</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu phiếu"}</button></div></form>}
                    {loading ? <div className="appointment-panel table-state">Đang tải phiếu sửa chữa...</div> : tickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu sửa chữa</h2><p>Tạo phiếu mới hoặc thay đổi từ khóa tìm kiếm.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{tickets.map((t) => <tr key={t.id}><td><strong>{t.ticketCode}</strong></td><td><strong>{t.customerName}</strong><span>KH#{t.customerId}</span></td><td>{t.device}</td><td>{new Date(`${t.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td>{t.technicianName || "Chưa phân công"}</td><td><span className="appointment-status">{t.status}</span></td><td><button className="secondary-button" type="button" onClick={() => openEdit(t)}>Cập nhật</button></td></tr>)}</tbody></table></div>}
                </section>
            )}
        </main>
    );
}

export default AdminRepairs;
