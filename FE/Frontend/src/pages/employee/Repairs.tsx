import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getMyAssignedRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import type { RepairTicket } from "../../types/repairTicket";

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể xử lý phiếu sửa chữa.";
const statusLabel = (status: string) => status === "Khách từ chối" ? "Khách đã từ chối" : status;

function EmployeeRepairs() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [paidByTicket, setPaidByTicket] = useState<Record<number, boolean>>({});
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async (term?: string) => {
        setLoading(true);
        setError("");
        try {
            const assigned = await getMyAssignedRepairTicketsApi(term);
            const paymentStates = await Promise.all(assigned.map(async (ticket) => {
                try {
                    const payments = await getRepairPaymentsApi(ticket.id);
                    return [ticket.id, payments.some((payment) => payment.status === "PAID")] as const;
                } catch (e: any) {
                    if (e.response?.status === 404) return [ticket.id, false] as const;
                    throw e;
                }
            }));
            setTickets(assigned);
            setPaidByTicket(Object.fromEntries(paymentStates));
        }
        catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const updateStatus = async (ticket: RepairTicket, status: string, nextPath?: string) => {
        setSavingId(ticket.id);
        setError("");
        setNotice("");
        try {
            await updateRepairTicketApi(ticket.id, {
                customerId: ticket.customerId,
                device: ticket.device,
                receivedDate: ticket.receivedDate,
                status,
                technicianId: ticket.technicianId,
            });
            if (nextPath) {
                navigate(`${nextPath}?ticketId=${ticket.id}`);
                return;
            }
            setNotice(`Đã cập nhật phiếu ${ticket.ticketCode}.`);
            await load(keyword);
        } catch (e: any) { setError(messageOf(e)); }
        finally { setSavingId(null); }
    };

    const nextAction = (ticket: RepairTicket) => {
        if (ticket.status === "Đã tiếp nhận") {
            return <button className="primary-button" type="button" disabled={savingId === ticket.id} onClick={() => void updateStatus(ticket, "Đang kiểm tra", "/employee/diagnosis")}>{savingId === ticket.id ? "Đang mở..." : "Chẩn đoán"}</button>;
        }
        if (["Đã nhận", "Đang kiểm tra"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/diagnosis?ticketId=${ticket.id}`)}>Tiếp tục chẩn đoán</button>;
        }
        if (["Đã kiểm tra", "Chờ báo giá"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/quotes?ticketId=${ticket.id}`)}>Lập báo giá</button>;
        }
        if (["Đã báo giá", "Chờ khách xác nhận", "Chờ xác nhận báo giá"].includes(ticket.status)) {
            return <span>Đã gửi báo giá · chờ khách phản hồi</span>;
        }
        if (ticket.status === "Đang sửa") {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/repair-process?ticketId=${ticket.id}`)}>Thực hiện sửa chữa</button>;
        }
        if (ticket.status === "Chờ thanh toán") {
            if (!paidByTicket[ticket.id]) return <span>Chờ khách thanh toán và nhân viên xác nhận</span>;
            return <button className="secondary-button" type="button" disabled={savingId === ticket.id} onClick={() => void updateStatus(ticket, "Đã kết thúc")}>{savingId === ticket.id ? "Đang kết thúc..." : "Kết thúc"}</button>;
        }
        if (ticket.status === "Khách từ chối" || ticket.status === "Khách đã từ chối") {
            return <button className="secondary-button" type="button" disabled={savingId === ticket.id} onClick={() => void updateStatus(ticket, "Đã kết thúc")}>{savingId === ticket.id ? "Đang kết thúc..." : "Kết thúc"}</button>;
        }
        return <span>{["Hoàn thành", "Đã kết thúc", "Đã hủy"].includes(ticket.status) ? "Đã kết thúc" : "—"}</span>;
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Phiếu sửa chữa</h1><p>Danh sách phiếu được giao cho bạn. Tiếp nhận phiếu rồi chuyển sang chẩn đoán thiết bị.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <form className="appointment-search-panel" onSubmit={(e: FormEvent) => { e.preventDefault(); void load(keyword); }}><div className="appointment-form-group"><label htmlFor="employee-ticket-search">Tìm phiếu</label><input id="employee-ticket-search" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mã phiếu, tên hoặc số điện thoại khách" /></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setKeyword(""); void load(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>Tìm phiếu</button></div></form>
        <div className="appointment-results-heading"><div><h2>Phiếu được phân công</h2><p>{loading ? "Đang tải..." : `${tickets.length} phiếu`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải phiếu...</div> : tickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu được giao cho bạn</h2><p>Phiếu sẽ xuất hiện tại đây sau khi được phân công.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Trạng thái</th><th>Bước tiếp theo</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><strong>{ticket.ticketCode}</strong></td><td><strong>{ticket.customerName}</strong><span>KH#{ticket.customerId}</span></td><td>{ticket.device}</td><td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td><span className="appointment-status">{statusLabel(ticket.status)}</span></td><td>{nextAction(ticket)}</td></tr>)}</tbody></table></div>}
    </main>;
}

export default EmployeeRepairs;
