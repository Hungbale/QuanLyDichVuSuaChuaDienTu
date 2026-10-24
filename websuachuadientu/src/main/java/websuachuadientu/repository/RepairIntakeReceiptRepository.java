package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairIntakeReceipt;

import java.util.Optional;

public interface RepairIntakeReceiptRepository extends JpaRepository<RepairIntakeReceipt, Long> {
    boolean existsByRepairTicket_Id(Long ticketId);
    Optional<RepairIntakeReceipt> findByRepairTicket_Id(Long ticketId);
}
