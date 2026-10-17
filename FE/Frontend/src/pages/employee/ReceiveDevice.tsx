import { useEffect, useState, type FormEvent } from "react";
import { createRepairTicketApi } from "../../api/repairTicketApi";
import { getCustomersApi } from "../../api/customerApi";
import { getMyEmployeeProfileApi } from "../../api/employeeApi";
import type { Customer } from "../../types/customer";
import type { RepairTicketRequest } from "../../types/repairTicket";

function EmployeeReceiveDevice() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [customerId, setCustomerId] = useState("");
    const [device, setDevice] = useState("");
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        Promise.all([getCustomersApi(), getMyEmployeeProfileApi()])
            .then(([customerList, employee]) => { setCustomers(customerList); setEmployeeId(employee.id); })
            .catch((e: any) => setError(e.response?.data?.message || e.response?.data?.error || "Không thể tải dữ liệu tiếp nhận."));
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        if (employeeId == null) { setError("Không tải được thông tin nhân viên để phân công phiếu."); setSaving(false); return; }
        const payload: RepairTicketRequest = { customerId: Number(customerId), device: device.trim(), receivedDate, status: "Đã tiếp nhận", technicianId: employeeId };
        try {
            const ticket = await createRepairTicketApi(payload);
            setNotice(`Đã tiếp nhận thiết bị. Mã phiếu: ${ticket.ticketCode}`);
            setCustomerId(""); setDevice(""); setReceivedDate(new Date().toISOString().slice(0, 10));
        } catch (e: any) { setError(e.response?.data?.message || e.response?.data?.error || "Không thể tạo phiếu sửa chữa."); }
        finally { setSaving(false); }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Tiếp nhận thiết bị</h1><p>Ghi nhận thông tin khách hàng và thiết bị để tạo phiếu sửa chữa.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <form className="appointment-panel ticket-editor" onSubmit={submit}><div className="appointment-card-top"><div><span className="appointment-card-reference">PHIẾU MỚI</span><h2>Thông tin tiếp nhận</h2></div></div><div className="appointment-form-grid">
            <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-customer">Khách hàng</label><select id="receive-customer" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Chọn khách hàng</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.customerCode} · {c.fullName} · {c.phone}</option>)}</select></div>
            <div className="appointment-form-group"><label htmlFor="receive-device">Thiết bị</label><input id="receive-device" required maxLength={200} value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Ví dụ: Laptop Dell Inspiron 15" /></div>
            <div className="appointment-form-group"><label htmlFor="receive-date">Ngày tiếp nhận</label><input id="receive-date" type="date" required value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} /></div>
            <div className="appointment-form-group appointment-form-full"><label>Trạng thái ban đầu</label><input value="Đã tiếp nhận" readOnly /></div>
        </div><div className="appointment-search-actions"><button className="primary-button" type="submit" disabled={saving || customers.length === 0 || employeeId == null}>{saving ? "Đang tạo phiếu..." : "Tạo phiếu tiếp nhận"}</button></div></form>
    </main>;
}

export default EmployeeReceiveDevice;
