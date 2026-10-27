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
    const [activeTab, setActiveTab] = useState<"current" | "past">("current");
    const [statusFilter, setStatusFilter] = useState("ALL");

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

    const paid = records.filter(({ payment }) => payment.status === "PAID");
    const currentRecords = records.filter(({ payment }) => payment.status !== "PAID");
    const pastRecords = paid;
    const periodRecords = activeTab === "current" ? currentRecords : pastRecords;
    const visibleRecords = periodRecords.filter(({ payment }) => statusFilter === "ALL" || payment.status === statusFilter);

    return <main className="management-page appointment-page">
        <header className="appointment-page-header"><span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span><h1>Xác nhận thanh toán</h1><p>Đối chiếu tiền khách đã gửi hoặc nộp tại cửa hàng rồi xác nhận giao dịch.</p></header>
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-tabs" role="tablist" aria-label="Phân loại thanh toán nhân viên"><button className={activeTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "current"} onClick={() => setActiveTab("current")}>Hiện tại <span>{currentRecords.length}</span></button><button className={activeTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={activeTab === "past"} onClick={() => setActiveTab("past")}>Đã qua <span>{pastRecords.length}</span></button></div>
        <div className="appointment-filter-row"><label htmlFor="employee-payment-status">Lọc trạng thái</label><select id="employee-payment-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chờ xác nhận</option><option value="PAID">Đã thanh toán</option></select></div>
        <div className="appointment-results-heading"><div><h2>Thanh toán {activeTab === "current" ? "hiện tại" : "đã qua"}</h2><p>{loading ? "Đang tải..." : `${visibleRecords.length} giao dịch`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải thanh toán...</div> : visibleRecords.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>{activeTab === "current" ? "Không có giao dịch hiện tại" : "Chưa có giao dịch đã qua"}</h2><p>Giao dịch phù hợp sẽ xuất hiện tại đây.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Số tiền</th><th>Hình thức</th><th>Thời gian</th><th>Trạng thái / thao tác</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.payment.id}><td><strong>{record.payment.ticketCode}</strong></td><td>{record.ticket.customerName}</td><td>{record.ticket.device}</td><td><strong>{money(record.payment.amount)}</strong></td><td>{paymentMethod(record.payment.method)}</td><td>{new Date(record.payment.paidAt || record.payment.createdAt).toLocaleString("vi-VN")}</td><td>{record.payment.status === "PENDING" ? <button className="primary-button" type="button" disabled={confirmingId === record.payment.id} onClick={() => void confirm(record)}>{confirmingId === record.payment.id ? "Đang xác nhận..." : "Đã nhận tiền · Xác nhận"}</button> : <span className="appointment-status completed">Đã thanh toán</span>}</td></tr>)}</tbody></table></div>}
    </main>;
}

export default EmployeePayments;
