import { useEffect, useState, type FormEvent } from "react";
import { getRepairDiagnosisApi, saveRepairDiagnosisApi } from "../../api/repairDiagnosisApi";
import { getRepairIntakeApi } from "../../api/repairIntakeApi";
import type { RepairDiagnosis } from "../../types/repairDiagnosis";
import type { RepairIntakeReceipt } from "../../types/repairIntake";
import type { RepairTicket } from "../../types/repairTicket";

type Props = { ticket: RepairTicket; onClose: () => void; onSaved: () => void };
type Draft = { result: string; proposal: string };
const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || "Không thể lưu chẩn đoán.";

export default function DiagnosisModal({ ticket, onClose, onSaved }: Props) {
    const [draft, setDraft] = useState<Draft>({ result: "", proposal: "" });
    const [diagnosis, setDiagnosis] = useState<RepairDiagnosis | null>(null);
    const [intake, setIntake] = useState<RepairIntakeReceipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        Promise.all([
            getRepairDiagnosisApi(ticket.id).catch((e: any) => e.response?.status === 404 ? null : Promise.reject(e)),
            getRepairIntakeApi(ticket.id).catch((e: any) => e.response?.status === 404 ? null : Promise.reject(e)),
        ]).then(([record, receipt]) => {
            if (!active) return;
            setDiagnosis(record);
            setIntake(receipt);
            if (record) setDraft({ result: record.diagnosisResult, proposal: record.repairProposal });
        }).catch((e: any) => {
            if (active) setError(messageOf(e));
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [ticket.id]);

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const record = await saveRepairDiagnosisApi(ticket.id, {
                diagnosisResult: draft.result.trim(),
                repairProposal: draft.proposal.trim(),
            });
            setDiagnosis(record);
            setDraft({ result: record.diagnosisResult, proposal: record.repairProposal });
            onSaved();
            onClose();
        } catch (e: any) {
            setError(messageOf(e));
        } finally {
            setSaving(false);
        }
    };

    return <div className="repair-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
        <section className="appointment-panel repair-detail-dialog diagnosis-modal" role="dialog" aria-modal="true" aria-labelledby="diagnosis-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">{ticket.ticketCode}</span><h2 id="diagnosis-modal-title">Chẩn đoán và đề xuất sửa chữa</h2><p>{ticket.device}</p></div><button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Đóng</button></div>
            {error && <div className="error-message" role="alert">{error}</div>}
            {notice && <div className="success-message" role="status">{notice}</div>}
            {loading ? <div className="table-state">Đang tải thông tin phiếu...</div> : <form className="diagnosis-form-card" onSubmit={save}>
                <div className="diagnosis-ticket-meta">
                    <div><strong>MÃ PHIẾU</strong><span>{ticket.ticketCode}</span></div>
                    <div><strong>THIẾT BỊ</strong><span>{ticket.device}</span></div>
                    <div><strong>LỖI TIẾP NHẬN</strong><span>{intake?.intakeNote?.trim() || "Nhân viên chưa ghi nhận lỗi khi tiếp nhận"}</span></div>
                    <div><strong>KỸ THUẬT VIÊN</strong><span>{ticket.technicianName || "Chưa phân công"}</span></div>
                </div>
                <div className="diagnosis-field"><label htmlFor="diagnosis-result">Kết quả chẩn đoán</label><textarea id="diagnosis-result" required maxLength={5000} rows={4} value={draft.result} onChange={(event) => setDraft({ ...draft, result: event.target.value })} placeholder="Ghi nhận tình trạng và nguyên nhân lỗi đã kiểm tra..." /></div>
                <div className="diagnosis-field"><label htmlFor="diagnosis-proposal">Đề xuất sửa chữa</label><textarea id="diagnosis-proposal" required maxLength={5000} rows={4} value={draft.proposal} onChange={(event) => setDraft({ ...draft, proposal: event.target.value })} placeholder="Đề xuất hạng mục cần sửa chữa..." /></div>
                {diagnosis?.diagnosedAt && <small>Đã lưu bởi {diagnosis.diagnosedBy} · {new Date(diagnosis.diagnosedAt).toLocaleString("vi-VN")}</small>}
                <div className="diagnosis-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu chẩn đoán"}</button></div>
            </form>}
        </section>
    </div>;
}
