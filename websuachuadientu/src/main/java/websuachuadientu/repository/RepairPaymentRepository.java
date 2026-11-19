package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairPayment;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepairPaymentRepository extends JpaRepository<RepairPayment, Long> {
    @Query("""
            select coalesce(sum(p.amount), 0)
            from RepairPayment p
            where upper(p.status) = 'PAID'
              and p.paidAt >= :fromDateTime
              and p.paidAt < :toDateTimeExclusive
            """)
    BigDecimal sumPaidAmountBetween(@Param("fromDateTime") LocalDateTime fromDateTime,
                                    @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive);

    List<RepairPayment> findByQuote_RepairTicket_IdOrderByCreatedAtDesc(Long ticketId);

    boolean existsByQuote_Id(Long quoteId);
}
