package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RepairTicketActivity;

import java.util.List;

public interface RepairTicketActivityRepository extends JpaRepository<RepairTicketActivity, Long> {
    List<RepairTicketActivity> findByRepairTicket_IdOrderByCreatedAtAscIdAsc(Long ticketId);
}
