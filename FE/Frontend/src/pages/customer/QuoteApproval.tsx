function QuoteApproval() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Duyệt báo giá</h1>
                <p>
                    Xem và xác nhận báo giá sửa chữa.
                </p>
            </div>

            <div className="table-container">
                <div className="table-state">
                    <h3>Báo giá sửa chữa</h3>
                    <p>
                        Chức năng đang chờ API báo giá từ backend.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default QuoteApproval;