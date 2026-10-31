package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "repair_final_inspections")
@Getter
@Setter
public class RepairFinalInspection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_ticket_id", nullable = false, unique = true)
    private RepairTicket repairTicket;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id")
    private Employee inspectedBy;

    @Column(nullable = false)
    private boolean deviceWorksNormally;

    @Column(nullable = false)
    private boolean mainFunctionsWork;

    @Column(nullable = false)
    private boolean noNewIssues;

    @Column(length = 5000)
    private String completionInfo;

    @Column(nullable = false)
    private LocalDateTime inspectedAt;

    private LocalDateTime completedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        inspectedAt = LocalDateTime.now();
    }
}
