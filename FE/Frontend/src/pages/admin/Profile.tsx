import { useAuth } from "../../context/AuthContext";

function AdminProfile() {
    const { user } = useAuth();

    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Thông tin cá nhân</h1>

                <p>
                    Thông tin tài khoản quản trị viên.
                </p>
            </div>

            <div className="dashboard-card">
                <div className="form-group">
                    <label>Email</label>

                    <input
                        type="email"
                        value={user?.email || ""}
                        readOnly
                    />
                </div>

                <div
                    className="form-group"
                    style={{ marginTop: "16px" }}
                >
                    <label>Vai trò</label>

                    <input
                        value="ADMIN"
                        readOnly
                    />
                </div>

                <div
                    className="table-state"
                    style={{ padding: "30px 0 0" }}
                >
                    Chức năng chỉnh sửa thông tin đang chờ API.
                </div>
            </div>
        </div>
    );
}

export default AdminProfile;