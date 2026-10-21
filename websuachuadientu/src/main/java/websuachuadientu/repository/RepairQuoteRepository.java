package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairQuote;

import java.util.Optional;

public interface RepairQuoteRepository extends JpaRepository<RepairQuote, Long> {
    Optional<RepairQuote> findByRepairTicket_Id(Long repairTicketId);
    boolean existsByRepairTicket_Id(Long repairTicketId);
}
