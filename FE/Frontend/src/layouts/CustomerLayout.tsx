import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
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
            <Sidebar role="CUSTOMER" email={user?.email} onLogout={handleLogout} />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default CustomerLayout;
