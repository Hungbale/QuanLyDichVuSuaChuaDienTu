import { useEffect, useState } from "react";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairHistoryEntry } from "../../types/repairTicket";

function RepairHistory() {
    const [items, setItems] = useState<RepairHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getMyRepairHistoryApi().then(setItems).catch((e: any) => setError(e.response?.data?.message || e.response?.data?.error || "Không thể tải lịch sử sửa chữa của bạn.")).finally(() => setLoading(false));
    }, []);

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Lịch sử sửa chữa</h1><p>Xem các thiết bị đã tiếp nhận, dịch vụ thực hiện và chi phí sửa chữa.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="appointment-results-heading"><div><h2>Các phiếu của tôi</h2><p>{loading ? "Đang tải..." : `${items.length} phiếu sửa chữa`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải lịch sử sửa chữa...</div> : items.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có lịch sử sửa chữa</h2><p>Các phiếu sửa chữa của bạn sẽ xuất hiện tại đây.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Thiết bị</th><th>Dịch vụ thực hiện</th><th>Ngày hoàn thành</th><th>Chi phí</th><th>Trạng thái</th></tr></thead><tbody>{items.map((item) => <tr key={item.ticketCode}><td><strong>{item.ticketCode}</strong></td><td>{item.device}</td><td>{item.service || "Chưa có thông tin dịch vụ"}</td><td>{item.completedDate ? new Date(`${item.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</td><td>{item.cost == null ? "—" : `${new Intl.NumberFormat("vi-VN").format(item.cost)} ₫`}</td><td><span className="appointment-status">{item.status}</span></td></tr>)}</tbody></table></div>}
    </main>;
}

export default RepairHistory;
