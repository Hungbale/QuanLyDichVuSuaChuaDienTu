package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairFinalInspection;

import java.util.Optional;

public interface RepairFinalInspectionRepository extends JpaRepository<RepairFinalInspection, Long> {
    Optional<RepairFinalInspection> findByRepairTicket_Id(Long ticketId);
}
