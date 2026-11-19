package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import websuachuadientu.entity.ServiceReview;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ServiceReviewRepository extends JpaRepository<ServiceReview, Long> {
    Optional<ServiceReview> findByRepairTicket_Id(Long repairTicketId);

    boolean existsByRepairTicket_Id(Long ticketId);

    List<ServiceReview> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);

    List<ServiceReview> findByRepairTicket_Service_IdOrderByCreatedAtDesc(Long serviceId);

    List<ServiceReview> findAllByOrderByCreatedAtDesc();

    @Query("""
            select avg(r.rating) from ServiceReview r
            where r.createdAt >= :fromDateTime
              and r.createdAt < :toDateTimeExclusive
            """)
    Double averageRatingBetween(@Param("fromDateTime") LocalDateTime fromDateTime,
                                @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive);
}
