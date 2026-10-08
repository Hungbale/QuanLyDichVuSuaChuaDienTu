function EmployeeDashboard() {
    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Bảng điều khiển</h1>
                    <p>
                        Quản lý hoạt động dịch vụ sửa chữa máy tính.
                    </p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="card-title">
                        Phiếu sửa chữa
                    </div>

                    <div className="card-value">
                        Chưa có API
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmployeeDashboard;