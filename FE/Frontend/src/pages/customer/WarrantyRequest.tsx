import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createWarrantyRequestApi, getMyWarrantyRequestsApi } from "../../api/warrantyRequestApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairHistoryEntry } from "../../types/repairTicket";
import type { WarrantyRequest as WarrantyRequestRecord } from "../../types/warrantyRequest";
import { statusLabel } from "../../utils/statusLabel";

const isCompleted = (status: string) => ["COMPLETED", "HOÀN THÀNH", "ĐÃ HOÀN THÀNH"].includes(status.trim().toLocaleUpperCase("vi"));
const isOpenRequest = (status: string) => ["PENDING", "APPROVED"].includes(status.toUpperCase());
const messageOf = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        return body?.message || body?.error || "Không thể tải hoặc gửi yêu cầu bảo hành. Vui lòng thử lại.";
    }
    return "Đã xảy ra lỗi khi xử lý yêu cầu bảo hành. Vui lòng thử lại.";
};
const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });

function WarrantyRequest() {
    const [tickets, setTickets] = useState<RepairHistoryEntry[]>([]);
    const [requests, setRequests] = useState<WarrantyRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTab, setActiveTab] = useState<"eligible" | "requests">("eligible");
    const [selectedRequest, setSelectedRequest] = useState<WarrantyRequestRecord | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [history, myRequests] = await Promise.all([getMyRepairHistoryApi(), getMyWarrantyRequestsApi()]);
            setTickets(history.filter((ticket) => isCompleted(ticket.status))
                .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || "")));
            setRequests(myRequests);
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const requestsByTicket = useMemo(() => {
        const groups = requests.reduce<Record<number, WarrantyRequestRecord[]>>((result, request) => {
            (result[request.repairTicketId] ||= []).push(request);
            return result;
        }, {});
        Object.values(groups).forEach((items) => items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        return groups;
    }, [requests]);
    const eligibleTickets = useMemo(
        () => tickets.filter((ticket) => !(requestsByTicket[ticket.ticketId]?.length)),
        [tickets, requestsByTicket],
    );
    const openForm = (ticketId: number) => {
        setActiveTicketId(ticketId);
        setReason("");
        setDescription("");
        setAttachment(null);
        setError("");
        setNotice("");
    };
    const closeForm = () => {
        if (savingId !== null) return;
        setActiveTicketId(null);
        setReason("");
        setDescription("");
        setAttachment(null);
        setError("");
    };

    const selectAttachment = (file?: File) => {
        setError("");
        if (!file) { setAttachment(null); return; }
        if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
            setAttachment(null);
            setError("Tệp đính kèm chỉ nhận ảnh JPG, PNG hoặc PDF hợp lệ.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAttachment(null);
            setError("Tệp đính kèm không được vượt quá 5 MB.");
            return;
        }
        setAttachment(file);
    };

    const submit = async (ticket: RepairHistoryEntry) => {
        const trimmedReason = reason.trim();
        const trimmedDescription = description.trim();
        if (!trimmedReason) { setError("Vui lòng nhập nội dung lỗi cần bảo hành."); return; }
        if (trimmedReason.length > 2000 || trimmedDescription.length > 2000) {
            setError("Nội dung và mô tả không được vượt quá 2.000 ký tự.");
            return;
        }

        setSavingId(ticket.ticketId);
        setError("");
        setNotice("");
        try {
            const created = await createWarrantyRequestApi({
                ticketCode: ticket.ticketCode,
                reason: trimmedReason,
                ...(trimmedDescription ? { description: trimmedDescription } : {}),
                ...(attachment ? { attachment } : {}),
            });
            setRequests((current) => [created, ...current]);
            setNotice(`Đã gửi yêu cầu bảo hành cho phiếu ${created.ticketCode}.`);
            setActiveTicketId(null);
            setReason("");
            setDescription("");
            setAttachment(null);
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        } finally {
            setSavingId(null);
        }
    };

    return <main className="management-page appointment-page sprint8-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Yêu cầu bảo hành</h1><p>Gửi lỗi phát sinh trên phiếu đã hoàn thành và theo dõi kết quả xử lý.</p></header>
        {error && activeTicketId === null && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại yêu cầu bảo hành">
            <button className={activeTab === "eligible" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "eligible"} onClick={() => { setActiveTab("eligible"); setActiveTicketId(null); }}>Phiếu đã hoàn thành <span>{eligibleTickets.length}</span></button>
            <button className={activeTab === "requests" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "requests"} onClick={() => { setActiveTab("requests"); setActiveTicketId(null); }}>Yêu cầu đã gửi <span>{requests.length}</span></button>
        </div>
        <div className="appointment-results-heading"><div><h2>{activeTab === "eligible" ? "Chọn phiếu cần bảo hành" : "Lịch sử yêu cầu bảo hành"}</h2><p>{loading ? "Đang tải..." : `${activeTab === "eligible" ? tickets.length : requests.length} mục`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải phiếu và yêu cầu bảo hành...</div> : activeTab === "eligible" ? tickets.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu sửa chữa hoàn thành</h2><p>Phiếu đủ điều kiện gửi bảo hành sẽ xuất hiện tại đây.</p></div>
        ) : <div className="sprint8-card-list">{eligibleTickets.map((ticket) => {
            const ticketRequests = requestsByTicket[ticket.ticketId] || [];
            const latest = ticketRequests[0];
            const blocked = ticketRequests.some((request) => isOpenRequest(request.status));
            return <article className="appointment-panel sprint8-feature-card" key={ticket.ticketId}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{ticket.ticketCode}</span><h2>{ticket.device}</h2><p>{ticket.service || ticket.bookedService || "Dịch vụ sửa chữa"} · Hoàn thành {ticket.completedDate ? new Date(`${ticket.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</p>{ticket.completedDate && <small className="warranty-policy-note">Thời hạn mặc định: 30 ngày từ ngày hoàn thành; Backend sẽ xác nhận điều kiện khi gửi.</small>}</div>
                    {latest ? <span className={`appointment-status ${latest.status.toLowerCase()}`}>{statusLabel(latest.status)}</span> : <span className="appointment-status completed">Đã hoàn thành</span>}
                </div>
                {latest && <div className="warranty-request-summary"><strong>{latest.reason}</strong>{latest.resolutionNote && <p>{latest.resolutionNote}</p>}<small>Gửi lúc {formatDate(latest.createdAt)}</small></div>}
                <div className="appointment-search-actions">{blocked ? <span className="warranty-open-note">Yêu cầu đang chờ xử lý; chưa thể tạo yêu cầu mới.</span> : <button className="primary-button" type="button" onClick={() => openForm(ticket.ticketId)}>Gửi yêu cầu bảo hành</button>}</div>
                {activeTicketId === ticket.ticketId && <div className="repair-detail-backdrop" role="presentation" onClick={closeForm}>
                    <section className="appointment-panel repair-detail-dialog sprint8-warranty-dialog" role="dialog" aria-modal="true" aria-labelledby={`warranty-form-title-${ticket.ticketId}`} onClick={(event) => event.stopPropagation()}>
                        <div className="appointment-card-top"><div><span className="appointment-card-reference">{ticket.ticketCode}</span><h2 id={`warranty-form-title-${ticket.ticketId}`}>Gửi yêu cầu bảo hành</h2><p>{ticket.device}</p></div><button className="secondary-button" type="button" onClick={closeForm} disabled={savingId === ticket.ticketId}>Đóng</button></div>
                        {error && <div className="error-message" role="alert">{error}</div>}
                        <form className="sprint8-warranty-form" onSubmit={(event) => { event.preventDefault(); void submit(ticket); }}>
                            <div className="appointment-form-group"><label htmlFor={`warranty-reason-${ticket.ticketId}`}>Nội dung lỗi <span aria-hidden="true">*</span></label><textarea id={`warranty-reason-${ticket.ticketId}`} required maxLength={2000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả lỗi cần kiểm tra bảo hành..." /><small>{reason.length}/2000 ký tự</small></div>
                            <div className="appointment-form-group"><label htmlFor={`warranty-description-${ticket.ticketId}`}>Mô tả chi tiết</label><textarea id={`warranty-description-${ticket.ticketId}`} maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Thời điểm xảy ra, tình trạng thiết bị..." /><small>{description.length}/2000 ký tự</small></div>
                            <div className="appointment-form-group"><label htmlFor={`warranty-file-${ticket.ticketId}`}>Ảnh hoặc tài liệu minh chứng <span>(không bắt buộc, JPG/PNG/PDF, tối đa 5 MB)</span></label><input id={`warranty-file-${ticket.ticketId}`} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => selectAttachment(event.target.files?.[0])} />{attachment && <small>Đã chọn: {attachment.name}</small>}</div>
                            <button className="primary-button" type="submit" disabled={savingId === ticket.ticketId}>{savingId === ticket.ticketId ? "Đang gửi..." : "Gửi yêu cầu"}</button>
                        </form>
                    </section>
                </div>}
            </article>;
        })}</div> : requests.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Bạn chưa gửi yêu cầu bảo hành</h2><p>Các yêu cầu đã gửi sẽ hiển thị trạng thái và phản hồi tại đây.</p></div>
        ) : <div className="sprint8-card-list">{requests.map((request) => <article className="appointment-panel sprint8-feature-card" key={request.id}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">{request.ticketCode}</span><h2>{request.device}</h2><p>{request.serviceName || "Dịch vụ sửa chữa"} · Gửi lúc {formatDate(request.createdAt)}</p></div><span className={`appointment-status ${request.status.toLowerCase()}`}>{statusLabel(request.status)}</span></div>
            <div className="warranty-request-summary"><strong>{request.reason}</strong>{request.description && <p>{request.description}</p>}{request.resolutionNote ? <p className="warranty-resolution">Phản hồi: {request.resolutionNote}</p> : ["APPROVED", "REJECTED", "CANCELLED", "COMPLETED"].includes(request.status.toUpperCase()) && <p className="warranty-resolution">Chưa có ý kiến phản hồi.</p>}{request.processedByEmployeeName && <small>Xử lý bởi: {request.processedByEmployeeName}{request.processedAt ? ` · ${formatDate(request.processedAt)}` : ""}</small>}{request.hasAttachment && <small>Tệp đính kèm: {request.attachmentFileName || "Đã gửi"}</small>}</div>
            <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setSelectedRequest(request)}>Xem chi tiết</button></div>
        </article>)}</div>}
        {selectedRequest && <div className="repair-detail-backdrop" role="presentation" onClick={() => setSelectedRequest(null)}><section className="appointment-panel repair-detail-dialog sprint8-warranty-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-warranty-detail-title" onClick={(event) => event.stopPropagation()}><div className="appointment-card-top"><div><span className="appointment-card-reference">{selectedRequest.ticketCode}</span><h2 id="customer-warranty-detail-title">Chi tiết yêu cầu bảo hành</h2><p>{selectedRequest.device}</p></div><button className="secondary-button" type="button" onClick={() => setSelectedRequest(null)}>Đóng</button></div><div className="appointment-details-grid"><div><span>Dịch vụ</span><strong>{selectedRequest.serviceName || "Dịch vụ sửa chữa"}</strong></div><div><span>Trạng thái</span><strong>{statusLabel(selectedRequest.status)}</strong></div><div><span>Ngày gửi</span><strong>{formatDate(selectedRequest.createdAt)}</strong></div><div><span>Ngày xử lý</span><strong>{selectedRequest.processedAt ? formatDate(selectedRequest.processedAt) : "Chưa xử lý"}</strong></div><div className="appointment-detail-full"><span>Nội dung lỗi</span><strong>{selectedRequest.reason}</strong></div>{selectedRequest.description && <div className="appointment-detail-full"><span>Mô tả chi tiết</span><strong>{selectedRequest.description}</strong></div>}{selectedRequest.resolutionNote ? <div className="appointment-detail-full"><span>Ý kiến phản hồi</span><strong>{selectedRequest.resolutionNote}</strong></div> : ["APPROVED", "REJECTED", "CANCELLED", "COMPLETED"].includes(selectedRequest.status.toUpperCase()) && <div className="appointment-detail-full"><span>Ý kiến phản hồi</span><strong>Chưa có ý kiến phản hồi.</strong></div>}{selectedRequest.processedByEmployeeName && <div><span>Người xử lý</span><strong>{selectedRequest.processedByEmployeeName}</strong></div>}{selectedRequest.hasAttachment && <div className="appointment-detail-full"><span>Tệp minh chứng</span><strong>{selectedRequest.attachmentFileName || "Khách hàng đã gửi tệp"}</strong></div>}</div></section></div>}
    </main>;
}

export default WarrantyRequest;
