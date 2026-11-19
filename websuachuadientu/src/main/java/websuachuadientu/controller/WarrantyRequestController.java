package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.multipart.MultipartFile;
import websuachuadientu.dto.WarrantyRequestCreateDto;
import websuachuadientu.dto.WarrantyRequestProcessDto;
import websuachuadientu.dto.WarrantyRequestResponse;
import websuachuadientu.service.WarrantyRequestService;

import java.util.List;

@RestController
@RequestMapping("/api")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Warranty Request", description = "API Gửi và xử lý yêu cầu bảo hành")
@RequiredArgsConstructor
public class WarrantyRequestController {

    private final WarrantyRequestService warrantyService;

    @Operation(summary = "Khách hàng gửi yêu cầu bảo hành theo mã phiếu sửa chữa (kèm file nếu có)")
    @PostMapping(value = "/warranty-requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WarrantyRequestResponse> createWarrantyRequest(
            @Valid @ModelAttribute WarrantyRequestCreateDto request,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(warrantyService.createWarrantyRequest(request, attachment, authentication.getName()));
    }

    @Operation(summary = "Khách hàng xem danh sách yêu cầu bảo hành của mình")
    @GetMapping("/warranty-requests/me")
    public ResponseEntity<List<WarrantyRequestResponse>> getMyWarrantyRequests(Authentication authentication) {
        return ResponseEntity.ok(warrantyService.getMyWarrantyRequests(authentication.getName()));
    }

    @Operation(summary = "Xem danh sách yêu cầu bảo hành của một phiếu sửa chữa")
    @GetMapping("/repair-tickets/{ticketId}/warranty-requests")
    public ResponseEntity<List<WarrantyRequestResponse>> getByTicket(
            @PathVariable Long ticketId,
            Authentication authentication) {
        return ResponseEntity.ok(warrantyService.getByTicketId(ticketId, authentication.getName(), isAdmin(authentication)));
    }

    @Operation(summary = "Xem chi tiết một yêu cầu bảo hành")
    @GetMapping("/warranty-requests/{id}")
    public ResponseEntity<WarrantyRequestResponse> getById(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(warrantyService.getById(id, authentication.getName(), isAdmin(authentication)));
    }

    @Operation(summary = "Khách hàng hoặc nhân viên tải tệp đính kèm của yêu cầu bảo hành")
    @GetMapping("/warranty-requests/{id}/attachment")
    public ResponseEntity<ByteArrayResource> getAttachment(
            @PathVariable Long id, Authentication authentication) {
        var attachment = warrantyService.getAttachment(id, authentication.getName(), isAdmin(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + attachment.fileName().replace("\"", "") + "\"")
                .body(new ByteArrayResource(attachment.data()));
    }

    @Operation(summary = "Admin xem tất cả; nhân viên chỉ xem yêu cầu của phiếu được giao")
    @GetMapping("/warranty-requests")
    public ResponseEntity<List<WarrantyRequestResponse>> getAllWarrantyRequests(
            @RequestParam(required = false) String status, Authentication authentication) {
        return ResponseEntity.ok(warrantyService.getAllWarrantyRequests(
                status, authentication.getName(), isAdmin(authentication)));
    }

    @Operation(summary = "Kỹ thuật viên được giao phiếu hoặc admin xử lý yêu cầu bảo hành")
    @PatchMapping("/warranty-requests/{id}/process")
    public ResponseEntity<WarrantyRequestResponse> processWarrantyRequest(
            @PathVariable Long id,
            @Valid @RequestBody WarrantyRequestProcessDto dto,
            Authentication authentication) {
        return ResponseEntity.ok(warrantyService.processWarrantyRequest(
                id, dto, authentication.getName(), isAdmin(authentication)));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
