import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createServiceReviewApi, getMyServiceReviewsApi } from "../../api/serviceReviewApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { ServiceReview as ServiceReviewRecord } from "../../types/serviceReview";
import type { RepairHistoryEntry } from "../../types/repairTicket";

const isCompleted = (status: string) => ["COMPLETED", "HOÀN THÀNH", "ĐÃ HOÀN THÀNH"].includes(status.trim().toLocaleUpperCase("vi"));
const messageOf = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        return body?.message || body?.error || "Không thể tải hoặc lưu đánh giá. Vui lòng thử lại.";
    }
    return "Đã xảy ra lỗi khi xử lý đánh giá. Vui lòng thử lại.";
};
const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });

function ServiceReview() {
    const [tickets, setTickets] = useState<RepairHistoryEntry[]>([]);
    const [reviews, setReviews] = useState<ServiceReviewRecord[]>([]);
    const [ratings, setRatings] = useState<Record<number, number>>({});
    const [comments, setComments] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [history, ownReviews] = await Promise.all([getMyRepairHistoryApi(), getMyServiceReviewsApi()]);
            setTickets(history.filter((ticket) => isCompleted(ticket.status))
                .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || "")));
            setReviews(ownReviews);
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

    const reviewedIds = useMemo(() => new Set(reviews.map((review) => review.repairTicketId)), [reviews]);
    const pendingTickets = tickets.filter((ticket) => !reviewedIds.has(ticket.ticketId));
    const displayedCount = activeTab === "pending" ? pendingTickets.length : reviews.length;

    const submit = async (ticket: RepairHistoryEntry) => {
        const rating = ratings[ticket.ticketId] || 0;
        const comment = (comments[ticket.ticketId] || "").trim();
        if (rating < 1 || rating > 5) { setError("Vui lòng chọn số sao từ 1 đến 5 trước khi gửi đánh giá."); return; }
        if (comment.length > 1000) { setError("Nhận xét không được vượt quá 1.000 ký tự."); return; }

        setSavingId(ticket.ticketId);
        setError("");
        setNotice("");
        try {
            const created = await createServiceReviewApi(ticket.ticketId, { rating, ...(comment ? { comment } : {}) });
            setReviews((current) => [created, ...current]);
            setNotice(`Đã lưu đánh giá cho phiếu ${created.ticketCode}.`);
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        } finally {
            setSavingId(null);
        }
    };

    return <main className="management-page appointment-page sprint8-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Đánh giá dịch vụ</h1><p>Chia sẻ trải nghiệm sau khi phiếu sửa chữa đã hoàn thành. Mỗi phiếu chỉ được đánh giá một lần.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại đánh giá">
            <button className={activeTab === "pending" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "pending"} onClick={() => setActiveTab("pending")}>Chờ đánh giá <span>{pendingTickets.length}</span></button>
            <button className={activeTab === "submitted" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "submitted"} onClick={() => setActiveTab("submitted")}>Đã đánh giá <span>{reviews.length}</span></button>
        </div>
        <div className="appointment-results-heading"><div><h2>{activeTab === "pending" ? "Phiếu chờ đánh giá" : "Đánh giá đã gửi"}</h2><p>{loading ? "Đang tải..." : `${displayedCount} mục`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải lịch sử và đánh giá...</div> : activeTab === "pending" ? pendingTickets.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Không có phiếu chờ đánh giá</h2><p>Phiếu đã hoàn thành và chưa được đánh giá sẽ xuất hiện tại đây.</p></div>
        ) : <div className="sprint8-card-list">{pendingTickets.map((ticket) => <article className="appointment-panel sprint8-feature-card" key={ticket.ticketId}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">{ticket.ticketCode}</span><h2>{ticket.device}</h2><p>{ticket.service || ticket.bookedService || "Dịch vụ sửa chữa"}{ticket.completedDate ? ` · Hoàn thành ${new Date(`${ticket.completedDate}T00:00:00`).toLocaleDateString("vi-VN")}` : ""}</p></div><span className="appointment-status completed">Đủ điều kiện đánh giá</span></div>
            <div className="sprint8-review-form">
                <fieldset className="sprint8-rating-field"><legend>Đánh giá của bạn</legend><div className="sprint8-stars" role="radiogroup" aria-label={`Chọn số sao cho phiếu ${ticket.ticketCode}`}>
                    {[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={rating <= (ratings[ticket.ticketId] || 0) ? "sprint8-star selected" : "sprint8-star"} type="button" role="radio" aria-checked={ratings[ticket.ticketId] === rating} aria-label={`${rating} sao`} onClick={() => setRatings((current) => ({ ...current, [ticket.ticketId]: rating }))}>★</button>)}
                </div></fieldset>
                <div className="appointment-form-group"><label htmlFor={`review-comment-${ticket.ticketId}`}>Nhận xét <span>(không bắt buộc)</span></label><textarea id={`review-comment-${ticket.ticketId}`} maxLength={1000} rows={3} value={comments[ticket.ticketId] || ""} onChange={(event) => setComments((current) => ({ ...current, [ticket.ticketId]: event.target.value }))} placeholder="Chia sẻ chất lượng phục vụ và kết quả sửa chữa..." /><small>{(comments[ticket.ticketId] || "").length}/1000 ký tự</small></div>
                <button className="primary-button" type="button" disabled={savingId === ticket.ticketId} onClick={() => void submit(ticket)}>{savingId === ticket.ticketId ? "Đang gửi đánh giá..." : "Gửi đánh giá"}</button>
            </div>
        </article>)}</div> : reviews.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Bạn chưa gửi đánh giá nào</h2><p>Đánh giá của bạn sẽ được lưu tại đây sau khi gửi.</p></div>
        ) : <div className="sprint8-card-list">{reviews.map((review) => <article className="appointment-panel sprint8-feature-card" key={review.id}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">{review.ticketCode}</span><h2>{review.serviceName || "Dịch vụ sửa chữa"}</h2><p>Gửi lúc {formatDate(review.createdAt)}</p></div><strong className="sprint8-review-score" aria-label={`${review.rating} trên 5 sao`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} <span>{review.rating}/5</span></strong></div>
            {review.comment && <p className="sprint8-review-comment">{review.comment}</p>}
        </article>)}</div>}
    </main>;
}

export default ServiceReview;
