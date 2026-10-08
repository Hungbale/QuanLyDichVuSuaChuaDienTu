import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Wrench,
    Users,
    UserCog,
    Tags,
    LogOut,
} from "lucide-react";

interface SidebarProps {
    role: "CUSTOMER" | "EMPLOYEE";
    onLogout: () => void;
}

function Sidebar({ role, onLogout }: SidebarProps) {
    const customerMenu = [
        {
            to: "/customer",
            label: "Tổng quan",
            icon: LayoutDashboard,
        },
        {
            to: "/customer/services",
            label: "Dịch vụ sửa chữa",
            icon: Wrench,
        },
    ];

    const employeeMenu = [
        {
            to: "/employee",
            label: "Tổng quan",
            icon: LayoutDashboard,
        },
        {
            to: "/employee/customers",
            label: "Khách hàng",
            icon: Users,
        },
        {
            to: "/employee/employees",
            label: "Nhân viên",
            icon: UserCog,
        },
        {
            to: "/employee/categories",
            label: "Danh mục",
            icon: Tags,
        },
        {
            to: "/employee/services",
            label: "Dịch vụ",
            icon: Wrench,
        },
    ];

    const menu = role === "CUSTOMER"
        ? customerMenu
        : employeeMenu;

    return (
        <aside
            style={{
                width: "240px",
                minHeight: "100vh",
                background: "#111",
                color: "#fff",
                padding: "20px 0",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    padding: "0 20px 25px",
                    borderBottom: "1px solid #333",
                }}
            >
                <h2 style={{ margin: 0 }}>
                    FixHub
                </h2>

                <p
                    style={{
                        margin: "6px 0 0",
                        color: "#aaa",
                        fontSize: "13px",
                    }}
                >
                    Quản lý dịch vụ sửa chữa
                </p>
            </div>

            <nav
                style={{
                    padding: "20px 12px",
                    flex: 1,
                }}
            >
                {menu.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/customer" || item.to === "/employee"}
                            style={({ isActive }) => ({
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px",
                                marginBottom: "6px",
                                color: isActive ? "#fff" : "#aaa",
                                background: isActive ? "#2a2a2a" : "transparent",
                                textDecoration: "none",
                                borderRadius: "6px",
                            })}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div
                style={{
                    padding: "12px",
                    borderTop: "1px solid #333",
                }}
            >
                <button
                    type="button"
                    onClick={onLogout}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        border: "none",
                        background: "transparent",
                        color: "#aaa",
                        cursor: "pointer",
                        textAlign: "left",
                    }}
                >
                    <LogOut size={18} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;