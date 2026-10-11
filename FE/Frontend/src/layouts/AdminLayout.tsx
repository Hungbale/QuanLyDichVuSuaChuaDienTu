import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminLayout() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    FIXHUB
                </div>

                <div className="sidebar-user">
                    <div className="user-name">
                        Quản trị viên
                    </div>

                    <div className="user-email">
                        {user?.email}
                    </div>
                </div>

                <nav className="sidebar-menu">
                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Bảng điều khiển
                    </NavLink>

                    <NavLink
                        to="/admin/employees"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Quản lý nhân viên
                    </NavLink>

                    <NavLink
                        to="/admin/services"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Quản lý dịch vụ
                    </NavLink>

                    <NavLink
                        to="/admin/customers"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Quản lý khách hàng
                    </NavLink>

                    <NavLink
                        to="/admin/repairs"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Quản lý sửa chữa
                    </NavLink>

                    <NavLink
                        to="/admin/reports"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Báo cáo thống kê
                    </NavLink>

                    <NavLink
                        to="/admin/profile"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Thông tin cá nhân
                    </NavLink>
                </nav>

                <button
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Đăng xuất
                </button>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;