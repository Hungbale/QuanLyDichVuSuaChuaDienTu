import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { confirmRepairPaymentApi, getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { createRepairQuoteApi, getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairTicketsApi } from "../../api/repairTicketApi";
import { getServicesApi } from "../../api/serviceApi";
import { downloadWarrantyAttachmentApi, getWarrantyRequestsApi, processWarrantyRequestApi } from "../../api/warrantyRequestApi";
import { getAllServiceReviewsApi } from "../../api/serviceReviewApi";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairTicket } from "../../types/repairTicket";
import type { RepairQuoteItemRequest } from "../../types/repairQuote";
import type { ServiceItem } from "../../types/service";
import type { ServiceReview } from "../../types/serviceReview";
import type { WarrantyRequest } from "../../types/warrantyRequest";
import { statusLabel } from "../../utils/statusLabel";

export type RepairSprint8Section = "billing" | "reviews" | "warranty";
type Period = "current" | "past";
type QuoteRow = { ticket: RepairTicket; quote: RepairQuote };
type PaymentRow = { ticket: RepairTicket; payment: RepairPayment };
type WarrantyAction = "APPROVED" | "REJECTED";
type QuoteDraftItem = { serviceId: string; quantity: string };
const emptyQuoteItem = (): QuoteDraftItem => ({ serviceId: "", quantity: "1" });

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

function RepairSprint8({ section, onCreateWarrantyTicket }: { section: RepairSprint8Section; onCreateWarrantyTicket?: (request: WarrantyRequest) => void | Promise<void> }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [appliedWarrantySearch, setAppliedWarrantySearch] = useState("");
    const [period, setPeriod] = useState<Period>("current");
    const [billingTab, setBillingTab] = useState<"quotes" | "payments">("quotes");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [reviews, setReviews] = useState<ServiceReview[]>([]);
    const [warranties, setWarranties] = useState<WarrantyRequest[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<QuoteRow | null>(null);
    const [selectedReview, setSelectedReview] = useState<ServiceReview | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [warrantyAction, setWarrantyAction] = useState<WarrantyAction | null>(null);
    const [warrantyDetail, setWarrantyDetail] = useState<WarrantyRequest | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; name: string } | null>(null);
    const [attachmentZoomOpen, setAttachmentZoomOpen] = useState(false);
    const [resolutionNote, setResolutionNote] = useState("");
    const [ratingFilter, setRatingFilter] = useState("ALL");
    const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
    const [selectedQuoteTicketId, setSelectedQuoteTicketId] = useState("");
    const [quoteTicketSearch, setQuoteTicketSearch] = useState("");
    const [quoteTicketPickerOpen, setQuoteTicketPickerOpen] = useState(false);
    const [quoteDraftItems, setQuoteDraftItems] = useState<QuoteDraftItem[]>([emptyQuoteItem()]);
    const [savingQuote, setSavingQuote] = useState(false);
    const quoteTicketPickerRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            if (section === "billing") {
                const [allTickets, activeServices] = await Promise.all([
                    getRepairTicketsApi(),
                    getServicesApi({ status: "ACTIVE" }),
                ]);
                setTickets(allTickets);
                setServices(activeServices);
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
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview.url);
        setAttachmentPreview(null);
        setAttachmentZoomOpen(false);
        try {
            const file = await downloadWarrantyAttachmentApi(request.id);
            const url = URL.createObjectURL(file);
            if ((request.attachmentContentType || file.type).toLocaleLowerCase().startsWith("image/")) {
                setAttachmentPreview({ url, name: request.attachmentFileName || `Ảnh bảo hành ${request.ticketCode}` });
                setAttachmentZoomOpen(false);
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

    const closeWarrantyDetail = () => {
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview.url);
        setAttachmentPreview(null);
        setAttachmentZoomOpen(false);
        setWarrantyDetail(null);
    };

    const openWarrantyDetails = (request: WarrantyRequest) => {
        setWarrantyDetail(request);
        setResolutionNote("");
        setError("");
        if (request.hasAttachment && request.attachmentContentType?.toLocaleLowerCase().startsWith("image/")) {
            void openAttachment(request);
        } else {
            if (attachmentPreview) URL.revokeObjectURL(attachmentPreview.url);
            setAttachmentPreview(null);
            setAttachmentZoomOpen(false);
        }
    };

    const processWarranty = async (action: WarrantyAction) => {
        if (!warrantyDetail) return;
        setWarrantyAction(action);
        if (["APPROVED", "REJECTED"].includes(action) && !resolutionNote.trim()) {
            setError("Vui lòng nhập ý kiến gửi khách hàng trước khi duyệt hoặc từ chối yêu cầu.");
            return;
        }
        if (resolutionNote.trim().length > 2000) {
            setError("Ghi chú xử lý không được vượt quá 2.000 ký tự.");
            return;
        }
        setBusyId(warrantyDetail.id);
        setError("");
        setNotice("");
        try {
            const updated = await processWarrantyRequestApi(warrantyDetail.id, action, resolutionNote);
            setWarranties((current) => current.map((request) => request.id === updated.id ? updated : request));
            setWarrantyDetail(null);
            setWarrantyAction(null);
            setResolutionNote("");
            if (action === "APPROVED" && onCreateWarrantyTicket) {
                await onCreateWarrantyTicket(updated);
                return;
            }
            setNotice(`\u0110\u00e3 c\u1eadp nh\u1eadt y\u00eau c\u1ea7u b\u1ea3o h\u00e0nh ${updated.ticketCode}: ${statusLabel(updated.status)}.`);
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
        && (!(section === "warranty" ? appliedWarrantySearch.trim().toLocaleLowerCase("vi") : normalizedSearch) || [request.ticketCode, request.device, request.customerName, request.reason].some((value) => value.toLocaleLowerCase("vi").includes(section === "warranty" ? appliedWarrantySearch.trim().toLocaleLowerCase("vi") : normalizedSearch)))),
    [warranties, period, statusFilter, normalizedSearch, appliedWarrantySearch, section]);
    const visibleReviews = useMemo(() => reviews.filter((review) =>
        (ratingFilter === "ALL" || review.rating === Number(ratingFilter))
        && (!normalizedSearch || [review.ticketCode, review.customerName, review.serviceName || "", review.comment || ""].some((value) => value.toLocaleLowerCase("vi").includes(normalizedSearch)))),
    [reviews, ratingFilter, normalizedSearch]);
    const averageReviewRating = visibleReviews.length
        ? visibleReviews.reduce((total, review) => total + review.rating, 0) / visibleReviews.length
        : 0;

    const availableStatuses = section === "billing"
        ? [...new Set([...quoteRows.map(({ quote }) => quote.status), ...paymentRows.map(({ payment }) => payment.status)])]
        : [...new Set(warranties.map((request) => request.status))];
    const quoteEligibleTickets = tickets.filter((ticket) => {
        const status = ticket.status.trim().toLocaleUpperCase("vi");
        const hasDiagnosisStatus = ["DIAGNOSING", "ĐANG KIỂM TRA", "ĐÃ KIỂM TRA", "CHỜ BÁO GIÁ"].includes(status);
        return hasDiagnosisStatus && !quoteRows.some((row) => row.ticket.id === ticket.id);
    }).sort((a, b) => b.id - a.id);
    const matchingQuoteTickets = quoteEligibleTickets.filter((ticket) => {
        const query = quoteTicketSearch.trim().toLocaleLowerCase("vi");
        return !query || [ticket.ticketCode, ticket.customerName, ticket.device]
            .some((value) => value.toLocaleLowerCase("vi").includes(query));
    });
    const selectedQuoteTicket = quoteEligibleTickets.find((ticket) => ticket.id === Number(selectedQuoteTicketId)) || null;

    const openQuoteEditor = () => {
        setSelectedQuoteTicketId("");
        setQuoteTicketSearch("");
        setQuoteTicketPickerOpen(false);
        setQuoteDraftItems([emptyQuoteItem()]);
        setQuoteEditorOpen(true);
        setError("");
        setNotice("");
    };

    const closeQuoteEditor = () => {
        if (savingQuote) return;
        setQuoteEditorOpen(false);
        setSelectedQuoteTicketId("");
        setQuoteTicketSearch("");
        setQuoteTicketPickerOpen(false);
        setQuoteDraftItems([emptyQuoteItem()]);
        setError("");
    };

    const submitQuote = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedQuoteTicket) {
            setError("Vui lòng chọn phiếu sửa chữa cần báo giá.");
            return;
        }
        const payload: RepairQuoteItemRequest[] = quoteDraftItems.map((item) => {
            const service = services.find((candidate) => candidate.id === Number(item.serviceId));
            return { name: service?.name || "", quantity: Number(item.quantity), unitPrice: service?.price ?? -1 };
        });
        if (!payload.length || payload.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
            setError("Vui lòng chọn dịch vụ và số lượng hợp lệ cho từng hạng mục.");
            return;
        }
        setSavingQuote(true);
        setError("");
        setNotice("");
        try {
            const quote = await createRepairQuoteApi(selectedQuoteTicket.id, { items: payload });
            setNotice(`Đã tạo báo giá ${quote.quoteCode} cho ${quote.customerName}.`);
            setQuoteEditorOpen(false);
            setSelectedQuoteTicketId("");
            setQuoteTicketSearch("");
            setQuoteTicketPickerOpen(false);
            setQuoteDraftItems([emptyQuoteItem()]);
            await load();
        } catch (requestError: unknown) {
            setError(errorMessage(requestError, "Không thể tạo báo giá cho phiếu này."));
        } finally {
            setSavingQuote(false);
        }
    };

    return <section className="admin-sprint8-panel" aria-label={sectionTitle[section]}>
        {error && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        {section !== "reviews" && <div className="appointment-tabs" role="tablist" aria-label={`Lọc ${sectionTitle[section].toLocaleLowerCase("vi")}`}>
            <button className={period === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={period === "current"} onClick={() => { setPeriod("current"); setStatusFilter("ALL"); }}>Hiện tại <span>{section === "billing" ? quoteRows.filter(({ quote }) => quote.status === "SENT").length + paymentRows.filter(({ payment }) => payment.status !== "PAID").length : warranties.filter((request) => ["PENDING", "APPROVED"].includes(request.status)).length}</span></button>
            <button className={period === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={period === "past"} onClick={() => { setPeriod("past"); setStatusFilter("ALL"); }}>Đã qua <span>{section === "billing" ? quoteRows.filter(({ quote }) => quote.status !== "SENT").length + paymentRows.filter(({ payment }) => payment.status === "PAID").length : warranties.filter((request) => !["PENDING", "APPROVED"].includes(request.status)).length}</span></button>
        </div>}
        <div className={section === "billing" ? "admin-sprint8-filters admin-billing-filters" : section === "warranty" ? "admin-sprint8-filters admin-warranty-filters" : "admin-sprint8-filters"}>
            <label className="appointment-form-group"><span>{section === "warranty" ? "Tìm yêu cầu bảo hành" : "Tìm kiếm"}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (section === "warranty" && event.key === "Enter") setAppliedWarrantySearch(search); }} placeholder={section === "warranty" ? "Mã phiếu, khách hàng, thiết bị hoặc lý do..." : "Mã phiếu, khách hàng, thiết bị..."} /></label>
            {section === "billing" ? <div className="admin-billing-status-actions"><label className="appointment-form-group"><span>Lọc trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{availableStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><button className="primary-button" type="button" onClick={openQuoteEditor}>Tạo báo giá</button></div> : section === "reviews" ? <label className="appointment-form-group"><span>Lọc số sao</span><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}><option value="ALL">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label> : <div className="admin-billing-status-actions"><button className="primary-button" type="button" onClick={() => setAppliedWarrantySearch(search)}>Tìm kiếm</button></div>}
        </div>
        {section === "billing" && <div className="appointment-tabs" role="tablist" aria-label="Loại dữ liệu thanh toán">
            <button className={billingTab === "quotes" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={billingTab === "quotes"} onClick={() => setBillingTab("quotes")}>Báo giá <span>{visibleQuotes.length}</span></button>
            <button className={billingTab === "payments" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={billingTab === "payments"} onClick={() => setBillingTab("payments")}>Thanh toán <span>{visiblePayments.length}</span></button>
        </div>}


        {loading ? <div className="appointment-panel table-state">Đang tải dữ liệu...</div>
            : error && ((section === "billing" && !quoteRows.length && !paymentRows.length) || (section === "reviews" && !reviews.length) || (section === "warranty" && !warranties.length))
                ? <div className="appointment-panel appointment-empty-state"><h2>Không tải được dữ liệu</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử tải lại</button></div>
            : section === "billing" ? <div className="appointment-panel admin-billing-sections">
                {billingTab === "quotes" ? <section className="admin-billing-subsection">
                    <div className="appointment-results-heading"><div><h3>Báo giá</h3><p>{visibleQuotes.length} báo giá phù hợp</p></div></div>
                    {visibleQuotes.length ? <div className="appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã báo giá</th><th>Mã phiếu / khách hàng</th><th>Thiết bị</th><th>Tổng tiền</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleQuotes.map((row) => <tr key={row.quote.id}><td><strong>{row.quote.quoteCode}</strong></td><td><strong>{row.ticket.ticketCode}</strong><span>{row.ticket.customerName}</span></td><td>{row.ticket.device}</td><td><strong>{money(row.quote.totalAmount)}</strong></td><td>{dateTime(row.quote.createdAt)}</td><td><span className={`appointment-status ${row.quote.status.toLowerCase()}`}>{statusLabel(row.quote.status)}</span></td><td><button className="secondary-button" type="button" onClick={() => setSelectedQuote(row)}>Chi tiết</button></td></tr>)}</tbody></table></div> : <EmptyState title="Không có báo giá phù hợp" />}
                </section> : <section className="admin-billing-subsection">
                    <div className="appointment-results-heading"><div><h3>Thanh toán</h3><p>{visiblePayments.length} giao dịch phù hợp</p></div></div>
                    {visiblePayments.length ? <div className="appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Số tiền</th><th>Phương thức</th><th>Ngày tạo</th><th>Trạng thái / thao tác</th></tr></thead><tbody>{visiblePayments.map((row) => <tr key={row.payment.id}><td><strong>{row.payment.ticketCode}</strong></td><td>{row.ticket.customerName}</td><td>{row.ticket.device}</td><td><strong>{money(row.payment.amount)}</strong></td><td>{row.payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"}</td><td>{dateTime(row.payment.createdAt)}</td><td>{row.payment.status === "PENDING" ? <button className="primary-button" type="button" disabled={busyId === row.payment.id} onClick={() => void confirmPayment(row)}>{busyId === row.payment.id ? "Đang xác nhận..." : "Xác nhận đã nhận tiền"}</button> : <span className="appointment-status completed">Đã thanh toán</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="Không có giao dịch phù hợp" />}
                </section>}
            </div>
                : section === "reviews" ? visibleReviews.length ? <div className="appointment-panel appointment-table-container admin-review-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Dịch vụ</th><th>Đánh giá</th><th>Nội dung</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead><tbody>{visibleReviews.map((review) => <tr key={review.id}><td><strong>{review.ticketCode}</strong></td><td>{review.customerName}</td><td>{review.serviceName || "Dịch vụ sửa chữa"}</td><td><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} ({review.rating}/5)</strong></td><td>{review.comment || "Không có nhận xét"}</td><td>{dateTime(review.createdAt)}</td><td><button className="secondary-button" type="button" onClick={() => setSelectedReview(review)}>Xem chi tiết</button></td></tr>)}</tbody><tfoot><tr className="admin-review-summary-row"><td colSpan={5}><strong>Đánh giá trung bình trong danh sách ({visibleReviews.length})</strong></td><td colSpan={2}><strong aria-label={`Trung bình ${averageReviewRating.toFixed(1)} trên 5 sao`}>{"★".repeat(Math.round(averageReviewRating))}{"☆".repeat(5 - Math.round(averageReviewRating))} {averageReviewRating.toFixed(1)} / 5 sao</strong></td></tr></tfoot></table></div> : <EmptyState title="Chưa có đánh giá phù hợp" />
                : visibleWarranties.length ? <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng / thiết bị</th><th>Lý do</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleWarranties.map((request) => <tr key={request.id}><td><strong>{request.ticketCode}</strong></td><td><strong>{request.customerName}</strong><span>{request.device}</span></td><td>{request.reason}{request.description && <span>{request.description}</span>}</td><td>{dateTime(request.createdAt)}</td><td><span className={`appointment-status ${request.status.toLowerCase()}`}>{statusLabel(request.status)}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => openWarrantyDetails(request)}>Xem chi ti&#7871;t</button>{request.status === "APPROVED" && onCreateWarrantyTicket && <button className="primary-button" type="button" onClick={() => onCreateWarrantyTicket(request)}>T&#7841;o phi&#7871;u b&#7843;o h&#224;nh</button>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="Không có yêu cầu bảo hành phù hợp" />}

        {quoteEditorOpen && <div className="repair-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuoteEditor(); }}><form className="appointment-panel repair-detail-dialog quote-editor" role="dialog" aria-modal="true" aria-labelledby="admin-create-quote-title" onSubmit={(event) => void submitQuote(event)} onClick={(event) => event.stopPropagation()}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">Quản lý sửa chữa</span><h2 id="admin-create-quote-title">Tạo báo giá</h2><p>Chọn phiếu đã chẩn đoán và thêm các dịch vụ cần báo giá.</p></div><button className="secondary-button" type="button" disabled={savingQuote} onClick={closeQuoteEditor}>Đóng</button></div>
            {error && <div className="error-message" role="alert">{error}</div>}
            {quoteEligibleTickets.length === 0 ? <div className="appointment-empty-state"><p>Không có phiếu đã chẩn đoán nào đang chờ tạo báo giá.</p></div> : <>
                <div className="appointment-form-group customer-picker-group" ref={quoteTicketPickerRef}><label htmlFor="admin-quote-ticket">Phiếu sửa chữa</label><input id="admin-quote-ticket" type="search" required autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={quoteTicketPickerOpen} aria-controls="admin-quote-ticket-options" value={quoteTicketSearch} placeholder="Tìm theo mã phiếu, tên khách hoặc thiết bị" onFocus={() => setQuoteTicketPickerOpen(true)} onBlur={() => setQuoteTicketPickerOpen(false)} onChange={(event) => { setQuoteTicketSearch(event.target.value); setSelectedQuoteTicketId(""); setQuoteTicketPickerOpen(true); }} />{quoteTicketPickerOpen && <div id="admin-quote-ticket-options" className="customer-picker-results" role="listbox" onMouseDown={(event) => event.preventDefault()}>{matchingQuoteTickets.length ? matchingQuoteTickets.map((ticket) => <button className="customer-picker-option" type="button" role="option" aria-selected={selectedQuoteTicketId === String(ticket.id)} key={ticket.id} onClick={() => { setSelectedQuoteTicketId(String(ticket.id)); setQuoteTicketSearch(`${ticket.ticketCode} · ${ticket.customerName} · ${ticket.device}`); setQuoteTicketPickerOpen(false); }}><span className="customer-picker-option-main"><strong>{ticket.ticketCode} · {ticket.customerName}</strong><small>{ticket.device} · {statusLabel(ticket.status)}</small></span></button>) : <p className="customer-picker-empty">{quoteTicketSearch.trim() ? "Không tìm thấy phiếu cần báo giá phù hợp." : "Không có phiếu cần báo giá phù hợp."}</p>}</div>}</div>
                {selectedQuoteTicket && <div className="appointment-details-grid tracking-summary"><div><span>Khách hàng</span><strong>{selectedQuoteTicket.customerName}</strong></div><div><span>Thiết bị</span><strong>{selectedQuoteTicket.device}</strong></div><div><span>Trạng thái</span><strong>{statusLabel(selectedQuoteTicket.status)}</strong></div></div>}
                <div className="quote-line-items">{quoteDraftItems.map((item, index) => {
                    const service = services.find((candidate) => candidate.id === Number(item.serviceId));
                    return <div className="quote-line-item" key={index}>
                        <div className="appointment-form-group"><label htmlFor={`admin-quote-service-${index}`}>Dịch vụ</label><select id={`admin-quote-service-${index}`} required value={item.serviceId} onChange={(event) => setQuoteDraftItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, serviceId: event.target.value } : row))}><option value="">Chọn dịch vụ</option>{services.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {money(entry.price)}</option>)}</select></div>
                        <div className="appointment-form-group"><label htmlFor={`admin-quote-quantity-${index}`}>Số lượng</label><input id={`admin-quote-quantity-${index}`} type="number" min="1" step="1" required value={item.quantity} onChange={(event) => setQuoteDraftItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))} /></div>
                        <div className="appointment-form-group"><label>Đơn giá</label><input readOnly value={service ? money(service.price) : "Chọn dịch vụ"} /></div>
                        <button className="secondary-button quote-remove-button" type="button" aria-label="Xóa hạng mục" disabled={quoteDraftItems.length === 1} onClick={() => setQuoteDraftItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Xóa</button>
                    </div>;
                })}</div>
                <button className="secondary-button" type="button" onClick={() => setQuoteDraftItems((current) => [...current, emptyQuoteItem()])}>+ Thêm dịch vụ</button>
                <div className="quote-total"><span>Tổng báo giá</span><strong>{money(quoteDraftItems.reduce((sum, item) => sum + Number(item.quantity || 0) * (services.find((service) => service.id === Number(item.serviceId))?.price ?? 0), 0))}</strong></div>
            </>}
            <div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={savingQuote} onClick={closeQuoteEditor}>Hủy</button><button className="primary-button" type="submit" disabled={savingQuote || quoteEligibleTickets.length === 0}>{savingQuote ? "Đang gửi..." : "Gửi báo giá cho khách"}</button></div>
        </form></div>}
        {selectedQuote && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedQuote(null); }}><section className="modal customer-modal sprint8-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-quote-detail-title"><div className="modal-header"><div><span className="appointment-card-reference">{selectedQuote.quote.quoteCode} · {selectedQuote.ticket.ticketCode}</span><h2 id="admin-quote-detail-title">Chi tiết báo giá</h2><p>{selectedQuote.ticket.customerName} · {selectedQuote.ticket.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setSelectedQuote(null)}>×</button></div><div className="appointment-details-grid"><div><span>Trạng thái</span><strong>{statusLabel(selectedQuote.quote.status)}</strong></div><div><span>Ngày gửi</span><strong>{dateTime(selectedQuote.quote.createdAt)}</strong></div></div><div className="quote-items-list">{selectedQuote.quote.items.map((item) => <div className="quote-customer-line sprint8-quote-line" key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} × {money(item.unitPrice)}</small></div><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="quote-total"><span>Tổng báo giá</span><strong>{money(selectedQuote.quote.totalAmount)}</strong></div><p className="sprint8-readonly-note">Admin có thể xem báo giá. Khách hàng xác nhận hoặc từ chối báo giá trong tài khoản của mình.</p></section></div>}

        {selectedReview && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReview(null); }}><section className="modal customer-modal sprint8-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-review-detail-title"><div className="modal-header"><div><span className="appointment-card-reference">{selectedReview.ticketCode}</span><h2 id="admin-review-detail-title">Chi tiết đánh giá</h2></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setSelectedReview(null)}>×</button></div><div className="appointment-details-grid"><div><span>Khách hàng</span><strong>{selectedReview.customerName}</strong></div><div><span>Dịch vụ</span><strong>{selectedReview.serviceName || "Dịch vụ sửa chữa"}</strong></div><div><span>Đánh giá</span><strong className="admin-review-detail-rating">{"★".repeat(selectedReview.rating)}{"☆".repeat(5 - selectedReview.rating)} ({selectedReview.rating}/5 sao)</strong></div><div><span>Ngày gửi</span><strong>{dateTime(selectedReview.createdAt)}</strong></div><div className="appointment-detail-full"><span>Nội dung nhận xét</span><strong>{selectedReview.comment?.trim() || "Khách hàng không để lại nhận xét."}</strong></div></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setSelectedReview(null)}>Đóng</button></div></section></div>}


        {warrantyDetail && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && busyId !== warrantyDetail.id) closeWarrantyDetail(); }}><section className="modal customer-modal sprint8-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-warranty-detail-title"><div className="modal-header"><div><span className="appointment-card-reference">{warrantyDetail.ticketCode}</span><h2 id="admin-warranty-detail-title">Chi tiết yêu cầu bảo hành</h2></div><button className="modal-close" type="button" aria-label="Đóng" disabled={busyId === warrantyDetail.id} onClick={closeWarrantyDetail}>×</button></div><div className="appointment-details-grid"><div><span>Khách hàng</span><strong>{warrantyDetail.customerName}</strong></div><div><span>Thiết bị</span><strong>{warrantyDetail.device}</strong></div><div><span>Dịch vụ</span><strong>{warrantyDetail.serviceName || "Dịch vụ sửa chữa"}</strong></div><div><span>Ngày gửi yêu cầu</span><strong>{dateTime(warrantyDetail.createdAt)}</strong></div><div><span>Trạng thái</span><strong>{statusLabel(warrantyDetail.status)}</strong></div><div className="appointment-detail-full"><span>Lý do bảo hành</span><strong>{warrantyDetail.reason}</strong></div>{warrantyDetail.description && <div className="appointment-detail-full"><span>Mô tả bổ sung</span><strong>{warrantyDetail.description}</strong></div>}{warrantyDetail.resolutionNote && <div className="appointment-detail-full"><span>Ý kiến admin đã gửi</span><strong>{warrantyDetail.resolutionNote}</strong></div>}</div>{warrantyDetail.hasAttachment && (warrantyDetail.attachmentContentType?.toLocaleLowerCase().startsWith("image/") ? (busyId === warrantyDetail.id && !attachmentPreview ? <p className="warranty-image-loading" role="status">\u0110ang t\u1ea3i \u1ea3nh...</p> : null) : <div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={busyId === warrantyDetail.id} onClick={() => void openAttachment(warrantyDetail)}>{busyId === warrantyDetail.id ? "\u0110ang t\u1ea3i..." : "T\u1ea3i t\u1ec7p \u0111\u00ednh k\u00e8m"}</button></div>)}{attachmentPreview && <div className="warranty-attachment-thumbnail"><span>{attachmentPreview.name}</span><button className="warranty-thumbnail-button" type="button" aria-label={"Ph\u00f3ng to ảnh bảo hành"} onClick={() => setAttachmentZoomOpen(true)}><img src={attachmentPreview.url} alt={attachmentPreview.name} onError={() => setError("Kh\u00f4ng th\u1ec3 hi\u1ec3n th\u1ecb \u1ea3nh \u0111\u00ednh k\u00e8m. Vui l\u00f2ng ki\u1ec3m tra t\u1ec7p tr\u00ean Backend.")} /></button><small>{"B\u1ea5m v\u00e0o \u1ea3nh \u0111\u1ec3 ph\u00f3ng to"}</small></div>}{warrantyDetail.status === "PENDING" ? <form onSubmit={(event) => { event.preventDefault(); if (warrantyAction) void processWarranty(warrantyAction); }}><div className="appointment-form-group"><label htmlFor="admin-warranty-resolution">Ý kiến của admin gửi cho khách <span aria-hidden="true">*</span></label><textarea id="admin-warranty-resolution" rows={4} maxLength={2000} required value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Nhập nội dung phản hồi để khách hàng xem được..."/><small>{resolutionNote.length}/2000 ký tự</small></div>{error && <div className="error-message" role="alert">{error}</div>}<div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={busyId === warrantyDetail.id} onClick={() => { closeWarrantyDetail(); setWarrantyAction(null); }}>Đóng</button><button className="secondary-button" type="button" disabled={busyId === warrantyDetail.id} onClick={() => void processWarranty("REJECTED")}>{busyId === warrantyDetail.id && warrantyAction === "REJECTED" ? "Đang lưu..." : "Từ chối"}</button><button className="primary-button" type="button" disabled={busyId === warrantyDetail.id} onClick={() => void processWarranty("APPROVED")}>{busyId === warrantyDetail.id && warrantyAction === "APPROVED" ? "Đang lưu..." : "Đồng ý"}</button></div></form> : <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={closeWarrantyDetail}>Đóng</button></div>}</section></div>}
        {attachmentPreview && attachmentZoomOpen && <div className="modal-overlay warranty-image-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAttachmentZoomOpen(false); }}><section className="modal customer-modal sprint8-admin-dialog warranty-image-dialog" role="dialog" aria-modal="true" aria-label={"Xem \u1ea3nh b\u1ea3o h\u00e0nh"} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>{attachmentPreview.name}</h2><button className="modal-close" type="button" aria-label={"\u0110\u00f3ng"} onClick={() => setAttachmentZoomOpen(false)}>{"\u00d7"}</button></div><img src={attachmentPreview.url} alt={attachmentPreview.name} onError={() => setError("Kh\u00f4ng th\u1ec3 hi\u1ec3n th\u1ecb \u1ea3nh \u0111\u00ednh k\u00e8m. Vui l\u00f2ng ki\u1ec3m tra t\u1ec7p tr\u00ean Backend.")} /></section></div>}

    </section>;
}

function EmptyState({ title }: { title: string }) {
    return <div className="appointment-panel appointment-empty-state"><h3>{title}</h3><p>Dữ liệu phù hợp sẽ xuất hiện tại đây.</p></div>;
}

export default RepairSprint8;
