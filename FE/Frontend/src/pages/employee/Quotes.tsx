import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyEmployeeProfileApi } from "../../api/employeeApi";
import { createRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import { getServicesApi } from "../../api/serviceApi";
import type { RepairQuoteItemRequest } from "../../types/repairQuote";
import type { RepairTicket } from "../../types/repairTicket";
import type { ServiceItem } from "../../types/service";

type DraftItem = { serviceId: string; quantity: string };
const emptyItem = (): DraftItem => ({ serviceId: "", quantity: "1" });
const money = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể xử lý báo giá.";
const quoteReady = (status: string) => ["Đã kiểm tra", "Chờ báo giá", "Đã báo giá"].includes(status);
const quoteWaiting = (status: string) => ["Chờ xác nhận báo giá", "Chờ khách xác nhận"].includes(status);

function EmployeeQuotes() {
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedTicketId = Number(searchParams.get("ticketId"));
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<RepairTicket | null>(null);
    const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);
    const [endingId, setEndingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [profile, ticketList, serviceList] = await Promise.all([
                getMyEmployeeProfileApi(),
                getRepairTicketsApi(),
                getServicesApi({ status: "ACTIVE" }),
            ]);
            setTickets(ticketList.filter((ticket) => ticket.technicianId === profile.id));
            setServices(serviceList);
        } catch (e: any) {
            setError(messageOf(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (!requestedTicketId || loading) return;
        const ticket = tickets.find((candidate) => candidate.id === requestedTicketId);
        if (!ticket) {
            setError("Phiếu này không được phân công cho tài khoản nhân viên hiện tại.");
            return;
        }
        if (!quoteReady(ticket.status)) {
            setError("Phiếu này chưa ở bước lập báo giá hoặc báo giá đã được gửi.");
            return;
        }
        setSelected(ticket);
        setItems([emptyItem()]);
    }, [requestedTicketId, loading, tickets]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selected) return;
        const payload: RepairQuoteItemRequest[] = items.map((item) => {
            const service = services.find((candidate) => candidate.id === Number(item.serviceId));
            return { name: service?.name || "", quantity: Number(item.quantity), unitPrice: service?.price ?? -1 };
        });
        if (!payload.length || payload.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
            setError("Chọn dịch vụ và số lượng hợp lệ cho từng hạng mục.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const quote = await createRepairQuoteApi(selected.id, { items: payload });
            setNotice(`Đã gửi báo giá ${quote.quoteCode} cho ${quote.customerName}.`);
            setSelected(null);
            setItems([emptyItem()]);
            if (searchParams.has("ticketId")) setSearchParams({}, { replace: true });
            await load();
        } catch (e: any) {
            setError(messageOf(e));
        } finally {
            setSaving(false);
        }
    };

    const finishRejectedTicket = async (ticket: RepairTicket) => {
        setEndingId(ticket.id);
        setError("");
        setNotice("");
        try {
            await updateRepairTicketApi(ticket.id, {
                customerId: ticket.customerId,
                device: ticket.device,
                receivedDate: ticket.receivedDate,
                status: "Đã kết thúc",
                technicianId: ticket.technicianId,
            });
            setNotice(`Đã kết thúc phiếu ${ticket.ticketCode}.`);
            await load();
        } catch (e: any) {
            setError(messageOf(e));
        } finally {
            setEndingId(null);
        }
    };

    const closeEditor = () => {
        setSelected(null);
        if (searchParams.has("ticketId")) setSearchParams({}, { replace: true });
    };

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span>
                <h1>Tạo và gửi báo giá</h1>
                <p>Lập các hạng mục sửa chữa và gửi tổng chi phí cho khách hàng xác nhận.</p>
            </header>
            {error && <div className="error-message" role="alert">{error}</div>}
            {notice && <div className="success-message" role="status">{notice}</div>}

            <div className="appointment-results-heading"><div><h2>Phiếu được phân công cho tôi</h2><p>{loading ? "Đang tải..." : `${tickets.length} phiếu`}</p></div></div>
            {loading ? <div className="appointment-panel table-state">Đang tải phiếu sửa chữa...</div> : tickets.length === 0 ? (
                <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu được phân công cho bạn</h2></div>
            ) : (
                <div className="appointment-panel appointment-table-container">
                    <table className="appointment-table repair-ticket-table">
                        <thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Trạng thái</th><th>Báo giá</th></tr></thead>
                        <tbody>{tickets.map((ticket) => (
                            <tr key={ticket.id}>
                                <td><strong>{ticket.ticketCode}</strong></td>
                                <td>{ticket.customerName}</td>
                                <td>{ticket.device}</td>
                                <td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td>
                                <td><span className="appointment-status">{ticket.status === "Đã kết thúc" ? "Đã kết thúc" : ticket.status === "Khách từ chối" || ticket.status === "Khách đã từ chối" ? "Khách đã từ chối" : quoteWaiting(ticket.status) ? "Chờ khách xác nhận" : ticket.status}</span></td>
                                <td>
                                    {quoteReady(ticket.status) ? <button className="primary-button" type="button" onClick={() => { setSelected(ticket); setItems([emptyItem()]); setError(""); }}>Lập báo giá</button>
                                        : quoteWaiting(ticket.status) ? <span>Đã gửi · chờ khách xác nhận</span>
                                            : ticket.status === "Khách từ chối" || ticket.status === "Khách đã từ chối" ? <div className="repair-ticket-actions"><button className="primary-button" type="button" disabled={endingId === ticket.id} onClick={() => void finishRejectedTicket(ticket)}>{endingId === ticket.id ? "Đang kết thúc..." : "Kết thúc"}</button></div>
                                                : ticket.status === "Đã kết thúc" ? <span>Đã kết thúc</span>
                                                    : ticket.status === "Đang sửa" ? <span>Khách đã xác nhận</span>
                                                        : <span>Chờ kiểm tra</span>}
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}

            {selected && <form className="appointment-panel ticket-editor quote-editor" onSubmit={submit}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{selected.ticketCode}</span><h2>Báo giá cho {selected.customerName}</h2><p>{selected.device}</p></div><button className="secondary-button" type="button" onClick={closeEditor}>Đóng</button></div>
                <div className="quote-line-items">{items.map((item, index) => {
                    const selectedService = services.find((service) => service.id === Number(item.serviceId));
                    return <div className="quote-line-item" key={index}>
                        <div className="appointment-form-group"><label htmlFor={`quote-service-${index}`}>Dịch vụ</label><select id={`quote-service-${index}`} required value={item.serviceId} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, serviceId: e.target.value } : row))}><option value="">Chọn dịch vụ</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}</select></div>
                        <div className="appointment-form-group"><label htmlFor={`quote-quantity-${index}`}>Số lượng</label><input id={`quote-quantity-${index}`} type="number" required min="1" step="1" value={item.quantity} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))} /></div>
                        <div className="appointment-form-group"><label>Đơn giá</label><input value={selectedService ? money(selectedService.price) : "Chọn dịch vụ"} readOnly /></div>
                        <button className="secondary-button quote-remove-button" type="button" aria-label="Xóa hạng mục" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))}>Xóa</button>
                    </div>;
                })}</div>
                <button className="secondary-button" type="button" onClick={() => setItems([...items, emptyItem()])}>+ Thêm hạng mục</button>
                <div className="quote-total"><span>Tổng báo giá</span><strong>{money(items.reduce((sum, item) => sum + Number(item.quantity || 0) * (services.find((service) => service.id === Number(item.serviceId))?.price ?? 0), 0))}</strong></div>
                <div className="appointment-search-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang gửi..." : "Gửi báo giá cho khách"}</button></div>
            </form>}
        </main>
    );
}

export default EmployeeQuotes;
