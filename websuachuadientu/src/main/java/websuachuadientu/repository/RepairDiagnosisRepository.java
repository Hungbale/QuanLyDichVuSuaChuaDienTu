package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairDiagnosis;

import java.util.Optional;

public interface RepairDiagnosisRepository extends JpaRepository<RepairDiagnosis, Long> {
    Optional<RepairDiagnosis> findByRepairTicket_Id(Long ticketId);
}
