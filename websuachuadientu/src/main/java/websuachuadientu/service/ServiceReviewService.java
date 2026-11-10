package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.ServiceReviewRequest;
import websuachuadientu.dto.ServiceReviewResponse;
import websuachuadientu.entity.Customer;
import websuachuadientu.entity.RepairTicket;
import websuachuadientu.entity.ServiceReview;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.ServiceReviewRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceReviewService {

    private final ServiceReviewRepository reviewRepository;
    private final RepairTicketRepository ticketRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public ServiceReviewResponse createReview(Long ticketId, ServiceReviewRequest request, String customerEmail) {
        Customer customer = customerRepository.findByUser_Email(customerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin khách hàng"));

        RepairTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sửa chữa"));

        if (!ticket.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền đánh giá phiếu sửa chữa của người khác");
        }

        if (!RepairTicketStatus.COMPLETED.storedValue().equalsIgnoreCase(ticket.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể đánh giá dịch vụ sau khi phiếu sửa chữa đã hoàn thành");
        }

        if (reviewRepository.existsByRepairTicket_Id(ticketId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiếu sửa chữa này đã được đánh giá");
        }

        ServiceReview review = new ServiceReview();
        review.setCustomer(customer);
        review.setRepairTicket(ticket);
        review.setRating(request.rating());
        review.setComment(request.comment() != null ? request.comment().trim() : null);
        review.setCreatedAt(LocalDateTime.now());

        review = reviewRepository.save(review);
        return mapToResponse(review);
    }

    public ServiceReviewResponse getByTicketId(Long ticketId) {
        ServiceReview review = reviewRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có đánh giá cho phiếu sửa chữa này"));
        return mapToResponse(review);
    }

    public List<ServiceReviewResponse> getReviewsByCustomer(String customerEmail) {
        Customer customer = customerRepository.findByUser_Email(customerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin khách hàng"));
        return reviewRepository.findByCustomer_IdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<ServiceReviewResponse> getReviewsByService(Long serviceId) {
        return reviewRepository.findByRepairTicket_Service_IdOrderByCreatedAtDesc(serviceId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<ServiceReviewResponse> getAllReviews() {
        return reviewRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ServiceReviewResponse mapToResponse(ServiceReview review) {
        RepairTicket ticket = review.getRepairTicket();
        Customer customer = review.getCustomer();
        return new ServiceReviewResponse(
                review.getId(),
                ticket != null ? ticket.getId() : null,
                ticket != null ? ticket.getTicketCode() : null,
                (ticket != null && ticket.getService() != null) ? ticket.getService().getName() : null,
                customer != null ? customer.getId() : null,
                customer != null ? customer.getFullName() : null,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
