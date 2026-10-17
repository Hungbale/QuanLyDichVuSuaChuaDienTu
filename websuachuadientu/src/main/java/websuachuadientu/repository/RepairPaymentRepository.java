package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairPayment;

import java.util.List;

public interface RepairPaymentRepository extends JpaRepository<RepairPayment, Long> {
    List<RepairPayment> findByQuote_RepairTicket_IdOrderByCreatedAtDesc(Long ticketId);
}
