package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.ServiceReviewRequest;
import websuachuadientu.dto.ServiceReviewResponse;
import websuachuadientu.service.ServiceReviewService;

import java.util.List;

@RestController
@RequestMapping("/api")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Service Review", description = "API Đánh giá dịch vụ sau sửa chữa")
@RequiredArgsConstructor
public class ServiceReviewController {

    private final ServiceReviewService reviewService;

    @Operation(summary = "Khách hàng gửi đánh giá cho phiếu sửa chữa đã hoàn thành")
    @PostMapping("/repair-tickets/{ticketId}/reviews")
    public ResponseEntity<ServiceReviewResponse> createReview(
            @PathVariable Long ticketId,
            @Valid @RequestBody ServiceReviewRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.createReview(ticketId, request, authentication.getName()));
    }

    @Operation(summary = "Xem đánh giá của một phiếu sửa chữa")
    @GetMapping("/repair-tickets/{ticketId}/reviews")
    public ResponseEntity<ServiceReviewResponse> getReviewByTicket(@PathVariable Long ticketId) {
        return ResponseEntity.ok(reviewService.getByTicketId(ticketId));
    }

    @Operation(summary = "Khách hàng xem lại các đánh giá của chính mình")
    @GetMapping("/reviews/me")
    public ResponseEntity<List<ServiceReviewResponse>> getMyReviews(Authentication authentication) {
        return ResponseEntity.ok(reviewService.getReviewsByCustomer(authentication.getName()));
    }

    @Operation(summary = "Xem danh sách đánh giá theo dịch vụ")
    @GetMapping("/services/{serviceId}/reviews")
    public ResponseEntity<List<ServiceReviewResponse>> getReviewsByService(@PathVariable Long serviceId) {
        return ResponseEntity.ok(reviewService.getReviewsByService(serviceId));
    }

    @Operation(summary = "Xem tất cả đánh giá (dành cho Admin / Quản trị)")
    @GetMapping("/reviews")
    public ResponseEntity<List<ServiceReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }
}
