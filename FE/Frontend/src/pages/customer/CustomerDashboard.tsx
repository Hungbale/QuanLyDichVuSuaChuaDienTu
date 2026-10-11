function CustomerDashboard() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Bảng điều khiển</h1>

                <p>
                    Chào mừng bạn đến với hệ thống quản lý
                    dịch vụ sửa chữa máy tính.
                </p>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="card-title">
                        Dịch vụ sửa chữa
                    </div>

                    <div className="card-value">
                        Xem dịch vụ
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Lịch hẹn
                    </div>

                    <div className="card-value">
                        Quản lý lịch hẹn
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
                        Lịch sử
                    </div>

                    <div className="card-value">
                        Lịch sử sửa chữa
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Báo giá
                    </div>

                    <div className="card-value">
                        Duyệt báo giá
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Bảo hành
                    </div>

                    <div className="card-value">
                        Yêu cầu bảo hành
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CustomerDashboard;