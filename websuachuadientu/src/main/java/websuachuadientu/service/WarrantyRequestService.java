package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.WarrantyRequestCreateDto;
import websuachuadientu.dto.WarrantyRequestProcessDto;
import websuachuadientu.dto.WarrantyRequestResponse;
import websuachuadientu.entity.Customer;
import websuachuadientu.entity.Employee;
import websuachuadientu.entity.RepairTicket;
import websuachuadientu.entity.WarrantyRequest;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.WarrantyRequestRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.Locale;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class WarrantyRequestService {

    // Thời hạn bảo hành mặc định: 30 ngày kể từ ngày hoàn thành sửa chữa (completedDate)
    public static final int DEFAULT_WARRANTY_DAYS = 30;
    private static final Set<String> ALLOWED_PROCESS_STATUSES = Set.of("APPROVED", "REJECTED", "COMPLETED");

    private final WarrantyRequestRepository warrantyRepository;
    private final RepairTicketRepository ticketRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public WarrantyRequestResponse createWarrantyRequest(WarrantyRequestCreateDto request, MultipartFile attachment, String customerEmail) {
        Customer customer = customerRepository.findByUser_Email(customerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin khách hàng"));

        RepairTicket ticket = ticketRepository.findByTicketCodeIgnoreCase(request.ticketCode().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sửa chữa với mã: " + request.ticketCode().trim()));

        // Ràng buộc 1: Phải là phiếu sửa chữa của chính khách hàng này
        if (!ticket.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền gửi yêu cầu bảo hành cho phiếu sửa chữa của người khác");
        }

        // Ràng buộc 2: Phiếu sửa chữa phải ở trạng thái đã hoàn thành (COMPLETED)
        if (!RepairTicketStatus.COMPLETED.storedValue().equalsIgnoreCase(ticket.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể yêu cầu bảo hành cho phiếu sửa chữa đã hoàn thành");
        }

        // Ràng buộc 3: Kiểm tra thời hạn bảo hành (Mặc định 30 ngày kể từ ngày hoàn thành)
        LocalDate completedDate = ticket.getCompletedDate();
        if (completedDate == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiếu sửa chữa chưa có ngày hoàn thành nên chưa thể xác định thời hạn bảo hành");
        }
        LocalDate warrantyExpiryDate = completedDate.plusDays(DEFAULT_WARRANTY_DAYS);
        if (LocalDate.now().isAfter(warrantyExpiryDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Phiếu sửa chữa đã hết thời hạn bảo hành (" + DEFAULT_WARRANTY_DAYS + " ngày, hết hạn vào ngày " + warrantyExpiryDate + ")");
        }

        // Ràng buộc 4: Nếu đang có yêu cầu bảo hành ở trạng thái chờ xử lý (PENDING) thì không tạo trùng
        List<WarrantyRequest> existingRequests = warrantyRepository.findByRepairTicket_IdOrderByCreatedAtDesc(ticket.getId());
        boolean hasOpenRequest = existingRequests.stream()
                .anyMatch(r -> Set.of("PENDING", "APPROVED").contains(r.getStatus().toUpperCase(Locale.ROOT)));
        if (hasOpenRequest) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiếu sửa chữa này đang có yêu cầu bảo hành chưa xử lý xong");
        }

        WarrantyRequest warranty = new WarrantyRequest();
        warranty.setCustomer(customer);
        warranty.setRepairTicket(ticket);
        warranty.setReason(request.reason().trim());
        warranty.setDescription(request.description() != null ? request.description().trim() : null);
        if (attachment != null && !attachment.isEmpty()) {
            if (attachment.getSize() > 5L * 1024 * 1024) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp đính kèm không được vượt quá 5 MB");
            }
            String contentType = attachment.getContentType();
            try {
                byte[] data = attachment.getBytes();
                boolean jpeg = "image/jpeg".equalsIgnoreCase(contentType) && data.length >= 3
                        && (data[0] & 0xff) == 0xff && (data[1] & 0xff) == 0xd8 && (data[2] & 0xff) == 0xff;
                boolean png = "image/png".equalsIgnoreCase(contentType) && data.length >= 8
                        && (data[0] & 0xff) == 0x89 && data[1] == 0x50 && data[2] == 0x4e
                        && data[3] == 0x47 && data[4] == 0x0d && data[5] == 0x0a && data[6] == 0x1a && data[7] == 0x0a;
                boolean pdf = "application/pdf".equalsIgnoreCase(contentType) && data.length >= 5
                        && data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F' && data[4] == '-';
                if (!jpeg && !png && !pdf) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp đính kèm chỉ nhận ảnh JPG, PNG hoặc PDF hợp lệ");
                }
                String originalName = attachment.getOriginalFilename();
                warranty.setAttachmentFileName(originalName == null ? "attachment" : originalName.replaceAll("[^A-Za-z0-9._-]", "_"));
                warranty.setAttachmentContentType(contentType.toLowerCase(Locale.ROOT));
                warranty.setAttachmentData(data);
            } catch (IOException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể đọc tệp đính kèm");
            }
        }
        warranty.setStatus("PENDING");
        warranty.setCreatedAt(LocalDateTime.now());

        warranty = warrantyRepository.save(warranty);
        return mapToResponse(warranty);
    }

    public List<WarrantyRequestResponse> getMyWarrantyRequests(String customerEmail) {
        Customer customer = customerRepository.findByUser_Email(customerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin khách hàng"));
        return warrantyRepository.findByCustomer_IdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<WarrantyRequestResponse> getByTicketId(Long ticketId, String email, boolean isAdmin) {
        RepairTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sửa chữa"));
        ensureCanAccess(ticket, email, isAdmin);

        return warrantyRepository.findByRepairTicket_IdOrderByCreatedAtDesc(ticketId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<WarrantyRequestResponse> getAllWarrantyRequests(String status, String email, boolean isAdmin) {
        String normalizedStatus = status == null || status.isBlank()
                ? null : status.trim().toUpperCase(Locale.ROOT);
        List<WarrantyRequest> list;
        if (isAdmin) {
            list = normalizedStatus == null
                    ? warrantyRepository.findAllByOrderByCreatedAtDesc()
                    : warrantyRepository.findByStatusOrderByCreatedAtDesc(normalizedStatus);
        } else {
            Employee employee = employeeRepository.findByUser_Email(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Chỉ kỹ thuật viên được giao phiếu mới xem được yêu cầu bảo hành"));
            list = normalizedStatus == null
                    ? warrantyRepository.findByRepairTicket_Technician_IdOrderByCreatedAtDesc(employee.getId())
                    : warrantyRepository.findByRepairTicket_Technician_IdAndStatusOrderByCreatedAtDesc(
                            employee.getId(), normalizedStatus);
        }
        return list.stream().map(this::mapToResponse).toList();
    }

    public WarrantyRequestResponse getById(Long id, String email, boolean isAdmin) {
        WarrantyRequest request = warrantyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu bảo hành"));

        ensureCanAccess(request.getRepairTicket(), email, isAdmin);

        return mapToResponse(request);
    }

    public WarrantyAttachment getAttachment(Long id, String email, boolean isAdmin) {
        WarrantyRequest request = warrantyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu bảo hành"));
        ensureCanAccess(request.getRepairTicket(), email, isAdmin);
        if (request.getAttachmentData() == null || request.getAttachmentContentType() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Yêu cầu bảo hành không có tệp đính kèm");
        }
        return new WarrantyAttachment(request.getAttachmentFileName(), request.getAttachmentContentType(), request.getAttachmentData());
    }

    @Transactional
    public WarrantyRequestResponse processWarrantyRequest(Long id, WarrantyRequestProcessDto dto,
                                                          String employeeEmail, boolean isAdmin) {
        WarrantyRequest warranty = warrantyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu bảo hành"));
        ensureCanAccess(warranty.getRepairTicket(), employeeEmail, isAdmin);

        String requestedStatus = dto.status().toUpperCase();
        if (!ALLOWED_PROCESS_STATUSES.contains(requestedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái xử lý không hợp lệ. Cho phép: " + ALLOWED_PROCESS_STATUSES);
        }

        String currentStatus = warranty.getStatus().toUpperCase(Locale.ROOT);
        boolean validTransition = ("PENDING".equals(currentStatus)
                && ("APPROVED".equals(requestedStatus) || "REJECTED".equals(requestedStatus)))
                || ("APPROVED".equals(currentStatus) && "COMPLETED".equals(requestedStatus));
        if (!validTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trạng thái yêu cầu bảo hành không cho phép chuyển sang trạng thái đã chọn");
        }
        if ("REJECTED".equals(requestedStatus) && (dto.resolutionNote() == null || dto.resolutionNote().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do từ chối bảo hành");
        }

        Employee employee = employeeRepository.findByUser_Email(employeeEmail).orElse(null);
        warranty.setStatus(requestedStatus);
        warranty.setResolutionNote(dto.resolutionNote() != null ? dto.resolutionNote().trim() : null);
        warranty.setProcessedBy(employee);
        warranty.setProcessedAt(LocalDateTime.now());

        warranty = warrantyRepository.save(warranty);
        return mapToResponse(warranty);
    }

    private WarrantyRequestResponse mapToResponse(WarrantyRequest w) {
        RepairTicket ticket = w.getRepairTicket();
        Customer customer = w.getCustomer();
        Employee employee = w.getProcessedBy();
        return new WarrantyRequestResponse(
                w.getId(),
                ticket != null ? ticket.getId() : null,
                ticket != null ? ticket.getTicketCode() : null,
                ticket != null ? ticket.getDevice() : null,
                (ticket != null && ticket.getService() != null) ? ticket.getService().getName() : null,
                customer != null ? customer.getId() : null,
                customer != null ? customer.getFullName() : null,
                w.getReason(),
                w.getDescription(),
                w.getAttachmentFileName(),
                w.getAttachmentContentType(),
                w.getAttachmentData() != null,
                w.getStatus(),
                w.getResolutionNote(),
                employee != null ? employee.getId() : null,
                employee != null ? employee.getFullName() : null,
                w.getCreatedAt(),
                w.getProcessedAt()
        );
    }

    private void ensureCanAccess(RepairTicket ticket, String email, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        Customer customer = customerRepository.findByUser_Email(email).orElse(null);
        if (customer != null && ticket.getCustomer().getId().equals(customer.getId())) {
            return;
        }
        Employee employee = employeeRepository.findByUser_Email(email).orElse(null);
        if (employee == null || ticket.getTechnician() == null
                || !ticket.getTechnician().getId().equals(employee.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ khách hàng sở hữu phiếu, kỹ thuật viên được giao phiếu hoặc admin mới có quyền truy cập");
        }
    }

    public record WarrantyAttachment(String fileName, String contentType, byte[] data) {}
}
