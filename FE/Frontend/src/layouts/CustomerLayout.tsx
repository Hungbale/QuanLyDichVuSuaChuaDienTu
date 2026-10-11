import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function CustomerLayout() {
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
                        Khách hàng
                    </div>

                    <div className="user-email">
                        {user?.email}
                    </div>
                </div>

                <nav className="sidebar-menu">
                    <NavLink
                        to="/customer"
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
                        to="/customer/profile"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Chỉnh sửa thông tin
                    </NavLink>

                    <NavLink
                        to="/customer/services"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Xem dịch vụ
                    </NavLink>

                    <NavLink
                        to="/customer/book-appointment"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Đặt lịch
                    </NavLink>

                    <NavLink
                        to="/customer/appointments"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Quản lý lịch hẹn
                    </NavLink>

                    <NavLink
                        to="/customer/repair-tracking"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Theo dõi sửa chữa
                    </NavLink>

                    <NavLink
                        to="/customer/quotes"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Duyệt báo giá
                    </NavLink>

                    <NavLink
                        to="/customer/payment"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Thanh toán
                    </NavLink>

                    <NavLink
                        to="/customer/repair-history"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Lịch sử sửa chữa
                    </NavLink>

                    <NavLink
                        to="/customer/reviews"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Đánh giá dịch vụ
                    </NavLink>

                    <NavLink
                        to="/customer/warranty"
                        className={({ isActive }) =>
                            isActive
                                ? "menu-item active"
                                : "menu-item"
                        }
                    >
                        Yêu cầu bảo hành
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

export default CustomerLayout;