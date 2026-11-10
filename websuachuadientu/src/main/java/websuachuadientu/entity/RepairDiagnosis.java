package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "repair_diagnoses")
@Getter
@Setter
public class RepairDiagnosis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repair_ticket_id", nullable = false, unique = true)
    private RepairTicket repairTicket;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id")
    private Employee diagnosedBy;

    @Column(nullable = false, length = 5000)
    private String diagnosisResult;

    @Column(nullable = false, length = 5000)
    private String repairProposal;

    @Column(length = 2000)
    private String technicalNote;

    @Column(nullable = false)
    private LocalDateTime diagnosedAt;

    @PrePersist
    void onCreate() {
        if (diagnosedAt == null) {
            diagnosedAt = LocalDateTime.now();
        }
    }
}
