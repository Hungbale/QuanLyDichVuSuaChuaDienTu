import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyAssignedRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import type { RepairTicket } from "../../types/repairTicket";

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể cập nhật tiến độ sửa chữa.";

function EmployeeRepairProcess() {
    const [searchParams] = useSearchParams();
    const requestedTicketId = Number(searchParams.get("ticketId"));
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try { setTickets(await getMyAssignedRepairTicketsApi()); }
        catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const complete = async (ticket: RepairTicket) => {
        setSavingId(ticket.id);
        setError("");
        setNotice("");
        try {
            await updateRepairTicketApi(ticket.id, {
                customerId: ticket.customerId,
                device: ticket.device,
                receivedDate: ticket.receivedDate,
                status: "Chờ thanh toán",
                technicianId: ticket.technicianId,
            });
            setNotice(`Đã hoàn tất sửa chữa phiếu ${ticket.ticketCode}. Phiếu chờ xác nhận thanh toán trước khi kết thúc.`);
            await load();
        } catch (e: any) { setError(messageOf(e)); }
        finally { setSavingId(null); }
    };

    const activeTickets = tickets.filter((ticket) => ticket.status === "Đang sửa");
    const requestedTicketIsActive = !requestedTicketId || activeTickets.some((ticket) => ticket.id === requestedTicketId);

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Thực hiện sửa chữa</h1><p>Hoàn tất công việc sửa chữa để chuyển phiếu sang chờ thanh toán. Sau khi xác nhận khách đã thanh toán, bạn có thể kết thúc phiếu tại mục Phiếu sửa chữa.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-panel diagnosis-note"><strong>Tiến độ sửa chữa</strong><p>Trang này hiển thị các phiếu khách đã chấp nhận báo giá. Hoàn tất sửa chữa sẽ chuyển phiếu sang chờ thanh toán; phiếu chỉ kết thúc sau khi nhân viên xác nhận đã nhận đủ tiền.</p></div>
        {requestedTicketId > 0 && !loading && !requestedTicketIsActive && <div className="error-message" role="alert">Phiếu này chưa được khách xác nhận hoặc đã chuyển sang bước khác.</div>}
        <div className="appointment-results-heading"><div><h2>Phiếu đang sửa</h2><p>{loading ? "Đang tải..." : `${activeTickets.length} phiếu`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải công việc...</div> : activeTickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu đang sửa</h2><p>Khi khách xác nhận báo giá, phiếu sẽ xuất hiện tại đây.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{activeTickets.map((ticket) => <tr key={ticket.id} className={ticket.id === requestedTicketId ? "diagnosis-highlight-row" : undefined}><td><strong>{ticket.ticketCode}</strong></td><td>{ticket.customerName}</td><td>{ticket.device}</td><td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td><span className="appointment-status">{ticket.status}</span></td><td><button className="primary-button" type="button" disabled={savingId === ticket.id} onClick={() => void complete(ticket)}>{savingId === ticket.id ? "Đang lưu..." : "Hoàn tất sửa chữa"}</button></td></tr>)}</tbody></table></div>}
    </main>;
}

export default EmployeeRepairProcess;
