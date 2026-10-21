import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppointmentForm from "../../components/common/AppointmentForm";
import { createAppointmentApi } from "../../api/appointmentApi";
import { getServicesApi } from "../../api/serviceApi";
import type { AppointmentRequest } from "../../types/appointment";
import type { ServiceItem } from "../../types/service";

const getLocalDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
};

function BookAppointment() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getServicesApi({ status: "ACTIVE" })
            .then((data) => {
                if (active) setServices(data);
            })
            .catch((requestError: any) => {
                if (active) setError(
                    requestError.response?.data?.message || "Không thể tải dịch vụ. Vui lòng thử lại."
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    const handleSubmit = async (values: AppointmentRequest) => {
        setSubmitting(true);
        setError("");
        try {
            await createAppointmentApi(values);
            navigate("/customer/appointments", {
                state: { success: "Đặt lịch thành công. Bạn có thể theo dõi lịch hẹn tại đây." },
            });
        } catch (requestError: any) {
            setError(
                requestError.response?.data?.message || "Không thể đặt lịch. Vui lòng kiểm tra thông tin và thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const initialValues: AppointmentRequest = {
        device: "",
        serviceId: Number(searchParams.get("serviceId")) || 0,
        appointmentDate: getLocalDate(),
        appointmentTime: "09:00",
        serviceMethod: "STORE_DROP_OFF",
        contactPhone: "",
        problemDescription: "",
        pickupAddress: "",
    };

    const selectedServiceId = Number(searchParams.get("serviceId"));
    const selectedServiceExists = services.some((service) => service.id === selectedServiceId);

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · ĐẶT LỊCH</span>
                <h1>Đặt lịch sửa chữa</h1>
                <p>Chọn dịch vụ, thời gian phù hợp và mô tả tình trạng thiết bị của bạn.</p>
            </header>

            {error && <div className="error-message" role="alert">{error}</div>}

            <section className="appointment-panel">
                <div className="appointment-panel-heading">
                    <div>
                        <h2>Thông tin lịch hẹn</h2>
                        <p>Các trường có dấu * cần được điền đầy đủ.</p>
                    </div>
                </div>
                {loading ? (
                    <div className="table-state">Đang tải dịch vụ...</div>
                ) : services.length === 0 ? (
                    <div className="table-state">Hiện chưa có dịch vụ hoạt động để đặt lịch.</div>
                ) : !selectedServiceId || !selectedServiceExists ? (
                    <div className="appointment-empty-state">
                        <h2>Hãy chọn dịch vụ trước</h2>
                        <p>Mở danh sách dịch vụ, chọn dịch vụ phù hợp rồi nhấn “Đặt lịch” để tiếp tục.</p>
                        <Link className="primary-button appointment-services-link" to="/customer/services">
                            Xem dịch vụ
                        </Link>
                    </div>
                ) : (
                    <AppointmentForm
                        key={selectedServiceId}
                        services={services}
                        initialValues={initialValues}
                        submitting={submitting}
                        submitLabel="Gửi yêu cầu đặt lịch"
                        onSubmit={handleSubmit}
                    />
                )}
            </section>
        </main>
    );
}

export default BookAppointment;
