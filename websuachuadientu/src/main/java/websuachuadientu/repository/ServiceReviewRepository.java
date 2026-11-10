package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import websuachuadientu.entity.ServiceReview;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceReviewRepository extends JpaRepository<ServiceReview, Long> {
    Optional<ServiceReview> findByRepairTicket_Id(Long repairTicketId);
    boolean existsByRepairTicket_Id(Long repairTicketId);
    List<ServiceReview> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);
    List<ServiceReview> findByRepairTicket_Service_IdOrderByCreatedAtDesc(Long serviceId);
    List<ServiceReview> findAllByOrderByCreatedAtDesc();
}
