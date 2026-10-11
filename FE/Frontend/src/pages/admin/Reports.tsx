function AdminReports() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Xem báo cáo</h1>

                <p>
                    Theo dõi và tổng hợp số liệu hoạt động của
                    cửa hàng sửa chữa.
                </p>
            </div>

            {/* ========================= */}
            {/* SUMMARY */}
            {/* ========================= */}

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="card-title">
                        Tổng số khách hàng
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Tổng số nhân viên
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Tổng số dịch vụ
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Phiếu sửa chữa
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Doanh thu
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-title">
                        Đánh giá dịch vụ
                    </div>

                    <div className="card-value">
                        —
                    </div>
                </div>
            </div>

            {/* ========================= */}
            {/* REPORT AREA */}
            {/* ========================= */}

            <div
                className="table-container"
                style={{
                    marginTop: "24px",
                }}
            >
                <div className="table-state">
                    <h3>
                        Báo cáo thống kê
                    </h3>

                    <p>
                        Chức năng báo cáo đang chờ API thống kê
                        từ backend.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminReports;