package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "warranty_requests")
@Getter
@Setter
public class WarrantyRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_ticket_id", nullable = false)
    private RepairTicket repairTicket;

    @Column(nullable = false, length = 2000)
    private String reason; // Nội dung lỗi cần bảo hành

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String attachmentFileName;

    @Column(length = 100)
    private String attachmentContentType;

    @Lob
    @Column(columnDefinition = "MEDIUMBLOB")
    private byte[] attachmentData;

    @Column(nullable = false, length = 50)
    private String status; // PENDING, APPROVED, REJECTED, COMPLETED

    @Column(columnDefinition = "TEXT")
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_employee_id")
    private Employee processedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime processedAt;
}
