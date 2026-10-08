function WarrantyRequest() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Gửi yêu cầu bảo hành</h1>
                <p>
                    Gửi yêu cầu bảo hành cho thiết bị đã sửa chữa.
                </p>
            </div>

            <div className="table-container">
                <div className="table-state">
                    <h3>Yêu cầu bảo hành</h3>
                    <p>
                        Chức năng đang chờ API bảo hành từ backend.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WarrantyRequest;