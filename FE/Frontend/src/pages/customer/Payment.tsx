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
const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN");
const methodLabel = (method: RepairPaymentMethod) => method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt";
const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể tải hoặc tạo yêu cầu thanh toán.";

function Payment() {
    const [items, setItems] = useState<PaymentItem[]>([]);
    const [methods, setMethods] = useState<Record<number, RepairPaymentMethod>>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const history = await getMyRepairHistoryApi();
            const resolved = await Promise.all(history.map(async (entry): Promise<PaymentItem | null> => {
                const ticketCodeMatch = /^PS(\d+)$/i.exec(entry.ticketCode);
                if (!ticketCodeMatch) return null;
                const ticketId = Number(ticketCodeMatch[1]);
                try {
                    const quote = await getRepairQuoteApi(ticketId);
                    if (quote.status !== "ACCEPTED") return null;
                    const payments = await getRepairPaymentsApi(ticketId);
                    return { history: entry, quote, payments };
                } catch (e: any) {
                    if (e.response?.status === 404) return null;
                    throw e;
                }
            }));
            setItems(resolved.filter((item): item is PaymentItem => item !== null));
        } catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const createPayment = async (item: PaymentItem) => {
        const method = methods[item.quote.repairTicketId] || "BANK_TRANSFER";
        setSavingId(item.quote.repairTicketId);
        setError("");
        setNotice("");
        try {
            const payment = await createRepairPaymentApi(item.quote.repairTicketId, method);
            setNotice(`Đã tạo yêu cầu thanh toán ${payment.ticketCode} bằng ${methodLabel(method).toLowerCase()}.`);
            await load();
        } catch (e: any) { setError(messageOf(e)); }
        finally { setSavingId(null); }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span><h1>Thanh toán</h1><p>Thanh toán các báo giá đã được bạn xác nhận và theo dõi trạng thái giao dịch.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-results-heading"><div><h2>Báo giá có thể thanh toán</h2><p>{loading ? "Đang tải..." : `${items.length} khoản thanh toán`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải thông tin thanh toán...</div> : items.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có khoản thanh toán</h2><p>Khoản thanh toán sẽ xuất hiện sau khi bạn xác nhận báo giá sửa chữa.</p></div> : <div className="payment-list">{items.map((item) => {
            const payment = item.payments.find((entry) => entry.status === "PAID") || item.payments[0];
            const hasPaid = payment?.status === "PAID";
            return <article className="appointment-panel payment-card" key={item.quote.id}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{item.quote.quoteCode} · {item.quote.ticketCode}</span><h2>{item.history.device}</h2><p>{item.history.service || "Dịch vụ sửa chữa"}</p></div><span className={`appointment-status ${hasPaid ? "completed" : payment ? "pending" : ""}`}>{hasPaid ? "Đã thanh toán" : payment ? "Chờ xác nhận thanh toán" : "Chưa thanh toán"}</span></div>
                <div className="appointment-details-grid"><div><span>Số tiền</span><strong>{money(item.quote.totalAmount)}</strong></div><div><span>Hạn thanh toán</span><strong>{payment ? new Date(`${payment.dueDate}T00:00:00`).toLocaleDateString("vi-VN") : "30 ngày kể từ khi tạo yêu cầu"}</strong></div></div>
                {payment && <div className="payment-transaction"><div><span>Mã phiếu</span><strong>{payment.ticketCode}</strong></div><div><span>Hình thức</span><strong>{methodLabel(payment.method)}</strong></div><div><span>Tạo lúc</span><strong>{dateTime(payment.createdAt)}</strong></div>{payment.paidAt && <div><span>Đã thanh toán lúc</span><strong>{dateTime(payment.paidAt)}</strong></div>}</div>}
                {!payment && !hasPaid && <div className="payment-create-row"><div className="appointment-form-group"><label htmlFor={`payment-method-${item.quote.id}`}>Hình thức thanh toán</label><select id={`payment-method-${item.quote.id}`} value={methods[item.quote.repairTicketId] || "BANK_TRANSFER"} onChange={(e) => setMethods({ ...methods, [item.quote.repairTicketId]: e.target.value as RepairPaymentMethod })}><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt tại cửa hàng</option></select></div><button className="primary-button" type="button" disabled={savingId === item.quote.repairTicketId} onClick={() => void createPayment(item)}>{savingId === item.quote.repairTicketId ? "Đang tạo..." : "Tạo yêu cầu thanh toán"}</button></div>}
                {payment?.status === "PENDING" && <p className="payment-pending-note">Yêu cầu đã được tạo. Trạng thái sẽ chuyển thành đã thanh toán sau khi nhận được tiền và xác nhận trên hệ thống.</p>}
                {payment?.status === "PENDING" && payment.method === "BANK_TRANSFER" && <section className="payment-qr-panel" aria-label="Mã QR chuyển khoản">
                    <div><span className="appointment-eyebrow">THANH TOÁN CHUYỂN KHOẢN</span><h3>Quét mã QR để chuyển đúng số tiền</h3><p>MBBank · 50007122005</p><p>Nội dung chuyển khoản: <strong>FIXHUB {payment.ticketCode}</strong></p><p>Sau khi chuyển khoản, nhân viên sẽ xác nhận trên hệ thống.</p></div>
                    <img src={vietQrUrl(item.quote.totalAmount, payment.ticketCode)} alt={`QR chuyển ${money(item.quote.totalAmount)} đến MBBank`} loading="lazy" />
                </section>}
            </article>;
        })}</div>}
    </main>;
}

export default Payment;
