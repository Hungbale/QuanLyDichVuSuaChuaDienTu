import { useEffect, useState } from "react";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairHistoryEntry } from "../../types/repairTicket";

function RepairTracking() {
    const [items, setItems] = useState<RepairHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getMyRepairHistoryApi().then(setItems).catch((e: any) => setError(e.response?.data?.message || e.response?.data?.error || "Không thể tải tiến trình sửa chữa.")).finally(() => setLoading(false));
    }, []);

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Theo dõi sửa chữa</h1><p>Cập nhật trạng thái các thiết bị đang được kiểm tra hoặc sửa chữa.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}
        {loading ? <div className="appointment-panel table-state">Đang tải tiến trình sửa chữa...</div> : items.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có thiết bị đang sửa chữa</h2><p>Khi thiết bị được tiếp nhận, tiến trình sẽ hiển thị tại đây.</p></div> : <div className="repair-progress-list">{items.map((item) => <article className="appointment-panel repair-progress-card" key={item.ticketCode}><div className="appointment-card-top"><div><span className="appointment-card-reference">{item.ticketCode}</span><h2>{item.device}</h2></div><span className="appointment-status">{item.status}</span></div><div className="appointment-details-grid"><div><span>Dịch vụ / hạng mục</span><strong>{item.service || "Đang chờ kiểm tra và báo giá"}</strong></div><div><span>Ngày hoàn tất</span><strong>{item.completedDate ? new Date(`${item.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa hoàn thành"}</strong></div></div></article>)}</div>}
    </main>;
}

export default RepairTracking;
