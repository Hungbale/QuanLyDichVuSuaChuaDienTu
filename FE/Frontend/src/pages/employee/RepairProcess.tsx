import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getMyAssignedRepairTicketsApi, updateRepairTicketStatusApi } from "../../api/repairTicketApi";
import type { RepairQuoteItem } from "../../types/repairQuote";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairTicket } from "../../types/repairTicket";

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể cập nhật tiến độ sửa chữa.";

function EmployeeRepairProcess() {
    const [searchParams] = useSearchParams();
    const requestedTicketId = Number(searchParams.get("ticketId"));
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [quoteItems, setQuoteItems] = useState<Record<number, RepairQuoteItem[]>>({});
    const [paymentsByTicket, setPaymentsByTicket] = useState<Record<number, RepairPayment[]>>({});
    const [editingTicket, setEditingTicket] = useState<RepairTicket | null>(null);
    const [progressNote, setProgressNote] = useState("");
    const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const assigned = await getMyAssignedRepairTicketsApi();
            const active = assigned.filter((ticket) => ticket.status === "Đang sửa");
            setTickets(assigned);
            const itemEntries = await Promise.all(active.map(async (ticket) => {
                try {
                    const quote = await getRepairQuoteApi(ticket.id);
                    return [ticket.id, quote.items] as const;
                } catch {
                    return [ticket.id, []] as const;
                }
            }));
            setQuoteItems(Object.fromEntries(itemEntries));
            const paymentEntries = await Promise.all(active.map(async (ticket) => {
                try {
                    return [ticket.id, await getRepairPaymentsApi(ticket.id)] as const;
                } catch (requestError: any) {
                    if (requestError.response?.status === 404) return [ticket.id, []] as const;
                    throw requestError;
                }
            }));
            setPaymentsByTicket(Object.fromEntries(paymentEntries));
        } catch (requestError: any) {
            setError(messageOf(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const activeTickets = tickets.filter((ticket) => ticket.status === "Đang sửa");
    const paymentConfirmed = editingTicket != null && (paymentsByTicket[editingTicket.id] || []).some((payment) => payment.status === "PAID");
    const requestedTicketIsActive = !requestedTicketId || activeTickets.some((ticket) => ticket.id === requestedTicketId);

    const openUpdate = async (ticket: RepairTicket) => {
        setEditingTicket(ticket);
        setProgressNote("");
        setEvidencePhoto(null);
        setError("");
        try {
            const payments = await getRepairPaymentsApi(ticket.id);
            setPaymentsByTicket((current) => ({ ...current, [ticket.id]: payments }));
        } catch (requestError: any) {
            if (requestError.response?.status === 404) {
                setPaymentsByTicket((current) => ({ ...current, [ticket.id]: [] }));
            } else {
                setError(messageOf(requestError));
            }
        }
    };

    useEffect(() => {
        if (loading || requestedTicketId <= 0) return;
        const ticket = tickets.find((item) => item.id === requestedTicketId && item.status === "Đang sửa");
        if (ticket) openUpdate(ticket);
    }, [loading, requestedTicketId, tickets]);

    const closeUpdate = () => {
        setEditingTicket(null);
        setProgressNote("");
        setEvidencePhoto(null);
    };

    const validateUpdate = () => {
        if (!progressNote.trim()) {
            setError("Vui lòng nhập thông tin sửa chữa.");
            return false;
        }
        if (!evidencePhoto) {
            setError("Vui lòng tải ảnh làm bằng chứng cho thao tác sửa chữa.");
            return false;
        }
        if (!/^image\/(jpeg|png)$/.test(evidencePhoto.type) || evidencePhoto.size > 5 * 1024 * 1024) {
            setError("Ảnh phải là JPEG hoặc PNG và không vượt quá 5 MB.");
            return false;
        }
        return true;
    };

    const finishRepair = async () => {
        if (!editingTicket || !validateUpdate()) return;
        setSavingId(editingTicket.id);
        setError("");
        setNotice("");
        try {
            // Refresh payment state in case it was confirmed in another page while this modal stayed open.
            const latestPayments = await getRepairPaymentsApi(editingTicket.id);
            setPaymentsByTicket((current) => ({ ...current, [editingTicket.id]: latestPayments }));
            if (!latestPayments.some((payment) => payment.status === "PAID")) {
                setError("Chưa thể hoàn thành: cần xác nhận khách đã thanh toán tại mục Thanh toán trước.");
                return;
            }
            await updateRepairTicketStatusApi(editingTicket.id, "COMPLETED", [evidencePhoto!], progressNote.trim());
            setNotice(`Đã hoàn thành sửa chữa phiếu ${editingTicket.ticketCode}.`);
            closeUpdate();
            await load();
        } catch (requestError: any) {
            setError(messageOf(requestError));
        } finally {
            setSavingId(null);
        }
    };

    const saveProgress = async () => {
        if (!editingTicket || !validateUpdate()) return;
        setSavingId(editingTicket.id);
        setError("");
        setNotice("");
        try {
            await updateRepairTicketStatusApi(editingTicket.id, "REPAIRING", [evidencePhoto!], progressNote.trim());
            setNotice(`Đã lưu tiến độ sửa chữa phiếu ${editingTicket.ticketCode}.`);
            setProgressNote("");
            setEvidencePhoto(null);
            await load();
        } catch (requestError: any) {
            setError(messageOf(requestError));
        } finally {
            setSavingId(null);
        }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header">
            <span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span>
            <h1>Thực hiện sửa chữa</h1>
            <p>Theo dõi các hạng mục khách đã xác nhận và cập nhật tiến độ sửa chữa.</p>
        </header>
        {error && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="appointment-panel diagnosis-note"><strong>Quy trình sửa chữa</strong><p>Hoàn thành sửa chữa sau khi khách thanh toán và nhân viên xác nhận giao dịch tại mục Thanh toán.</p></div>
        {requestedTicketId > 0 && !loading && !requestedTicketIsActive && <div className="error-message" role="alert">Phiếu này chưa được khách xác nhận hoặc đã chuyển sang bước khác.</div>}
        <div className="appointment-results-heading"><div><h2>Các hạng mục đang sửa chữa</h2><p>{loading ? "Đang tải..." : `${activeTickets.length} phiếu`}</p></div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải công việc...</div> : activeTickets.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>Chưa có hạng mục đang sửa chữa</h2><p>Khi khách xác nhận báo giá, các hạng mục sẽ hiển thị tại đây.</p></div>
        ) : (
            <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table">
                <thead><tr><th>Mã phiếu</th><th>Khách hàng / thiết bị</th><th>Hạng mục đang sửa</th><th>Ngày nhận</th><th>Thao tác</th></tr></thead>
                <tbody>{activeTickets.map((ticket) => <tr key={ticket.id} className={ticket.id === requestedTicketId ? "diagnosis-highlight-row" : undefined}>
                    <td><strong>{ticket.ticketCode}</strong></td>
                    <td><strong>{ticket.customerName}</strong><span>{ticket.device}</span></td>
                    <td>{quoteItems[ticket.id]?.length ? <ul className="repair-active-items">{quoteItems[ticket.id].map((item) => <li key={item.id}>{item.name}<span> × {item.quantity}</span></li>)}</ul> : <span>Chưa có thông tin hạng mục</span>}</td>
                    <td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td>
                    <td><button className="primary-button" type="button" onClick={() => openUpdate(ticket)}>Cập nhật</button></td>
                </tr>)}</tbody>
            </table></div>
        )}

        {editingTicket && <div className="repair-detail-backdrop" role="presentation" onClick={closeUpdate}>
            <section className="appointment-panel repair-detail-dialog repair-progress-editor" role="dialog" aria-modal="true" aria-labelledby="repair-progress-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{editingTicket.ticketCode}</span><h2 id="repair-progress-title">Cập nhật sửa chữa</h2><p>{editingTicket.customerName} · {editingTicket.device}</p></div></div>
                <div className="appointment-form-group"><label htmlFor="repair-progress-note">Thông tin sửa chữa</label><textarea id="repair-progress-note" required maxLength={2000} rows={5} value={progressNote} onChange={(event) => setProgressNote(event.target.value)} placeholder="Mô tả hạng mục đã thực hiện, linh kiện đã thay hoặc kết quả kiểm tra..." /></div>
                <div className="appointment-form-group"><label htmlFor="repair-progress-photo">Ảnh bằng chứng</label><input id="repair-progress-photo" type="file" accept="image/jpeg,image/png" onChange={(event) => setEvidencePhoto(event.target.files?.[0] || null)} /><small>Bắt buộc tải ảnh JPEG hoặc PNG, tối đa 5 MB.</small></div>
                {!paymentConfirmed && <p className="tracking-timestamp-note">Chưa xác nhận thanh toán. Xác nhận giao dịch tại mục Thanh toán rồi quay lại hoàn tất phiếu.</p>}
                <div className="repair-progress-modal-actions"><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={closeUpdate}>Hủy</button><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={() => void saveProgress()}>{savingId === editingTicket.id ? "Đang lưu..." : "Lưu tiến độ"}</button><button className="primary-button" type="button" disabled={savingId === editingTicket.id} onClick={() => void finishRepair()}>{savingId === editingTicket.id ? "Đang lưu..." : "Hoàn thành sửa chữa"}</button></div>
            </section>
        </div>}
    </main>;
}

export default EmployeeRepairProcess;
