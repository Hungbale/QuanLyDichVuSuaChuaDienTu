import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function EmployeeLayout() {
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
                        Nhân viên
                    </div>

                    <div className="user-email">
                        {user?.email}
                    </div>
                </div>

                <nav className="sidebar-menu">
                    <NavLink
                        to="/employee"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Bảng điều khiển
                    </NavLink>

                    <NavLink
                        to="/employee/receive-device"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Tiếp nhận thiết bị
                    </NavLink>

                    <NavLink
                        to="/employee/repairs"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Quản lý sửa chữa
                    </NavLink>

                    <NavLink
                        to="/employee/diagnosis"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Chẩn đoán & đề xuất
                    </NavLink>

                    <NavLink
                        to="/employee/quotes"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Tạo và gửi báo giá
                    </NavLink>

                    <NavLink
                        to="/employee/appointments"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Xử lý lịch hẹn
                    </NavLink>

                    <NavLink
                        to="/employee/repair-process"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Thực hiện sửa chữa
                    </NavLink>

                    <NavLink
                        to="/employee/complete-repair"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        Kiểm tra & hoàn thành
                    </NavLink>

                    <NavLink
                        to="/employee/profile"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
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

export default EmployeeLayout;