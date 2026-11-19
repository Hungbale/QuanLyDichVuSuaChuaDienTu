package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "repair_intake_receipts")
@Getter
@Setter
public class RepairIntakeReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_ticket_id", nullable = false, unique = true)
    private RepairTicket repairTicket;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id")
    private Employee receivedBy;

    @Column(length = 100)
    private String serialNumber;

    @Column(nullable = false, length = 2000)
    private String appearanceCondition;

    @Column(length = 2000)
    private String includedAccessories;

    @Column(length = 5000)
    private String customerReportedIssue;

    @Column(length = 2000)
    private String intakeNote;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @OneToMany(mappedBy = "intakeReceipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RepairIntakePhoto> photos = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
    }
}
