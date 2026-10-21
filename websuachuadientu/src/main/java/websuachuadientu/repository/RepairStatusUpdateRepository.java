package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairStatusUpdate;

import java.util.List;

public interface RepairStatusUpdateRepository extends JpaRepository<RepairStatusUpdate, Long> {
    List<RepairStatusUpdate> findByRepairTicket_IdOrderByCreatedAtAsc(Long ticketId);
}
