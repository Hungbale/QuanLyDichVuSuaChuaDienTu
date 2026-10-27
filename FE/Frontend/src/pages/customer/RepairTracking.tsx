import { useEffect, useMemo, useState } from "react";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairTrackingApi } from "../../api/repairTrackingApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairHistoryEntry } from "../../types/repairTicket";
import type { RepairTrackingDetails } from "../../types/repairTracking";
import { statusLabel } from "../../utils/statusLabel";
import { repairTrackingTitle } from "../../utils/repairTrackingTitle";

type TimelineEvent = {
    id: string;
    title: string;
    date: string | null;
    description?: string | null;
    actor?: string;
    photos?: { fileName: string; dataUri: string }[];
};

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể tải tiến trình sửa chữa.";
const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
const formatMoney = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
const statusTitle = (status: string) => ({
    "Đã tiếp nhận": "Tiếp nhận thiết bị",
    "Đang kiểm tra": "Kiểm tra thiết bị",
    "Chờ báo giá": "Hoàn tất kiểm tra",
    "Chờ xác nhận báo giá": "Gửi báo giá",
    "Chờ khách xác nhận": "Gửi báo giá",
    "Đã báo giá": "Gửi báo giá",
    "Đang sửa": "Khách xác nhận báo giá",
    "Khách từ chối": "Khách từ chối báo giá",
    "Khách đã từ chối": "Khách từ chối báo giá",
    "Đã kết thúc": "Kết thúc phiếu",
    "Hoàn thành": "Hoàn thành sửa chữa",
}[status] || statusLabel(status));

function normalize(value: string | null | undefined) {
    return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi").trim();
}

function RepairTracking() {
    const [items, setItems] = useState<RepairHistoryEntry[]>([]);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"current" | "past">("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selected, setSelected] = useState<RepairHistoryEntry | null>(null);
    const [tracking, setTracking] = useState<RepairTrackingDetails | null>(null);
    const [quote, setQuote] = useState<RepairQuote | null>(null);
    const [payments, setPayments] = useState<RepairPayment[]>([]);
    const [previewPhoto, setPreviewPhoto] = useState<{ fileName: string; dataUri: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getMyRepairHistoryApi()
            .then(setItems)
            .catch((requestError: any) => setError(messageOf(requestError)))
            .finally(() => setLoading(false));
    }, []);

    const periodItems = useMemo(() => {
        const isPast = (item: RepairHistoryEntry) => Boolean(item.completedDate)
            || ["Hoàn thành", "Đã kết thúc", "Đã hủy", "Khách từ chối", "Khách đã từ chối", "COMPLETED", "CANCELLED", "CUSTOMER_DECLINED"].includes(item.status);
        return items.filter((item) => activeTab === "past" ? isPast(item) : !isPast(item))
            .sort((a, b) => (b.completedDate || b.ticketCode).localeCompare(a.completedDate || a.ticketCode));
    }, [items, activeTab]);

    const filteredItems = useMemo(() => {
        const term = normalize(search);
        return periodItems.filter((item) => (statusFilter === "ALL" || item.status === statusFilter)
            && (!term || [item.ticketCode, item.device, item.service, item.bookedService, item.status]
                .some((value) => normalize(value).includes(term))));
    }, [periodItems, search, statusFilter]);
    const availableStatuses = [...new Set(periodItems.map((item) => item.status))];

    const closeDetails = () => {
        setSelected(null);
        setTracking(null);
        setQuote(null);
        setPayments([]);
        setPreviewPhoto(null);
        setError("");
    };

    const showDetails = async (item: RepairHistoryEntry) => {
        setSelected(item);
        setTracking(null);
        setQuote(null);
        setPayments([]);
        setDetailLoading(true);
        setError("");
        try {
            const [trackingDetails, quoteDetails, paymentList] = await Promise.all([
                getRepairTrackingApi(item.ticketId),
                getRepairQuoteApi(item.ticketId).catch(() => null),
                getRepairPaymentsApi(item.ticketId).catch(() => [] as RepairPayment[]),
            ]);
            setTracking(trackingDetails);
            setQuote(quoteDetails);
            setPayments(paymentList);
        } catch (requestError: any) {
            setError(messageOf(requestError));
        } finally {
            setDetailLoading(false);
        }
    };

    const timeline = useMemo<TimelineEvent[]>(() => {
        if (!selected) return [];
        if (tracking?.timeline?.length) {
            return tracking.timeline.map((event, index) => {
                const matchingUpdate = tracking.updates.find((update) =>
                    update.createdAt === event.createdAt && update.status === event.details,
                );
                return {
                    id: `${event.type}-${index}`,
                    title: repairTrackingTitle(event.type, event.details),
                    date: event.createdAt,
                    description: [event.details, event.note].filter(Boolean).join("\n"),
                    actor: event.actorName,
                    photos: matchingUpdate?.photos.map((photo) => ({ fileName: photo.fileName, dataUri: photo.dataUri })),
                };
            });
        }
        const events: TimelineEvent[] = [];
        tracking?.updates.forEach((update) => events.push({
            id: `status-${update.id}`,
            title: statusTitle(update.status),
            date: update.createdAt,
            description: update.note,
            actor: update.employeeName,
            photos: update.photos.map((photo) => ({ fileName: photo.fileName, dataUri: photo.dataUri })),
        }));

        if (quote) {
            events.push({
                id: `quote-${quote.id}`,
                title: "Nhân viên gửi báo giá",
                date: quote.createdAt,
                description: `${quote.items.map((line) => `${line.name} × ${line.quantity}`).join(", ")} · Tổng ${formatMoney(quote.totalAmount)}`,
            });
        }

        payments.forEach((payment) => {
            events.push({
                id: `payment-created-${payment.id}`,
                title: "Tạo yêu cầu thanh toán",
                date: payment.createdAt,
                description: `${payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt tại cửa hàng"} · ${formatMoney(payment.amount)}`,
            });
            if (payment.paidAt) {
                events.push({
                    id: `payment-paid-${payment.id}`,
                    title: "Nhân viên xác nhận đã thanh toán",
                    date: payment.paidAt,
                    description: formatMoney(payment.amount),
                });
            }
        });

        return events.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    }, [selected, tracking, quote, payments]);

    const quoteDecisionLabel = quote?.status === "ACCEPTED" ? "Khách đã xác nhận báo giá"
        : quote?.status === "REJECTED" ? "Khách đã từ chối báo giá"
            : quote ? "Đang chờ khách xác nhận báo giá" : "Chưa có báo giá";

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Theo dõi sửa chữa</h1><p>Tìm phiếu và xem từng mốc xử lý thiết bị theo thời gian thực tế từ hệ thống.</p></header>
        {error && !selected && <div className="error-message" role="alert">{error}</div>}
        <form className="appointment-search-panel" onSubmit={(event) => event.preventDefault()}>
            <div className="appointment-form-group"><label htmlFor="repair-tracking-search">Tìm phiếu sửa chữa</label><input id="repair-tracking-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã phiếu, thiết bị, dịch vụ hoặc trạng thái" /></div>
            <div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={!search} onClick={() => setSearch("")}>Xóa tìm kiếm</button></div>
        </form>
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại tiến độ sửa chữa"><button className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "current"} onClick={() => setActiveTab("current")}>Hiện tại <span>{items.filter((item) => !item.completedDate && !["Hoàn thành", "Đã kết thúc", "Đã hủy", "Khách từ chối", "Khách đã từ chối", "COMPLETED", "CANCELLED", "CUSTOMER_DECLINED"].includes(item.status)).length}</span></button><button className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "past"} onClick={() => setActiveTab("past")}>Đã qua <span>{items.length - items.filter((item) => !item.completedDate && !["Hoàn thành", "Đã kết thúc", "Đã hủy", "Khách từ chối", "Khách đã từ chối", "COMPLETED", "CANCELLED", "CUSTOMER_DECLINED"].includes(item.status)).length}</span></button></div>
        <div className="appointment-filter-row"><label htmlFor="tracking-status-filter">Lọc trạng thái</label><select id="tracking-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{availableStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
        <div className="appointment-results-heading"><div><h2>Phiếu sửa chữa của tôi</h2><p>{loading ? "Đang tải..." : `${filteredItems.length} phiếu`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải tiến trình sửa chữa...</div> : items.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu sửa chữa</h2><p>Phiếu sẽ xuất hiện tại đây khi thiết bị được tiếp nhận.</p></div>
        ) : filteredItems.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Không tìm thấy phiếu phù hợp</h2><p>Thử đổi từ khóa hoặc trạng thái lọc.</p></div>
        ) : (
            <div className="repair-progress-list">{filteredItems.map((item) => <article className="appointment-panel repair-progress-card" key={item.ticketId}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{item.ticketCode}</span><h2>{item.device}</h2></div><span className="appointment-status">{statusLabel(item.status)}</span></div>
                <div className="appointment-details-grid"><div><span>Dịch vụ / hạng mục</span><strong>{item.service || item.bookedService || "Đang chờ kiểm tra và báo giá"}</strong></div><div><span>Ngày hoàn tất</span><strong>{item.completedDate ? new Date(`${item.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa hoàn thành"}</strong></div></div>
                <div className="appointment-search-actions"><button className="primary-button" type="button" onClick={() => void showDetails(item)}>Xem chi tiết tiến độ</button></div>
            </article>)}</div>
        )}

        {selected && <div className="repair-detail-backdrop" role="presentation" onClick={closeDetails}>
            <section className="appointment-panel repair-detail-dialog customer-tracking-dialog" role="dialog" aria-modal="true" aria-labelledby="tracking-detail-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{selected.ticketCode}</span><h2 id="tracking-detail-title">Tiến độ sửa chữa</h2><p>{selected.device}</p></div><button className="secondary-button" type="button" onClick={closeDetails}>Đóng</button></div>
                {error && <div className="error-message" role="alert">{error}</div>}
                {detailLoading ? <div className="table-state">Đang tải các mốc tiến độ...</div> : <>
                    <div className="appointment-details-grid tracking-summary"><div><span>Trạng thái hiện tại</span><strong>{statusLabel(tracking?.currentStatus || selected.status)}</strong></div><div><span>Phản hồi báo giá</span><strong>{quoteDecisionLabel}</strong></div><div><span>Dịch vụ</span><strong>{quote?.items.map((line) => line.name).join(", ") || selected.bookedService || selected.service || "Chưa có thông tin"}</strong></div></div>
                    {timeline.length === 0 ? <div className="appointment-empty-state"><p>Chưa có mốc tiến độ được ghi nhận.</p></div> : <ol className="repair-timeline">{timeline.map((event) => <li className="repair-timeline-event" key={event.id}>
                        <span className="repair-timeline-marker" aria-hidden="true" />
                        <div className="repair-timeline-content"><div className="repair-timeline-heading"><h3>{event.title}</h3><time>{event.date ? formatDateTime(event.date) : "Chưa có thời điểm"}</time></div>
                            {event.description?.split(/\r?\n/).map((line, index) => line.trim() ? <p key={`${event.id}-detail-${index}`}>{line.trim()}</p> : null)}{event.actor && <small>Thực hiện bởi: {event.actor}</small>}
                            {event.photos && event.photos.length > 0 && <div className="repair-timeline-photos">{event.photos.map((photo, index) => <button className="repair-timeline-photo-button" type="button" key={`${photo.fileName}-${index}`} onClick={() => setPreviewPhoto(photo)} aria-label={`Xem ảnh bằng chứng ${event.title}`}><img src={photo.dataUri} alt={`Bằng chứng ${event.title}`} loading="lazy" /></button>)}</div>}
                        </div>
                    </li>)}</ol>}
                </>}
            </section>
        </div>}
        {previewPhoto && <div className="repair-photo-preview-backdrop" role="presentation" onClick={() => setPreviewPhoto(null)}>
            <section className="repair-photo-preview-dialog" role="dialog" aria-modal="true" aria-label="Ảnh bằng chứng sửa chữa" onClick={(event) => event.stopPropagation()}>
                <div className="repair-photo-preview-heading"><strong>{previewPhoto.fileName}</strong><button className="secondary-button" type="button" onClick={() => setPreviewPhoto(null)}>Đóng</button></div>
                <img src={previewPhoto.dataUri} alt={`Ảnh bằng chứng ${previewPhoto.fileName}`} />
            </section>
        </div>}
    </main>;
}

export default RepairTracking;
