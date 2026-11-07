package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import websuachuadientu.entity.WarrantyRequest;

import java.util.List;

@Repository
public interface WarrantyRequestRepository extends JpaRepository<WarrantyRequest, Long> {
    List<WarrantyRequest> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);
    List<WarrantyRequest> findByRepairTicket_IdOrderByCreatedAtDesc(Long repairTicketId);
    List<WarrantyRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<WarrantyRequest> findAllByOrderByCreatedAtDesc();
    List<WarrantyRequest> findByRepairTicket_Technician_IdOrderByCreatedAtDesc(Long technicianId);
    List<WarrantyRequest> findByRepairTicket_Technician_IdAndStatusOrderByCreatedAtDesc(Long technicianId, String status);
}
