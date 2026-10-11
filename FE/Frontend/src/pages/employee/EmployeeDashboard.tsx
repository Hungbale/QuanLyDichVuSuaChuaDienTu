function EmployeeDashboard() {
    return (
        <div>
            <h1>Tổng quan</h1>

            <p
                style={{
                    color: "#666",
                    marginTop: "8px",
                }}
            >
                Quản lý hệ thống dịch vụ sửa chữa máy tính.
            </p>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "20px",
                    marginTop: "30px",
                }}
            >
                <div
                    style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                    }}
                >
                    <h3>Khách hàng</h3>
                    <p>Quản lý khách hàng</p>
                </div>

                <div
                    style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                    }}
                >
                    <h3>Nhân viên</h3>
                    <p>Quản lý nhân viên</p>
                </div>

                <div
                    style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                    }}
                >
                    <h3>Danh mục</h3>
                    <p>Quản lý danh mục dịch vụ</p>
                </div>

                <div
                    style={{
                        background: "#fff",
                        padding: "24px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                    }}
                >
                    <h3>Dịch vụ</h3>
                    <p>Quản lý dịch vụ sửa chữa</p>
                </div>
            </div>
        </div>
    );
}

export default EmployeeDashboard;