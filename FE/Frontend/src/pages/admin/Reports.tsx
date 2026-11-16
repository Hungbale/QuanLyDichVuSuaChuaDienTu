import { useCallback, useEffect, useState } from "react";
import {
    exportSystemReportApi,
    getPeriodSystemReportApi,
    getSystemReportApi,
    type ComparisonMetric,
    type ComparisonSystemReport,
    type PeriodSystemReport,
    type ReportMetric,
    type ReportRange,
} from "../../api/systemReportApi";

type ReportMode = "period" | "comparison";
const toInputDate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
};
const today = toInputDate(new Date());
const defaultFrom = toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const metricNames: Record<string, string> = {
    appointments: "Lịch hẹn",
    repairTickets: "Phiếu sửa chữa tiếp nhận",
    completedTickets: "Phiếu đã hoàn thành",
    revenue: "Doanh thu",
    averageRating: "Điểm đánh giá trung bình",
};
const statusNames: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    SCHEDULED: "Đã lên lịch",
    RECEIVED: "Đã tiếp nhận",
    INSPECTING: "Đang kiểm tra",
    QUOTED: "Đã báo giá",
    WAITING_FOR_CUSTOMER: "Chờ khách xác nhận",
    REPAIRING: "Đang sửa chữa",
    WAITING_FOR_PAYMENT: "Chờ thanh toán",
    COMPLETED: "Hoàn thành",
    REJECTED: "Khách từ chối",
};

function AdminReports() {
    const [mode, setMode] = useState<ReportMode>("comparison");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(today);
    const [report, setReport] = useState<PeriodSystemReport | ComparisonSystemReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");

    const loadReport = useCallback(async () => {
        if (!fromDate || !toDate || fromDate > toDate) {
            setError("Vui lòng chọn khoảng ngày hợp lệ.");
            setReport(null);
            setLoading(false);
            return;
        }
        const dayCount = (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000 + 1;
        if (dayCount > 366) {
            setError("Khoảng thời gian báo cáo không được vượt quá 366 ngày.");
            setReport(null);
            setLoading(false);
            return;
        }
        const range: ReportRange = { fromDate, toDate };
        setLoading(true);
        setError("");
        try {
            const data = mode === "comparison"
                ? await getSystemReportApi(range)
                : await getPeriodSystemReportApi(range);
            setReport(data);
        } catch (requestError: unknown) {
            const apiError = requestError as { response?: { data?: { message?: string } }; message?: string };
            setReport(null);
            setError(apiError.response?.data?.message || apiError.message || "Không thể tải báo cáo. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, mode]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadReport(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadReport]);

    const exportReport = async () => {
        setExporting(true);
        setError("");
        try {
            const blob = await exportSystemReportApi({ fromDate, toDate }, mode === "comparison");
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `fixhub-bao-cao-${fromDate}-${toDate}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        } catch (requestError: unknown) {
            const apiError = requestError as { response?: { data?: { message?: string } }; message?: string };
            setError(apiError.response?.data?.message || apiError.message || "Không thể xuất file báo cáo.");
        } finally {
            setExporting(false);
        }
    };

    const metrics = report?.metrics ?? [];
    const appointmentStatuses = report?.appointmentStatusCounts ?? {};
    const ticketStatuses = report?.repairTicketStatusCounts ?? {};

    return <main className="management-page">
        <header className="page-header">
            <div>
                <h1>Báo cáo hoạt động</h1>
                <p>Xem số liệu vận hành theo thời gian và xuất báo cáo Excel.</p>
            </div>
        </header>

        {error && <div className="error-message" role="alert">{error} <button className="secondary-button" type="button" onClick={() => void loadReport()}>Thử lại</button></div>}

        <section className="appointment-search-panel" aria-label="Bộ lọc báo cáo">
            <div className="appointment-form-group">
                <label htmlFor="report-type">Loại báo cáo</label>
                <select id="report-type" value={mode} onChange={(event) => setMode(event.target.value as ReportMode)}>
                    <option value="comparison">Tổng hợp và so sánh kỳ trước</option>
                    <option value="period">Chỉ số liệu kỳ đã chọn</option>
                </select>
            </div>
            <div className="appointment-form-group">
                <label htmlFor="report-from">Từ ngày</label>
                <input id="report-from" type="date" value={fromDate} max={toDate || today} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="appointment-form-group">
                <label htmlFor="report-to">Đến ngày</label>
                <input id="report-to" type="date" value={toDate} min={fromDate || undefined} max={today} onChange={(event) => setToDate(event.target.value)} />
            </div>
            <div className="appointment-search-actions">
                <button className="secondary-button" type="button" onClick={() => void loadReport()} disabled={loading}>{loading ? "Đang tải..." : "Lọc báo cáo"}</button>
                <button className="primary-button" type="button" onClick={() => void exportReport()} disabled={loading || exporting || !report?.hasData}>{exporting ? "Đang xuất..." : "Xuất Excel"}</button>
            </div>
        </section>

        {loading ? <div className="table-state" role="status">Đang tải dữ liệu báo cáo...</div>
            : !report?.hasData ? <section className="table-container"><div className="table-state">{report?.message || "Không có dữ liệu phù hợp trong khoảng thời gian đã chọn."}</div></section>
            : <>
                <section className="dashboard-grid" aria-label="Các chỉ số báo cáo">
                    {metrics.map((metric) => {
                        const comparisonMetric = metric as ComparisonMetric;
                        const value = mode === "comparison" ? comparisonMetric.currentPeriod : (metric as ReportMetric).value;
                        const isRevenue = metric.key === "revenue";
                        return <article className="dashboard-card" key={metric.key}>
                            <div className="card-title">{metricNames[metric.key] || metric.label}</div>
                            <div className="card-value">{value == null ? "Chưa có dữ liệu" : isRevenue ? `${Number(value).toLocaleString("vi-VN")} ₫` : Number(value).toLocaleString("vi-VN")}{metric.key === "averageRating" && value != null ? " / 5" : ""}</div>
                            {mode === "comparison" && <small>Kỳ trước: {comparisonMetric.previousPeriod == null ? "Chưa có dữ liệu" : Number(comparisonMetric.previousPeriod).toLocaleString("vi-VN")}{metric.key === "revenue" && comparisonMetric.previousPeriod != null ? " ₫" : ""}{comparisonMetric.percentChange != null ? ` · ${comparisonMetric.percentChange > 0 ? "+" : ""}${comparisonMetric.percentChange}%` : ""}</small>}
                        </article>;
                    })}
                </section>

                <section className="table-container" style={{ marginTop: 24 }}>
                    <div className="appointment-results-heading"><div><h2>Trạng thái trong kỳ</h2><p>{report.fromDate} — {report.toDate}</p></div></div>
                    <div className="appointment-panel appointment-table-container">
                        <table className="appointment-table"><thead><tr><th>Loại</th><th>Trạng thái</th><th>Số lượng</th></tr></thead>
                            <tbody>{[
                                ...Object.entries(appointmentStatuses).map(([status, count]) => ({ type: "Lịch hẹn", status, count })),
                                ...Object.entries(ticketStatuses).map(([status, count]) => ({ type: "Phiếu sửa chữa", status, count })),
                            ].length === 0 ? <tr><td colSpan={3}>Không có dữ liệu trạng thái.</td></tr> : [
                                ...Object.entries(appointmentStatuses).map(([status, count]) => ({ type: "Lịch hẹn", status, count })),
                                ...Object.entries(ticketStatuses).map(([status, count]) => ({ type: "Phiếu sửa chữa", status, count })),
                            ].map((item) => <tr key={`${item.type}-${item.status}`}><td>{item.type}</td><td>{statusNames[item.status] || item.status}</td><td>{item.count.toLocaleString("vi-VN")}</td></tr>)}</tbody>
                        </table>
                    </div>
                </section>
                {!!report.unavailableMetrics.length && <p className="diagnosis-storage-note">Một số chỉ số chưa có dữ liệu: {report.unavailableMetrics.join("; ")}</p>}
            </>}
    </main>;
}

export default AdminReports;
