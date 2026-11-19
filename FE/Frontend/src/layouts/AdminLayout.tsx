import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";

function AdminLayout() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="app-layout">
            <Sidebar role="ADMIN" email={user?.email} onLogout={handleLogout} onPendingCountsChange={setPendingCounts} />
            <main className="main-content">
                <Outlet context={{ pendingCounts }} />
            </main>
        </div>
    );
}

export default AdminLayout;
