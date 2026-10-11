function AdminDashboard() {
    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Bảng điều khiển</h1>

                    <p>
                        Tổng quan hoạt động quản lý hệ thống FIXHUB.
                    </p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="card-title">
                        Nhân viên
                    </div>

                    <div className="card-value">
                        Quản lý nhân viên
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Dịch vụ
                    </div>

                    <div className="card-value">
                        Quản lý dịch vụ
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Khách hàng
                    </div>

                    <div className="card-value">
                        Quản lý khách hàng
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Sửa chữa
                    </div>

                    <div className="card-value">
                        Theo dõi sửa chữa
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Báo cáo
                    </div>

                    <div className="card-value">
                        Báo cáo thống kê
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;