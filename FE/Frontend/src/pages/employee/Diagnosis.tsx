import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMyAssignedRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import type { RepairTicket } from "../../types/repairTicket";

type DiagnosisDraft = { result: string; proposal: string };
const draftKey = (ticketId: number) => `repair-diagnosis-${ticketId}`;
const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể cập nhật phiếu sửa chữa.";

function EmployeeDiagnosis() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedTicketId = Number(searchParams.get("ticketId"));
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<DiagnosisDraft>({ result: "", proposal: "" });
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const list = await getMyAssignedRepairTicketsApi();
            const eligible = list.filter((ticket) => ["Đã nhận", "Đang kiểm tra", "Đã tiếp nhận"].includes(ticket.status));
            setTickets(eligible);
            const requested = eligible.find((ticket) => ticket.id === requestedTicketId);
            setSelectedId(requested?.id ?? eligible[0]?.id ?? null);
        } catch (e: any) { setError(messageOf(e)); }
        finally { setLoading(false); }
    }, [requestedTicketId]);

    useEffect(() => { void load(); }, [load]);

    const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedTicket) {
            setDraft({ result: "", proposal: "" });
            setSaved(false);
            return;
        }
        const stored = localStorage.getItem(draftKey(selectedTicket.id));
        if (!stored) {
            setDraft({ result: "", proposal: "" });
            setSaved(false);
            return;
        }
        try {
            setDraft(JSON.parse(stored) as DiagnosisDraft);
            setSaved(true);
        } catch {
            localStorage.removeItem(draftKey(selectedTicket.id));
            setDraft({ result: "", proposal: "" });
            setSaved(false);
        }
    }, [selectedId, selectedTicket?.id]);

    const saveDiagnosis = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedTicket) return;
        localStorage.setItem(draftKey(selectedTicket.id), JSON.stringify(draft));
        setSaved(true);
        setError("");
        setNotice("Đã lưu chẩn đoán trên trình duyệt này.");
    };

    const continueToQuote = async () => {
        if (!selectedTicket) return;
        if (!saved) {
            setError("Hãy lưu kết quả chẩn đoán trước khi chuyển sang lập báo giá.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await updateRepairTicketApi(selectedTicket.id, {
                customerId: selectedTicket.customerId,
                device: selectedTicket.device,
                receivedDate: selectedTicket.receivedDate,
                status: "Chờ báo giá",
                technicianId: selectedTicket.technicianId,
            });
            navigate(`/employee/quotes?ticketId=${selectedTicket.id}`);
        } catch (e: any) { setError(messageOf(e)); }
        finally { setSaving(false); }
    };

    return <main className="management-page diagnosis-page">
        <header className="diagnosis-system-header"><strong>FIXHUB</strong><span>TRUNG TÂM KỸ THUẬT · QUY TRÌNH CHẨN ĐOÁN</span></header>
        <section className="diagnosis-content">
            <h1>Chẩn đoán &amp; đề xuất sửa chữa</h1>
            {error && <div className="error-message" role="alert">{error}</div>}
            {notice && <div className="success-message" role="status">{notice}</div>}
            {loading ? <div className="diagnosis-form-card">Đang tải phiếu được phân công...</div> : !selectedTicket ? <div className="diagnosis-form-card"><h2>Không có phiếu cần chẩn đoán</h2><p>Phiếu được giao cho bạn sẽ xuất hiện tại đây sau khi được tiếp nhận.</p></div> : <>
                {tickets.length > 1 && <div className="diagnosis-ticket-picker"><label htmlFor="diagnosis-ticket-select">Chọn phiếu</label><select id="diagnosis-ticket-select" value={selectedTicket.id} onChange={(event) => { setSelectedId(Number(event.target.value)); setNotice(""); setError(""); }}><option value={selectedTicket.id}>{selectedTicket.ticketCode} · {selectedTicket.device}</option>{tickets.filter((ticket) => ticket.id !== selectedTicket.id).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketCode} · {ticket.device}</option>)}</select></div>}
                <form className="diagnosis-form-card" onSubmit={saveDiagnosis}>
                    <div className="diagnosis-ticket-meta">
                        <div><strong>MÃ PHIẾU</strong><span>{selectedTicket.ticketCode}</span></div>
                        <div><strong>THIẾT BỊ</strong><span>{selectedTicket.device}</span></div>
                        <div><strong>LỖI TIẾP NHẬN</strong><span>Chưa có mô tả lỗi trên phiếu</span></div>
                        <div><strong>KỸ THUẬT VIÊN</strong><span>{selectedTicket.technicianName || "Chưa phân công"}</span></div>
                    </div>
                    <div className="diagnosis-field"><label htmlFor="diagnosis-result">Kết quả chẩn đoán</label><textarea id="diagnosis-result" required value={draft.result} onChange={(event) => { setDraft({ ...draft, result: event.target.value }); setSaved(false); setNotice(""); }} placeholder="Ghi nhận tình trạng và nguyên nhân lỗi đã kiểm tra..." /></div>
                    <div className="diagnosis-field"><label htmlFor="diagnosis-proposal">Đề xuất sửa chữa</label><textarea id="diagnosis-proposal" required value={draft.proposal} onChange={(event) => { setDraft({ ...draft, proposal: event.target.value }); setSaved(false); setNotice(""); }} placeholder="Đề xuất hạng mục cần sửa chữa..." /></div>
                    <div className="diagnosis-actions"><button className="primary-button" type="submit">Lưu chẩn đoán</button><button className="secondary-button" type="button" disabled={saving} onClick={() => void continueToQuote()}>{saving ? "Đang chuyển..." : "Chuyển tạo báo giá"}</button></div>
                    <p className="diagnosis-storage-note">Nội dung hiện được lưu trên trình duyệt này; API chưa hỗ trợ lưu chẩn đoán lên hệ thống.</p>
                </form>
            </>}
        </section>
        <footer className="diagnosis-system-footer">Thông tin của cửa hàng</footer>
    </main>;
}

export default EmployeeDiagnosis;
