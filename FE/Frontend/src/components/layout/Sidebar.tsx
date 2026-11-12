import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    CalendarDays,
    CalendarPlus,
    ChartColumn,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileText,
    History,
    LayoutDashboard,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldCheck,
    Star,
    Stethoscope,
    UserRound,
    Users,
    Wrench,
} from "lucide-react";

type UserRole = "CUSTOMER" | "EMPLOYEE" | "ADMIN";

interface SidebarProps {
    role: UserRole;
    email?: string;
    onLogout: () => void;
}

const roleLabels: Record<UserRole, string> = {
    CUSTOMER: "Khách hàng",
    EMPLOYEE: "Nhân viên",
    ADMIN: "Quản trị viên",
};

const roleMenus = {
    CUSTOMER: [
        { to: "/customer", label: "Bảng điều khiển", icon: LayoutDashboard, end: true },
        { to: "/customer/profile", label: "Thông tin cá nhân", icon: UserRound },
        { to: "/customer/services", label: "Dịch vụ sửa chữa", icon: Wrench },
        { to: "/customer/appointments", label: "Lịch hẹn", icon: CalendarDays },
        { to: "/customer/repair-tracking", label: "Theo dõi sửa chữa", icon: ClipboardCheck },
        { to: "/customer/quotes", label: "Duyệt báo giá", icon: FileText },
        { to: "/customer/payment", label: "Thanh toán", icon: CreditCard },
        { to: "/customer/repair-history", label: "Lịch sử sửa chữa", icon: History },
        { to: "/customer/reviews", label: "Đánh giá dịch vụ", icon: Star },
        { to: "/customer/warranty", label: "Yêu cầu bảo hành", icon: ShieldCheck },
    ],
    EMPLOYEE: [
        { to: "/employee", label: "Bảng điều khiển", icon: LayoutDashboard, end: true },
        { to: "/employee/appointments", label: "Lịch hẹn", icon: CalendarDays },
        { to: "/employee/receive-device", label: "Tiếp nhận thiết bị", icon: CalendarPlus },
        { to: "/employee/repairs", label: "Phiếu sửa chữa", icon: ClipboardList },
        { to: "/employee/diagnosis", label: "Chẩn đoán thiết bị", icon: Stethoscope },
        { to: "/employee/quotes", label: "Báo giá", icon: FileText },
        { to: "/employee/repair-process", label: "Thực hiện sửa chữa", icon: Wrench },
        { to: "/employee/payments", label: "Xác nhận thanh toán", icon: CreditCard },
        { to: "/employee/profile", label: "Thông tin cá nhân", icon: UserRound },
    ],
    ADMIN: [
        { to: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard, end: true },
        { to: "/admin/employees", label: "Quản lý nhân viên", icon: Users },
        { to: "/admin/services", label: "Quản lý dịch vụ", icon: Wrench },
        { to: "/admin/customers", label: "Quản lý khách hàng", icon: UserRound },
        { to: "/admin/repairs", label: "Quản lý sửa chữa", icon: ClipboardList },
        { to: "/admin/reports", label: "Báo cáo thống kê", icon: ChartColumn },
        { to: "/admin/profile", label: "Thông tin cá nhân", icon: UserRound },
    ],
};

function Sidebar({ role, email, onLogout }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

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
                {roleMenus[role].map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                        title={collapsed ? label : undefined}
                    >
                        <Icon size={18} aria-hidden="true" />
                        <span className="menu-label">{label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="logout-button" onClick={onLogout}>
                <LogOut size={18} aria-hidden="true" />
                <span className="logout-label">Đăng xuất</span>
            </button>
        </aside>
    );
}

export default Sidebar;
