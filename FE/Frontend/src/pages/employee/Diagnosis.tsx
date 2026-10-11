function EmployeeDiagnosis() {
    return (
        <div className="management-page">
            <div className="page-header">
                <h1>Chẩn đoán và đề xuất sửa chữa</h1>
                <p>
                    Ghi nhận tình trạng thiết bị và đề xuất phương án sửa chữa.
                </p>
            </div>

            <div className="table-container">
                <div className="table-state">
                    <h3>Chẩn đoán thiết bị</h3>
                    <p>
                        Chức năng đang chờ API chẩn đoán.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EmployeeDiagnosis;