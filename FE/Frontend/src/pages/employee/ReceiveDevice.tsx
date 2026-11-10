import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { getCustomersApi } from "../../api/customerApi";
import { getMyEmployeeProfileApi } from "../../api/employeeApi";
import { getMyAssignedAppointmentGroupsApi } from "../../api/appointmentApi";
import { createRepairIntakeApi, getRepairIntakeApi } from "../../api/repairIntakeApi";
import { getMyAssignedRepairTicketsApi } from "../../api/repairTicketApi";
import type { AssignedAppointment } from "../../types/appointment";
import type { Customer } from "../../types/customer";
import type { RepairIntakeRequest } from "../../types/repairIntake";
import type { RepairTicket } from "../../types/repairTicket";

const messageOf = (error: any) => error.response?.data?.message || error.response?.data?.error || error.message || "Không thể xử lý tiếp nhận thiết bị.";
const isScheduled = (status: string) => status === "SCHEDULED" || status === "Đã lên lịch";

function EmployeeReceiveDevice() {
    const [searchParams] = useSearchParams();
    const requestedAppointmentId = searchParams.get("appointmentId");
    const requestedTicketId = searchParams.get("ticketId");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [assignedAppointments, setAssignedAppointments] = useState<AssignedAppointment[]>([]);
    const [assignedTickets, setAssignedTickets] = useState<RepairTicket[]>([]);
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [customerId, setCustomerId] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<AssignedAppointment | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);
    const [device, setDevice] = useState("");
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
    const [serialNumber, setSerialNumber] = useState("");
    const [initialCondition, setInitialCondition] = useState("");
    const [accessories, setAccessories] = useState("");
    const [customerReportedIssue, setCustomerReportedIssue] = useState("");
    const [intakeNote, setIntakeNote] = useState("");
    const [intakePhotos, setIntakePhotos] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        Promise.all([
            getCustomersApi(),
            getMyEmployeeProfileApi(),
            getMyAssignedAppointmentGroupsApi(),
            getMyAssignedRepairTicketsApi(),
        ])
            .then(([customerList, employee, appointments, tickets]) => {
                setCustomers(customerList);
                setEmployeeId(employee.id);
                setAssignedAppointments([...appointments.actionRequired, ...appointments.received, ...appointments.other]);
                setAssignedTickets(tickets);
            })
            .catch((requestError: any) => setError(messageOf(requestError)))
            .finally(() => setLoading(false));
    }, []);

    const appointmentByCustomer = useMemo(() => {
        const result = new Map<number, AssignedAppointment>();
        assignedAppointments.forEach((appointment) => {
            const hasPendingIntakeTicket = assignedTickets.some((ticket) =>
                ticket.customerId === appointment.customerId
                && ticket.device === appointment.device
                && ticket.receivedDate === appointment.appointmentDate
                && isScheduled(ticket.status),
            );
            if (appointment.customerId != null && appointment.status === "CONFIRMED" && hasPendingIntakeTicket && !result.has(appointment.customerId)) {
                result.set(appointment.customerId, appointment);
            }
        });
        return result;
    }, [assignedAppointments, assignedTickets]);

    useEffect(() => {
        if (!requestedAppointmentId || assignedAppointments.length === 0) return;
        const appointment = assignedAppointments.find((item) => item.id === Number(requestedAppointmentId));
        if (!appointment) {
            setError("Không tìm thấy lịch hẹn được giao cho bạn.");
            return;
        }
        setSelectedAppointment(appointment);
        setCustomerId(appointment.customerId == null ? "" : String(appointment.customerId));
        setCustomerSearch(appointment.customerName ? `${appointment.customerName} · ${appointment.contactPhone}` : appointment.contactPhone);
        setDevice(appointment.device);
        setReceivedDate(appointment.appointmentDate);
        setCustomerReportedIssue(appointment?.problemDescription || "");
        setSelectedTicket(assignedTickets.find((ticket) => ticket.customerId === appointment.customerId
            && ticket.device === appointment.device && ticket.receivedDate === appointment.appointmentDate
            && isScheduled(ticket.status)) || null);
    }, [requestedAppointmentId, assignedAppointments, assignedTickets]);

    useEffect(() => {
        if (!requestedTicketId || loading) return;
        const ticket = assignedTickets.find((item) => item.id === Number(requestedTicketId));
        if (!ticket) {
            setError("Không tìm thấy phiếu được phân công cho bạn.");
            return;
        }
        if (!isScheduled(ticket.status)) {
            setError("Phiếu này đã được tiếp nhận hoặc không còn ở trạng thái chờ tiếp nhận.");
            return;
        }
        const customer = customers.find((item) => item.id === ticket.customerId);
        const appointment = assignedAppointments.find((item) => item.customerId === ticket.customerId
            && item.device === ticket.device && item.appointmentDate === ticket.receivedDate);
        setSelectedTicket(ticket);
        setSelectedAppointment(appointment || null);
        setCustomerId(String(ticket.customerId));
        setCustomerSearch(customer ? `${customer.customerCode} · ${customer.fullName} · ${customer.phone}` : ticket.customerName);
        setDevice(ticket.device);
        setReceivedDate(ticket.receivedDate);
        setCustomerReportedIssue(appointment?.problemDescription || "");
    }, [requestedTicketId, loading, assignedTickets, customers, assignedAppointments]);

    const filteredCustomers = useMemo(() => {
        const query = customerSearch.trim().toLocaleLowerCase("vi");
        const results = customers.filter((customer) => query
            ? [customer.customerCode, customer.fullName, customer.phone, customer.email].some((value) => value?.toLocaleLowerCase("vi").includes(query))
            : appointmentByCustomer.has(customer.id));
        return results.sort((a, b) => Number(appointmentByCustomer.has(b.id)) - Number(appointmentByCustomer.has(a.id)) || a.fullName.localeCompare(b.fullName, "vi"));
    }, [customers, customerSearch, appointmentByCustomer]);

    const selectCustomer = (customer: Customer) => {
        setCustomerId(String(customer.id));
        setCustomerSearch(`${customer.customerCode} · ${customer.fullName} · ${customer.phone}`);
        const appointment = appointmentByCustomer.get(customer.id) || null;
        const pendingTicket = assignedTickets.find((ticket) => ticket.customerId === customer.id
            && ticket.technicianId === employeeId && isScheduled(ticket.status)) || null;
        setSelectedTicket(pendingTicket);
        setSelectedAppointment(appointment);
        if (appointment || pendingTicket) {
            setDevice(appointment?.device || pendingTicket!.device);
            setReceivedDate(appointment?.appointmentDate || pendingTicket!.receivedDate);
            setCustomerReportedIssue(appointment?.problemDescription || "");
        } else {
            setCustomerReportedIssue("");
        }
        setCustomerPickerOpen(false);
    };

    const markTicketReceived = (ticketId: number) => {
        setAssignedTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, status: "RECEIVED" } : ticket));
    };

    const createOrGetIntake = async (ticketId: number, request: RepairIntakeRequest, images: File[]) => {
        try {
            return await createRepairIntakeApi(ticketId, request, images);
        } catch (requestError: any) {
            // A retry after a lost response may find that the server already created the receipt.
            if (requestError.response?.status === 409) {
                return await getRepairIntakeApi(ticketId);
            }
            throw requestError;
        }
    };

    const resetForm = () => {
        setCustomerId("");
        setCustomerSearch("");
        setSelectedAppointment(null);
        setSelectedTicket(null);
        setDevice("");
        setReceivedDate(new Date().toISOString().slice(0, 10));
        setSerialNumber("");
        setInitialCondition("");
        setAccessories("");
        setCustomerReportedIssue("");
        setIntakeNote("");
        setIntakePhotos([]);
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setNotice("");
        if (!customerId) return setError("Hãy chọn khách hàng trong danh sách gợi ý.");
        if (employeeId == null) return setError("Không tải được thông tin nhân viên để phân công phiếu.");
        if (!device.trim()) return setError("Vui lòng nhập thiết bị cần tiếp nhận.");
        if (!initialCondition.trim()) return setError("Vui lòng ghi nhận tình trạng ban đầu của thiết bị.");
        if (intakePhotos.length < 1 || intakePhotos.length > 5) return setError("Tải từ 1 đến 5 ảnh thiết bị khi tiếp nhận.");
        if (intakePhotos.some((photo) => !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) return setError("Mỗi ảnh phải là JPEG hoặc PNG và không vượt quá 5 MB.");

        setSaving(true);
        try {
            const matchedTicket = selectedTicket && isScheduled(selectedTicket.status)
                ? selectedTicket
                : selectedAppointment
                ? assignedTickets.find((ticket) => ticket.customerId === selectedAppointment.customerId
                    && ticket.technicianId === employeeId
                    && ticket.device === selectedAppointment.device
                    && ticket.receivedDate === selectedAppointment.appointmentDate
                    && isScheduled(ticket.status))
                : assignedTickets.find((ticket) => ticket.customerId === Number(customerId)
                    && ticket.technicianId === employeeId
                    && ticket.device.trim().toLocaleLowerCase("vi") === device.trim().toLocaleLowerCase("vi")
                    && ticket.receivedDate === receivedDate
                    && isScheduled(ticket.status));

            if (!matchedTicket) {
                setError("Chưa có phiếu sửa chữa đang chờ tiếp nhận được giao cho bạn. Hãy chọn khách có lịch được phân công hoặc nhờ admin tạo và giao phiếu trước.");
                return;
            }
            const ticket = matchedTicket;

            await createOrGetIntake(ticket.id, {
                serialNumber: serialNumber.trim() || undefined,
                appearanceCondition: initialCondition.trim(),
                includedAccessories: accessories.trim() || undefined,
                customerReportedIssue: customerReportedIssue.trim() || undefined,
                intakeNote: intakeNote.trim() || undefined,
            }, intakePhotos);

            markTicketReceived(ticket.id);
            setNotice(`Đã lưu biên nhận tiếp nhận phiếu ${ticket.ticketCode} lên hệ thống.`);
            resetForm();
        } catch (requestError: any) {
            setError(messageOf(requestError));
        } finally {
            setSaving(false);
        }
    };

    return <main className="management-page appointment-page">
        <header className="appointment-page-header">
            <span className="appointment-eyebrow">FIXHUB · NHÂN VIÊN</span>
            <h1>Tiếp nhận thiết bị</h1>
            <p>Ghi nhận biên nhận cho phiếu được giao; thông tin sẽ được lưu trực tiếp qua API của hệ thống.</p>
        </header>
        {error && <div className="error-message" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <form className="appointment-panel ticket-editor" onSubmit={submit}>
            <div className="appointment-card-top"><div><span className="appointment-card-reference">BIÊN NHẬN THIẾT BỊ</span><h2>Thông tin khách hàng và thiết bị</h2></div></div>
            <div className="appointment-form-grid">
                <div className="appointment-form-group appointment-form-full customer-picker-group">
                    <label htmlFor="receive-customer">Khách hàng</label>
                    <input
                        id="receive-customer"
                        type="search"
                        required
                        autoComplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={customerPickerOpen}
                        aria-controls="receive-customer-options"
                        value={customerSearch}
                        placeholder="Tìm theo mã, tên, số điện thoại hoặc email"
                        onFocus={() => {
                            if (customerId) {
                                setCustomerId("");
                                setCustomerSearch("");
                                setSelectedAppointment(null);
                                setSelectedTicket(null);
                            }
                            setCustomerPickerOpen(true);
                        }}
                        onBlur={() => setCustomerPickerOpen(false)}
                        onChange={(event) => {
                            setCustomerSearch(event.target.value);
                            setCustomerId("");
                            setSelectedAppointment(null);
                            setSelectedTicket(null);
                            setCustomerPickerOpen(true);
                        }}
                    />
                    {customerPickerOpen && <div id="receive-customer-options" className="customer-picker-results" role="listbox" onMouseDown={(event) => event.preventDefault()}>
                        {filteredCustomers.length === 0
                            ? <p className="customer-picker-empty">{customerSearch.trim() ? "Không tìm thấy khách hàng phù hợp." : loading ? "Đang tải lịch hẹn được giao..." : "Nhập thông tin để tìm khách hàng."}</p>
                            : filteredCustomers.map((customer) => {
                                const appointment = appointmentByCustomer.get(customer.id);
                                return <button className="customer-picker-option" type="button" role="option" aria-selected={customerId === String(customer.id)} key={customer.id} onClick={() => selectCustomer(customer)}>
                                    <span className="customer-picker-option-main"><strong>{customer.fullName}</strong><small>{customer.customerCode} · {customer.phone}</small></span>
                                    {appointment && <span className="customer-appointment-hint"><strong>Có lịch với bạn</strong><small>{appointment.serviceName} · {new Date(`${appointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} {appointment.appointmentTime.slice(0, 5)}</small></span>}
                                </button>;
                            })}
                    </div>}
                </div>
                {selectedAppointment && <section className="appointment-form-group appointment-form-full appointment-panel">
                    <strong>Thông tin lịch hẹn #{selectedAppointment.id}</strong>
                    <span>{selectedAppointment.serviceName} · {new Date(`${selectedAppointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} {selectedAppointment.appointmentTime.slice(0, 5)}</span>
                    <span>{selectedAppointment.problemDescription}</span>
                    <span>{selectedAppointment.serviceMethod === "HOME_PICKUP" ? `Nhận tại nhà${selectedAppointment.pickupAddress ? ` · ${selectedAppointment.pickupAddress}` : ""}` : "Khách mang thiết bị đến cửa hàng"}</span>
                </section>}
                <div className="appointment-form-group"><label htmlFor="receive-device">Thiết bị</label><input id="receive-device" required maxLength={200} value={device} onChange={(event) => setDevice(event.target.value)} placeholder="Ví dụ: Laptop Dell Inspiron 15" readOnly={!!selectedAppointment} /></div>
                <div className="appointment-form-group"><label htmlFor="receive-date">Ngày tiếp nhận</label><input id="receive-date" type="date" required value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} readOnly={!!selectedAppointment} /></div>
                <div className="appointment-form-group"><label htmlFor="receive-serial">Số serial</label><input id="receive-serial" maxLength={100} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Nếu có" /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-condition">Tình trạng ngoại quan / ban đầu</label><textarea id="receive-condition" required maxLength={2000} rows={3} value={initialCondition} onChange={(event) => setInitialCondition(event.target.value)} placeholder="Mô tả vết xước, móp hoặc tình trạng thiết bị khi nhận" /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-accessories">Phụ kiện đi kèm</label><textarea id="receive-accessories" maxLength={2000} rows={2} value={accessories} onChange={(event) => setAccessories(event.target.value)} placeholder="Ví dụ: sạc, túi đựng, chuột; ghi rõ nếu không có" /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-issue">Lỗi khách hàng phản ánh</label><textarea id="receive-issue" maxLength={5000} rows={3} value={customerReportedIssue} onChange={(event) => setCustomerReportedIssue(event.target.value)} placeholder="Mô tả lỗi khách báo khi mang thiết bị đến" /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-note">Ghi chú tiếp nhận</label><textarea id="receive-note" maxLength={2000} rows={2} value={intakeNote} onChange={(event) => setIntakeNote(event.target.value)} placeholder="Ghi chú thêm cho kỹ thuật viên" /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="receive-evidence">Ảnh thiết bị khi tiếp nhận</label><input id="receive-evidence" type="file" accept="image/jpeg,image/png" multiple required aria-describedby="receive-evidence-note" onChange={(event) => setIntakePhotos(Array.from(event.target.files || []))} /><small id="receive-evidence-note">Bắt buộc 1–5 ảnh JPEG hoặc PNG, tối đa 5 MB mỗi ảnh. Đã chọn: {intakePhotos.length}.</small></div>
            </div>
            <div className="appointment-search-actions"><button className="primary-button" type="submit" disabled={saving || loading || customers.length === 0 || employeeId == null}>{saving ? "Đang lưu biên nhận..." : "Xác nhận tiếp nhận"}</button></div>
        </form>
    </main>;
}

export default EmployeeReceiveDevice;
