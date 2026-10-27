import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getMyAssignedRepairTicketsApi, getRepairTicketApi, getRepairTicketHistoryApi } from "../../api/repairTicketApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairDiagnosisApi } from "../../api/repairDiagnosisApi";
import { getRepairIntakeApi } from "../../api/repairIntakeApi";
import { getRepairTrackingApi } from "../../api/repairTrackingApi";
import type { RepairTicket, RepairTicketActivity } from "../../types/repairTicket";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairIntakeReceipt } from "../../types/repairIntake";
import type { RepairTrackingDetails } from "../../types/repairTracking";
import { repairActivityLabel } from "../../utils/repairActivityLabel";
import { repairTrackingTitle } from "../../utils/repairTrackingTitle";
import { statusLabel as translateStatus } from "../../utils/statusLabel";

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể xử lý phiếu sửa chữa.";
const statusLabel = (status: string) => ({
    RECEIVED: "Đã tiếp nhận",
    SCHEDULED: "Chờ tiếp nhận",
    CUSTOMER_DECLINED: "Khách đã từ chối",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
}[status] || (status === "Khách từ chối" ? "Khách đã từ chối" : translateStatus(status)));

function EmployeeRepairs() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [paymentsByTicket, setPaymentsByTicket] = useState<Record<number, RepairPayment[]>>({});
    const [quotesByTicket, setQuotesByTicket] = useState<Record<number, RepairQuote>>({});
    const [diagnosedTickets, setDiagnosedTickets] = useState<Record<number, boolean>>({});
    const [keyword, setKeyword] = useState("");
    const [activeTab, setActiveTab] = useState<"current" | "past">("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async (term?: string) => {
        setLoading(true);
        setError("");
        try {
            const assigned = await getMyAssignedRepairTicketsApi(term);
            const paymentStates = await Promise.all(assigned.map(async (ticket) => {
                try {
                    const payments = await getRepairPaymentsApi(ticket.id);
                    return [ticket.id, payments] as const;
                } catch (e: any) {
                    if (e.response?.status === 404) return [ticket.id, []] as const;
                    throw e;
                }
            }));
            const quoteStates = await Promise.all(assigned.map(async (ticket) => {
                try {
                    const quote = await getRepairQuoteApi(ticket.id);
                    return [ticket.id, quote] as const;
                } catch (e: any) {
                    if (e.response?.status === 404) return null;
                    throw e;
                }
            }));
            const diagnosisStates = await Promise.all(assigned.map(async (ticket) => {
                try {
                    await getRepairDiagnosisApi(ticket.id);
                    return [ticket.id, true] as const;
                } catch (e: any) {
                    if (e.response?.status === 404) return [ticket.id, false] as const;
                    throw e;
                }
            }));
            setTickets([...assigned].sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || b.id - a.id));
            setPaymentsByTicket(Object.fromEntries(paymentStates));
            setQuotesByTicket(Object.fromEntries(quoteStates.filter((entry): entry is readonly [number, RepairQuote] => entry !== null)));
            setDiagnosedTickets(Object.fromEntries(diagnosisStates));
        }
        catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const [detailTicket, setDetailTicket] = useState<RepairTicket | null>(null);
    const [detailQuote, setDetailQuote] = useState<RepairQuote | null>(null);
    const [detailIntake, setDetailIntake] = useState<RepairIntakeReceipt | null>(null);
    const [detailDiagnosis, setDetailDiagnosis] = useState<{ result: string; proposal: string } | null>(null);
    const [detailActivities, setDetailActivities] = useState<RepairTicketActivity[]>([]);
    const [detailTracking, setDetailTracking] = useState<RepairTrackingDetails | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const showDetails = async (ticket: RepairTicket) => {
        setDetailTicket(ticket);
        setDetailQuote(null);
        setDetailIntake(null);
        setDetailDiagnosis(null);
        setDetailActivities([]);
        setDetailTracking(null);
        setDetailLoading(true);
        try {
            const diagnosisPromise = getRepairDiagnosisApi(ticket.id).catch((e: any) => {
                if (e.response?.status === 404) return null;
                throw e;
            });
            const quotePromise = getRepairQuoteApi(ticket.id).catch((e: any) => {
                if (e.response?.status === 404) return null;
                throw e;
            });
            const intakePromise = getRepairIntakeApi(ticket.id).catch((e: any) => {
                if (e.response?.status === 404) return null;
                throw e;
            });
            const [diagnosis, quote, intake, latestTicket, activities, tracking] = await Promise.all([
                diagnosisPromise,
                quotePromise,
                intakePromise,
                getRepairTicketApi(ticket.id),
                getRepairTicketHistoryApi(ticket.id),
                getRepairTrackingApi(ticket.id).catch((e: any) => {
                    if (e.response?.status === 404) return null;
                    throw e;
                }),
            ]);
            setDetailDiagnosis(diagnosis ? { result: diagnosis.diagnosisResult, proposal: diagnosis.repairProposal } : null);
            setDetailQuote(quote);
            setDetailIntake(intake);
            setDetailTicket(latestTicket);
            setDetailActivities(activities);
            setDetailTracking(tracking);
        } catch (e: any) {
            setError(messageOf(e));
        } finally {
            setDetailLoading(false);
        }
    };

    const nextAction = (ticket: RepairTicket) => {
        // Terminal ticket status must take precedence over an accepted quote.
        if (["COMPLETED", "Hoàn thành", "Đã kết thúc", "CANCELLED", "Đã hủy", "CUSTOMER_DECLINED", "Khách từ chối", "Khách đã từ chối"].includes(ticket.status)) {
            return <span>{ticket.status === "CUSTOMER_DECLINED" || ticket.status === "Khách từ chối" || ticket.status === "Khách đã từ chối" ? "Đã kết thúc · khách từ chối" : "Đã kết thúc"}</span>;
        }
        // Prefer the persisted quote record if ticket status is stale in a list response.
        const quote = quotesByTicket[ticket.id];
        if (quote) {
            if (quote.status === "REJECTED") {
                return <span>Khách đã từ chối báo giá</span>;
            }
            if (quote.status === "ACCEPTED") {
                return <button className="primary-button" type="button" onClick={() => navigate(`/employee/repair-process?ticketId=${ticket.id}`)}>Thực hiện sửa chữa</button>;
            }
            return <span>Đã gửi báo giá · chờ khách phản hồi</span>;
        }
        if (diagnosedTickets[ticket.id]) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/quotes?ticketId=${ticket.id}`)}>Lập báo giá</button>;
        }
        if (["SCHEDULED", "Đã lên lịch", "Chờ tiếp nhận"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/receive-device?ticketId=${ticket.id}`)}>Tiếp nhận thiết bị</button>;
        }
        if (["RECEIVED", "Đã tiếp nhận"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/diagnosis?ticketId=${ticket.id}`)}>Chẩn đoán</button>;
        }
        if (["RECEIVED", "DIAGNOSING", "Đã nhận", "Đang kiểm tra"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/diagnosis?ticketId=${ticket.id}`)}>Tiếp tục chẩn đoán</button>;
        }
        if (["Đã kiểm tra", "Chờ báo giá", "Đã báo giá"].includes(ticket.status)) {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/quotes?ticketId=${ticket.id}`)}>Lập báo giá</button>;
        }
        if (["Đã báo giá", "Chờ khách xác nhận", "Chờ xác nhận báo giá"].includes(ticket.status)) {
            return <span>Đã gửi báo giá · chờ khách phản hồi</span>;
        }
        if (ticket.status === "Đang sửa") {
            return <button className="primary-button" type="button" onClick={() => navigate(`/employee/repair-process?ticketId=${ticket.id}`)}>Thực hiện sửa chữa</button>;
        }
        return <span>{["COMPLETED", "Hoàn thành", "Đã hủy", "CANCELLED", "Khách từ chối", "Khách đã từ chối", "CUSTOMER_DECLINED"].includes(ticket.status) ? "Đã kết thúc" : "—"}</span>;
    };

    const isPastTicket = (ticket: RepairTicket) => ["COMPLETED", "Hoàn thành", "Đã kết thúc", "CANCELLED", "Đã hủy", "CUSTOMER_DECLINED", "Khách từ chối", "Khách đã từ chối"].includes(ticket.status);
    const periodTickets = tickets.filter((ticket) => activeTab === "past" ? isPastTicket(ticket) : !isPastTicket(ticket));
    const statusOptions = [...new Set(periodTickets.map((ticket) => ticket.status))];
    const visibleTickets = periodTickets.filter((ticket) => statusFilter === "ALL" || ticket.status === statusFilter)
        .filter((ticket) => !keyword.trim() || [ticket.ticketCode, ticket.customerName, ticket.device, ticket.status].some((value) => value.toLocaleLowerCase("vi").includes(keyword.trim().toLocaleLowerCase("vi"))));

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Phiếu sửa chữa</h1><p>Danh sách phiếu được giao cho bạn. Tiếp nhận phiếu rồi chuyển sang chẩn đoán thiết bị.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}
        <form className="appointment-search-panel" onSubmit={(e: FormEvent) => { e.preventDefault(); void load(keyword); }}><div className="appointment-form-group"><label htmlFor="employee-ticket-search">Tìm phiếu</label><input id="employee-ticket-search" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mã phiếu, tên hoặc số điện thoại khách" /></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setKeyword(""); void load(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>Tìm phiếu</button></div></form>
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại phiếu sửa chữa"><button className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "current"} onClick={() => setActiveTab("current")}>Hiện tại <span>{tickets.filter((ticket) => !isPastTicket(ticket)).length}</span></button><button className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "past"} onClick={() => setActiveTab("past")}>Đã qua <span>{tickets.filter(isPastTicket).length}</span></button></div>
        <div className="appointment-filter-row"><label htmlFor="employee-ticket-status">Lọc trạng thái</label><select id="employee-ticket-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{statusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
        <div className="appointment-results-heading"><div><h2>Phiếu {activeTab === "current" ? "hiện tại" : "đã qua"}</h2><p>{loading ? "Đang tải..." : `${visibleTickets.length} phiếu`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải phiếu...</div> : visibleTickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>{activeTab === "current" ? "Không có phiếu hiện tại phù hợp" : "Chưa có phiếu đã qua phù hợp"}</h2></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleTickets.map((ticket) => <tr key={ticket.id}><td><strong>{ticket.ticketCode}</strong></td><td><strong>{ticket.customerName}</strong><span>KH#{ticket.customerId}</span></td><td>{ticket.device}</td><td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td><span className="appointment-status">{statusLabel(ticket.status)}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => void showDetails(ticket)}>Chi tiết</button>{nextAction(ticket)}</div></td></tr>)}</tbody></table></div>}
        {detailTicket && <div className="repair-detail-backdrop" role="presentation" onClick={() => setDetailTicket(null)}><section className="appointment-panel repair-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="repair-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">{detailTicket.ticketCode}</span><h2 id="repair-detail-title">Chi tiết phiếu sửa chữa</h2><p>{detailTicket.device}</p></div><button className="secondary-button" type="button" onClick={() => setDetailTicket(null)}>Đóng</button></div>
            <div className="appointment-details-grid"><div><span>Khách hàng</span><strong>{detailTicket.customerName} · KH#{detailTicket.customerId}</strong></div><div><span>Kỹ thuật viên</span><strong>{detailTicket.technicianName || "Chưa phân công"}</strong></div><div><span>Ngày nhận</span><strong>{new Date(`${detailTicket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div><span>Trạng thái</span><strong>{statusLabel(detailTicket.status)}</strong></div></div>
            <section className="repair-detail-section"><h3>Chi tiết tiếp nhận thiết bị</h3>{detailLoading ? <p>Đang tải biên nhận...</p> : detailIntake ? <><p><strong>Thời gian tiếp nhận:</strong> {new Date(detailIntake.receivedAt).toLocaleString("vi-VN")}</p><p><strong>Người tiếp nhận:</strong> {detailIntake.receivedBy}</p><p><strong>Số serial:</strong> {detailIntake.serialNumber || "Không ghi nhận"}</p><p><strong>Tình trạng ban đầu:</strong> {detailIntake.appearanceCondition}</p><p><strong>Phụ kiện đi kèm:</strong> {detailIntake.includedAccessories || "Không ghi nhận"}</p><p><strong>Lỗi khách phản ánh:</strong> {detailIntake.customerReportedIssue || "Không ghi nhận"}</p><p><strong>Ghi chú:</strong> {detailIntake.intakeNote || "Không có"}</p></> : <p>Phiếu chưa có biên nhận tiếp nhận.</p>}</section>
            <section className="repair-detail-section"><h3>Chẩn đoán & đề xuất sửa chữa</h3>{detailDiagnosis ? <><p><strong>Kết quả:</strong> {detailDiagnosis.result}</p><p><strong>Đề xuất:</strong> {detailDiagnosis.proposal}</p></> : <p>Phiếu chưa có chẩn đoán được lưu trên hệ thống.</p>}</section>
            <section className="repair-detail-section"><h3>Báo giá</h3>{detailLoading ? <p>Đang tải báo giá...</p> : detailQuote ? <><p><strong>{detailQuote.quoteCode}</strong> · {detailQuote.status === "ACCEPTED" ? "Khách đã xác nhận" : detailQuote.status === "REJECTED" ? "Khách từ chối" : "Chờ khách xác nhận"}</p><ul>{detailQuote.items.map((item) => <li key={item.id}>{item.name} × {item.quantity} — {new Intl.NumberFormat("vi-VN").format(item.lineTotal)} ₫</li>)}</ul><p><strong>Tổng báo giá: {new Intl.NumberFormat("vi-VN").format(detailQuote.totalAmount)} ₫</strong></p></> : <p>Phiếu chưa có báo giá.</p>}</section>
            <section className="repair-detail-section"><h3>Thanh toán</h3>{(paymentsByTicket[detailTicket.id] || []).length ? (paymentsByTicket[detailTicket.id] || []).map((payment) => <p key={payment.id}>{payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"} · {new Intl.NumberFormat("vi-VN").format(payment.amount)} ₫ · {payment.status === "PAID" ? "Đã xác nhận thanh toán" : "Chờ xác nhận"}</p>) : <p>Chưa có yêu cầu thanh toán.</p>}</section>
            <section className="repair-detail-section"><h3>Lịch sử xử lý từ hệ thống</h3>{detailTracking?.timeline.length ? <ol className="repair-timeline">{detailTracking.timeline.map((event, index) => {
                const update = detailTracking.updates.find((item) => item.createdAt === event.createdAt && item.status === event.details);
                const photos = event.type === "DEVICE_RECEIVED" ? detailIntake?.photos || [] : update?.photos || [];
                return <li className="repair-timeline-event" key={`${event.type}-${index}`}><span className="repair-timeline-marker" aria-hidden="true" /><div className="repair-timeline-content"><div className="repair-timeline-heading"><h4>{repairTrackingTitle(event.type, event.details)}</h4><time>{new Date(event.createdAt).toLocaleString("vi-VN")}</time></div>{event.details && event.type !== "STATUS_UPDATED" && <p>{event.details}</p>}{event.note && <p>{event.note}</p>}{event.actorName && <small>Thực hiện bởi: {event.actorName}</small>}{photos.length > 0 && <div className="repair-timeline-photos">{photos.map((photo, photoIndex) => <a key={`${event.type}-${photo.fileName}-${photoIndex}`} href={photo.dataUri} target="_blank" rel="noreferrer"><img src={photo.dataUri} alt={`Ảnh minh chứng ${photoIndex + 1}`} loading="lazy" /></a>)}</div>}</div></li>;
            })}</ol> : detailActivities.length ? <ol className="repair-timeline">{detailActivities.map((activity) => <li className="repair-timeline-event" key={activity.id}><span className="repair-timeline-marker" aria-hidden="true" /><div className="repair-timeline-content"><div className="repair-timeline-heading"><h4>{repairActivityLabel(activity)}</h4><time>{new Date(activity.createdAt).toLocaleString("vi-VN")}</time></div>{activity.note && <p>{activity.note}</p>}{activity.employeeName && <small>Thực hiện bởi: {activity.employeeName}</small>}</div></li>)}</ol> : <p>Chưa có hoạt động được ghi nhận.</p>}</section>
        </section></div>}
    </main>;
}

export default EmployeeRepairs;
