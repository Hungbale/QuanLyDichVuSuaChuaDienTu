import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    CalendarDays,
    ChartColumn,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    History,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldCheck,
    Star,
    UserRound,
    Users,
    Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAppointmentsApi, getAppointmentCancellationRequestsApi, getMyAppointmentsApi, getMyAssignedAppointmentGroupsApi } from "../../api/appointmentApi";
import { getRepairTicketsApi, getMyAssignedRepairTicketsApi, getMyRepairHistoryApi } from "../../api/repairTicketApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getServicesApi } from "../../api/serviceApi";
import { getEmployeesApi } from "../../api/employeeApi";
import { getCustomersApi } from "../../api/customerApi";
import { getMyWarrantyRequestsApi } from "../../api/warrantyRequestApi";
import { getMyServiceReviewsApi } from "../../api/serviceReviewApi";
import { getWarrantyRequestsApi } from "../../api/warrantyRequestApi";
import { isPastRepairTicket } from "../../utils/repairTicketPeriod";
import { isQuoteReadyForEmployee } from "../../utils/employeeQuoteStatus";

type UserRole = "CUSTOMER" | "EMPLOYEE" | "ADMIN";

interface SidebarProps {
    role: UserRole;
    email?: string;
    onLogout: () => void | Promise<void>;
    onPendingCountsChange?: (counts: Record<string, number>) => void;
}

const roleLabels: Record<UserRole, string> = {
    CUSTOMER: "Khách hàng",
    EMPLOYEE: "Nhân viên",
    ADMIN: "Quản trị viên",
};

const roleMenus = {
    CUSTOMER: [
        { to: "/customer/services", label: "Dịch vụ sửa chữa", icon: Wrench },
        { to: "/customer/appointments", label: "Lịch hẹn", icon: CalendarDays },
        { to: "/customer/repair-tracking", label: "Theo dõi sửa chữa", icon: ClipboardCheck },
        { to: "/customer/quotes", label: "Duyệt báo giá", icon: FileText },
        { to: "/customer/payment", label: "Thanh toán", icon: CreditCard },
        { to: "/customer/repair-history", label: "Lịch sử sửa chữa", icon: History },
        { to: "/customer/reviews", label: "Đánh giá dịch vụ", icon: Star },
        { to: "/customer/warranty", label: "Yêu cầu bảo hành", icon: ShieldCheck },
        { to: "/customer/profile", label: "Thông tin cá nhân", icon: UserRound },
    ],
    EMPLOYEE: [
        { to: "/employee/appointments", label: "Lịch hẹn", icon: CalendarDays },
        { to: "/employee/repairs", label: "Phiếu sửa chữa", icon: ClipboardList },
        { to: "/employee/quotes", label: "Báo giá", icon: FileText },
        { to: "/employee/repair-process", label: "Thực hiện sửa chữa", icon: Wrench },
        { to: "/employee/profile", label: "Thông tin cá nhân", icon: UserRound },
    ],
    ADMIN: [
        { to: "/admin/repairs", label: "Quản lý sửa chữa", icon: ClipboardList },
        { to: "/admin/services", label: "Quản lý dịch vụ", icon: Wrench },
        { to: "/admin/employees", label: "Quản lý nhân viên", icon: Users },
        { to: "/admin/customers", label: "Quản lý khách hàng", icon: UserRound },
        { to: "/admin/reports", label: "Báo cáo thống kê", icon: ChartColumn },
        { to: "/admin/profile", label: "Thông tin cá nhân", icon: UserRound },
    ],
};

function Sidebar({ role, email, onLogout, onPendingCountsChange }: SidebarProps) {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const [collapsed, setCollapsed] = useState(() =>
        typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches,
    );
    const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 700px)");
        const updateForViewport = (event: MediaQueryListEvent) => setCollapsed(event.matches);

        mobileQuery.addEventListener("change", updateForViewport);
        return () => mobileQuery.removeEventListener("change", updateForViewport);
    }, []);

    useEffect(() => {
        let active = true;
        const loadPendingCounts = async () => {
            const counts: Record<string, number> = {};
            const terminal = (status: string) => ["COMPLETED", "CANCELLED", "CUSTOMER_DECLINED", "REJECTED", "REJECTED_BY_CUSTOMER", "ĐÃ HOÀN THÀNH", "ĐÃ HỦY", "ĐÃ TỪ CHỐI"].includes(status.trim().toLocaleUpperCase("vi"));
            const normalized = (status: string) => status.trim().toLocaleUpperCase("vi");
            if (role === "CUSTOMER") {
                const [appointments, history, warranty, reviews] = await Promise.allSettled([
                    getMyAppointmentsApi(), getMyRepairHistoryApi(), getMyWarrantyRequestsApi(), getMyServiceReviewsApi(),
                ]);
                if (appointments.status === "fulfilled") {
                    const now = Date.now();
                    counts["/customer/appointments"] = appointments.value.filter((item) => {
                        const status = normalized(item.status);
                        const received = ["RECEIVED", "IN_PROGRESS", "CONVERTED", "COMPLETED"].includes(status);
                        const timestamp = new Date(`${item.appointmentDate}T${item.appointmentTime}`).getTime();
                        return status !== "CANCELLED" && !received && timestamp >= now;
                    }).length;
                }
                if (history.status === "fulfilled") {
                    const entries = history.value;
                    const done = entries.filter((item) => ["COMPLETED", "HOÀN THÀNH", "ĐÃ KẾT THÚC"].includes(normalized(item.status)));
                    counts["/customer/repair-tracking"] = entries.filter((item) => !terminal(item.status)).length;
                    const billingResults = await Promise.allSettled(entries.map(async (entry) => {
                        const quote = await getRepairQuoteApi(entry.ticketId);
                        if (quote.status !== "ACCEPTED") return { quoteStatus: quote.status, needsPayment: false };
                        const payments = await getRepairPaymentsApi(entry.ticketId);
                        return { quoteStatus: quote.status, needsPayment: !payments.some((payment) => payment.status === "PAID") };
                    }));
                    const billingItems = billingResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
                    counts["/customer/quotes"] = billingItems.filter((item) => item.quoteStatus === "SENT").length;
                    counts["/customer/payment"] = billingItems.filter((item) => item.needsPayment).length;
                    if (reviews.status === "fulfilled") {
                        const reviewedIds = new Set(reviews.value.map((item) => item.repairTicketId));
                        counts["/customer/reviews"] = done.filter((item) => !reviewedIds.has(item.ticketId)).length;
                    }
                }
                if (warranty.status === "fulfilled") counts["/customer/warranty"] = warranty.value.filter((item) => ["PENDING", "APPROVED"].includes(normalized(item.status))).length;
            } else if (role === "EMPLOYEE") {
                const [groups, tickets] = await Promise.allSettled([getMyAssignedAppointmentGroupsApi(), getMyAssignedRepairTicketsApi()]);
                if (groups.status === "fulfilled") counts["/employee/appointments"] = groups.value.actionRequired.filter((item) => item.status !== "CANCELLATION_REQUESTED").length;
                if (tickets.status === "fulfilled") {
                    const items = tickets.value;
                    counts["/employee/repairs"] = items.filter((item) => !isPastRepairTicket(item)).length;
                    counts["/employee/repair-process"] = items.filter((item) => ["REPAIRING", "IN_PROGRESS", "ĐANG SỬA", "ĐANG SỬA CHỮA", "WAITING_FOR_PAYMENT"].includes(normalized(item.status))).length;
                    const quoteReadyCount = items.filter((item) => isQuoteReadyForEmployee(item.status)).length;
                    const paymentResults = await Promise.allSettled(items.map((ticket) => getRepairPaymentsApi(ticket.id)));
                    const pendingPaymentCount = paymentResults.reduce((total, result) => total + (result.status === "fulfilled" ? result.value.filter((payment) => payment.status === "PENDING").length : 0), 0);
                    counts["/employee/quotes"] = quoteReadyCount + pendingPaymentCount;
                }
            } else {
                const [appointments, cancellations, tickets, warranties, services, employees, customers] = await Promise.allSettled([
                    getAppointmentsApi(), getAppointmentCancellationRequestsApi(), getRepairTicketsApi(), getWarrantyRequestsApi(),
                    getServicesApi(), getEmployeesApi(), getCustomersApi(),
                ]);
                if (appointments.status === "fulfilled" || cancellations.status === "fulfilled") {
                    const needingAssignment = appointments.status === "fulfilled" ? appointments.value.filter((item) => item.status === "PENDING").length : 0;
                    const cancellationCount = cancellations.status === "fulfilled" ? cancellations.value.length : 0;
                    counts["/admin/repairs:appointments"] = needingAssignment + cancellationCount;
                }
                if (tickets.status === "fulfilled") {
                    const activeTickets = tickets.value.filter((item) => !isPastRepairTicket(item));
                    counts["/admin/repairs:repairs"] = activeTickets.length;
                    const [paymentResults, quoteResults] = await Promise.all([
                        Promise.allSettled(tickets.value.map((ticket) => getRepairPaymentsApi(ticket.id))),
                        Promise.allSettled(tickets.value.map((ticket) => getRepairQuoteApi(ticket.id))),
                    ]);
                    const pendingPayments = paymentResults.reduce((total, result) => total + (result.status === "fulfilled" ? result.value.filter((payment) => payment.status === "PENDING").length : 0), 0);
                    const quoteRows = quoteResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
                    const sentQuotes = quoteRows.filter((quote) => quote.status === "SENT").length;
                    const quotedTicketIds = new Set(quoteRows.map((quote) => quote.repairTicketId));
                    const quoteCreationTasks = tickets.value.filter((ticket) => isQuoteReadyForEmployee(ticket.status) && !quotedTicketIds.has(ticket.id)).length;
                    counts["/admin/repairs:billing"] = pendingPayments + sentQuotes + quoteCreationTasks;
                }
                if (warranties.status === "fulfilled") counts["/admin/repairs:warranty"] = warranties.value.filter((item) => ["PENDING", "APPROVED"].includes(normalized(item.status))).length;
                counts["/admin/repairs"] = ["appointments", "repairs", "billing", "warranty"]
                    .reduce((total, section) => total + (counts[`/admin/repairs:${section}`] ?? 0), 0);
                if (services.status === "fulfilled") counts["/admin/services"] = services.value.length;
                if (employees.status === "fulfilled") counts["/admin/employees"] = employees.value.length;
                if (customers.status === "fulfilled") counts["/admin/customers"] = customers.value.length;
            }
            if (active) {
                setPendingCounts(counts);
                onPendingCountsChange?.(counts);
            }
        };
        void loadPendingCounts();
        const refreshOnFocus = () => { void loadPendingCounts(); };
        const refreshInterval = window.setInterval(() => {
            if (document.visibilityState === "visible") void loadPendingCounts();
        }, 60_000);
        window.addEventListener("focus", refreshOnFocus);
        return () => {
            active = false;
            window.clearInterval(refreshInterval);
            window.removeEventListener("focus", refreshOnFocus);
        };
    }, [pathname, role, user?.id, onPendingCountsChange]);

    const handleLogout = async () => {
        if (!window.confirm("B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n \u0111\u0103ng xu\u1ea5t kh\u00f4ng?")) return;
        await onLogout();
    };

    return (
        <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
            <div className="sidebar-top">
                <div className="sidebar-logo" title="FIXHUB">FIXHUB</div>
                <button
                    className="sidebar-toggle"
                    type="button"
                    onClick={() => setCollapsed((value) => !value)}
                    aria-label={collapsed ? "Mở thanh công cụ" : "Ẩn thanh công cụ"}
                    title={collapsed ? "Mở thanh công cụ" : "Ẩn thanh công cụ"}
                >
                    {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
                </button>
            </div>

            <div className="sidebar-user">
                <div className="user-name">{roleLabels[role]}</div>
                {email && <div className="user-email" title={email}>{email}</div>}
            </div>

            <nav className="sidebar-menu" aria-label="Thanh công cụ">
                {roleMenus[role].map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                        aria-label={label}
                        title={collapsed ? label : undefined}
                    >
                        <Icon size={18} aria-hidden="true" />
                        <span className="sidebar-item-content"><span className="menu-label">{label}</span>
                            <span className="sidebar-badges">
                                {(role === "ADMIN" ? to === "/admin/repairs" : (pendingCounts[to] ?? 0) > 0) && (pendingCounts[to] ?? 0) > 0 && <span className="sidebar-badge" role="img" aria-label="Có việc cần làm" title="Có việc cần làm" />}
                            </span>
                        </span>
                    </NavLink>
                ))}
            </nav>

            <button className="logout-button" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất">
                <LogOut size={18} aria-hidden="true" />
                <span className="logout-label">Đăng xuất</span>
            </button>
        </aside>
    );
}

export default Sidebar;
