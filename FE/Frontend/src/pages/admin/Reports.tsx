import { useCallback, useEffect, useMemo, useState } from "react";
import { getCustomersApi } from "../../api/customerApi";
import { getEmployeesApi } from "../../api/employeeApi";
import { getRepairTicketsApi } from "../../api/repairTicketApi";
import { getServicesApi } from "../../api/serviceApi";
import type { RepairTicket } from "../../types/repairTicket";
import { statusLabel } from "../../utils/statusLabel";

type ReportData = { customers: number; employees: number; services: number; tickets: RepairTicket[] };
const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function AdminReports() {
    const [data, setData] = useState<ReportData>({ customers: 0, employees: 0, services: 0, tickets: [] });
    const [from, setFrom] = useState(() => dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [to, setTo] = useState(() => dateValue(new Date()));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [customers, employees, services, tickets] = await Promise.all([
                getCustomersApi(), getEmployeesApi(), getServicesApi(), getRepairTicketsApi(),
            ]);
            setData({ customers: customers.length, employees: employees.length, services: services.length, tickets });
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || requestError.response?.data?.error || "Không tải được dữ liệu báo cáo. Kiểm tra quyền quản trị và kết nối API.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filteredTickets = useMemo(() => data.tickets.filter((ticket) =>
        (!from || ticket.receivedDate >= from) && (!to || ticket.receivedDate <= to),
    ), [data.tickets, from, to]);
    const statusCounts = useMemo(() => filteredTickets.reduce<Record<string, number>>((counts, ticket) => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        return counts;
    }, {}), [filteredTickets]);

    const exportCsv = () => {
        const rows = [
            ["Mã phiếu", "Khách hàng", "Thiết bị", "Ngày tiếp nhận", "Nhân viên", "Trạng thái"],
            ...filteredTickets.map((ticket) => [ticket.ticketCode, ticket.customerName, ticket.device, ticket.receivedDate, ticket.technicianName || "", statusLabel(ticket.status)]),
        ];
        const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `fixhub-bao-cao-${from || "tat-ca"}-${to || "tat-ca"}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const summary = [
        ["Tổng số khách hàng", data.customers],
        ["Tổng số nhân viên", data.employees],
        ["Tổng số dịch vụ", data.services],
        ["Phiếu trong kỳ", filteredTickets.length],
    ] as const;

    return <main className="management-page">
        <div className="page-header">
            <h1>Báo cáo hoạt động</h1>
            <p>Tổng hợp dữ liệu hiện có từ danh sách khách hàng, nhân viên, dịch vụ và phiếu sửa chữa.</p>
        </div>

        {error && <div className="error-message" role="alert">{error} <button className="secondary-button" type="button" onClick={() => void load()}>Thử lại</button></div>}

        <section className="appointment-search-panel" aria-label="Bộ lọc báo cáo">
            <div className="appointment-form-group"><label htmlFor="report-from">Từ ngày tiếp nhận</label><input id="report-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
            <div className="appointment-form-group"><label htmlFor="report-to">Đến ngày tiếp nhận</label><input id="report-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
            <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</button><button className="primary-button" type="button" onClick={exportCsv} disabled={loading || filteredTickets.length === 0}>Xuất CSV</button></div>
        </section>

        <div className="dashboard-grid">
            {summary.map(([label, value]) => <article className="dashboard-card" key={label}><div className="card-title">{label}</div><div className="card-value">{loading ? "…" : value}</div></article>)}
        </div>

        <section className="table-container" style={{ marginTop: 24 }}>
            <div className="appointment-results-heading"><div><h2>Phiếu theo trạng thái</h2><p>{loading ? "Đang tổng hợp..." : `${filteredTickets.length} phiếu trong khoảng ngày đã chọn`}</p></div></div>
            {loading ? <div className="table-state">Đang tải dữ liệu báo cáo...</div> : filteredTickets.length === 0 ? <div className="table-state"><p>Không có phiếu sửa chữa trong khoảng thời gian này.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Trạng thái</th><th>Số phiếu</th><th>Tỷ lệ</th></tr></thead><tbody>{Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => <tr key={status}><td>{statusLabel(status)}</td><td>{count}</td><td>{Math.round(count / filteredTickets.length * 100)}%</td></tr>)}</tbody></table></div>}
            <p className="diagnosis-storage-note">Báo cáo doanh thu và đánh giá chưa thể hiển thị: API hiện có không cung cấp dữ liệu thanh toán tổng hợp hoặc đánh giá.</p>
        </section>
    </main>;
}

export default AdminReports;
