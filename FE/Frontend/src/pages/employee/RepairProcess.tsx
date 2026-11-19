import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairFinalInspectionApi, saveRepairFinalInspectionApi } from "../../api/repairFinalInspectionApi";
import { getMyAssignedRepairTicketsApi, updateRepairTicketStatusApi } from "../../api/repairTicketApi";
import type { RepairQuoteItem } from "../../types/repairQuote";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairTicket } from "../../types/repairTicket";
import { statusLabel } from "../../utils/statusLabel";

const errorPayload = (error: unknown) => {
    if (!axios.isAxiosError(error)) return undefined;
    const data: unknown = error.response?.data;
    return typeof data === "object" && data !== null ? data as { message?: string; error?: string } : undefined;
};
const statusOf = (error: unknown) => axios.isAxiosError(error) ? error.response?.status : undefined;
const messageOf = (error: unknown) => errorPayload(error)?.message || errorPayload(error)?.error || "Không thể cập nhật tiến độ sửa chữa.";

const canonicalStatus = (status: string) => {
    // "Đ" does not decompose to "D" with Unicode NFD, so replace it first.
    // The API currently returns the localized enum value "Đang sửa".
    const normalized = status.replace(/[Đđ]/g, "D").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[ -]+/g, "_");
    const aliases: Record<string, string> = { DANG_SUA: "REPAIRING", DANG_SUA_CHUA: "REPAIRING", DANG_XU_LY: "IN_PROGRESS" };
    return aliases[normalized] || normalized;
};
const isRepairing = (status: string) => ["REPAIRING", "IN_PROGRESS"].includes(canonicalStatus(status));

function EmployeeRepairProcess() {
    const [searchParams] = useSearchParams();
    const requestedTicketId = Number(searchParams.get("ticketId"));
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [quoteItems, setQuoteItems] = useState<Record<number, RepairQuoteItem[]>>({});
    const [paymentsByTicket, setPaymentsByTicket] = useState<Record<number, RepairPayment[]>>({});
    const [inspectionByTicket, setInspectionByTicket] = useState<Record<number, boolean>>({});
    const [editingTicket, setEditingTicket] = useState<RepairTicket | null>(null);
    const [progressNote, setProgressNote] = useState("");
    const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);
    const [completionReviewOpen, setCompletionReviewOpen] = useState(false);
    const [completionSubmitOpen, setCompletionSubmitOpen] = useState(false);
    const [completionInfo, setCompletionInfo] = useState("");
    const [completionEvidence, setCompletionEvidence] = useState<File | null>(null);
    const [inspectionSaved, setInspectionSaved] = useState(false);
    const [inspectionResult, setInspectionResult] = useState("");
    const [inspectionNote, setInspectionNote] = useState("");
    const [inspectionChecks, setInspectionChecks] = useState({
        deviceWorksNormally: false,
        mainFunctionsWork: false,
        noNewIssues: false,
    });
    const [inspectionSavedNotice, setInspectionSavedNotice] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const autoOpenedTicketId = useRef<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const assigned = await getMyAssignedRepairTicketsApi();
            const active = assigned.filter((ticket) => isRepairing(ticket.status));
            setTickets(assigned);
            const itemEntries = await Promise.all(active.map(async (ticket) => {
                try {
                    const quote = await getRepairQuoteApi(ticket.id);
                    return [ticket.id, quote.items] as const;
                } catch (requestError: unknown) {
                    if (statusOf(requestError) === 404) return [ticket.id, []] as const;
                    throw requestError;
                }
            }));
            setQuoteItems(Object.fromEntries(itemEntries));
            const paymentEntries = await Promise.all(active.map(async (ticket) => {
                try {
                    return [ticket.id, await getRepairPaymentsApi(ticket.id)] as const;
                } catch (requestError: unknown) {
                    if (statusOf(requestError) === 404) return [ticket.id, []] as const;
                    throw requestError;
                }
            }));
            setPaymentsByTicket(Object.fromEntries(paymentEntries));
            const inspectionEntries = await Promise.all(active.map(async (ticket) => {
                try {
                    await getRepairFinalInspectionApi(ticket.id);
                    return [ticket.id, true] as const;
                } catch (requestError: unknown) {
                    if (statusOf(requestError) === 404) return [ticket.id, false] as const;
                    throw requestError;
                }
            }));
            setInspectionByTicket(Object.fromEntries(inspectionEntries));
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const activeTickets = tickets.filter((ticket) => isRepairing(ticket.status));
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");
    const filteredActiveTickets = activeTickets.filter((ticket) => {
        const serviceNames = (quoteItems[ticket.id] || []).map((item) => item.name);
        return [ticket.ticketCode, ticket.customerName, ...serviceNames]
            .some((value) => value?.toLocaleLowerCase("vi").includes(normalizedSearch));
    });
    const paymentConfirmed = editingTicket != null && (paymentsByTicket[editingTicket.id] || []).some((payment) => payment.status === "PAID");
    const requestedTicketIsActive = !requestedTicketId || activeTickets.some((ticket) => ticket.id === requestedTicketId);

    const openUpdate = async (ticket: RepairTicket) => {
        setEditingTicket(ticket);
        setNotice("");
        setProgressNote("");
        setEvidencePhoto(null);
        setCompletionReviewOpen(false);
        setCompletionSubmitOpen(false);
        setCompletionInfo("");
        setCompletionEvidence(null);
        setInspectionSaved(false);
        setInspectionResult("");
        setInspectionNote("");
        setInspectionChecks({ deviceWorksNormally: false, mainFunctionsWork: false, noNewIssues: false });
        setInspectionSavedNotice("");
        setError("");
        try {
            const [payments, inspection] = await Promise.all([
                getRepairPaymentsApi(ticket.id).catch((requestError: unknown) => {
                    if (statusOf(requestError) === 404) return [];
                    throw requestError;
                }),
                getRepairFinalInspectionApi(ticket.id).catch((requestError: unknown) => {
                    if (statusOf(requestError) === 404) return null;
                    throw requestError;
                }),
            ]);
            setPaymentsByTicket((current) => ({ ...current, [ticket.id]: payments }));
            if (inspection) {
                const [result, ...noteParts] = (inspection.completionInfo || "").split("\n\n");
                setInspectionResult(result || "");
                setInspectionNote(noteParts.join("\n\n"));
                setInspectionChecks({
                    deviceWorksNormally: inspection.deviceWorksNormally,
                    mainFunctionsWork: inspection.mainFunctionsWork,
                    noNewIssues: inspection.noNewIssues,
                });
                setInspectionSaved(true);
                setInspectionSavedNotice("Đã lưu kết quả kiểm tra sau sửa chữa.");
                setCompletionReviewOpen(true);
                setCompletionSubmitOpen(true);
                setCompletionInfo(inspection.completionInfo || "");
            } else {
                setInspectionByTicket((current) => ({ ...current, [ticket.id]: false }));
            }
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        }
    };

    useEffect(() => {
        if (requestedTicketId <= 0) {
            autoOpenedTicketId.current = null;
            return;
        }
        if (loading || autoOpenedTicketId.current === requestedTicketId) return;
        const ticket = tickets.find((item) => item.id === requestedTicketId && isRepairing(item.status));
        if (ticket) {
            autoOpenedTicketId.current = requestedTicketId;
            const timer = window.setTimeout(() => void openUpdate(ticket), 0);
            return () => window.clearTimeout(timer);
        }
    }, [loading, requestedTicketId, tickets]);

    const closeUpdate = () => {
        setEditingTicket(null);
        setError("");
        setProgressNote("");
        setEvidencePhoto(null);
        setCompletionReviewOpen(false);
        setCompletionSubmitOpen(false);
        setCompletionInfo("");
        setCompletionEvidence(null);
        setInspectionSaved(false);
        setInspectionResult("");
        setInspectionNote("");
        setInspectionChecks({ deviceWorksNormally: false, mainFunctionsWork: false, noNewIssues: false });
        setInspectionSavedNotice("");
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

    const beginCompletionReview = () => {
        if (!validateUpdate()) return;
        setError("");
        setCompletionReviewOpen(true);
    };

    const openCompletionForm = () => {
        if (!inspectionSaved || !Object.values(inspectionChecks).every(Boolean)) {
            setError("Vui lòng lưu kết quả kiểm tra đạt yêu cầu trước khi hoàn thành phiếu.");
            return;
        }
        setCompletionInfo([inspectionResult.trim(), inspectionNote.trim()].filter(Boolean).join("\n\n"));
        setCompletionEvidence(null);
        setError("");
        setCompletionSubmitOpen(true);
    };

    const finishRepair = async () => {
        if (!editingTicket) return;
        if (!inspectionSaved) {
            setError("Vui lòng lưu kết quả kiểm tra trước khi hoàn thành sửa chữa.");
            return;
        }
        if (!Object.values(inspectionChecks).every(Boolean)) {
            setError("Chỉ có thể hoàn thành khi cả ba tiêu chí kiểm tra đều đạt.");
            return;
        }
        if (!inspectionResult.trim()) {
            setError("Vui lòng nhập kết quả kiểm tra sau sửa chữa.");
            return;
        }
        if (!completionInfo.trim()) {
            setError("Vui lòng nhập nội dung xác nhận hoàn thành sửa chữa.");
            return;
        }
        if (completionInfo.trim().length > 2000) {
            setError("Nội dung hoàn thành không được vượt quá 2.000 ký tự.");
            return;
        }
        if (!completionEvidence) {
            setError("Vui lòng tải ảnh minh chứng hoàn thành sửa chữa.");
            return;
        }
        if (!/^image\/(jpeg|png)$/.test(completionEvidence.type) || completionEvidence.size > 5 * 1024 * 1024) {
            setError("Ảnh minh chứng phải là JPEG hoặc PNG và không vượt quá 5 MB.");
            return;
        }
        setSavingId(editingTicket.id);
        setError("");
        setNotice("");
        try {
            const latestPayments = await getRepairPaymentsApi(editingTicket.id);
            setPaymentsByTicket((current) => ({ ...current, [editingTicket.id]: latestPayments }));
            if (!latestPayments.some((payment) => payment.status === "PAID")) {
                setError("Chưa thể hoàn thành: khách chưa được xác nhận đã thanh toán tại mục Báo giá.");
                return;
            }
            if (!window.confirm(`Xác nhận hoàn thành sửa chữa phiếu ${editingTicket.ticketCode}?`)) return;
            // The current Backend has no photo field on final-inspection. Save the required
            // evidence against the current repair status, then complete via its dedicated API.
            await updateRepairTicketStatusApi(editingTicket.id, editingTicket.status, [completionEvidence], completionInfo.trim());
            await saveRepairFinalInspectionApi(editingTicket.id, {
                ...inspectionChecks,
                completionInfo: completionInfo.trim(),
                complete: true,
            });
            setNotice(`Đã hoàn thành sửa chữa phiếu ${editingTicket.ticketCode}.`);
            closeUpdate();
            await load();
        } catch (requestError: unknown) {
            setError(messageOf(requestError));
        } finally {
            setSavingId(null);
        }
    };

    const saveFinalInspection = async () => {
        if (!editingTicket || !validateUpdate()) return;
        if (!inspectionResult.trim()) {
            setError("Vui lòng nhập kết quả kiểm tra sau sửa chữa trước khi lưu.");
            return;
        }
        const completionInfo = [inspectionResult.trim(), inspectionNote.trim()].filter(Boolean).join("\n\n");
        if (completionInfo.length > 5000) {
            setError("Nội dung kiểm tra không được vượt quá 5.000 ký tự.");
            return;
        }
        setSavingId(editingTicket.id);
        setError("");
        setInspectionSavedNotice("");
        try {
            await updateRepairTicketStatusApi(editingTicket.id, editingTicket.status, [evidencePhoto!], progressNote.trim());
            await saveRepairFinalInspectionApi(editingTicket.id, {
                ...inspectionChecks,
                completionInfo,
                complete: false,
            });
            setInspectionSavedNotice("Đã lưu kết quả kiểm tra sau sửa chữa.");
            setInspectionSaved(true);
            setInspectionByTicket((current) => ({ ...current, [editingTicket.id]: true }));
            setEvidencePhoto(null);
            setNotice("Đã lưu kết quả kiểm tra sau sửa chữa.");
            closeUpdate();
            await load();
        } catch (requestError: unknown) {
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
            await updateRepairTicketStatusApi(editingTicket.id, editingTicket.status, [evidencePhoto!], progressNote.trim());
            setNotice(`Đã lưu tiến độ sửa chữa phiếu ${editingTicket.ticketCode}.`);
            setInspectionSaved(false);
            setProgressNote("");
            setEvidencePhoto(null);
            closeUpdate();
            await load();
        } catch (requestError: unknown) {
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
        {error && editingTicket && <div className="error-message" role="alert">{error}</div>}
        {notice && !editingTicket && <div className="success-message" role="status">{notice}</div>}
        {requestedTicketId > 0 && !loading && !error && !requestedTicketIsActive && <div className="error-message" role="alert">Phiếu này chưa được khách xác nhận hoặc đã chuyển sang bước khác.</div>}
        <div className="appointment-results-heading"><div><h2>Các hạng mục đang sửa chữa</h2><p>{loading ? "Đang tải..." : `${activeTickets.length} phiếu`}</p></div></div>
        <form className="appointment-search-panel" onSubmit={(event) => event.preventDefault()}>
            <div className="appointment-form-group"><label htmlFor="repair-process-search">Tìm theo mã phiếu, tên khách hoặc dịch vụ</label><input id="repair-process-search" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nhập mã phiếu, tên khách hoặc tên dịch vụ" /></div>
            <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setSearchTerm("")} disabled={!searchTerm}>Xóa tìm kiếm</button></div>
        </form>
        {loading ? <div className="appointment-panel table-state">Đang tải công việc...</div> : error && !editingTicket ? (
            <div className="appointment-panel appointment-empty-state"><h2>Không tải được công việc</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử tải lại</button></div>
        ) : filteredActiveTickets.length === 0 ? (
            <div className="appointment-panel appointment-empty-state"><h2>{activeTickets.length === 0 ? "Chưa có hạng mục đang sửa chữa" : "Không tìm thấy phiếu phù hợp"}</h2><p>{activeTickets.length === 0 ? "Khi khách xác nhận báo giá, các hạng mục sẽ hiển thị tại đây." : "Thử tìm bằng mã phiếu, tên khách hoặc dịch vụ khác."}</p></div>
        ) : (
            <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table">
                <thead><tr><th>Mã phiếu</th><th>Khách hàng / thiết bị</th><th>Hạng mục đang sửa</th><th>Ngày nhận</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>{filteredActiveTickets.map((ticket) => <tr key={ticket.id} className={ticket.id === requestedTicketId ? "diagnosis-highlight-row" : undefined}>
                    <td><strong>{ticket.ticketCode}</strong></td>
                    <td><strong>{ticket.customerName}</strong><span>{ticket.device}</span></td>
                    <td>{quoteItems[ticket.id]?.length ? <ul className="repair-active-items">{quoteItems[ticket.id].map((item) => <li key={item.id}>{item.name}<span> × {item.quantity}</span></li>)}</ul> : <span>Chưa có thông tin hạng mục</span>}</td>
                    <td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td><span className="appointment-status">{statusLabel(ticket.status)}</span></td>
                    <td><button className="primary-button" type="button" disabled={savingId === ticket.id} onClick={() => void openUpdate(ticket)}>{savingId === ticket.id ? "Đang xử lý..." : inspectionByTicket[ticket.id] ? "Hoàn thành" : "Cập nhật"}</button></td>
                </tr>)}</tbody>
            </table></div>
        )}

        {editingTicket && <div className="repair-detail-backdrop" role="presentation" onClick={closeUpdate}>
            <section className="appointment-panel repair-detail-dialog repair-progress-editor" role="dialog" aria-modal="true" aria-labelledby="repair-progress-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div><span className="appointment-card-reference">{editingTicket.ticketCode}</span><h2 id="repair-progress-title">Cập nhật sửa chữa</h2><p>{editingTicket.customerName} · {editingTicket.device}</p></div></div>
                {error && <div className="error-message" role="alert">{error}</div>}
                {notice && <div className="success-message" role="status">{notice} Cửa sổ sẽ tự đóng sau giây lát.</div>}
                {!completionReviewOpen ? <>
                    <div className="appointment-form-group"><label htmlFor="repair-progress-note">Thông tin sửa chữa đã thực hiện</label><textarea id="repair-progress-note" required maxLength={1800} rows={5} value={progressNote} onChange={(event) => { setProgressNote(event.target.value); setInspectionSaved(false); }} placeholder="Mô tả hạng mục đã thực hiện, linh kiện đã thay hoặc tiến độ hiện tại..." /></div>
                    <div className="repair-progress-modal-actions"><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={closeUpdate}>Hủy</button><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={() => void saveProgress()}>{savingId === editingTicket.id ? "Đang lưu..." : "Lưu tiến độ"}</button><button className="primary-button" type="button" disabled={savingId === editingTicket.id} onClick={beginCompletionReview}>Kiểm tra</button></div>
                </> : completionSubmitOpen ? <>
                    <section className="repair-completion-review">
                        <h3>Xác nhận hoàn thành sửa chữa</h3>
                        <p>Ghi nội dung hoàn tất và tải ảnh minh chứng trước khi kết thúc phiếu.</p>
                        <div className="appointment-form-group"><label htmlFor="repair-completion-info">Nội dung hoàn thành</label><textarea id="repair-completion-info" required maxLength={2000} rows={5} value={completionInfo} onChange={(event) => setCompletionInfo(event.target.value)} placeholder="Mô tả kết quả sửa chữa và tình trạng thiết bị sau khi hoàn tất..." /></div>
                        <div className="appointment-form-group"><label htmlFor="repair-completion-photo">Ảnh minh chứng hoàn thành</label><input id="repair-completion-photo" type="file" accept="image/jpeg,image/png" required onChange={(event) => setCompletionEvidence(event.target.files?.[0] || null)} /><small>Bắt buộc 1 ảnh JPEG hoặc PNG, tối đa 5 MB.</small></div>
                    </section>
                    <div className="repair-progress-modal-actions"><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={closeUpdate}>Hủy</button><button className="primary-button" type="button" disabled={savingId === editingTicket.id} onClick={() => void finishRepair()}>{savingId === editingTicket.id ? "Đang hoàn thành..." : "Xác nhận hoàn thành"}</button></div>
                </> : <>
                    <section className="repair-completion-review"><h3>Kiểm tra sau sửa chữa</h3><p>Ghi lại kết quả kiểm tra. Chỉ xác nhận hoàn thành khi cả ba tiêu chí đều đạt.</p><div className="repair-completion-summary"><strong>Nội dung sửa chữa</strong><p>{progressNote}</p></div>
                        <fieldset className="repair-inspection-checklist"><legend>Danh sách kiểm tra bắt buộc</legend>
                            <label><input type="checkbox" checked={inspectionChecks.deviceWorksNormally} onChange={(event) => { setInspectionChecks((current) => ({ ...current, deviceWorksNormally: event.target.checked })); setInspectionSaved(false); }} /> Thiết bị hoạt động bình thường</label>
                            <label><input type="checkbox" checked={inspectionChecks.mainFunctionsWork} onChange={(event) => { setInspectionChecks((current) => ({ ...current, mainFunctionsWork: event.target.checked })); setInspectionSaved(false); }} /> Các chức năng chính hoạt động</label>
                            <label><input type="checkbox" checked={inspectionChecks.noNewIssues} onChange={(event) => { setInspectionChecks((current) => ({ ...current, noNewIssues: event.target.checked })); setInspectionSaved(false); }} /> Không phát sinh lỗi mới</label>
                        </fieldset>
                        <div className="appointment-form-group"><label htmlFor="repair-inspection-result">Kết quả kiểm tra</label><textarea id="repair-inspection-result" maxLength={3500} rows={4} value={inspectionResult} onChange={(event) => { setInspectionResult(event.target.value); setInspectionSaved(false); }} placeholder="Mô tả tình trạng thiết bị sau sửa chữa và các chức năng đã kiểm tra..." /></div>
                        <div className="appointment-form-group"><label htmlFor="repair-inspection-note">Ghi chú kiểm tra</label><textarea id="repair-inspection-note" maxLength={1000} rows={2} value={inspectionNote} onChange={(event) => { setInspectionNote(event.target.value); setInspectionSaved(false); }} placeholder="Ghi chú thêm nếu cần" /></div>
                        {inspectionSavedNotice && <div className="success-message" role="status">{inspectionSavedNotice}</div>}
                    </section>
                    <div className="repair-progress-modal-actions"><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={closeUpdate}>Hủy</button><button className="secondary-button" type="button" disabled={savingId === editingTicket.id} onClick={() => void saveFinalInspection()}>{savingId === editingTicket.id ? "Đang lưu..." : "Lưu kết quả kiểm tra"}</button>{inspectionSaved && <button className="primary-button" type="button" disabled={savingId === editingTicket.id} onClick={openCompletionForm}>Hoàn thành</button>}</div>
                </>}
                {!completionSubmitOpen && <div className="appointment-form-group"><label htmlFor="repair-progress-photo">Ảnh bằng chứng</label><input id="repair-progress-photo" type="file" accept="image/jpeg,image/png" onChange={(event) => setEvidencePhoto(event.target.files?.[0] || null)} /><small>Bắt buộc tải ảnh JPEG hoặc PNG, tối đa 5 MB. Ảnh này được lưu cùng cập nhật tiến độ hoặc kết quả kiểm tra.</small></div>}
                {!paymentConfirmed && <p className="tracking-timestamp-note">Có thể lưu kết quả kiểm tra trước. Để hoàn thành phiếu, cần xác nhận thanh toán tại mục Báo giá.</p>}
            </section>
        </div>}
    </main>;
}

export default EmployeeRepairProcess;
