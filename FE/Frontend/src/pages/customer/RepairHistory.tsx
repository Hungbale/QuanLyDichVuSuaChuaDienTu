import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getRepairTrackingApi } from "../../api/repairTrackingApi";
import { getMyRepairHistoryApi } from "../../api/repairTicketApi";
import type { RepairHistoryEntry } from "../../types/repairTicket";
import type { RepairTrackingDetails, RepairTrackingPhoto } from "../../types/repairTracking";
import { statusLabel } from "../../utils/statusLabel";
import { repairTrackingTitle } from "../../utils/repairTrackingTitle";

const errorPayload = (error: unknown) => {
    if (!axios.isAxiosError(error)) return undefined;
    const data: unknown = error.response?.data;
    return typeof data === "object" && data !== null
        ? data as { message?: string; error?: string }
        : undefined;
};
const errorStatus = (error: unknown) => axios.isAxiosError(error) ? error.response?.status : undefined;
const errorMessage = (error: unknown) => errorPayload(error)?.message
    || errorPayload(error)?.error
    || "Không thể tải thông tin lịch sử sửa chữa.";
const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
});
const normalize = (value: string | null | undefined) => (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
const customerStatusLabel = (status: string) => {
    const normalized = normalize(status).replace(/[ -]+/g, "_").toUpperCase();
    if (["CUSTOMER_DECLINED", "KHACH_TU_CHOI", "KHACH_DA_TU_CHOI"].includes(normalized)) {
        return "Đã từ chối";
    }
    return statusLabel(status);
};

function RepairHistory() {
    const [items, setItems] = useState<RepairHistoryEntry[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<RepairHistoryEntry | null>(null);
    const [tracking, setTracking] = useState<RepairTrackingDetails | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [previewPhoto, setPreviewPhoto] = useState<RepairTrackingPhoto | null>(null);

    const loadHistory = async () => {
        setLoading(true);
        setError("");
        try {
            setItems(await getMyRepairHistoryApi());
        } catch (requestError: unknown) {
            setError(errorMessage(requestError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadHistory(); }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const availableStatuses = [...new Set(items.map((item) => item.status))];
    const filteredItems = useMemo(() => {
        const term = normalize(search);
        return items.filter((item) =>
            (statusFilter === "ALL" || item.status === statusFilter)
            && (!term || [item.ticketCode, item.device, item.service, item.bookedService, item.status]
                .some((value) => normalize(value).includes(term))),
        );
    }, [items, search, statusFilter]);

    const closeDetails = () => {
        setSelected(null);
        setTracking(null);
        setDetailError("");
        setPreviewPhoto(null);
    };

    const openDetails = async (item: RepairHistoryEntry) => {
        setSelected(item);
        setTracking(null);
        setDetailError("");
        setDetailLoading(true);
        try {
            setTracking(await getRepairTrackingApi(item.ticketId));
        } catch (requestError: unknown) {
            setDetailError(errorStatus(requestError) === 403
                ? "Bạn không có quyền xem quá trình sửa chữa của phiếu này."
                : errorMessage(requestError));
        } finally {
            setDetailLoading(false);
        }
    };

    const timeline = tracking?.timeline.map((event, index) => {
        const update = tracking.updates.find((entry) =>
            entry.createdAt === event.createdAt && entry.status === event.details,
        );
        return {
            id: `${event.type}-${index}`,
            type: event.type,
            title: repairTrackingTitle(event.type, event.details),
            date: event.createdAt,
            details: event.details,
            note: event.note,
            actor: event.actorName,
            photos: update?.photos || [],
        };
    }) || [];

    return <main className="management-page appointment-page">
        <header className="appointment-page-header">
            <span className="appointment-eyebrow">FIXHUB · KHÁCH HÀNG</span>
            <h1>Lịch sử sửa chữa</h1>
            <p>Xem lại các phiếu đã tiếp nhận, dịch vụ thực hiện và toàn bộ quá trình xử lý.</p>
        </header>
        {error && <div className="error-message" role="alert">{error}</div>}
        <form className="appointment-search-panel" onSubmit={(event) => event.preventDefault()}>
            <div className="appointment-form-group">
                <label htmlFor="repair-history-search">Tìm phiếu sửa chữa</label>
                <input id="repair-history-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã phiếu, thiết bị, dịch vụ hoặc trạng thái" />
            </div>
            <div className="appointment-search-actions">
                <button className="secondary-button" type="button" disabled={!search} onClick={() => setSearch("")}>Xóa tìm kiếm</button>
            </div>
        </form>
        <div className="appointment-filter-row">
            <label htmlFor="repair-history-status-filter">Lọc trạng thái</label>
            <select id="repair-history-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                {availableStatuses.map((status) => <option key={status} value={status}>{customerStatusLabel(status)}</option>)}
            </select>
        </div>
        <div className="appointment-results-heading"><div>
            <h2>Các phiếu của tôi</h2>
            <p>{loading ? "Đang tải..." : `${filteredItems.length} phiếu sửa chữa`}</p>
        </div></div>
        {loading ? <div className="appointment-panel table-state">Đang tải lịch sử sửa chữa...</div> : error ? (
            <div className="appointment-panel appointment-empty-state">
                <h2>Không tải được lịch sử sửa chữa</h2>
                <p>{error}</p>
                <button className="secondary-button" type="button" onClick={() => void loadHistory()}>Thử tải lại</button>
            </div>
        ) : items.length === 0 ? (
            <div className="appointment-panel appointment-empty-state">
                <h2>Chưa có lịch sử sửa chữa</h2>
                <p>Các phiếu sửa chữa của bạn sẽ xuất hiện tại đây.</p>
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="appointment-panel appointment-empty-state">
                <h2>Không tìm thấy phiếu phù hợp</h2>
                <p>Thử đổi từ khóa tìm kiếm hoặc trạng thái lọc.</p>
            </div>
        ) : <div className="appointment-panel appointment-table-container">
            <table className="appointment-table repair-ticket-table">
                <thead><tr><th>Mã phiếu</th><th>Thiết bị</th><th>Dịch vụ thực hiện</th><th>Ngày hoàn thành</th><th>Chi phí</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>{filteredItems.map((item) => <tr key={item.ticketId}>
                    <td><strong>{item.ticketCode}</strong></td>
                    <td>{item.device}</td>
                    <td>{item.service || "Chưa có thông tin dịch vụ"}</td>
                    <td>{item.completedDate ? new Date(`${item.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</td>
                    <td>{item.cost == null ? "—" : `${new Intl.NumberFormat("vi-VN").format(item.cost)} ₫`}</td>
                    <td><span className="appointment-status">{customerStatusLabel(item.status)}</span></td>
                    <td><button className="secondary-button" type="button" onClick={() => void openDetails(item)}>Chi tiết</button></td>
                </tr>)}</tbody>
            </table>
        </div>}

        {selected && <div className="repair-detail-backdrop" role="presentation" onClick={closeDetails}>
            <section className="appointment-panel repair-detail-dialog customer-tracking-dialog" role="dialog" aria-modal="true" aria-labelledby="repair-history-detail-title" onClick={(event) => event.stopPropagation()}>
                <div className="appointment-card-top"><div>
                    <span className="appointment-card-reference">{selected.ticketCode}</span>
                    <h2 id="repair-history-detail-title">Chi tiết quá trình sửa chữa</h2>
                    <p>{selected.device}</p>
                </div><button className="secondary-button" type="button" onClick={closeDetails}>Đóng</button></div>
                {detailError && <div className="error-message" role="alert">{detailError}</div>}
                {detailLoading ? <div className="table-state">Đang tải quá trình sửa chữa...</div> : detailError ? null : <>
                    {tracking && <div className="appointment-details-grid tracking-summary">
                        <div><span>Trạng thái hiện tại</span><strong>{customerStatusLabel(tracking.currentStatus)}</strong></div>
                        <div><span>Dịch vụ</span><strong>{tracking.serviceName || selected.bookedService || selected.service || "Chưa có thông tin"}</strong></div>
                        <div><span>Ngày hoàn thành</span><strong>{selected.completedDate ? new Date(`${selected.completedDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa hoàn thành"}</strong></div>
                    </div>}
                    {timeline.length === 0 ? <div className="appointment-empty-state"><p>Chưa có mốc xử lý được ghi nhận cho phiếu này.</p></div> : <ol className="repair-timeline">
                        {timeline.map((event) => <li className="repair-timeline-event" key={event.id}>
                            <span className="repair-timeline-marker" aria-hidden="true" />
                            <div className="repair-timeline-content">
                                <div className="repair-timeline-heading"><h3>{event.title}</h3><time>{formatDateTime(event.date)}</time></div>
                                {event.details && event.type !== "STATUS_UPDATED" && <p>{event.details}</p>}
                                {event.note && <p>{event.note}</p>}
                                {event.actor && <small>Thực hiện bởi: {event.actor}</small>}
                                {event.photos.length > 0 && <div className="repair-timeline-photos">{event.photos.map((photo, index) => <button className="repair-timeline-photo-button" type="button" key={`${event.id}-${photo.fileName}-${index}`} onClick={() => setPreviewPhoto(photo)} aria-label={`Xem ảnh bằng chứng ${event.title}`}><img src={photo.dataUri} alt={`Bằng chứng ${event.title}`} loading="lazy" /></button>)}</div>}
                            </div>
                        </li>)}
                    </ol>}
                </>}
            </section>
        </div>}
        {previewPhoto && <div className="repair-photo-preview-backdrop" role="presentation" onClick={() => setPreviewPhoto(null)}>
            <section className="repair-photo-preview-dialog" role="dialog" aria-modal="true" aria-label="Ảnh bằng chứng sửa chữa" onClick={(event) => event.stopPropagation()}>
                <div className="repair-photo-preview-heading"><strong>{previewPhoto.fileName}</strong><button className="secondary-button" type="button" onClick={() => setPreviewPhoto(null)}>Đóng</button></div>
                <img src={previewPhoto.dataUri} alt={`Ảnh bằng chứng ${previewPhoto.fileName}`} />
            </section>
        </div>}
    </main>;
}

export default RepairHistory;
