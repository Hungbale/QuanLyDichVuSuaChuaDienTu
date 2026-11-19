import { useCallback, useEffect, useState } from "react";
import {
    getPeriodSystemReportApi,
    getSystemReportApi,
    type ComparisonMetric,
    type ComparisonSystemReport,
    type PeriodSystemReport,
    type ReportMetric,
    type ReportRange,
} from "../../api/systemReportApi";
import { getRepairTicketsApi } from "../../api/repairTicketApi";
import type { RepairTicket } from "../../types/repairTicket";
import { createReportWorkbook } from "../../utils/reportWorkbook";

type ReportMode = "period" | "comparison";
const toInputDate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
};
const today = toInputDate(new Date());
const formatMetricValue = (key: string, value: number | null) => {
    if (value == null) return "Chưa có dữ liệu";
    const fractionDigits = key === "averageRating" ? 2 : key === "revenue" ? 2 : 0;
    const formatted = Number(value).toLocaleString("vi-VN", { maximumFractionDigits: fractionDigits });
    if (key === "revenue") return `${formatted} ₫`;
    if (key === "averageRating") return `${formatted} / 5 sao`;
    return formatted;
};
const formatDifference = (key: string, value: number | null) => {
    if (value == null) return null;
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${formatMetricValue(key, Math.abs(value))}`;
};
const statusNames: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CANCELLATION_REQUESTED: "Chờ duyệt hủy",
    CANCELLED: "Đã hủy",
    RECEIVED: "Đã tiếp nhận",
    IN_PROGRESS: "Đang xử lý",
    CONVERTED: "Đã chuyển thành phiếu sửa chữa",
    SCHEDULED: "Chờ tiếp nhận",
    DIAGNOSING: "Đang chẩn đoán",
    WAITING_FOR_QUOTE_APPROVAL: "Chờ khách xác nhận báo giá",
    REPAIRING: "Đang sửa chữa",
    WAITING_FOR_PARTS: "Chờ linh kiện",
    CANNOT_BE_REPAIRED: "Không thể sửa",
    CUSTOMER_DECLINED: "Khách đã từ chối",
    COMPLETED: "Hoàn thành",
    INSPECTING: "Đang kiểm tra",
    QUOTED: "Đã báo giá",
    WAITING_FOR_CUSTOMER: "Chờ khách xác nhận",
    WAITING_FOR_PAYMENT: "Chờ thanh toán",
    REJECTED: "Đã từ chối",
};

const defaultFrom = toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const metricNames: Record<string, string> = {
    appointments: "Lịch hẹn",
    repairTickets: "Phiếu sửa chữa tiếp nhận",
    completedTickets: "Phiếu đã hoàn thành",
    revenue: "Doanh thu",
    averageRating: "Điểm đánh giá trung bình",
};


function AdminReports() {
    const [mode, setMode] = useState<ReportMode>("comparison");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(today);
    const [report, setReport] = useState<PeriodSystemReport | ComparisonSystemReport | null>(null);
    const [repairTickets, setRepairTickets] = useState<RepairTicket[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState("");
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

    useEffect(() => {
        let cancelled = false;
        const loadActivityTickets = async () => {
            setActivityLoading(true);
            setActivityError("");
            try {
                const tickets = await getRepairTicketsApi();
                if (!cancelled) setRepairTickets(tickets);
            } catch (requestError: unknown) {
                if (cancelled) return;
                const apiError = requestError as { response?: { data?: { message?: string } }; message?: string };
                setActivityError(apiError.response?.data?.message || apiError.message || "Không thể tải dữ liệu thống kê phiếu sửa chữa.");
            } finally {
                if (!cancelled) setActivityLoading(false);
            }
        };
        void loadActivityTickets();
        return () => { cancelled = true; };
    }, []);

    const exportReport = async () => {
        if (!report || activityLoading) return;
        setExporting(true);
        setError("");
        try {
            const summaryRows: (string | number | null)[][] = [
                ["BÁO CÁO HOẠT ĐỘNG"],
                ["Kỳ báo cáo", report.fromDate, report.toDate],
                ["Chế độ", mode === "comparison" ? "Tổng hợp và so sánh" : "Chỉ số kỳ đã chọn"],
                ...(comparisonReport ? [["Kỳ so sánh", comparisonReport.comparisonFromDate, comparisonReport.comparisonToDate] as (string | number | null)[]] : []),
                [],
                ["Chỉ số", "Kỳ này", ...(comparisonReport ? ["Kỳ trước", "Chênh lệch", "Thay đổi (%)"] : [])],
                ...metrics.map((metric) => {
                    const value = mode === "comparison"
                        ? (metric as ComparisonMetric).currentPeriod
                        : (metric as ReportMetric).value;
                    return [metricNames[metric.key] || metric.label, value,
                        ...(comparisonReport ? [
                            (metric as ComparisonMetric).previousPeriod,
                            (metric as ComparisonMetric).difference,
                            (metric as ComparisonMetric).percentChange,
                        ] : [])];
                }),
                [],
                ["Trạng thái lịch hẹn"],
                ["Trạng thái", "Số lượng"],
                ...Object.entries(appointmentStatuses).map(([status, count]) => [statusNames[status] || status, count]),
                [],
                ["Trạng thái phiếu sửa chữa"],
                ["Trạng thái", "Số lượng"],
                ...Object.entries(ticketStatuses).map(([status, count]) => [statusNames[status] || status, count]),
                ...(report.unavailableMetrics.length ? [[], ["Chỉ số chưa có dữ liệu"], ...report.unavailableMetrics.map((item) => [item])] : []),
            ];
            const employeeRows: (string | number | null)[][] = activityError
                ? [["BÁO CÁO NHÂN VIÊN"], [`Kỳ báo cáo: ${fromDate} — ${toDate}`], ["Không thể tải số liệu nhân viên"], [activityError]]
                : [["BÁO CÁO NHÂN VIÊN"], [`Kỳ báo cáo: ${fromDate} — ${toDate}`], ["Nhân viên", "Số phiếu hoàn thành"],
                    ...employeeCompletedCounts.map((employee) => [employee.name, employee.count]),
                    ["Tổng", completedTicketsInPeriod.length]];
            const customerRows: (string | number | null)[][] = activityError
                ? [["BÁO CÁO KHÁCH HÀNG"], [`Kỳ báo cáo: ${fromDate} — ${toDate}`], ["Không thể tải số liệu khách hàng"], [activityError]]
                : [["BÁO CÁO KHÁCH HÀNG"], [`Kỳ báo cáo: ${fromDate} — ${toDate}`], ["Khách hàng", "Số phiếu đã sử dụng dịch vụ"],
                    ...customerTicketCounts.map((customer) => [customer.name, customer.count]),
                    ["Tổng", completedTicketsInPeriod.length]];
            const metricHeaderRow = comparisonReport ? 5 : 4;
            const appointmentHeaderRow = metricHeaderRow + metrics.length + 3;
            const ticketHeaderRow = appointmentHeaderRow + Object.keys(appointmentStatuses).length + 3;
            const blob = createReportWorkbook([
                {
                    name: "Tổng quan",
                    rows: summaryRows,
                    headerRows: [metricHeaderRow, appointmentHeaderRow, ticketHeaderRow],
                    sectionRows: [appointmentHeaderRow - 1, ticketHeaderRow - 1],
                },
                { name: "Nhân viên", rows: employeeRows, headerRows: [2], totalRows: activityError ? [] : [employeeRows.length - 1] },
                { name: "Khách hàng", rows: customerRows, headerRows: [2], totalRows: activityError ? [] : [customerRows.length - 1] },
            ]);
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
    const comparisonReport = report && mode === "comparison" ? report as ComparisonSystemReport : null;
    const appointmentStatuses = report?.appointmentStatusCounts ?? {};
    const ticketStatuses = report?.repairTicketStatusCounts ?? {};
    const statusRows = [
        ...Object.entries(appointmentStatuses).map(([status, count]) => ({ type: "Lịch hẹn", status, count })),
        ...Object.entries(ticketStatuses).map(([status, count]) => ({ type: "Phiếu sửa chữa", status, count })),
    ].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "vi") || a.status.localeCompare(b.status));
    const statusGroups = [
        { type: "Lịch hẹn", rows: statusRows.filter((row) => row.type === "Lịch hẹn") },
        { type: "Phiếu sửa chữa", rows: statusRows.filter((row) => row.type === "Phiếu sửa chữa") },
    ];
    const totalStatusCount = statusRows.reduce((sum, row) => sum + row.count, 0);
    const repairTicketsReceivedInPeriod = repairTickets.filter((ticket) => ticket.receivedDate >= fromDate && ticket.receivedDate <= toDate);
    const completedTicketsInPeriod = repairTicketsReceivedInPeriod.filter((ticket) => ["COMPLETED", "HOÀN THÀNH", "ĐÃ KẾT THÚC"].includes(ticket.status.trim().toUpperCase()));
    const employeeCompletedCounts = Array.from(completedTicketsInPeriod.reduce((counts, ticket) => {
        const id = ticket.technicianId == null ? "unassigned" : String(ticket.technicianId);
        const name = ticket.technicianName?.trim() || (id === "unassigned" ? "Chưa phân công" : `Nhân viên #${id}`);
        const current = counts.get(id) ?? { id, name, count: 0 };
        current.count += 1;
        counts.set(id, current);
        return counts;
    }, new Map<string, { id: string; name: string; count: number }>()).values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
    const customerTicketCounts = Array.from(completedTicketsInPeriod.reduce((counts, ticket) => {
        const id = String(ticket.customerId);
        const name = ticket.customerName?.trim() || `Khách hàng #${id}`;
        const current = counts.get(id) ?? { id, name, count: 0 };
        current.count += 1;
        counts.set(id, current);
        return counts;
    }, new Map<string, { id: string; name: string; count: number }>()).values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));

    return <main className="management-page">
        <header className="appointment-page-header">
            <div>
                <span className="appointment-eyebrow">FIXHUB · QUẢN TRỊ VIÊN</span>
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
                <button className="primary-button" type="button" onClick={() => void exportReport()} disabled={loading || activityLoading || exporting || !report}>{exporting ? "Đang xuất..." : "Xuất Excel (3 trang)"}</button>
            </div>
        </section>

        {loading ? <div className="table-state" role="status">Đang tải dữ liệu báo cáo...</div>
            : !report ? <section className="table-container"><div className="table-state">Không có dữ liệu báo cáo để hiển thị.</div></section>
            : <>
                {report.message && <p className={report.hasData ? "diagnosis-storage-note" : "table-state"} role="status">{report.message}</p>}
                <section className="dashboard-grid" aria-label="Các chỉ số báo cáo">
                    {metrics.map((metric) => {
                        const comparisonMetric = metric as ComparisonMetric;
                        const value = mode === "comparison" ? comparisonMetric.currentPeriod : (metric as ReportMetric).value;
                        return <article className="dashboard-card" key={metric.key}>
                            <div className="card-title">{metricNames[metric.key] || metric.label}</div>
                            <div className="card-value">{formatMetricValue(metric.key, value)}</div>
                            {mode === "comparison" && <div className="report-metric-comparison">
                                <small>Kỳ trước ({comparisonReport?.comparisonFromDate} — {comparisonReport?.comparisonToDate}): {formatMetricValue(metric.key, comparisonMetric.previousPeriod)}</small>
                                <small>Chênh lệch: {formatDifference(metric.key, comparisonMetric.difference) ?? "Chưa có dữ liệu"}{comparisonMetric.percentChange == null ? " (không tính được tỉ lệ %)" : ` (${comparisonMetric.percentChange > 0 ? "+" : ""}${comparisonMetric.percentChange}% so với kỳ trước)`}</small>
                            </div>}
                        </article>;
                    })}
                </section>

                <section className="report-chart-grid" aria-label="Biểu đồ báo cáo">
                    <article className="report-chart-card">
                        <div className="report-chart-heading">
                            <div>
                                <h2>So sánh các chỉ số</h2>
                                <p>{comparisonReport ? `${comparisonReport.fromDate} — ${comparisonReport.toDate} so với ${comparisonReport.comparisonFromDate} — ${comparisonReport.comparisonToDate}` : "Biểu đồ so sánh cần chọn loại báo cáo tổng hợp."}</p>
                            </div>
                            {comparisonReport && <div className="report-chart-legend"><span><i className="report-chart-swatch report-chart-current" />Kỳ này</span><span><i className="report-chart-swatch report-chart-previous" />Kỳ trước</span></div>}
                        </div>
                        {comparisonReport ? <div className="report-metric-chart" role="img" aria-label="Biểu đồ cột so sánh các chỉ số giữa hai kỳ">
                            {metrics.map((metric) => {
                                const comparisonMetric = metric as ComparisonMetric;
                                const current = comparisonMetric.currentPeriod ?? 0;
                                const previous = comparisonMetric.previousPeriod ?? 0;
                                const scale = Math.max(current, previous, 1);
                                return <div className="report-metric-chart-row" key={metric.key}>
                                    <div className="report-metric-chart-label">{metricNames[metric.key] || metric.label}</div>
                                    <div className="report-metric-chart-bars">
                                        <div className="report-metric-bar-line"><span className="report-metric-bar report-chart-current" style={{ width: `${Math.max(0, current / scale * 100)}%` }} /><small>{formatMetricValue(metric.key, comparisonMetric.currentPeriod)}</small></div>
                                        <div className="report-metric-bar-line"><span className="report-metric-bar report-chart-previous" style={{ width: `${Math.max(0, previous / scale * 100)}%` }} /><small>{formatMetricValue(metric.key, comparisonMetric.previousPeriod)}</small></div>
                                    </div>
                                </div>;
                            })}
                        </div> : <p className="report-chart-empty">Chọn “Tổng hợp và so sánh kỳ trước” để xem biểu đồ đối chiếu.</p>}
                    </article>

                    <article className="report-chart-card">
                        <div className="report-chart-heading"><div><h2>Phân bố trạng thái</h2><p>Số hồ sơ theo trạng thái hiện tại trong kỳ báo cáo.</p></div></div>
                        <div className="report-status-chart">
                            {statusGroups.map((group) => {
                                const total = group.rows.reduce((sum, row) => sum + row.count, 0);
                                return <div className="report-status-group" key={group.type}>
                                    <h3>{group.type} <span>{total.toLocaleString("vi-VN")}</span></h3>
                                    {total > 0 ? <>
                                        <div className="report-status-stacked-bar" role="img" aria-label={`Phân bố ${group.type.toLowerCase()} theo trạng thái`}>
                                            {group.rows.map((row, index) => <span key={row.status} title={`${statusNames[row.status] || row.status}: ${row.count.toLocaleString("vi-VN")}`} style={{ width: `${row.count / total * 100}%` }} className={`report-status-segment report-status-color-${index % 6}`} />)}
                                        </div>
                                        <ul className="report-status-legend">
                                            {group.rows.map((row, index) => <li key={row.status}><span className={`report-chart-swatch report-status-color-${index % 6}`} /><span>{statusNames[row.status] || row.status}</span><strong>{row.count.toLocaleString("vi-VN")} <small>({(row.count / total * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%)</small></strong></li>)}
                                        </ul>
                                    </> : <p className="report-chart-empty">Không có dữ liệu trạng thái.</p>}
                                </div>;
                            })}
                        </div>
                    </article>
                </section>

                <section className="table-container report-status-section" style={{ marginTop: 24 }}>
                    <div className="appointment-results-heading report-status-heading"><div><h2>Trạng thái hiện tại của hồ sơ phát sinh trong kỳ</h2><p>Kỳ báo cáo: {report.fromDate} — {report.toDate}{comparisonReport ? ` | Kỳ trước: ${comparisonReport.comparisonFromDate} — ${comparisonReport.comparisonToDate}` : ""}</p><small>Thống kê theo trạng thái hiện tại của lịch hẹn và phiếu tiếp nhận trong khoảng ngày đã chọn.</small></div><span className="report-status-total"><strong>{totalStatusCount.toLocaleString("vi-VN")}</strong><small>hồ sơ</small></span></div>
                    <div className="appointment-panel appointment-table-container report-status-table-container">
                        <table className="appointment-table report-status-table"><thead><tr><th>Loại hồ sơ</th><th>Trạng thái</th><th>Số lượng</th></tr></thead>
                            <tbody>{statusRows.length === 0 ? <tr><td colSpan={3} className="report-status-empty">Không có dữ liệu trạng thái trong kỳ này.</td></tr> : statusRows.map((item) => <tr key={`${item.type}-${item.status}`}><td><span className="report-type-pill">{item.type}</span></td><td>{statusNames[item.status] || item.status}</td><td className="report-count-cell"><strong>{item.count.toLocaleString("vi-VN")}</strong></td></tr>)}</tbody>
                            {statusRows.length > 0 && <tfoot><tr><td colSpan={2}>Tổng số hồ sơ</td><td className="report-count-cell"><strong>{totalStatusCount.toLocaleString("vi-VN")}</strong></td></tr></tfoot>}
                        </table>
                    </div>
                </section>

                <section className="report-activity-grid" aria-label="Thống kê phiếu theo nhân viên và khách hàng">
                    <article className="report-activity-card">
                        <div className="report-activity-heading"><div><h2>Phiếu hoàn thành theo nhân viên</h2><p>Chỉ tính phiếu có trạng thái hoàn thành; lọc theo ngày tiếp nhận trên phiếu ({fromDate} — {toDate}).</p></div><strong>{completedTicketsInPeriod.length.toLocaleString("vi-VN")}</strong></div>
                        {activityError ? <p className="report-activity-state report-activity-error">{activityError}</p>
                            : activityLoading ? <p className="report-activity-state">Đang tải dữ liệu phiếu...</p>
                                : employeeCompletedCounts.length === 0 ? <p className="report-activity-state">Không có phiếu hoàn thành trong kỳ này.</p>
                                    : <div className="report-activity-table-wrap"><table className="report-activity-table"><thead><tr><th>Nhân viên</th><th>Số phiếu hoàn thành</th></tr></thead><tbody>{employeeCompletedCounts.map((employee) => <tr key={employee.id}><td>{employee.name}</td><td>{employee.count.toLocaleString("vi-VN")}</td></tr>)}</tbody><tfoot><tr><td>Tổng</td><td>{completedTicketsInPeriod.length.toLocaleString("vi-VN")}</td></tr></tfoot></table></div>}
                    </article>

                    <article className="report-activity-card">
                        <div className="report-activity-heading"><div><h2>Phiếu khách hàng đã sử dụng dịch vụ</h2><p>Chỉ tính phiếu có trạng thái hoàn thành; lọc theo ngày tiếp nhận trên phiếu trong kỳ {fromDate} — {toDate}.</p></div><strong>{completedTicketsInPeriod.length.toLocaleString("vi-VN")}</strong></div>
                        {activityError ? <p className="report-activity-state report-activity-error">{activityError}</p>
                            : activityLoading ? <p className="report-activity-state">Đang tải dữ liệu phiếu...</p>
                                : customerTicketCounts.length === 0 ? <p className="report-activity-state">Không có khách hàng sử dụng dịch vụ trong kỳ này.</p>
                                    : <div className="report-activity-table-wrap"><table className="report-activity-table"><thead><tr><th>Khách hàng</th><th>Số phiếu hoàn thành</th></tr></thead><tbody>{customerTicketCounts.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.count.toLocaleString("vi-VN")}</td></tr>)}</tbody><tfoot><tr><td>Tổng</td><td>{completedTicketsInPeriod.length.toLocaleString("vi-VN")}</td></tr></tfoot></table></div>}
                    </article>
                </section>
                {!!report.unavailableMetrics.length && <p className="diagnosis-storage-note">Một số chỉ số chưa có dữ liệu: {report.unavailableMetrics.join("; ")}</p>}
            </>}
    </main>;
}

export default AdminReports;
