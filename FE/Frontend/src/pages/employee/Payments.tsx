import { useCallback, useEffect, useState } from "react";
import { confirmRepairPaymentApi, getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getMyAssignedRepairTicketsApi } from "../../api/repairTicketApi";
import type { RepairTicket } from "../../types/repairTicket";
import type { RepairPayment } from "../../types/repairPayment";

type TicketPayment = { ticket: RepairTicket; payment: RepairPayment };
const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const paymentMethod = (method: RepairPayment["method"]) => method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt";
const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể tải hoặc xác nhận thanh toán.";

function EmployeePayments() {
    const [records, setRecords] = useState<TicketPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const tickets = await getMyAssignedRepairTicketsApi();
            const payments = await Promise.all(tickets.map(async (ticket) => {
                try { return (await getRepairPaymentsApi(ticket.id)).map((payment) => ({ ticket, payment })); }
                catch (e: any) { if (e.response?.status === 404) return []; throw e; }
            }));
            setRecords(payments.flat().sort((a, b) => b.payment.createdAt.localeCompare(a.payment.createdAt)));
        } catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const confirm = async (record: TicketPayment) => {
        setConfirmingId(record.payment.id);
        setError("");
        setNotice("");
        try {
            await confirmRepairPaymentApi(record.payment.id);
            setNotice(`Đã xác nhận thanh toán cho phiếu ${record.payment.ticketCode}.`);
            await load();
        } catch (e: any) { setError(messageOf(e)); }
        finally { setConfirmingId(null); }
    };

    const pending = records.filter(({ payment }) => payment.status === "PENDING");
    const paid = records.filter(({ payment }) => payment.status === "PAID");

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Xác nhận thanh toán</h1><p>Đối chiếu tiền khách đã gửi hoặc nộp tại cửa hàng rồi xác nhận giao dịch.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-results-heading"><div><h2>Đang chờ xác nhận</h2><p>{loading ? "Đang tải..." : `${pending.length} giao dịch`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải thanh toán...</div> : pending.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không có giao dịch chờ xác nhận</h2><p>Các yêu cầu thanh toán của khách sẽ xuất hiện tại đây.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Số tiền</th><th>Hình thức</th><th>Ngày yêu cầu</th><th>Thao tác</th></tr></thead><tbody>{pending.map((record) => <tr key={record.payment.id}><td><strong>{record.payment.ticketCode}</strong></td><td>{record.ticket.customerName}</td><td>{record.ticket.device}</td><td><strong>{money(record.payment.amount)}</strong></td><td>{paymentMethod(record.payment.method)}</td><td>{new Date(record.payment.createdAt).toLocaleString("vi-VN")}</td><td><button className="primary-button" type="button" disabled={confirmingId === record.payment.id} onClick={() => void confirm(record)}>{confirmingId === record.payment.id ? "Đang xác nhận..." : "Đã nhận tiền · Xác nhận"}</button></td></tr>)}</tbody></table></div>}
        {paid.length > 0 && <><div className="appointment-results-heading payment-paid-heading"><div><h2>Đã thanh toán</h2><p>{paid.length} giao dịch</p></div></div><div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Số tiền</th><th>Hình thức</th><th>Thời gian xác nhận</th><th>Trạng thái</th></tr></thead><tbody>{paid.map((record) => <tr key={record.payment.id}><td><strong>{record.payment.ticketCode}</strong></td><td>{record.ticket.customerName}</td><td>{record.ticket.device}</td><td>{money(record.payment.amount)}</td><td>{paymentMethod(record.payment.method)}</td><td>{record.payment.paidAt ? new Date(record.payment.paidAt).toLocaleString("vi-VN") : "—"}</td><td><span className="appointment-status completed">Đã thanh toán</span></td></tr>)}</tbody></table></div></>}
    </main>;
}

export default EmployeePayments;
