import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { decideRepairQuoteApi, getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairHistoryEntry } from "../../types/repairTicket";
import type { RepairQuote } from "../../types/repairQuote";
import { statusLabel } from "../../utils/statusLabel";

type CustomerQuote = { quote: RepairQuote; history: RepairHistoryEntry };
const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const messageOf = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        return body?.message || body?.error || "Không thể xử lý báo giá. Vui lòng thử lại.";
    }
    return "Đã xảy ra lỗi khi xử lý báo giá. Vui lòng thử lại.";
};

function QuoteApproval() {
    const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTab, setActiveTab] = useState<"current" | "past">("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selected, setSelected] = useState<CustomerQuote | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const history = await getMyRepairHistoryApi();
            const linkedQuotes = await Promise.all(history.map(async (entry) => {
                try { return { quote: await getRepairQuoteApi(entry.ticketId), history: entry }; }
                catch (e: unknown) { if (axios.isAxiosError(e) && e.response?.status === 404) return null; throw e; }
            }));
            setQuotes(linkedQuotes.filter((item): item is CustomerQuote => item !== null)
                .sort((a, b) => b.quote.createdAt.localeCompare(a.quote.createdAt)));
        } catch (e: unknown) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const currentQuotes = quotes.filter(({ quote }) => quote.status === "SENT");
    const pastQuotes = quotes.filter(({ quote }) => quote.status !== "SENT");
    const periodQuotes = activeTab === "current" ? currentQuotes : pastQuotes;
    const visibleQuotes = periodQuotes.filter(({ quote }) => statusFilter === "ALL" || quote.status === statusFilter);

    const decide = async (quote: RepairQuote, decision: "ACCEPTED" | "REJECTED") => {
        setBusyId(quote.id); setError(""); setNotice("");
        try {
            const updated = await decideRepairQuoteApi(quote.id, decision);
            setQuotes((current) => current.map((entry) => entry.quote.id === updated.id ? { ...entry, quote: updated } : entry));
            setSelected((current) => current?.quote.id === updated.id ? { ...current, quote: updated } : current);
            setNotice(decision === "ACCEPTED" ? `Bạn đã xác nhận báo giá ${updated.quoteCode}.` : `Bạn đã từ chối báo giá ${updated.quoteCode}.`);
        } catch (e: unknown) { setError(messageOf(e)); }
        finally { setBusyId(null); }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Duyệt báo giá</h1><p>Xem chi tiết hạng mục và xác nhận hoặc từ chối báo giá sửa chữa.</p></header>
        {error && <div className="error-message" role="alert">{error}<button className="inline-retry-button" type="button" onClick={() => void load()}>Tải lại</button></div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại báo giá"><button className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "current"} onClick={() => setActiveTab("current")}>Hiện tại <span>{currentQuotes.length}</span></button><button className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "past"} onClick={() => setActiveTab("past")}>Đã qua <span>{pastQuotes.length}</span></button></div>
        <div className="appointment-filter-row"><label htmlFor="quote-status-filter">Lọc trạng thái</label><select id="quote-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="SENT">Chờ xác nhận</option><option value="ACCEPTED">Đã xác nhận</option><option value="REJECTED">Đã từ chối</option></select></div>
        <div className="appointment-results-heading"><div><h2>{activeTab === "current" ? "Báo giá hiện tại" : "Báo giá đã qua"}</h2><p>{loading ? "Đang tải..." : `${visibleQuotes.length} báo giá`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải báo giá...</div> : error && quotes.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không tải được báo giá</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử tải lại</button></div> : visibleQuotes.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>{activeTab === "current" ? "Không có báo giá cần xác nhận" : "Chưa có báo giá đã xử lý"}</h2><p>{statusFilter === "ALL" ? "Báo giá tương ứng sẽ xuất hiện tại đây." : "Không có báo giá nào khớp trạng thái đã chọn."}</p></div> : <div className="repair-progress-list">{visibleQuotes.map(({ quote, history }) => <article className="appointment-panel customer-quote-card" key={quote.id}><div className="appointment-card-top"><div><span className="appointment-card-reference">{quote.quoteCode} · {quote.ticketCode}</span><h2>{history.device}</h2><p>Ngày gửi: {new Date(quote.createdAt).toLocaleString("vi-VN")}</p></div><span className={`appointment-status ${quote.status.toLowerCase()}`}>{statusLabel(quote.status)}</span></div>
            <div className="quote-total"><span>{quote.items.length} hạng mục · Tổng cộng</span><strong>{money(quote.totalAmount)}</strong></div>
            <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setSelected({ quote, history })}>Xem chi tiết báo giá</button></div>
        </article>)}</div>}
        {selected && <div className="repair-detail-backdrop" role="presentation" onClick={() => setSelected(null)}>
            <section className="appointment-panel repair-detail-dialog sprint8-quote-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-detail-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{selected.quote.quoteCode} · {selected.quote.ticketCode}</span><h2 id="quote-detail-title">Chi tiết báo giá</h2><p>{selected.history.device} · {selected.history.service || selected.history.bookedService || "Dịch vụ sửa chữa"}</p></div><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Đóng</button></div>
                <div className="appointment-details-grid"><div><span>Trạng thái</span><strong>{statusLabel(selected.quote.status)}</strong></div><div><span>Ngày gửi</span><strong>{new Date(selected.quote.createdAt).toLocaleString("vi-VN")}</strong></div></div>
                <div className="quote-items-list">{selected.quote.items.map((item) => <div className="quote-customer-line sprint8-quote-line" key={item.id}><div><strong>{item.name}</strong><small>{item.quantity} × {money(item.unitPrice)}</small></div><strong>{money(item.lineTotal)}</strong></div>)}</div>
                <div className="quote-total"><span>Tổng thanh toán</span><strong>{money(selected.quote.totalAmount)}</strong></div>
                {selected.quote.status === "SENT" && <div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={busyId === selected.quote.id} onClick={() => void decide(selected.quote, "REJECTED")}>Từ chối báo giá</button><button className="primary-button" type="button" disabled={busyId === selected.quote.id} onClick={() => void decide(selected.quote, "ACCEPTED")}>{busyId === selected.quote.id ? "Đang gửi..." : "Xác nhận báo giá"}</button></div>}
                {selected.quote.status !== "SENT" && <p className="sprint8-readonly-note">Bạn đã {selected.quote.status === "ACCEPTED" ? "xác nhận" : "từ chối"} báo giá này.</p>}
            </section>
        </div>}
    </main>;
}

export default QuoteApproval;
