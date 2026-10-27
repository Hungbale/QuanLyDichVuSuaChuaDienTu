import { useEffect, useState, type FormEvent } from "react";
import { createRepairTicketApi, getRepairTicketHistoryApi, getRepairTicketsApi, updateRepairTicketApi } from "../../api/repairTicketApi";
import { assignAppointmentApi, createAppointmentApi, getAppointmentCancellationRequestsApi, getAppointmentsApi, reviewAppointmentCancellationApi } from "../../api/appointmentApi";
import { getCustomersApi } from "../../api/customerApi";
import { getEmployeesApi } from "../../api/employeeApi";
import AppointmentForm from "../../components/common/AppointmentForm";
import { getServicesApi } from "../../api/serviceApi";
import { createRepairIntakeApi, getRepairIntakeApi } from "../../api/repairIntakeApi";
import { getRepairDiagnosisApi } from "../../api/repairDiagnosisApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import type { AssignedAppointment, AppointmentRequest, AppointmentCancellationRequestRecord } from "../../types/appointment";
import type { Customer } from "../../types/customer";
import type { Employee } from "../../types/employee";
import type { RepairTicket, RepairTicketActivity, RepairTicketRequest } from "../../types/repairTicket";
import { repairActivityLabel } from "../../utils/repairActivityLabel";
import type { RepairIntakeReceipt, RepairIntakeRequest } from "../../types/repairIntake";
import type { RepairDiagnosis } from "../../types/repairDiagnosis";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairPayment } from "../../types/repairPayment";
import type { ServiceItem } from "../../types/service";

type RepairsTab = "appointments" | "intakes" | "repairs";
type TicketForm = { customerId: string; device: string; receivedDate: string; status: string; technicianId: string };
type IntakeForm = { serialNumber: string; appearanceCondition: string; includedAccessories: string; customerReportedIssue: string; intakeNote: string };
const emptyForm: TicketForm = { customerId: "", device: "", receivedDate: new Date().toISOString().slice(0, 10), status: "SCHEDULED", technicianId: "" };
const emptyIntakeForm: IntakeForm = { serialNumber: "", appearanceCondition: "", includedAccessories: "", customerReportedIssue: "", intakeNote: "" };
const errorMessage = (error: any, fallback: string) => error.response?.data?.message || error.response?.data?.error || fallback;
const emptyAppointment = (): AppointmentRequest => ({ device: "", serviceId: 0, appointmentDate: new Date().toLocaleDateString("en-CA"), appointmentTime: "09:00", serviceMethod: "STORE_DROP_OFF", contactPhone: "", problemDescription: "", pickupAddress: "" });

function AdminRepairs() {
    const [activeTab, setActiveTab] = useState<RepairsTab>("appointments");
    const [appointments, setAppointments] = useState<AssignedAppointment[]>([]);
    const [viewingAppointment, setViewingAppointment] = useState<AssignedAppointment | null>(null);
    const [cancellationRequests, setCancellationRequests] = useState<AppointmentCancellationRequestRecord[]>([]);
    const [appointmentSavingId, setAppointmentSavingId] = useState<number | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [intakeTickets, setIntakeTickets] = useState<RepairTicket[]>([]);
    const [intakeReceipts, setIntakeReceipts] = useState<Record<number, RepairIntakeReceipt>>({});
    const [intakeKeyword, setIntakeKeyword] = useState("");
    const [intakeEditorTicket, setIntakeEditorTicket] = useState<RepairTicket | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<RepairIntakeReceipt | null>(null);
    const [intakeForm, setIntakeForm] = useState<IntakeForm>(emptyIntakeForm);
    const [intakePhotos, setIntakePhotos] = useState<File[]>([]);
    const [intakeSaving, setIntakeSaving] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [phone, setPhone] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [form, setForm] = useState<TicketForm>(emptyForm);
    const [editing, setEditing] = useState<RepairTicket | null>(null);
    const [viewingTicket, setViewingTicket] = useState<RepairTicket | null>(null);
    const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
    const [ticketDetailIntake, setTicketDetailIntake] = useState<RepairIntakeReceipt | null>(null);
    const [ticketDetailDiagnosis, setTicketDetailDiagnosis] = useState<RepairDiagnosis | null>(null);
    const [ticketDetailQuote, setTicketDetailQuote] = useState<RepairQuote | null>(null);
    const [ticketDetailPayments, setTicketDetailPayments] = useState<RepairPayment[]>([]);
    const [ticketDetailActivities, setTicketDetailActivities] = useState<RepairTicketActivity[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAppointmentEditor, setShowAppointmentEditor] = useState(false);
    const [appointmentServices, setAppointmentServices] = useState<ServiceItem[]>([]);
    const [appointmentSaving, setAppointmentSaving] = useState(false);

    const loadAppointments = async (contactPhone?: string) => {
        setLoading(true); setError("");
        try {
            const [appointmentList, requests] = await Promise.all([
                getAppointmentsApi({ contactPhone: contactPhone?.trim() || undefined }),
                getAppointmentCancellationRequestsApi(),
            ]);
            setAppointments(appointmentList);
            setCancellationRequests(requests);
        }
        catch (e: any) { setError(errorMessage(e, "Không thể tải lịch đặt của khách hàng.")); }
        finally { setLoading(false); }
    };
    const loadTickets = async (search?: string) => {
        setLoading(true); setError("");
        try { setTickets(await getRepairTicketsApi(search)); }
        catch (e: any) { setError(errorMessage(e, "Không thể tải danh sách phiếu sửa chữa.")); }
        finally { setLoading(false); }
    };
    const loadIntakes = async (search?: string) => {
        setLoading(true); setError("");
        try {
            const allTickets = await getRepairTicketsApi(search);
            // Intake history must remain visible after the ticket advances to diagnosis,
            // quotation, repair, or completion. Use the persisted receipt as the source
            // of truth instead of filtering only by the ticket's current status.
            const entries = await Promise.all(allTickets.map(async (ticket) => {
                try { return [ticket.id, await getRepairIntakeApi(ticket.id)] as const; }
                catch (requestError: any) {
                    if (requestError.response?.status === 404) return [ticket.id, null] as const;
                    return [ticket.id, null, errorMessage(requestError, "Không tải được biên nhận.")] as const;
                }
            }));
            const receipts: Record<number, RepairIntakeReceipt> = {};
            let failed = 0;
            entries.forEach((entry) => {
                if (entry.length === 2 && entry[1]) receipts[entry[0]] = entry[1];
                else if (entry.length === 3) failed += 1;
            });
            const visibleTickets = allTickets.filter((ticket) =>
                Boolean(receipts[ticket.id]) || ["SCHEDULED", "Đã lên lịch"].includes(ticket.status),
            );
            setIntakeTickets(visibleTickets);
            setIntakeReceipts(receipts);
            if (failed) setError(`Không thể tải chi tiết biên nhận của ${failed} phiếu. Hãy làm mới danh sách để thử lại.`);
        } catch (e: any) { setError(errorMessage(e, "Không thể tải danh sách phiếu tiếp nhận.")); }
        finally { setLoading(false); }
    };

    useEffect(() => { void loadAppointments(); }, []);
    useEffect(() => {
        if (activeTab === "intakes") { void loadIntakes(); return; }
        if (activeTab !== "repairs") return;
        void loadTickets();
        Promise.all([getCustomersApi(), getEmployeesApi()]).then(([customerList, employeeList]) => {
            setCustomers(customerList); setEmployees(employeeList);
        }).catch((e: any) => setError(errorMessage(e, "Không thể tải danh sách khách hàng hoặc nhân viên.")));
    }, [activeTab]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void loadTickets(keyword); };
    const submitIntakeSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void loadIntakes(intakeKeyword); };
    const beginIntake = (ticket: RepairTicket) => {
        setIntakeEditorTicket(ticket);
        setIntakeForm({ ...emptyIntakeForm, customerReportedIssue: "" });
        setIntakePhotos([]);
        setError(""); setNotice("");
    };
    const saveIntake = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!intakeEditorTicket) return;
        if (!intakeForm.appearanceCondition.trim()) { setError("Vui lòng nhập tình trạng ngoại quan thiết bị."); return; }
        if (intakePhotos.length < 1 || intakePhotos.length > 5) { setError("Tải từ 1 đến 5 ảnh thiết bị khi tiếp nhận."); return; }
        if (intakePhotos.some((photo) => !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) { setError("Mỗi ảnh phải là JPEG hoặc PNG và không vượt quá 5 MB."); return; }
        const request: RepairIntakeRequest = {
            serialNumber: intakeForm.serialNumber.trim() || undefined,
            appearanceCondition: intakeForm.appearanceCondition.trim(),
            includedAccessories: intakeForm.includedAccessories.trim() || undefined,
            customerReportedIssue: intakeForm.customerReportedIssue.trim() || undefined,
            intakeNote: intakeForm.intakeNote.trim() || undefined,
        };
        setIntakeSaving(true); setError(""); setNotice("");
        try {
            let receipt: RepairIntakeReceipt;
            try { receipt = await createRepairIntakeApi(intakeEditorTicket.id, request, intakePhotos); }
            catch (requestError: any) {
                if (requestError.response?.status !== 409) throw requestError;
                receipt = await getRepairIntakeApi(intakeEditorTicket.id);
            }
            setIntakeReceipts((current) => ({ ...current, [intakeEditorTicket.id]: receipt }));
            setIntakeTickets((current) => current.map((ticket) => ticket.id === intakeEditorTicket.id ? { ...ticket, status: "RECEIVED" } : ticket));
            setNotice(`Đã lưu biên nhận ${receipt.ticketCode} thành công.`);
            setIntakeEditorTicket(null);
        } catch (e: any) { setError(errorMessage(e, "Không thể lưu biên nhận thiết bị.")); }
        finally { setIntakeSaving(false); }
    };
    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowEditor(true); setNotice(""); setError(""); };
    const openCreateAppointment = async () => {
        setError(""); setNotice("");
        try {
            const [activeServices, customerList] = await Promise.all([getServicesApi({ status: "ACTIVE" }), getCustomersApi()]);
            setAppointmentServices(activeServices);
            setCustomers(customerList);
            setSelectedCustomerId("");
            setShowAppointmentEditor(true);
        } catch (e: any) {
            setError(errorMessage(e, "Không thể tải danh sách dịch vụ để tạo lịch hẹn."));
        }
    };
    const saveAppointment = async (request: AppointmentRequest) => {
        if (!selectedCustomerId) { setError("Hãy chọn khách hàng cho lịch hẹn."); return; }
        setAppointmentSaving(true); setError(""); setNotice("");
        try {
            await createAppointmentApi({ ...request, customerId: Number(selectedCustomerId) });
            setShowAppointmentEditor(false);
            setSelectedCustomerId("");
            setNotice("Đã tạo lịch hẹn cho khách.");
            await loadAppointments(phone);
        } catch (e: any) {
            setError(errorMessage(e, "Không thể tạo lịch hẹn."));
        } finally {
            setAppointmentSaving(false);
        }
    };
    const assignAppointment = async (appointmentId: number) => {
        setAppointmentSavingId(appointmentId); setError(""); setNotice("");
        try {
            await assignAppointmentApi(appointmentId);
            setNotice("Đã xác nhận lịch và tự động phân công kỹ thuật viên.");
            await loadAppointments(phone);
        } catch (e: any) { setError(errorMessage(e, "Không thể phân công lịch hẹn.")); }
        finally { setAppointmentSavingId(null); }
    };
    const reviewCancellation = async (appointmentId: number, decision: "APPROVE" | "REJECT") => {
        setAppointmentSavingId(appointmentId); setError(""); setNotice("");
        try {
            await reviewAppointmentCancellationApi(appointmentId, decision);
            setNotice(decision === "APPROVE" ? "Đã duyệt hủy lịch." : "Đã từ chối yêu cầu hủy lịch.");
            await loadAppointments(phone);
        } catch (e: any) { setError(errorMessage(e, "Không thể xử lý yêu cầu hủy.")); }
        finally { setAppointmentSavingId(null); }
    };
    const openEdit = (ticket: RepairTicket) => {
        setEditing(ticket); setShowEditor(true); setNotice(""); setError("");
        setForm({ customerId: String(ticket.customerId), device: ticket.device, receivedDate: ticket.receivedDate, status: ticket.status, technicianId: ticket.technicianId ? String(ticket.technicianId) : "" });
    };
    const openTicketDetails = async (ticket: RepairTicket) => {
        setViewingTicket(ticket);
        setTicketDetailsLoading(true);
        setTicketDetailIntake(null);
        setTicketDetailDiagnosis(null);
        setTicketDetailQuote(null);
        setTicketDetailPayments([]);
        setTicketDetailActivities([]);
        const optional = <T,>(promise: Promise<T>) => promise.catch((error: any) => {
            if (error.response?.status === 404) return null;
            throw error;
        });
        try {
            const [intake, diagnosis, quote, payments, activities] = await Promise.all([
                optional(getRepairIntakeApi(ticket.id)),
                optional(getRepairDiagnosisApi(ticket.id)),
                optional(getRepairQuoteApi(ticket.id)),
                getRepairPaymentsApi(ticket.id).catch((error: any) => error.response?.status === 404 ? [] : Promise.reject(error)),
                getRepairTicketHistoryApi(ticket.id),
            ]);
            setTicketDetailIntake(intake);
            setTicketDetailDiagnosis(diagnosis);
            setTicketDetailQuote(quote);
            setTicketDetailPayments(payments);
            setTicketDetailActivities(activities);
        } catch (error: any) {
            setError(errorMessage(error, "Không thể tải đầy đủ chi tiết phiếu sửa chữa."));
        } finally {
            setTicketDetailsLoading(false);
        }
    };
    const saveTicket = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        const request: RepairTicketRequest = {
            customerId: Number(form.customerId), device: form.device.trim(), receivedDate: form.receivedDate, status: form.status,
            technicianId: form.technicianId ? Number(form.technicianId) : null,
        };
        try {
            if (editing) await updateRepairTicketApi(editing.id, request);
            else await createRepairTicketApi({ ...request, status: "SCHEDULED" });
            setNotice(editing ? "Đã cập nhật phiếu sửa chữa." : "Đã tạo phiếu sửa chữa.");
            setEditing(null); setShowEditor(false); setForm(emptyForm); await loadTickets(keyword);
        } catch (e: any) { setError(errorMessage(e, "Không thể lưu phiếu sửa chữa.")); }
        finally { setSaving(false); }
    };

    return (
        <main className="management-page appointment-page">
            <header className="appointment-page-header">
                <span className="appointment-eyebrow">FIXHUB · ADMIN</span>
                <h1>Quản lý sửa chữa</h1>
                <p>Tra cứu lịch khách đặt và quản lý các phiếu sửa chữa trong hệ thống.</p>
            </header>

            <div className="repair-management-tabs" role="tablist" aria-label="Nội dung quản lý sửa chữa">
                <button type="button" role="tab" aria-selected={activeTab === "appointments"} className={activeTab === "appointments" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("appointments"); setError(""); setNotice(""); }}>Lịch đặt của khách</button>
                <button type="button" role="tab" aria-selected={activeTab === "intakes"} className={activeTab === "intakes" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("intakes"); setError(""); setNotice(""); }}>Phiếu tiếp nhận</button>
                <button type="button" role="tab" aria-selected={activeTab === "repairs"} className={activeTab === "repairs" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("repairs"); setError(""); setNotice(""); }}>Phiếu sửa chữa</button>
            </div>

            {activeTab === "appointments" ? (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <form className="appointment-search-panel" onSubmit={(e) => { e.preventDefault(); void loadAppointments(phone); }}>
                        <div className="appointment-form-group"><label htmlFor="admin-appointment-phone">Số điện thoại khách hàng</label><input id="admin-appointment-phone" type="search" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Để trống để xem tất cả lịch đặt" /></div>
                        <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setPhone(""); void loadAppointments(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm lịch đặt"}</button></div>
                    </form>
                    {notice && <div className="success-message" role="status">{notice}</div>}
                    <div className="appointment-heading-actions"><button className="primary-button" type="button" onClick={() => void openCreateAppointment()}>Tạo lịch hẹn</button></div>
                    <div className="appointment-results-heading"><div><h2>Danh sách lịch khách đặt</h2><p>{loading ? "Đang lấy dữ liệu..." : `${appointments.length} lịch đặt`}</p></div></div>
                    {loading ? <div className="appointment-panel table-state">Đang tải lịch đặt...</div> : appointments.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không tìm thấy lịch đặt</h2><p>Thử tìm bằng số điện thoại khác hoặc xóa bộ lọc.</p></div> : (
                        <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách hàng / liên hệ</th><th>Thiết bị / dịch vụ</th><th>Hình thức</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
                            {appointments.map((a) => <tr key={a.id}><td><strong>#{a.id}</strong><span>{new Date(`${a.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span><span>{a.appointmentTime.slice(0, 5)}</span></td><td><strong>{a.customerName || "Khách vãng lai"}</strong><span>{a.contactPhone}</span></td><td><strong>{a.device}</strong><span>{a.serviceName || "Dịch vụ sửa chữa"}</span></td><td><span>{a.serviceMethod === "HOME_PICKUP" ? "Nhận tại nhà" : "Mang đến cửa hàng"}</span>{a.pickupAddress && <span>{a.pickupAddress}</span>}</td><td><span className={`appointment-status ${a.status.toLowerCase()}`}>{a.status === "PENDING" ? "Chờ xác nhận" : a.status === "CANCELLED" ? "Đã hủy" : a.status === "CONFIRMED" ? "Đã xác nhận" : a.status === "CANCELLATION_REQUESTED" ? "Chờ duyệt hủy" : a.status}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(a)}>Xem chi tiết</button>{a.status === "PENDING" && <button className="primary-button" type="button" disabled={appointmentSavingId === a.id} onClick={() => void assignAppointment(a.id)}>{appointmentSavingId === a.id ? "Đang phân công..." : "Xác nhận & phân công"}</button>}</div></td></tr>)}
                        </tbody></table></div>
                    )}
                    {cancellationRequests.length > 0 && <>
                        <div className="appointment-results-heading"><div><h2>Yêu cầu hủy lịch</h2><p>{cancellationRequests.length} yêu cầu chờ xử lý</p></div></div>
                        <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách hàng</th><th>Thiết bị</th><th>Lý do</th><th>Thao tác</th></tr></thead><tbody>{cancellationRequests.map((request) => <tr key={request.appointmentId}><td><strong>#{request.appointmentId}</strong><span>{new Date(`${request.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} · {request.appointmentTime.slice(0, 5)}</span></td><td>{request.customerName || "Khách hàng"}</td><td>{request.device}</td><td className="appointment-description-cell">{request.cancellationReason}</td><td><div className="repair-ticket-actions"><button className="primary-button" type="button" disabled={appointmentSavingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "APPROVE")}>Duyệt hủy</button><button className="secondary-button" type="button" disabled={appointmentSavingId === request.appointmentId} onClick={() => void reviewCancellation(request.appointmentId, "REJECT")}>Từ chối</button></div></td></tr>)}</tbody></table></div>
                    </>}
            {viewingAppointment && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingAppointment(null); }}>
                        <section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="admin-appointment-detail-title">
                            <div className="modal-header"><div><h2 id="admin-appointment-detail-title">Chi tiết lịch hẹn #{viewingAppointment.id}</h2><p>{viewingAppointment.customerName || "Khách vãng lai"} · {viewingAppointment.serviceName}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingAppointment(null)}>×</button></div>
                            <div className="appointment-details-grid">
                                <div><span>Trạng thái</span><strong>{viewingAppointment.status === "PENDING" ? "Chờ xác nhận" : viewingAppointment.status === "CONFIRMED" ? "Đã xác nhận" : viewingAppointment.status === "CANCELLED" ? "Đã hủy" : viewingAppointment.status}</strong></div>
                                <div><span>Thời gian hẹn</span><strong>{new Date(`${viewingAppointment.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")} · {viewingAppointment.appointmentTime.slice(0, 5)}</strong></div>
                                <div><span>Thiết bị</span><strong>{viewingAppointment.device}</strong></div>
                                <div><span>Số điện thoại liên hệ</span><strong>{viewingAppointment.contactPhone}</strong></div>
                                <div><span>Hình thức</span><strong>{viewingAppointment.serviceMethod === "HOME_PICKUP" ? "Nhận thiết bị tại nhà" : "Mang đến cửa hàng"}</strong></div>
                                {viewingAppointment.pickupAddress && <div className="appointment-detail-full"><span>Địa chỉ nhận thiết bị</span><strong>{viewingAppointment.pickupAddress}</strong></div>}
                                <div className="appointment-detail-full"><span>Mô tả tình trạng</span><strong>{viewingAppointment.problemDescription || "Không có mô tả"}</strong></div>
                            </div>
                            <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(null)}>Đóng</button></div>
                        </section>
                    </div>}
                                    {showAppointmentEditor && <div className="modal-overlay" onClick={() => setShowAppointmentEditor(false)}><section className="modal customer-modal admin-appointment-create-modal" role="dialog" aria-modal="true" aria-labelledby="admin-create-appointment-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2 id="admin-create-appointment-title">Tạo lịch hẹn cho khách</h2><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setShowAppointmentEditor(false)}>×</button></div>{appointmentServices.length === 0 ? <div className="appointment-empty-state"><p>Chưa có dịch vụ đang hoạt động để đặt lịch.</p></div> : <><div className="appointment-form-group"><label htmlFor="admin-appointment-customer">Khách hàng</label><select id="admin-appointment-customer" required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}><option value="">Chọn khách hàng</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode} · {customer.fullName} · {customer.phone}</option>)}</select></div><AppointmentForm services={appointmentServices} initialValues={emptyAppointment()} submitting={appointmentSaving} submitLabel="Tạo lịch hẹn" blockUnavailableSlot onSubmit={saveAppointment} onCancel={() => { setShowAppointmentEditor(false); setSelectedCustomerId(""); }} /></>}</section></div>}</section>
            ) : activeTab === "intakes" ? (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
                    <form className="appointment-search-panel" onSubmit={submitIntakeSearch}>
                        <div className="appointment-form-group"><label htmlFor="intake-search">Tìm phiếu tiếp nhận</label><input id="intake-search" type="search" value={intakeKeyword} onChange={(event) => setIntakeKeyword(event.target.value)} placeholder="Mã phiếu, tên khách hàng hoặc thiết bị" /></div>
                        <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setIntakeKeyword(""); void loadIntakes(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm phiếu"}</button></div>
                    </form>
                    <div className="appointment-results-heading"><div><h2>Biên nhận thiết bị</h2><p>{loading ? "Đang lấy dữ liệu..." : `${intakeTickets.length} phiếu đang chờ hoặc đã tiếp nhận`}</p></div><button className="secondary-button" type="button" onClick={() => void loadIntakes(intakeKeyword)} disabled={loading}>Làm mới</button></div>
                    {loading ? <div className="appointment-panel table-state">Đang tải phiếu tiếp nhận...</div> : intakeTickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu tiếp nhận</h2><p>Phiếu từ lịch hẹn đã phân công và phiếu đang chờ tiếp nhận sẽ xuất hiện tại đây.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày hẹn/nhận</th><th>Kỹ thuật viên</th><th>Trạng thái tiếp nhận</th><th>Thao tác</th></tr></thead><tbody>{intakeTickets.map((ticket) => {
                        const receipt = intakeReceipts[ticket.id];
                        const received = Boolean(receipt) || ["RECEIVED", "Đã tiếp nhận"].includes(ticket.status);
                        return <tr key={ticket.id}><td><strong>{ticket.ticketCode}</strong></td><td>{ticket.customerName}</td><td>{ticket.device}</td><td>{new Date(`${ticket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td>{ticket.technicianName || "Chưa phân công"}</td><td><span className={`appointment-status ${received ? "confirmed" : "pending"}`}>{received ? "Đã tiếp nhận" : "Chờ tiếp nhận"}</span></td><td>{received ? receipt ? <button className="secondary-button" type="button" onClick={() => setViewingReceipt(receipt)}>Xem biên nhận</button> : <span>Không tải được biên nhận</span> : <button className="primary-button" type="button" onClick={() => beginIntake(ticket)}>Tiếp nhận thiết bị</button>}</td></tr>;
                    })}</tbody></table></div>}
                    <p className="diagnosis-storage-note">Admin có thể lập biên nhận cho phiếu được phân công và xem chi tiết biên nhận đã lưu. API biên nhận chưa hỗ trợ ảnh bằng chứng.</p>
                </section>
            ) : (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
                    <form className="appointment-search-panel" onSubmit={submitSearch}><div className="appointment-form-group"><label htmlFor="ticket-search">Tra cứu phiếu sửa chữa</label><input id="ticket-search" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mã phiếu, tên, mã hoặc số điện thoại khách" /></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setKeyword(""); void loadTickets(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>Tìm phiếu</button><button className="primary-button" type="button" onClick={openCreate}>Tạo phiếu</button></div></form>
                    <div className="appointment-results-heading"><div><h2>Danh sách phiếu sửa chữa</h2><p>{loading ? "Đang lấy dữ liệu..." : `${tickets.length} phiếu`}</p></div></div>
                    {showEditor && <form className="appointment-panel ticket-editor" onSubmit={saveTicket}><h2>{editing ? `Cập nhật ${editing.ticketCode}` : "Tạo phiếu sửa chữa"}</h2><div className="appointment-form-grid">
                        <div className="appointment-form-group"><label htmlFor="ticket-customer">Khách hàng</label><select id="ticket-customer" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}><option value="">Chọn khách hàng</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.customerCode} · {c.fullName} · {c.phone}</option>)}</select></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-device">Thiết bị</label><input id="ticket-device" required maxLength={200} value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-date">Ngày tiếp nhận</label><input id="ticket-date" type="date" required value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-status">Trạng thái phiếu</label><input id="ticket-status" value={editing ? form.status : "SCHEDULED"} readOnly /><small>Phiếu mới cần ở trạng thái chờ tiếp nhận; trạng thái được cập nhật theo quy trình sửa chữa.</small></div>
                        <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-technician">Kỹ thuật viên phụ trách</label><select id="ticket-technician" required value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Chọn kỹ thuật viên</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.fullName}</option>)}</select></div>
                    </div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setEditing(null); setShowEditor(false); setForm(emptyForm); }}>Đóng</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu phiếu"}</button></div></form>}
                    {loading ? <div className="appointment-panel table-state">Đang tải phiếu sửa chữa...</div> : tickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Chưa có phiếu sửa chữa</h2><p>Tạo phiếu mới hoặc thay đổi từ khóa tìm kiếm.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{tickets.map((t) => <tr key={t.id}><td><strong>{t.ticketCode}</strong></td><td><strong>{t.customerName}</strong><span>KH#{t.customerId}</span></td><td>{t.device}</td><td>{new Date(`${t.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td>{t.technicianName || "Chưa phân công"}</td><td><span className="appointment-status">{t.status}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => void openTicketDetails(t)}>Xem chi tiết</button><button className="primary-button" type="button" onClick={() => openEdit(t)}>Sửa</button></div></td></tr>)}</tbody></table></div>}
                </section>
            )}

            {viewingTicket && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingTicket(null); }}><section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="admin-repair-detail-title"><div className="modal-header"><div><h2 id="admin-repair-detail-title">Chi tiết phiếu {viewingTicket.ticketCode}</h2><p>{viewingTicket.customerName} · {viewingTicket.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingTicket(null)}>×</button></div>
                {ticketDetailsLoading ? <div className="table-state">Đang tải chi tiết phiếu...</div> : <>
                    <div className="appointment-details-grid"><div><span>Khách hàng</span><strong>{viewingTicket.customerName} · KH#{viewingTicket.customerId}</strong></div><div><span>Kỹ thuật viên</span><strong>{viewingTicket.technicianName || "Chưa phân công"}</strong></div><div><span>Thiết bị</span><strong>{viewingTicket.device}</strong></div><div><span>Ngày nhận phiếu</span><strong>{new Date(`${viewingTicket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div><span>Trạng thái</span><strong>{viewingTicket.status}</strong></div></div>
                    <section className="repair-detail-section"><h3>Biên nhận tiếp nhận</h3>{ticketDetailIntake ? <><p><strong>Thời gian:</strong> {new Date(ticketDetailIntake.receivedAt).toLocaleString("vi-VN")} · <strong>Người nhận:</strong> {ticketDetailIntake.receivedBy}</p><p><strong>Serial:</strong> {ticketDetailIntake.serialNumber || "Không ghi nhận"}</p><p><strong>Tình trạng:</strong> {ticketDetailIntake.appearanceCondition}</p><p><strong>Phụ kiện:</strong> {ticketDetailIntake.includedAccessories || "Không ghi nhận"}</p><p><strong>Lỗi khách báo:</strong> {ticketDetailIntake.customerReportedIssue || "Không ghi nhận"}</p></> : <p>Chưa có biên nhận.</p>}</section>
                    <section className="repair-detail-section"><h3>Chẩn đoán</h3>{ticketDetailDiagnosis ? <><p><strong>Kết quả:</strong> {ticketDetailDiagnosis.diagnosisResult}</p><p><strong>Đề xuất:</strong> {ticketDetailDiagnosis.repairProposal}</p><small>{ticketDetailDiagnosis.diagnosedBy} · {new Date(ticketDetailDiagnosis.diagnosedAt).toLocaleString("vi-VN")}</small></> : <p>Chưa có chẩn đoán.</p>}</section>
                    <section className="repair-detail-section"><h3>Báo giá</h3>{ticketDetailQuote ? <><p>{ticketDetailQuote.quoteCode} · {ticketDetailQuote.status}</p><ul>{ticketDetailQuote.items.map((item) => <li key={item.id}>{item.name} × {item.quantity} — {new Intl.NumberFormat("vi-VN").format(item.lineTotal)} ₫</li>)}</ul><strong>Tổng: {new Intl.NumberFormat("vi-VN").format(ticketDetailQuote.totalAmount)} ₫</strong></> : <p>Chưa có báo giá.</p>}</section>
                    <section className="repair-detail-section"><h3>Thanh toán</h3>{ticketDetailPayments.length ? ticketDetailPayments.map((payment) => <p key={payment.id}>{payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"} · {new Intl.NumberFormat("vi-VN").format(payment.amount)} ₫ · {payment.status === "PAID" ? "Đã thanh toán" : "Chờ xác nhận"}</p>) : <p>Chưa có giao dịch.</p>}</section>
                    <section className="repair-detail-section"><h3>Lịch sử xử lý</h3>{ticketDetailActivities.length ? <ol className="repair-timeline">{ticketDetailActivities.map((activity) => <li className="repair-timeline-event" key={activity.id}><span className="repair-timeline-marker" aria-hidden="true"/><div className="repair-timeline-content"><div className="repair-timeline-heading"><h4>{repairActivityLabel(activity)}</h4><time>{new Date(activity.createdAt).toLocaleString("vi-VN")}</time></div>{activity.note && <p>{activity.note}</p>}{activity.employeeName && <small>{activity.employeeName}</small>}</div></li>)}</ol> : <p>Chưa có hoạt động.</p>}</section>
                </>}
            </section></div>}

            {intakeEditorTicket && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !intakeSaving) setIntakeEditorTicket(null); }}><form className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="admin-intake-title" onSubmit={saveIntake}><div className="modal-header"><div><h2 id="admin-intake-title">Tiếp nhận {intakeEditorTicket.ticketCode}</h2><p>{intakeEditorTicket.customerName} · {intakeEditorTicket.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" disabled={intakeSaving} onClick={() => setIntakeEditorTicket(null)}>×</button></div><div className="appointment-form-grid">
                <div className="appointment-form-group"><label htmlFor="admin-intake-serial">Số serial</label><input id="admin-intake-serial" maxLength={100} value={intakeForm.serialNumber} onChange={(event) => setIntakeForm({ ...intakeForm, serialNumber: event.target.value })} /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="admin-intake-condition">Tình trạng ngoại quan / ban đầu</label><textarea id="admin-intake-condition" required maxLength={2000} rows={3} value={intakeForm.appearanceCondition} onChange={(event) => setIntakeForm({ ...intakeForm, appearanceCondition: event.target.value })} /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="admin-intake-accessories">Phụ kiện đi kèm</label><textarea id="admin-intake-accessories" maxLength={2000} rows={2} value={intakeForm.includedAccessories} onChange={(event) => setIntakeForm({ ...intakeForm, includedAccessories: event.target.value })} /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="admin-intake-issue">Lỗi khách hàng phản ánh</label><textarea id="admin-intake-issue" maxLength={5000} rows={3} value={intakeForm.customerReportedIssue} onChange={(event) => setIntakeForm({ ...intakeForm, customerReportedIssue: event.target.value })} /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="admin-intake-note">Ghi chú tiếp nhận</label><textarea id="admin-intake-note" maxLength={2000} rows={2} value={intakeForm.intakeNote} onChange={(event) => setIntakeForm({ ...intakeForm, intakeNote: event.target.value })} /></div>
                <div className="appointment-form-group appointment-form-full"><label htmlFor="admin-intake-evidence">Ảnh thiết bị khi tiếp nhận</label><input id="admin-intake-evidence" type="file" accept="image/jpeg,image/png" multiple required aria-describedby="admin-intake-evidence-note" onChange={(event) => setIntakePhotos(Array.from(event.target.files || []))} /><small id="admin-intake-evidence-note">Bắt buộc 1–5 ảnh JPEG hoặc PNG, tối đa 5 MB mỗi ảnh. Đã chọn: {intakePhotos.length}.</small></div>
            </div><div className="appointment-search-actions"><button className="secondary-button" type="button" disabled={intakeSaving} onClick={() => setIntakeEditorTicket(null)}>Hủy</button><button className="primary-button" type="submit" disabled={intakeSaving}>{intakeSaving ? "Đang lưu..." : "Lưu biên nhận"}</button></div></form></div>}

            {viewingReceipt && <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setViewingReceipt(null); }}><section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="admin-intake-detail-title"><div className="modal-header"><div><h2 id="admin-intake-detail-title">Biên nhận {viewingReceipt.ticketCode}</h2><p>{viewingReceipt.customerName} · {viewingReceipt.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingReceipt(null)}>×</button></div><div className="appointment-details-grid"><div><span>Số serial</span><strong>{viewingReceipt.serialNumber || "Không ghi nhận"}</strong></div><div><span>Người tiếp nhận</span><strong>{viewingReceipt.receivedBy}</strong></div><div><span>Thời gian tiếp nhận</span><strong>{new Date(viewingReceipt.receivedAt).toLocaleString("vi-VN")}</strong></div><div className="appointment-detail-full"><span>Tình trạng ngoại quan</span><strong>{viewingReceipt.appearanceCondition}</strong></div><div className="appointment-detail-full"><span>Phụ kiện đi kèm</span><strong>{viewingReceipt.includedAccessories || "Không ghi nhận"}</strong></div><div className="appointment-detail-full"><span>Lỗi khách phản ánh</span><strong>{viewingReceipt.customerReportedIssue || "Không ghi nhận"}</strong></div><div className="appointment-detail-full"><span>Ghi chú</span><strong>{viewingReceipt.intakeNote || "Không có"}</strong></div></div><section className="repair-detail-section"><h3>Ảnh thiết bị ({viewingReceipt.photos?.length || 0})</h3>{viewingReceipt.photos?.length ? <div className="repair-timeline-photos">{viewingReceipt.photos.map((photo, index) => <img key={`${photo.fileName}-${index}`} src={photo.dataUri} alt={`Thiết bị tiếp nhận ${index + 1}`} loading="lazy" />)}</div> : <p>Biên nhận không có ảnh.</p>}</section><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => setViewingReceipt(null)}>Đóng</button></div></section></div>}
        </main>
    );
}

export default AdminRepairs;
