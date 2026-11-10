import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmRepairPaymentApi, getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairTicketsApi } from "../../api/repairTicketApi";
import { downloadWarrantyAttachmentApi, getWarrantyRequestsApi, processWarrantyRequestApi } from "../../api/warrantyRequestApi";
import { getAllServiceReviewsApi } from "../../api/serviceReviewApi";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairTicket } from "../../types/repairTicket";
import type { ServiceReview } from "../../types/serviceReview";
import type { WarrantyRequest } from "../../types/warrantyRequest";
import { statusLabel } from "../../utils/statusLabel";

export type RepairSprint8Section = "billing" | "reviews" | "warranty";
type Period = "current" | "past";
type QuoteRow = { ticket: RepairTicket; quote: RepairQuote };
type PaymentRow = { ticket: RepairTicket; payment: RepairPayment };
type WarrantyAction = "APPROVED" | "REJECTED" | "COMPLETED";

const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
const errorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        return body?.message || body?.error || fallback;
    }
    return fallback;
};
const statusOf = (error: unknown) => axios.isAxiosError(error) ? error.response?.status : undefined;

const sectionTitle: Record<RepairSprint8Section, string> = {
    billing: "Báo giá & thanh toán",
    reviews: "Đánh giá dịch vụ",
    warranty: "Bảo hành",
};

function RepairSprint8({ section }: { section: RepairSprint8Section }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [period, setPeriod] = useState<Period>("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [reviews, setReviews] = useState<ServiceReview[]>([]);
    const [warranties, setWarranties] = useState<WarrantyRequest[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<QuoteRow | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; name: string } | null>(null);
    const [warrantyAction, setWarrantyAction] = useState<WarrantyAction | null>(null);
    const [resolutionNote, setResolutionNote] = useState("");
    const [ratingFilter, setRatingFilter] = useState("ALL");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            if (section === "billing") {
                const allTickets = await getRepairTicketsApi();
                const [quoteResults, paymentResults] = await Promise.all([
                    Promise.all(allTickets.map(async (ticket): Promise<QuoteRow | null> => {
                        try { return { ticket, quote: await getRepairQuoteApi(ticket.id) }; }
                        catch (requestError: unknown) { if (statusOf(requestError) === 404) return null; throw requestError; }
                    })),
                    Promise.all(allTickets.map(async (ticket): Promise<PaymentRow[]> => {
                        try { return (await getRepairPaymentsApi(ticket.id)).map((payment) => ({ ticket, payment })); }
                        catch (requestError: unknown) { if (statusOf(requestError) === 404) return []; throw requestError; }
                    })),
                ]);
                setQuoteRows(quoteResults.filter((row): row is QuoteRow => row !== null).sort((a, b) => b.quote.createdAt.localeCompare(a.quote.createdAt)));
                setPaymentRows(paymentResults.flat().sort((a, b) => b.payment.createdAt.localeCompare(a.payment.createdAt)));
            } else if (section === "reviews") {
                setReviews(await getAllServiceReviewsApi());
            } else {
                setWarranties(await getWarrantyRequestsApi());
            }
        } catch (requestError: unknown) {
            setError(errorMessage(requestError, `Không thể tải mục ${sectionTitle[section].toLocaleLowerCase("vi")}.`));
        } finally {
            setLoading(false);
        }
    }, [section]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const confirmPayment = async (row: PaymentRow) => {
        if (!window.confirm(`Xác nhận đã nhận đủ ${money(row.payment.amount)} cho phiếu ${row.payment.ticketCode}?`)) return;
        setBusyId(row.payment.id);
        setError("");
        setNotice("");
        try {
            const updated = await confirmRepairPaymentApi(row.payment.id);
            setPaymentRows((current) => current.map((entry) => entry.payment.id === updated.id ? { ...entry, payment: updated } : entry));
            setNotice(`Đã xác nhận thanh toán phiếu ${updated.ticketCode}.`);
        } catch (requestError: unknown) {
            setError(errorMessage(requestError, "Không thể xác nhận giao dịch thanh toán."));
        } finally {
            setBusyId(null);
        }
    };


    const openAttachment = async (request: WarrantyRequest) => {
        setBusyId(request.id);
        setError("");
        try {
            const file = await downloadWarrantyAttachmentApi(request.id);
            const url = URL.createObjectURL(file);
            if ((request.attachmentContentType || file.type).startsWith("image/")) {
                setAttachmentPreview({ url, name: request.attachmentFileName || `Ảnh bảo hành ${request.ticketCode}` });
            } else {
                const link = document.createElement("a");
                link.href = url;
                link.download = request.attachmentFileName || `tệp bảo hành ${request.ticketCode}`;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        } catch (requestError: unknown) {
            setError(errorMessage(requestError, "Không thể mở tệp đính kèm."));
        } finally {
            setBusyId(null);
        }
    };

    const processWarranty = async () => {
        if (!selectedWarranty || !warrantyAction) return;
        if (warrantyAction === "REJECTED" && !resolutionNote.trim()) {
            setError("Cần nhập lý do khi từ chối yêu cầu bảo hành.");
            return;
        }
        if (resolutionNote.trim().length > 2000) {
            setError("Ghi chú xử lý không được vượt quá 2.000 ký tự.");
            return;
        }
        setBusyId(selectedWarranty.id);
        setError("");
        setNotice("");
        try {
            const updated = await processWarrantyRequestApi(selectedWarranty.id, warrantyAction, resolutionNote);
            setWarranties((current) => current.map((request) => request.id === updated.id ? updated : request));
            setNotice(`Đã cập nhật yêu cầu bảo hành ${updated.ticketCode}: ${statusLabel(updated.status)}.`);
            setSelectedWarranty(null);
            setWarrantyAction(null);
            setResolutionNote("");
        } catch (requestError: unknown) {
            setError(errorMessage(requestError, "Không thể xử lý yêu cầu bảo hành."));
        } finally {
            setBusyId(null);
        }
    };

    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    const visibleQuotes = useMemo(() => quoteRows.filter(({ ticket, quote }) =>
        (period === "current" ? quote.status === "SENT" : quote.status !== "SENT")
        && (statusFilter === "ALL" || quote.status === statusFilter)
        && (!normalizedSearch || [ticket.ticketCode, ticket.device, ticket.customerName, quote.quoteCode].some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch)))),
    [quoteRows, period, statusFilter, normalizedSearch]);
    const visiblePayments = useMemo(() => paymentRows.filter(({ ticket, payment }) =>
        (period === "current" ? payment.status !== "PAID" : payment.status === "PAID")
        && (statusFilter === "ALL" || payment.status === statusFilter)
        && (!normalizedSearch || [ticket.ticketCode, ticket.device, ticket.customerName].some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch)))),
    [paymentRows, period, statusFilter, normalizedSearch]);
    const visibleWarranties = useMemo(() => warranties.filter((request) =>
        (period === "current" ? ["PENDING", "APPROVED"].includes(request.status) : !["PENDING", "APPROVED"].includes(request.status))
        && (statusFilter === "ALL" || request.status === statusFilter)
        && (!normalizedSearch || [request.ticketCode, request.device, request.customerName, request.reason].some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch)))),
    [warranties, period, statusFilter, normalizedSearch]);
    const visibleReviews = useMemo(() => reviews.filter((review) =>
        (ratingFilter === "ALL" || review.rating === Number(ratingFilter))
        && (!normalizedSearch || [review.ticketCode, review.customerName, review.serviceName || "", review.comment || ""].some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch)))),
    [reviews, ratingFilter, normalizedSearch]);

    const availableStatuses = section === "billing"
        ? [...new Set([...quoteRows.map(({ quote }) => quote.status), ...paymentRows.map(({ payment }) => payment.status)])]
        : [...new Set(warranties.map((request) => request.status))];

    return <section className="admin-sprint8-panel" aria-label={sectionTitle[section]}>
        <div className="appointment-results-heading"><div><h2>{sectionTitle[section]}</h2><p>{loading ? "Đang tải..." : section === "billing" ? `${visibleQuotes.length} báo giá · ${visiblePayments.length} giao dịch` : section === "reviews" ? `${visibleReviews.length} đánh giá` : `${visibleWarranties.length} yêu cầu`}</p></div><button className="secondary-button" type="button" disabled={loading} onClick={() => void load()}>{loading ? "Đang tải..." : "Làm mới"}</button></div>
        {error && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="admin-sprint8-filters">
            <label className="appointment-form-group"><span>Tìm kiếm</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã phiếu, khách hàng, thiết bị..." /></label>
            {section === "reviews" ? <label className="appointment-form-group"><span>Lọc số sao</span><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}><option value="ALL">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label> : <label className="appointment-form-group"><span>Lọc trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{availableStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>}
        </div>
        {section !== "reviews" && <div className="appointment-tabs" role="tablist" aria-label={`Lọc ${sectionTitle[section].toLocaleLowerCase("vi")}`}>
            <button className={period === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={period === "current"} onClick={() => { setPeriod("current"); setStatusFilter("ALL"); }}>Hiện tại <span>{section === "billing" ? quoteRows.filter(({ quote }) => quote.status === "SENT").length + paymentRows.filter(({ payment }) => payment.status !== "PAID").length : warranties.filter((request) => ["PENDING", "APPROVED"].includes(request.status)).length}</span></button>
            <button className={period === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={period === "past"} onClick={() => { setPeriod("past"); setStatusFilter("ALL"); }}>Đã qua <span>{section === "billing" ? quoteRows.filter(({ quote }) => quote.status !== "SENT").length + paymentRows.filter(({ payment }) => payment.status === "PAID").length : warranties.filter((request) => !["PENDING", "APPROVED"].includes(request.status)).length}</span></button>
        </div>}

        {loading ? <div className="appointment-panel table-state">Đang tải dữ liệu...</div>
            : error && ((section === "billing" && !quoteRows.length && !paymentRows.length) || (section === "reviews" && !reviews.length) || (section === "warranty" && !warranties.length))
                ? <div className="appointment-panel appointment-empty-state"><h2>Không tải được dữ liệu</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử tải lại</button></div>
                : section === "billing" ? <div className="admin-billing-sections">
                    <section className="admin-appointments-panel">
                        <div className="appointment-results-heading"><div><h3>Báo giá</h3><p>{visibleQuotes.length} báo giá phù hợp</p></div></div>
                        {visibleQuotes.length ? <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã báo giá</th><th>Mã phiếu / khách hàng</th><th>Thiết bị</th><th>Tổng tiền</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleQuotes.map((row) => <tr key={row.quote.id}><td><strong>{row.quote.quoteCode}</strong></td><td><strong>{row.ticket.ticketCode}</strong><span>{row.ticket.customerName}</span></td><td>{row.ticket.device}</td><td><strong>{money(row.quote.totalAmount)}</strong></td><td>{dateTime(row.quote.createdAt)}</td><td><span className={`appointment-status ${row.quote.status.toLowerCase()}`}>{statusLabel(row.quote.status)}</span></td><td><button className="secondary-button" type="button" onClick={() => setSelectedQuote(row)}>Chi tiết</button></td></tr>)}</tbody></table></div> : <EmptyState title="Không có báo giá phù hợp" />}
                    </section>
                    <section className="admin-appointments-panel">
                        <div className="appointment-results-heading"><div><h3>Thanh toán</h3><p>{visiblePayments.length} giao dịch phù hợp</p></div></div>
                        {visiblePayments.length ? <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Số tiền</th><th>Phương thức</th><th>Ngày tạo</th><th>Trạng thái / thao tác</th></tr></thead><tbody>{visiblePayments.map((row) => <tr key={row.payment.id}><td><strong>{row.payment.ticketCode}</strong></td><td>{row.ticket.customerName}</td><td>{row.ticket.device}</td><td><strong>{money(row.payment.amount)}</strong></td><td>{row.payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"}</td><td>{dateTime(row.payment.createdAt)}</td><td>{row.payment.status === "PENDING" ? <button className="primary-button" type="button" disabled={busyId === row.payment.id} onClick={() => void confirmPayment(row)}>{busyId === row.payment.id ? "Đang xác nhận..." : "Xác nhận đã nhận tiền"}</button> : <span className="appointment-status completed">Đã thanh toán</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="Không có giao dịch phù hợp" />}
                    </section>
                </div>
                : section === "reviews" ? visibleReviews.length ? <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Dịch vụ</th><th>Đánh giá</th><th>Nội dung</th><th>Ngày gửi</th></tr></thead><tbody>{visibleReviews.map((review) => <tr key={review.id}><td><strong>{review.ticketCode}</strong></td><td>{review.customerName}</td><td>{review.serviceName || "Dịch vụ sửa chữa"}</td><td><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} ({review.rating}/5)</strong></td><td>{review.comment || "Không có nhận xét"}</td><td>{dateTime(review.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có đánh giá phù hợp" />
                : visibleWarranties.length ? <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng / thiết bị</th><th>Lý do</th><th>Ngày gửi</th><th>Trạng thái</th><th>Tệp đính kèm</th><th>Thao tác</th></tr></thead><tbody>{visibleWarranties.map((request) => <tr key={request.id}><td><strong>{request.ticketCode}</strong></td><td><strong>{request.customerName}</strong><span>{request.device}</span></td><td>{request.reason}{request.description && <span>{request.description}</span>}{request.resolutionNote && <small>Phản hồi: {request.resolutionNote}</small>}</td><td>{dateTime(request.createdAt)}</td><td><span className={`appointment-status ${request.status.toLowerCase()}`}>{statusLabel(request.status)}</span></td><td>{request.hasAttachment ? <button className="secondary-button" type="button" disabled={busyId === request.id} onClick={() => void openAttachment(request)}>{busyId === request.id ? "Đang mở..." : "Xem tệp"}</button> : "Không có"}</td><td><div className="repair-ticket-actions">{request.status === "PENDING" && <><button className="secondary-button" type="button" onClick={() => { setSelectedWarranty(request); setWarrantyAction("REJECTED"); setResolutionNote(""); }}>Từ chối</button><button className="primary-button" type="button" onClick={() => { setSelectedWarranty(request); setWarrantyAction("APPROVED"); setResolutionNote(""); }}>Duyệt bảo hành</button></>}{request.status === "APPROVED" && <button className="primary-button" type="button" onClick={() => { setSelectedWarranty(request); setWarrantyAction("COMPLETED"); setResolutionNote(""); }}>Hoàn tất xử lý</button>}{request.processedByEmployeeName && <small>{request.processedByEmployeeName}{request.processedAt ? ` · ${dateTime(request.processedAt)}` : ""}</small>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="Không có yêu cầu bảo hành phù hợp" />}

        {selectedQuote && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedQuote(null); }}><section className="modal customer-modal sprint8-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-quote-detail-title"><div className="modal-header"><div><span className="appointment-card-reference">{selectedQuote.quote.quoteCode} · {selectedQuote.ticket.ticketCode}</span><h2 id="admin-quote-detail-title">Chi tiết báo giá</h2><p>{selectedQuote.ticket.customerName} · {selectedQuote.ticket.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setSelectedQuote(null)}>×</button></div><div className="appointment-details-grid"><div><span>Trạng thái</span><strong>{statusLabel(selectedQuote.quote.status)}</strong></div><div><span>Ngày gửi</span><strong>{dateTime(selectedQuote.quote.createdAt)}</strong></div></div><div className="quote-items-list">{selectedQuote.quote.items.map((item) => <div className="quote-customer-line sprint8-quote-line" key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} × {money(item.unitPrice)}</small></div><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="quote-total"><span>Tổng báo giá</span><strong>{money(selectedQuote.quote.totalAmount)}</strong></div><p className="sprint8-readonly-note">Admin có thể xem báo giá. Khách hàng xác nhận hoặc từ chối báo giá trong tài khoản của mình.</p></section></div>}

        {attachmentPreview && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { URL.revokeObjectURL(attachmentPreview.url); setAttachmentPreview(null); } }}><section className="modal customer-modal sprint8-admin-dialog warranty-image-dialog" role="dialog" aria-modal="true" aria-label="Xem ảnh bảo hành"><div className="modal-header"><h2>{attachmentPreview.name}</h2><button className="modal-close" type="button" aria-label="Đóng" onClick={() => { URL.revokeObjectURL(attachmentPreview.url); setAttachmentPreview(null); }}>×</button></div><img src={attachmentPreview.url} alt={attachmentPreview.name} /></section></div>}

        {selectedWarranty && warrantyAction && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && busyId !== selectedWarranty.id) { setSelectedWarranty(null); setWarrantyAction(null); } }}><form className="modal customer-modal sprint8-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-warranty-process-title" onSubmit={(event) => { event.preventDefault(); void processWarranty(); }}><div className="modal-header"><div><span className="appointment-card-reference">{selectedWarranty.ticketCode}</span><h2 id="admin-warranty-process-title">{warrantyAction === "APPROVED" ? "Duyệt yêu cầu bảo hành" : warrantyAction === "REJECTED" ? "Từ chối yêu cầu bảo hành" : "Hoàn tất xử lý bảo hành"}</h2><p>{selectedWarranty.customerName} · {selectedWarranty.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" disabled={busyId === selectedWarranty.id} onClick={() => { setSelectedWarranty(null); setWarrantyAction(null); }}>×</button></div><p><strong>Lỗi khách báo:</strong> {selectedWarranty.reason}</p><div className="appointment-form-group"><label htmlFor="admin-warranty-resolution">Ghi chú xử lý {warrantyAction === "REJECTED" && <span aria-hidden="true">*</span>}</label><textarea id="admin-warranty-resolution" rows={4} maxLength={2000} required={warrantyAction === "REJECTED"} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder={warrantyAction === "REJECTED" ? "Nhập lý do từ chối..." : "Ghi chú xử lý nếu cần..."}/><small>{resolutionNote.length}/2000 ký tự</small></div>{error && <div className="error-message" role="alert">{error}</div>}<div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={busyId === selectedWarranty.id} onClick={() => { setSelectedWarranty(null); setWarrantyAction(null); }}>Hủy</button><button className="primary-button" type="submit" disabled={busyId === selectedWarranty.id}>{busyId === selectedWarranty.id ? "Đang lưu..." : "Xác nhận xử lý"}</button></div></form></div>}
    </section>;
}

function EmptyState({ title }: { title: string }) {
    return <div className="appointment-panel appointment-empty-state"><h3>{title}</h3><p>Dữ liệu phù hợp sẽ xuất hiện tại đây.</p></div>;
}

export default RepairSprint8;
