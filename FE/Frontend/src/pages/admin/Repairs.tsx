import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { createRepairTicketApi, getRepairTicketHistoryApi, getRepairTicketsApi, updateRepairTicketApi, updateRepairTicketStatusApi } from "../../api/repairTicketApi";
import { assignAppointmentApi, createAppointmentApi, getAppointmentCancellationRequestsApi, getAppointmentsApi, reviewAppointmentCancellationApi } from "../../api/appointmentApi";
import { getCustomersApi } from "../../api/customerApi";
import { processWarrantyRequestApi } from "../../api/warrantyRequestApi";
import { getEmployeesApi } from "../../api/employeeApi";
import AppointmentForm from "../../components/common/AppointmentForm";
import RepairSprint8, { type RepairSprint8Section } from "./RepairSprint8";
import { getServicesApi } from "../../api/serviceApi";
import { getRepairIntakeApi } from "../../api/repairIntakeApi";
import { getRepairDiagnosisApi } from "../../api/repairDiagnosisApi";
import { getRepairQuoteApi } from "../../api/repairQuoteApi";
import { getRepairPaymentsApi } from "../../api/repairPaymentApi";
import { getRepairTrackingApi } from "../../api/repairTrackingApi";
import type { AssignedAppointment, AppointmentRequest, AppointmentCancellationRequestRecord } from "../../types/appointment";
import type { Customer } from "../../types/customer";
import type { WarrantyRequest } from "../../types/warrantyRequest";
import type { Employee } from "../../types/employee";
import type { RepairTicket, RepairTicketActivity, RepairTicketRequest } from "../../types/repairTicket";
import { repairActivityLabel } from "../../utils/repairActivityLabel";
import { repairTrackingTitle } from "../../utils/repairTrackingTitle";
import { statusLabel as translateStatus } from "../../utils/statusLabel";
import { photosForRepairTimelineEvent } from "../../utils/repairTimelinePhotos";
import { repairTimelineLines } from "../../utils/repairTimelineLines";
import { isPastRepairStatus } from "../../utils/repairTicketPeriod";
import type { RepairIntakeReceipt } from "../../types/repairIntake";
import type { RepairDiagnosis } from "../../types/repairDiagnosis";
import type { RepairQuote } from "../../types/repairQuote";
import type { RepairPayment } from "../../types/repairPayment";
import type { RepairTrackingDetails } from "../../types/repairTracking";
import type { ServiceItem } from "../../types/service";

type RepairsTab = "appointments" | "repairs" | RepairSprint8Section;
type PeriodTab = "current" | "past";
type TicketForm = { customerId: string; device: string; receivedDate: string; status: string; technicianId: string; intakeIssue: string };
const emptyForm: TicketForm = { customerId: "", device: "", receivedDate: new Date().toISOString().slice(0, 10), status: "SCHEDULED", technicianId: "", intakeIssue: "" };
const errorMessage = (error: any, fallback: string) => error.response?.data?.message || error.response?.data?.error || fallback;
const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const emptyAppointment = (): AppointmentRequest => ({ device: "", serviceId: 0, appointmentDate: localDate(), appointmentTime: "09:00", serviceMethod: "STORE_DROP_OFF", contactPhone: "", problemDescription: "", pickupAddress: "" });
const ticketStatuses = [
    ["SCHEDULED", "Chờ tiếp nhận"], ["RECEIVED", "Đã tiếp nhận"], ["DIAGNOSING", "Đang kiểm tra"],
    ["WAITING_FOR_QUOTE_APPROVAL", "Chờ khách xác nhận báo giá"], ["REPAIRING", "Đang sửa chữa"],
    ["IN_PROGRESS", "Đang xử lý"], ["WAITING_FOR_PARTS", "Chờ linh kiện"],
    ["CANNOT_BE_REPAIRED", "Không thể sửa"], ["CUSTOMER_DECLINED", "Khách từ chối"],
    ["COMPLETED", "Hoàn thành"], ["CANCELLED", "Đã hủy"],
] as const;
const canonicalTicketStatus = (status: string) => {
    const normalized = status.trim().toLocaleLowerCase("vi");
    const aliases: Record<string, string> = {
        "đã lên lịch": "SCHEDULED", "chờ tiếp nhận": "SCHEDULED",
        "đã kiểm tra": "DIAGNOSING", "đã báo giá": "WAITING_FOR_QUOTE_APPROVAL",
        "chờ khách xác nhận": "WAITING_FOR_QUOTE_APPROVAL", "đang sửa": "REPAIRING",
    };
    if (aliases[normalized]) return aliases[normalized];
    return ticketStatuses.find(([code, label]) => code.toLocaleLowerCase("vi") === normalized || label.toLocaleLowerCase("vi") === normalized)?.[0] || status;
};
const allowedStatusChanges: Record<string, string[]> = {
    SCHEDULED: ["CANCELLED"],
    RECEIVED: ["CANCELLED"],
    DIAGNOSING: ["WAITING_FOR_PARTS", "CANNOT_BE_REPAIRED", "CANCELLED"],
    REPAIRING: ["WAITING_FOR_PARTS", "CANNOT_BE_REPAIRED", "COMPLETED"],
    IN_PROGRESS: ["WAITING_FOR_PARTS", "CANNOT_BE_REPAIRED", "COMPLETED"],
    WAITING_FOR_PARTS: ["REPAIRING", "CANNOT_BE_REPAIRED"],
};

function AdminRepairs() {
    const { pendingCounts } = useOutletContext<{ pendingCounts: Record<string, number> }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RepairsTab>("appointments");
    const [periodTab, setPeriodTab] = useState<PeriodTab>("current");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [appointments, setAppointments] = useState<AssignedAppointment[]>([]);
    const [viewingAppointment, setViewingAppointment] = useState<AssignedAppointment | null>(null);
    const [openingAppointmentTicketId, setOpeningAppointmentTicketId] = useState<number | null>(null);
    const [cancellationRequests, setCancellationRequests] = useState<AppointmentCancellationRequestRecord[]>([]);
    const [appointmentSavingId, setAppointmentSavingId] = useState<number | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [appointmentCustomerSearch, setAppointmentCustomerSearch] = useState("");
    const [appointmentCustomerPickerOpen, setAppointmentCustomerPickerOpen] = useState(false);
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [phone, setPhone] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [form, setForm] = useState<TicketForm>(emptyForm);
    const [warrantyRequestToComplete, setWarrantyRequestToComplete] = useState<WarrantyRequest | null>(null);
    const [ticketCustomerSearch, setTicketCustomerSearch] = useState("");
    const [ticketCustomerPickerOpen, setTicketCustomerPickerOpen] = useState(false);
    const [ticketNote, setTicketNote] = useState("");
    const [statusPhotos, setStatusPhotos] = useState<File[]>([]);
    const [editing, setEditing] = useState<RepairTicket | null>(null);
    const [viewingTicket, setViewingTicket] = useState<RepairTicket | null>(null);
    const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
    const [ticketDetailIntake, setTicketDetailIntake] = useState<RepairIntakeReceipt | null>(null);
    const [ticketDetailDiagnosis, setTicketDetailDiagnosis] = useState<RepairDiagnosis | null>(null);
    const [ticketDetailQuote, setTicketDetailQuote] = useState<RepairQuote | null>(null);
    const [ticketDetailPayments, setTicketDetailPayments] = useState<RepairPayment[]>([]);
    const [ticketDetailActivities, setTicketDetailActivities] = useState<RepairTicketActivity[]>([]);
    const [ticketDetailTracking, setTicketDetailTracking] = useState<RepairTrackingDetails | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAppointmentEditor, setShowAppointmentEditor] = useState(false);
    const [appointmentServices, setAppointmentServices] = useState<ServiceItem[]>([]);
    const [appointmentSaving, setAppointmentSaving] = useState(false);

    const isTerminalStatus = isPastRepairStatus;
    const pendingDot = (key: string, label: string) => pendingCounts[key] > 0
        ? <span className="sidebar-badge" role="img" aria-label={`Có việc cần làm trong ${label}`} title={`Có việc cần làm trong ${label}`} />
        : null;
    const appointmentIsPast = (appointment: AssignedAppointment) => appointment.status === "CANCELLED"
        || ["RECEIVED", "IN_PROGRESS", "CONVERTED"].includes(appointment.status)
        || new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`).getTime() < Date.now();
    const appointmentPeriod = appointments.filter((appointment) => periodTab === "past" ? appointmentIsPast(appointment) : !appointmentIsPast(appointment));
    const repairPeriod = tickets.filter((ticket) => periodTab === "past" ? isTerminalStatus(ticket.status) : !isTerminalStatus(ticket.status));
    const sprint8Sections: RepairSprint8Section[] = ["billing", "reviews", "warranty"];
    const isSprint8Tab = sprint8Sections.includes(activeTab as RepairSprint8Section);
    const activeStatusSource = activeTab === "appointments" ? appointmentPeriod.map((item) => item.status) : activeTab === "repairs" ? repairPeriod.map((item) => item.status) : [];
    const statusOptions = [...new Set(activeStatusSource)];
    const visibleAppointments = appointmentPeriod.filter((item) => statusFilter === "ALL" || item.status === statusFilter)
        .sort((a, b) => `${b.appointmentDate}T${b.appointmentTime}`.localeCompare(`${a.appointmentDate}T${a.appointmentTime}`));
    const visibleRepairTickets = repairPeriod.filter((item) => statusFilter === "ALL" || item.status === statusFilter)
        .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || b.id - a.id);
    const currentEditStatus = editing ? canonicalTicketStatus(editing.status) : "SCHEDULED";
    const editableStatuses = [...new Set([currentEditStatus, ...(allowedStatusChanges[currentEditStatus] || [])])];
    const matchingCustomers = (query: string) => {
        const normalized = query.trim().toLocaleLowerCase("vi");
        return customers.filter((customer) => !normalized
            || customer.fullName.toLocaleLowerCase("vi").includes(normalized)
            || customer.phone.replace(/\s/g, "").includes(normalized.replace(/\s/g, ""))
            || customer.customerCode.toLocaleLowerCase("vi").includes(normalized));
    };

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

    useEffect(() => { void loadAppointments(); }, []);
    const requestedTicketId = Number((location.state as { openTicketId?: number } | null)?.openTicketId);
    useEffect(() => {
        if (Number.isInteger(requestedTicketId) && requestedTicketId > 0) {
            setActiveTab("repairs");
            setPeriodTab("current");
            setStatusFilter("ALL");
        }
    }, [requestedTicketId]);
    useEffect(() => {
        if (activeTab !== "repairs" || !Number.isInteger(requestedTicketId) || requestedTicketId <= 0) return;
        const ticket = tickets.find((item) => item.id === requestedTicketId);
        if (!ticket) return;
        void openTicketDetails(ticket);
        navigate(location.pathname, { replace: true, state: null });
    }, [activeTab, tickets, requestedTicketId, navigate, location.pathname]);
    useEffect(() => {
        if (activeTab !== "repairs") return;
        void loadTickets();
        Promise.all([getCustomersApi(), getEmployeesApi()]).then(([customerList, employeeList]) => {
            setCustomers(customerList); setEmployees(employeeList);
        }).catch((e: any) => setError(errorMessage(e, "Không thể tải danh sách khách hàng hoặc nhân viên.")));
    }, [activeTab]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void loadTickets(keyword); };
    const openCreate = () => { setEditing(null); setForm({ ...emptyForm, receivedDate: localDate() }); setTicketCustomerSearch(""); setTicketCustomerPickerOpen(false); setTicketNote(""); setStatusPhotos([]); setShowEditor(true); setNotice(""); setError(""); };
    const openWarrantyTicketCreate = async (request: WarrantyRequest) => {
        setError(""); setNotice("");
        setActiveTab("repairs");
        setPeriodTab("current");
        setStatusFilter("ALL");
        setKeyword("");
        try {
            const [customerList, employeeList] = await Promise.all([getCustomersApi(), getEmployeesApi()]);
            const customer = customerList.find((item) => item.id === request.customerId);
            if (!customer) throw new Error("Không tìm thấy khách hàng của yêu cầu bảo hành.");
            const intakeIssue = [`Bảo hành từ phiếu ${request.ticketCode}: ${request.reason}`, request.description].filter(Boolean).join(" | ").slice(0, 1800);
            setWarrantyRequestToComplete(request);
            setCustomers(customerList);
            setEmployees(employeeList);
            setEditing(null);
            setForm({ ...emptyForm, customerId: String(customer.id), device: request.device, receivedDate: localDate(), intakeIssue });
            setTicketCustomerSearch(`${customer.fullName} · ${customer.phone}`);
            setTicketCustomerPickerOpen(false);
            setTicketNote("");
            setStatusPhotos([]);
            setShowEditor(true);
        } catch (requestError: any) {
            setError(errorMessage(requestError, "Không thể mở biểu mẫu tạo phiếu bảo hành."));
        }
    };
    const closeEditor = () => { setEditing(null); setShowEditor(false); setForm({ ...emptyForm, receivedDate: localDate() }); setTicketCustomerSearch(""); setTicketCustomerPickerOpen(false); setTicketNote(""); setStatusPhotos([]); setWarrantyRequestToComplete(null); };
    const openCreateAppointment = async () => {
        setError(""); setNotice("");
        try {
            const [activeServices, customerList] = await Promise.all([getServicesApi({ status: "ACTIVE" }), getCustomersApi()]);
            setAppointmentServices(activeServices);
            setCustomers(customerList);
            setSelectedCustomerId("");
            setAppointmentCustomerSearch("");
            setAppointmentCustomerPickerOpen(false);
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
            setAppointmentCustomerSearch("");
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
            const assignedAppointment = await assignAppointmentApi(appointmentId);
            const technicianName = assignedAppointment.technician?.fullName?.trim();
            setNotice(technicianName
                ? `Đã xác nhận lịch và phân công cho nhân viên ${technicianName}.`
                : "Đã xác nhận lịch. Hệ thống chưa trả về tên nhân viên được phân công.");
            await loadAppointments(phone);
        } catch (e: any) { setError(errorMessage(e, "Không thể phân công lịch hẹn.")); }
        finally { setAppointmentSavingId(null); }
    };
    const openAppointmentRepairTicket = async (appointment: AssignedAppointment) => {
        setOpeningAppointmentTicketId(appointment.id);
        setError("");
        try {
            const allTickets = await getRepairTicketsApi();
            const matches = allTickets.filter((ticket) =>
                ticket.customerId === appointment.customerId
                && ticket.device.trim().toLocaleLowerCase("vi") === appointment.device.trim().toLocaleLowerCase("vi")
                && ticket.receivedDate === appointment.appointmentDate
                && (ticket.serviceId == null || ticket.serviceId === appointment.serviceId),
            );
            if (matches.length === 1) {
                setPeriodTab("current");
                setStatusFilter("ALL");
                setKeyword("");
                setActiveTab("repairs");
                navigate(location.pathname, { replace: true, state: { openTicketId: matches[0].id } });
            } else if (matches.length > 1) {
                setError("Có nhiều phiếu sửa chữa phù hợp với lịch hẹn này. Không thể xác định chính xác phiếu.");
            } else {
                setError("Lịch hẹn này chưa có phiếu sửa chữa.");
            }
        } catch (e: any) {
            setError(errorMessage(e, "Không thể tải phiếu sửa chữa liên quan đến lịch hẹn."));
        } finally {
            setOpeningAppointmentTicketId(null);
        }
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
        setTicketNote(""); setStatusPhotos([]);
        const customer = customers.find((item) => item.id === ticket.customerId);
        setTicketCustomerSearch(customer ? `${customer.fullName} · ${customer.phone}` : ticket.customerName);
        setTicketCustomerPickerOpen(false);
        setForm({ customerId: String(ticket.customerId), device: ticket.device, receivedDate: ticket.receivedDate, status: canonicalTicketStatus(ticket.status), technicianId: ticket.technicianId ? String(ticket.technicianId) : "", intakeIssue: "" });
    };
    const openTicketDetails = async (ticket: RepairTicket) => {
        setViewingTicket(ticket);
        setTicketDetailsLoading(true);
        setTicketDetailIntake(null);
        setTicketDetailDiagnosis(null);
        setTicketDetailQuote(null);
        setTicketDetailPayments([]);
        setTicketDetailActivities([]);
        setTicketDetailTracking(null);
        const optional = <T,>(promise: Promise<T>) => promise.catch((error: any) => {
            if (error.response?.status === 404) return null;
            throw error;
        });
        try {
            const [intake, diagnosis, quote, payments, activities, tracking] = await Promise.all([
                optional(getRepairIntakeApi(ticket.id)),
                optional(getRepairDiagnosisApi(ticket.id)),
                optional(getRepairQuoteApi(ticket.id)),
                getRepairPaymentsApi(ticket.id).catch((error: any) => error.response?.status === 404 ? [] : Promise.reject(error)),
                getRepairTicketHistoryApi(ticket.id),
                optional(getRepairTrackingApi(ticket.id)),
            ]);
            setTicketDetailIntake(intake);
            setTicketDetailDiagnosis(diagnosis);
            setTicketDetailQuote(quote);
            setTicketDetailPayments(payments);
            setTicketDetailActivities(activities);
            setTicketDetailTracking(tracking);
        } catch (error: any) {
            setError(errorMessage(error, "Không thể tải đầy đủ chi tiết phiếu sửa chữa."));
        } finally {
            setTicketDetailsLoading(false);
        }
    };
    const saveTicket = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        const customerId = Number(form.customerId);
        const technicianId = Number(form.technicianId);
        const currentStatus = editing ? canonicalTicketStatus(editing.status) : "SCHEDULED";
        const nextStatus = canonicalTicketStatus(form.status);
        const statusChanged = Boolean(editing && nextStatus !== currentStatus);
        const invalid = (message: string) => { setError(message); setSaving(false); };
        if (!Number.isInteger(customerId) || !customers.some((customer) => customer.id === customerId)) { invalid("Vui lòng chọn khách hàng có trong danh sách."); return; }
        if (!form.device.trim() || form.device.trim().length > 200) { invalid("Tên thiết bị là bắt buộc và không được vượt quá 200 ký tự."); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.receivedDate) || Number.isNaN(new Date(`${form.receivedDate}T00:00:00`).getTime())) { invalid("Ngày tiếp nhận không hợp lệ. Vui lòng chọn lại."); return; }
        if (form.receivedDate < localDate() && (!editing || form.receivedDate !== editing.receivedDate)) { invalid("Ngày tiếp nhận không được ở quá khứ. Vui lòng chọn hôm nay hoặc một ngày trong tương lai."); return; }
        if (!Number.isInteger(technicianId) || !employees.some((employee) => employee.id === technicianId && employee.status === "ACTIVE")) { invalid("Vui lòng chọn kỹ thuật viên đang hoạt động."); return; }
        if (!ticketStatuses.some(([code]) => code === nextStatus) || (statusChanged && !(allowedStatusChanges[currentStatus] || []).includes(nextStatus))) { invalid("Trạng thái mới không hợp lệ theo quy trình của phiếu sửa chữa."); return; }
        if (ticketNote.length > 2000) { invalid("Ghi chú không được vượt quá 2.000 ký tự."); return; }
        if (form.intakeIssue.trim().length > 1800) { invalid("Lỗi tiếp nhận không được vượt quá 1.800 ký tự."); return; }
        if (statusChanged && (statusPhotos.length < 1 || statusPhotos.length > 5)) { invalid("Khi đổi trạng thái, vui lòng đính kèm từ 1 đến 5 ảnh minh chứng."); return; }
        if (statusChanged && statusPhotos.some((photo) => !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) { invalid("Ảnh minh chứng phải là JPEG hoặc PNG và không vượt quá 5 MB mỗi ảnh."); return; }
        const requestNote = editing
            ? (!statusChanged ? ticketNote.trim() : "")
            : (form.intakeIssue.trim() ? `Lỗi khách phản ánh bổ sung khi tiếp nhận: ${form.intakeIssue.trim()}` : "");
        const request: RepairTicketRequest = {
            customerId, device: form.device.trim(), receivedDate: form.receivedDate,
            status: currentStatus, technicianId,
            ...(requestNote ? { note: requestNote } : {}),
        };
        let createdTicket: RepairTicket | null = null;
        try {
            if (editing) {
                await updateRepairTicketApi(editing.id, request);
                if (statusChanged) await updateRepairTicketStatusApi(editing.id, nextStatus, statusPhotos, ticketNote.trim());
            } else {
                createdTicket = await createRepairTicketApi({ ...request, status: "SCHEDULED" });
                if (warrantyRequestToComplete) {
                    await processWarrantyRequestApi(warrantyRequestToComplete.id, "COMPLETED", [warrantyRequestToComplete.resolutionNote, `\u0110\u00e3 t\u1ea1o phi\u1ebfu b\u1ea3o h\u00e0nh ${createdTicket.ticketCode}.`].filter(Boolean).join("\n\n"));
                }
            }
            setNotice(warrantyRequestToComplete && createdTicket
                ? `\u0110\u00e3 t\u1ea1o phi\u1ebfu b\u1ea3o h\u00e0nh ${createdTicket.ticketCode} v\u00e0 chuy\u1ec3n y\u00eau c\u1ea7u ${warrantyRequestToComplete.ticketCode} sang Ho\u00e0n t\u1ea5t.`
                : editing ? "\u0110\u00e3 c\u1eadp nh\u1eadt phi\u1ebfu s\u1eeda ch\u1eefa." : "\u0110\u00e3 t\u1ea1o phi\u1ebfu s\u1eeda ch\u1eefa.");
            setWarrantyRequestToComplete(null);
            setEditing(null); setShowEditor(false); setForm({ ...emptyForm, receivedDate: localDate() }); setTicketCustomerSearch(""); setTicketCustomerPickerOpen(false); setTicketNote(""); setStatusPhotos([]); await loadTickets(keyword);
        } catch (e: any) {
            if (createdTicket && warrantyRequestToComplete) {
                setError(`Phi\u1ebfu b\u1ea3o h\u00e0nh ${createdTicket.ticketCode} \u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o nh\u01b0ng kh\u00f4ng th\u1ec3 t\u1ef1 chuy\u1ec3n y\u00eau c\u1ea7u sang Ho\u00e0n t\u1ea5t: ${errorMessage(e, "Backend t\u1eeb ch\u1ed1i c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i.")}`);
                setEditing(null); setShowEditor(false); setWarrantyRequestToComplete(null);
                setForm({ ...emptyForm, receivedDate: localDate() }); setTicketCustomerSearch(""); setTicketCustomerPickerOpen(false); setTicketNote(""); setStatusPhotos([]);
                await loadTickets(keyword);
            } else setError(errorMessage(e, "Kh\u00f4ng th\u1ec3 l\u01b0u phi\u1ebfu s\u1eeda ch\u1eefa."));
        }
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
                <button type="button" role="tab" aria-selected={activeTab === "appointments"} className={activeTab === "appointments" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("appointments"); setStatusFilter("ALL"); setError(""); setNotice(""); }}>Lịch đặt của khách{pendingDot("/admin/repairs:appointments", "lịch đặt")}</button>
                <button type="button" role="tab" aria-selected={activeTab === "repairs"} className={activeTab === "repairs" ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab("repairs"); setStatusFilter("ALL"); setError(""); setNotice(""); }}>Phiếu sửa chữa{pendingDot("/admin/repairs:repairs", "phiếu sửa chữa")}</button>
                {(["billing", "reviews", "warranty"] as RepairSprint8Section[]).map((section) => {
                    const labels: Record<RepairSprint8Section, string> = { billing: "Báo giá & thanh toán", reviews: "Đánh giá dịch vụ", warranty: "Bảo hành" };
                    return <button key={section} type="button" role="tab" aria-selected={activeTab === section} className={activeTab === section ? "repair-management-tab active" : "repair-management-tab"} onClick={() => { setActiveTab(section); setStatusFilter("ALL"); setError(""); setNotice(""); }}>{labels[section]}{section !== "reviews" && pendingDot(`/admin/repairs:${section}`, labels[section])}</button>;
                })}
            </div>
            {isSprint8Tab ? <RepairSprint8 key={activeTab} section={activeTab as RepairSprint8Section} onCreateWarrantyTicket={openWarrantyTicketCreate} /> : <>
            <div className="appointment-tabs" role="tablist" aria-label="Repair data period">
                <button className={periodTab === "current" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={periodTab === "current"} onClick={() => { setPeriodTab("current"); setStatusFilter("ALL"); }}>Hi&#7879;n t&#7841;i <span>{activeTab === "appointments" ? appointments.filter((item) => !appointmentIsPast(item)).length : tickets.filter((item) => !isTerminalStatus(item.status)).length}</span></button>
                <button className={periodTab === "past" ? "appointment-tab active" : "appointment-tab"} type="button" role="tab" aria-selected={periodTab === "past"} onClick={() => { setPeriodTab("past"); setStatusFilter("ALL"); }}>&#272;&#227; qua <span>{activeTab === "appointments" ? appointments.filter(appointmentIsPast).length : tickets.filter((item) => isTerminalStatus(item.status)).length}</span></button>
            </div>
            {activeTab !== "appointments" && activeTab !== "repairs" && <div className="appointment-filter-row"><label htmlFor="admin-repair-status-filter">Lọc trạng thái</label><select id="admin-repair-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{statusOptions.map((status) => <option key={status} value={status}>{translateStatus(status)}</option>)}</select></div>}

            {activeTab === "appointments" ? (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <form className="appointment-search-panel" onSubmit={(e) => { e.preventDefault(); void loadAppointments(phone); }}>
                        <div className="appointment-form-group"><label htmlFor="admin-appointment-phone">Số điện thoại khách hàng</label><input id="admin-appointment-phone" type="search" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Để trống để xem tất cả lịch đặt" /></div>
                        <div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setPhone(""); void loadAppointments(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang tải..." : "Tìm lịch đặt"}</button><button className="primary-button" type="button" onClick={() => void openCreateAppointment()}>Tạo lịch hẹn</button></div>
                    </form>
                    {notice && <div className="success-message" role="status">{notice}</div>}
                    <div className="appointment-filter-row"><label htmlFor="admin-repair-status-filter">Lọc trạng thái</label><select id="admin-repair-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{statusOptions.map((status) => <option key={status} value={status}>{translateStatus(status)}</option>)}</select></div>
                    <div className="appointment-results-heading"><div><h2>Lịch hẹn {periodTab === "current" ? "hiện tại" : "đã qua"}</h2><p>{loading ? "Đang lấy dữ liệu..." : `${visibleAppointments.length} lịch đặt`}</p></div></div>
                    {loading ? <div className="appointment-panel table-state">Đang tải lịch đặt...</div> : visibleAppointments.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không có lịch hẹn phù hợp</h2><p>Thử đổi bộ lọc trạng thái hoặc xóa từ khóa.</p></div> : (
                        <div className="appointment-panel appointment-table-container"><table className="appointment-table"><thead><tr><th>Lịch hẹn</th><th>Khách hàng / liên hệ</th><th>Thiết bị / dịch vụ</th><th>Hình thức</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
                            {visibleAppointments.map((a) => <tr key={a.id}><td><strong>#{a.id}</strong><span>{new Date(`${a.appointmentDate}T00:00:00`).toLocaleDateString("vi-VN")}</span><span>{a.appointmentTime.slice(0, 5)}</span></td><td><strong>{a.customerName || "Khách vãng lai"}</strong><span>{a.contactPhone}</span></td><td><strong>{a.device}</strong><span>{a.serviceName || "Dịch vụ sửa chữa"}</span></td><td><span>{a.serviceMethod === "HOME_PICKUP" ? "Nhận tại nhà" : "Mang đến cửa hàng"}</span>{a.pickupAddress && <span>{a.pickupAddress}</span>}</td><td><span className={`appointment-status ${a.status.toLowerCase()}`}>{translateStatus(a.status)}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => setViewingAppointment(a)}>Xem chi tiết</button>{a.status !== "PENDING" && <button className="secondary-button" type="button" disabled={openingAppointmentTicketId === a.id} onClick={() => void openAppointmentRepairTicket(a)}>{openingAppointmentTicketId === a.id ? "Đang tải phiếu..." : "Xem phiếu sửa chữa"}</button>}{a.status === "PENDING" && <button className="primary-button" type="button" disabled={appointmentSavingId === a.id} onClick={() => void assignAppointment(a.id)}>{appointmentSavingId === a.id ? "Đang phân công..." : "Xác nhận & phân công"}</button>}</div></td></tr>)}
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
                                <div><span>Trạng thái</span><strong>{translateStatus(viewingAppointment.status)}</strong></div>
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
                                    {showAppointmentEditor && <div className="modal-overlay" onClick={() => { setShowAppointmentEditor(false); setAppointmentCustomerPickerOpen(false); }}><section className="modal customer-modal admin-appointment-create-modal" role="dialog" aria-modal="true" aria-labelledby="admin-create-appointment-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2 id="admin-create-appointment-title">Tạo lịch hẹn cho khách</h2><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setShowAppointmentEditor(false)}>×</button></div>{appointmentServices.length === 0 ? <div className="appointment-empty-state"><p>Chưa có dịch vụ đang hoạt động để đặt lịch.</p></div> : <><div className="appointment-form-group customer-picker-group"><label htmlFor="admin-appointment-customer">Khách hàng</label><input id="admin-appointment-customer" type="search" required autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={appointmentCustomerPickerOpen} aria-controls="admin-appointment-customer-options" value={appointmentCustomerSearch} placeholder="Tìm theo tên hoặc số điện thoại" onFocus={() => setAppointmentCustomerPickerOpen(true)} onBlur={() => setAppointmentCustomerPickerOpen(false)} onChange={(event) => { setAppointmentCustomerSearch(event.target.value); setSelectedCustomerId(""); setAppointmentCustomerPickerOpen(true); }} />{appointmentCustomerPickerOpen && <div id="admin-appointment-customer-options" className="customer-picker-results" role="listbox" onMouseDown={(event) => event.preventDefault()}>{matchingCustomers(appointmentCustomerSearch).length ? matchingCustomers(appointmentCustomerSearch).map((customer) => <button className="customer-picker-option" type="button" role="option" aria-selected={selectedCustomerId === String(customer.id)} key={customer.id} onClick={() => { setSelectedCustomerId(String(customer.id)); setAppointmentCustomerSearch(`${customer.fullName} · ${customer.phone}`); setAppointmentCustomerPickerOpen(false); }}><span className="customer-picker-option-main"><strong>{customer.fullName}</strong><small>{customer.phone} · {customer.customerCode}</small></span></button>) : <p className="customer-picker-empty">{appointmentCustomerSearch.trim() ? "Không tìm thấy khách hàng phù hợp." : "Nhập tên hoặc số điện thoại để tìm khách hàng."}</p>}</div>}</div><AppointmentForm services={appointmentServices} initialValues={emptyAppointment()} submitting={appointmentSaving} submitLabel="Tạo lịch hẹn" blockUnavailableSlot onSubmit={saveAppointment} onCancel={() => { setShowAppointmentEditor(false); setSelectedCustomerId(""); setAppointmentCustomerSearch(""); }} /></>}</section></div>}</section>
            ) : (
                <section role="tabpanel" className="admin-appointments-panel">
                    {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
                    <form className="appointment-search-panel" onSubmit={submitSearch}><div className="appointment-form-group"><label htmlFor="ticket-search">Tra cứu phiếu sửa chữa</label><input id="ticket-search" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mã phiếu, tên, mã hoặc số điện thoại khách" /></div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={() => { setKeyword(""); void loadTickets(); }} disabled={loading}>Xóa lọc</button><button className="primary-button" type="submit" disabled={loading}>Tìm phiếu</button><button className="primary-button" type="button" onClick={openCreate}>Tạo phiếu</button></div></form>
                    <div className="appointment-filter-row"><label htmlFor="admin-repair-status-filter">Lọc trạng thái</label><select id="admin-repair-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{statusOptions.map((status) => <option key={status} value={status}>{translateStatus(status)}</option>)}</select></div>
                    <div className="appointment-results-heading"><div><h2>Phiếu sửa chữa {periodTab === "current" ? "hiện tại" : "đã qua"}</h2><p>{loading ? "Đang lấy dữ liệu..." : visibleRepairTickets.length === repairPeriod.length ? `${repairPeriod.length} phiếu` : `${visibleRepairTickets.length} phiếu phù hợp · tổng ${repairPeriod.length} phiếu ${periodTab === "current" ? "hiện tại" : "đã qua"}`}</p></div></div>
                    {showEditor && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><form className="modal customer-modal ticket-editor" role="dialog" aria-modal="true" aria-labelledby="admin-ticket-editor-title" onClick={(event) => event.stopPropagation()} onSubmit={saveTicket}><h2 id="admin-ticket-editor-title">{editing ? `Cập nhật ${editing.ticketCode}` : "Tạo phiếu sửa chữa"}</h2><div className="appointment-form-grid">
                        <div className="appointment-form-group customer-picker-group"><label htmlFor="ticket-customer">Khách hàng</label><input id="ticket-customer" type="search" required autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={ticketCustomerPickerOpen} aria-controls="ticket-customer-options" value={ticketCustomerSearch} placeholder="Tìm theo tên hoặc số điện thoại" onFocus={() => setTicketCustomerPickerOpen(true)} onBlur={() => setTicketCustomerPickerOpen(false)} onChange={(event) => { setTicketCustomerSearch(event.target.value); setForm({ ...form, customerId: "" }); setTicketCustomerPickerOpen(true); }} />{ticketCustomerPickerOpen && <div id="ticket-customer-options" className="customer-picker-results" role="listbox" onMouseDown={(event) => event.preventDefault()}>{matchingCustomers(ticketCustomerSearch).length ? matchingCustomers(ticketCustomerSearch).map((customer) => <button className="customer-picker-option" type="button" role="option" aria-selected={form.customerId === String(customer.id)} key={customer.id} onClick={() => { setForm({ ...form, customerId: String(customer.id) }); setTicketCustomerSearch(`${customer.fullName} · ${customer.phone}`); setTicketCustomerPickerOpen(false); }}><span className="customer-picker-option-main"><strong>{customer.fullName}</strong><small>{customer.phone} · {customer.customerCode}</small></span></button>) : <p className="customer-picker-empty">{ticketCustomerSearch.trim() ? "Không tìm thấy khách hàng phù hợp." : "Nhập tên hoặc số điện thoại để tìm khách hàng."}</p>}</div>}</div>
                        <div className="appointment-form-group"><label htmlFor="ticket-device">Thiết bị</label><input id="ticket-device" required maxLength={200} value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-date">Ngày tiếp nhận</label><input id="ticket-date" type="date" required min={localDate()} value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></div>
                        <div className="appointment-form-group"><label htmlFor="ticket-status">Trạng thái phiếu</label>{editing ? <select id="ticket-status" value={form.status} onChange={(e) => { setForm({ ...form, status: e.target.value }); setStatusPhotos([]); }}>{editableStatuses.map((status) => { const option = ticketStatuses.find(([code]) => code === status); return <option key={status} value={status}>{option?.[1] || translateStatus(status)}</option>; })}</select> : <input id="ticket-status" value="Chờ tiếp nhận" readOnly />}<small>Trạng thái chỉ chuyển theo đúng quy trình; thay đổi trạng thái cần ảnh minh chứng.</small></div>
                        <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-technician">Kỹ thuật viên phụ trách</label><select id="ticket-technician" required value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}><option value="">Chọn kỹ thuật viên</option>{employees.filter((employee) => employee.status === "ACTIVE").map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} · {employee.fullName}</option>)}</select></div>
                        {!editing && <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-intake-issue">Lỗi tiếp nhận</label><textarea id="ticket-intake-issue" value={form.intakeIssue} maxLength={1800} rows={3} onChange={(event) => setForm({ ...form, intakeIssue: event.target.value })} placeholder="Nhập lỗi ghi nhận khi tiếp nhận; nội dung sẽ được nối vào ghi chú lỗi khách phản ánh của phiếu" /><small>Nội dung được lưu cùng ghi chú phiếu để bổ sung thông tin lỗi khách phản ánh.</small></div>}
                        {editing && <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-note">Ghi chú tình trạng mới</label><textarea id="ticket-note" value={ticketNote} maxLength={2000} rows={3} onChange={(event) => setTicketNote(event.target.value)} placeholder="Nhập nội dung cần lưu vào lịch sử xử lý" /></div>}
                        {editing && form.status !== currentEditStatus && <div className="appointment-form-group appointment-form-full"><label htmlFor="ticket-status-photos">Ảnh minh chứng cho trạng thái mới</label><input id="ticket-status-photos" type="file" accept="image/jpeg,image/png" multiple required onChange={(event) => setStatusPhotos(Array.from(event.target.files || []))} /><small>Bắt buộc từ 1 đến 5 ảnh JPEG hoặc PNG, tối đa 5 MB mỗi ảnh. Đã chọn: {statusPhotos.length}.</small></div>}
                    </div><div className="appointment-search-actions"><button className="secondary-button" type="button" onClick={closeEditor}>Đóng</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu phiếu"}</button></div></form></div>}
                    {loading ? <div className="appointment-panel table-state">Đang tải phiếu sửa chữa...</div> : visibleRepairTickets.length === 0 ? <div className="appointment-panel appointment-empty-state"><h2>Không có phiếu sửa chữa phù hợp</h2><p>Tạo phiếu mới hoặc thay đổi bộ lọc.</p></div> : <div className="appointment-panel appointment-table-container"><table className="appointment-table repair-ticket-table"><thead><tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Ngày nhận</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleRepairTickets.map((t) => <tr key={t.id}><td><strong>{t.ticketCode}</strong></td><td><strong>{t.customerName}</strong><span>KH#{t.customerId}</span></td><td>{t.device}</td><td>{new Date(`${t.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td>{t.technicianName || "Chưa phân công"}</td><td><span className="appointment-status">{translateStatus(t.status)}</span></td><td><div className="repair-ticket-actions"><button className="secondary-button" type="button" onClick={() => void openTicketDetails(t)}>Xem chi tiết</button><button className="primary-button" type="button" onClick={() => openEdit(t)}>Sửa</button></div></td></tr>)}</tbody></table></div>}
                </section>
            )}

            </>}
            {viewingTicket && <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingTicket(null); }}><section className="modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="admin-repair-detail-title"><div className="modal-header"><div><h2 id="admin-repair-detail-title">Chi tiết phiếu {viewingTicket.ticketCode}</h2><p>{viewingTicket.customerName} · {viewingTicket.device}</p></div><button className="modal-close" type="button" aria-label="Đóng" onClick={() => setViewingTicket(null)}>×</button></div>
                {ticketDetailsLoading ? <div className="table-state">Đang tải chi tiết phiếu...</div> : <>
                    <div className="appointment-details-grid"><div><span>Khách hàng</span><strong>{viewingTicket.customerName} · KH#{viewingTicket.customerId}</strong></div><div><span>Kỹ thuật viên</span><strong>{viewingTicket.technicianName || "Chưa phân công"}</strong></div><div><span>Thiết bị</span><strong>{viewingTicket.device}</strong></div><div><span>Ngày nhận phiếu</span><strong>{new Date(`${viewingTicket.receivedDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div><span>Trạng thái</span><strong>{translateStatus(viewingTicket.status)}</strong></div></div>
                    <section className="repair-detail-section"><h3>Biên nhận tiếp nhận</h3>{ticketDetailIntake ? <><p><strong>Thời gian:</strong> {new Date(ticketDetailIntake.receivedAt).toLocaleString("vi-VN")} · <strong>Người nhận:</strong> {ticketDetailIntake.receivedBy}</p><p><strong>Số sê-ri:</strong> {ticketDetailIntake.serialNumber || "Không ghi nhận"}</p><p><strong>Tình trạng:</strong> {ticketDetailIntake.appearanceCondition}</p><p><strong>Phụ kiện:</strong> {ticketDetailIntake.includedAccessories || "Không ghi nhận"}</p><p><strong>Lỗi khách phản ánh:</strong> {ticketDetailIntake.customerReportedIssue || "Không ghi nhận"}</p><p><strong>Lỗi tiếp nhận:</strong> {ticketDetailIntake.intakeNote || "Không ghi nhận"}</p></> : <p>Chưa có biên nhận.</p>}</section>
                    <section className="repair-detail-section"><h3>Chẩn đoán</h3>{ticketDetailDiagnosis ? <><p><strong>Kết quả:</strong> {ticketDetailDiagnosis.diagnosisResult}</p><p><strong>Đề xuất:</strong> {ticketDetailDiagnosis.repairProposal}</p><small>{ticketDetailDiagnosis.diagnosedBy} · {new Date(ticketDetailDiagnosis.diagnosedAt).toLocaleString("vi-VN")}</small></> : <p>Chưa có chẩn đoán.</p>}</section>
                    <section className="repair-detail-section"><h3>Báo giá</h3>{ticketDetailQuote ? <><p>{ticketDetailQuote.quoteCode} · {translateStatus(ticketDetailQuote.status)}</p><ul>{ticketDetailQuote.items.map((item) => <li key={item.id}>{item.name} × {item.quantity} — {new Intl.NumberFormat("vi-VN").format(item.lineTotal)} ₫</li>)}</ul><strong>Tổng: {new Intl.NumberFormat("vi-VN").format(ticketDetailQuote.totalAmount)} ₫</strong></> : <p>Chưa có báo giá.</p>}</section>
                    <section className="repair-detail-section"><h3>Thanh toán</h3>{ticketDetailPayments.length ? ticketDetailPayments.map((payment) => <p key={payment.id}>{payment.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Tiền mặt"} · {new Intl.NumberFormat("vi-VN").format(payment.amount)} ₫ · {payment.status === "PAID" ? "Đã thanh toán" : "Chờ xác nhận"}</p>) : <p>Chưa có giao dịch.</p>}</section>
                    <section className="repair-detail-section"><h3>Lịch sử xử lý</h3>{ticketDetailTracking?.timeline.length ? <ol className="repair-timeline">{ticketDetailTracking.timeline.map((event, index) => {
                        const photos = event.type === "DEVICE_RECEIVED" ? ticketDetailIntake?.photos || [] : photosForRepairTimelineEvent(event, ticketDetailTracking.updates);
                        return <li className="repair-timeline-event" key={`${event.type}-${index}`}><span className="repair-timeline-marker" aria-hidden="true"/><div className="repair-timeline-content"><div className="repair-timeline-heading"><h4>{repairTrackingTitle(event.type, event.details, event.title)}</h4><time>{new Date(event.createdAt).toLocaleString("vi-VN")}</time></div>{event.details && event.type !== "STATUS_UPDATED" && repairTimelineLines(event.details).map((line, lineIndex) => <p key={`${event.type}-detail-${lineIndex}`}>{line}</p>)}{repairTimelineLines(event.note).map((line, lineIndex) => <p key={`${event.type}-note-${lineIndex}`}>{line}</p>)}{event.actorName && <small>Thực hiện bởi: {event.actorName}</small>}{photos.length > 0 && <div className="repair-timeline-photos">{photos.map((photo, photoIndex) => <a key={`${event.type}-${photo.fileName}-${photoIndex}`} href={photo.dataUri} target="_blank" rel="noreferrer"><img src={photo.dataUri} alt={`Ảnh minh chứng ${photoIndex + 1}`} loading="lazy" /></a>)}</div>}</div></li>;
                    })}</ol> : ticketDetailActivities.length ? <ol className="repair-timeline">{ticketDetailActivities.map((activity) => <li className="repair-timeline-event" key={activity.id}><span className="repair-timeline-marker" aria-hidden="true"/><div className="repair-timeline-content"><div className="repair-timeline-heading"><h4>{repairActivityLabel(activity)}</h4><time>{new Date(activity.createdAt).toLocaleString("vi-VN")}</time></div>{activity.note && <p>{activity.note}</p>}{activity.employeeName && <small>{activity.employeeName}</small>}</div></li>)}</ol> : <p>Chưa có hoạt động.</p>}</section>
                </>}
            </section></div>}

        </main>
    );
}

export default AdminRepairs;
