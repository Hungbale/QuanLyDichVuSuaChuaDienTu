import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { createRepairPaymentApi, getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairPayment, RepairPaymentMethod } from "../../types/repairPayment";
import type { RepairHistoryEntry } from "../../types/repairTicket";
import type { RepairQuote } from "../../types/repairQuote";

type PaymentItem = { history: RepairHistoryEntry; quote: RepairQuote; payments: RepairPayment[] };
const vietQrUrl = (amount: number, ticketCode: string) => {
    const params = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: `FIXHUB ${ticketCode}` });
    return `https://img.vietqr.io/image/970422-50007122005-compact2.png?${params.toString()}`;
};
const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const methodLabel = (method: RepairPaymentMethod) => method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt";
const messageOf = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        return body?.message || body?.error || "Không thể tải hoặc tạo yêu cầu thanh toán.";
    }
    return "Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng thử lại.";
};

function Payment() {
    const [items, setItems] = useState<PaymentItem[]>([]);
    const [methods, setMethods] = useState<Record<number, RepairPaymentMethod>>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTab, setActiveTab] = useState<"current" | "past">("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [createdPayment, setCreatedPayment] = useState<{ item: PaymentItem; payment: RepairPayment } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const history = await getMyRepairHistoryApi();
            const resolved = await Promise.all(history.map(async (entry): Promise<PaymentItem | null> => {
                const ticketId = entry.ticketId;
                try {
                    const quote = await getRepairQuoteApi(ticketId);
                    if (quote.status !== "ACCEPTED") return null;
                    const payments = await getRepairPaymentsApi(ticketId);
                    return { history: entry, quote, payments };
                } catch (e: unknown) {
                    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
                    throw e;
                }
            }));
            setItems(resolved.filter((item): item is PaymentItem => item !== null)
                .sort((a, b) => (b.payments[0]?.createdAt || b.quote.createdAt).localeCompare(a.payments[0]?.createdAt || a.quote.createdAt)));
        } catch (e: unknown) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const paymentState = (item: PaymentItem) => item.payments.some((entry) => entry.status === "PAID")
        ? "PAID" : item.payments.length ? "PENDING" : "UNPAID";
    const currentItems = items.filter((item) => paymentState(item) !== "PAID");
    const pastItems = items.filter((item) => paymentState(item) === "PAID");
    const periodItems = activeTab === "current" ? currentItems : pastItems;
    const visibleItems = periodItems.filter((item) => statusFilter === "ALL" || paymentState(item) === statusFilter);

    const createPayment = async (item: PaymentItem) => {
        const method = methods[item.quote.repairTicketId] || "BANK_TRANSFER";
        setSavingId(item.quote.repairTicketId);
        setError("");
        setNotice("");
        try {
            const payment = await createRepairPaymentApi(item.quote.repairTicketId, method);
            setNotice(`Đã tạo yêu cầu thanh toán ${payment.ticketCode} bằng ${methodLabel(method).toLowerCase()}.`);
            setCreatedPayment({ item, payment });
            void load();
        } catch (e: unknown) { setError(messageOf(e)); }
        finally { setSavingId(null); }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Thanh toán</h1><p>Thanh toán các báo giá đã được bạn xác nhận và theo dõi trạng thái giao dịch.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại thanh toán"><button className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "current"} onClick={() => setActiveTab("current")}>Hiện tại <span>{currentItems.length}</span></button><button className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "past"} onClick={() => setActiveTab("past")}>Đã qua <span>{pastItems.length}</span></button></div>
        <div className="appointment-filter-row"><label htmlFor="payment-status-filter">Lọc trạng thái</label><select id="payment-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="UNPAID">Chưa tạo yêu cầu</option><option value="PENDING">Chờ xác nhận</option><option value="PAID">Đã thanh toán</option></select></div>
        <div className="appointment-results-heading"><div><h2>{activeTab === "current" ? "Khoản thanh toán hiện tại" : "Khoản thanh toán đã qua"}</h2><p>{loading ? "Đang tải..." : `${visibleItems.length} khoản thanh toán`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải thông tin thanh toán...</div> : error && items.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không tải được thông tin thanh toán</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử tải lại</button></div> : visibleItems.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>{activeTab === "current" ? "Không có khoản thanh toán hiện tại" : "Chưa có khoản thanh toán đã qua"}</h2><p>Khoản thanh toán tương ứng sẽ xuất hiện tại đây.</p></div> : <div className="payment-list">{visibleItems.map((item) => {
            const payment = item.payments.find((entry) => entry.status === "PAID") || item.payments[0];
            const hasPaid = payment?.status === "PAID";
            return <article className="appointment-panel payment-card" key={item.quote.id}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{item.quote.quoteCode} · {item.quote.ticketCode}</span><h2>{item.history.device}</h2><p>{item.history.service || "Dịch vụ sửa chữa"}</p></div><span className={`appointment-status ${hasPaid ? "completed" : payment ? "pending" : ""}`}>{hasPaid ? "Đã thanh toán" : payment ? "Chờ xác nhận thanh toán" : "Chưa thanh toán"}</span></div>
                {payment ? <div className="payment-create-row"><button className="secondary-button" type="button" onClick={() => setCreatedPayment({ item, payment })}>Xem lại yêu cầu thanh toán</button></div> : <>
                    <div className="appointment-details-grid"><div><span>Số tiền</span><strong>{money(item.quote.totalAmount)}</strong></div><div><span>Hạn thanh toán</span><strong>30 ngày kể từ khi tạo yêu cầu</strong></div></div>
                    <div className="payment-create-row"><div className="appointment-form-group"><label htmlFor={`payment-method-${item.quote.id}`}>Hình thức thanh toán</label><select id={`payment-method-${item.quote.id}`} value={methods[item.quote.repairTicketId] || "BANK_TRANSFER"} onChange={(e) => setMethods({ ...methods, [item.quote.repairTicketId]: e.target.value as RepairPaymentMethod })}><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt tại cửa hàng</option></select></div><button className="primary-button" type="button" disabled={savingId === item.quote.repairTicketId} onClick={() => void createPayment(item)}>{savingId === item.quote.repairTicketId ? "Đang tạo..." : "Tạo yêu cầu thanh toán"}</button></div>
                </>}
            </article>;
        })}</div>}
        {createdPayment && <div className="repair-detail-backdrop" role="presentation" onClick={() => setCreatedPayment(null)}>
            <section className="appointment-panel repair-detail-dialog payment-created-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-created-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{createdPayment.payment.ticketCode}</span><h2 id="payment-created-title">Đã tạo yêu cầu thanh toán</h2><p>{createdPayment.item.history.device} · {createdPayment.item.quote.ticketCode}</p></div><button className="secondary-button" type="button" onClick={() => setCreatedPayment(null)}>Đóng</button></div>
                <div className="appointment-details-grid"><div><span>Số tiền</span><strong>{money(createdPayment.payment.amount)}</strong></div><div><span>Hình thức thanh toán</span><strong>{methodLabel(createdPayment.payment.method)}</strong></div><div><span>Hạn thanh toán</span><strong>{new Date(`${createdPayment.payment.dueDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div><span>Trạng thái</span><strong>{createdPayment.payment.status === "PAID" ? "Đã thanh toán" : "Chờ xác nhận"}</strong></div></div>
                {createdPayment.payment.method === "BANK_TRANSFER" ? <section className="payment-qr-panel" aria-label="Mã QR chuyển khoản">
                    <div><span className="appointment-eyebrow">THANH TOÁN CHUYỂN KHOẢN</span><h3>Quét mã QR để chuyển đúng số tiền</h3><p>MBBank · 50007122005</p><p>Nội dung chuyển khoản: <strong>FIXHUB {createdPayment.payment.ticketCode}</strong></p><p>Sau khi chuyển khoản, nhân viên sẽ xác nhận trên hệ thống.</p></div>
                    <img src={vietQrUrl(createdPayment.payment.amount, createdPayment.payment.ticketCode)} alt={`QR chuyển ${money(createdPayment.payment.amount)} đến MBBank`} />
                </section> : <p className="payment-pending-note">Vui lòng thanh toán tiền mặt tại cửa hàng. Nhân viên sẽ xác nhận giao dịch trên hệ thống.</p>}
            </section>
        </div>}
    </main>;
}

export default Payment;
