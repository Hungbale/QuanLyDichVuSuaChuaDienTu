function Payment() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Thanh toán</h1>
                <p>
                    Thanh toán chi phí sửa chữa thiết bị.
                </p>
            </div>

            <div className="table-container">
                <div className="table-state">
                    <h3>Thanh toán</h3>
                    <p>
                        Chức năng đang chờ API thanh toán từ backend.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Payment;