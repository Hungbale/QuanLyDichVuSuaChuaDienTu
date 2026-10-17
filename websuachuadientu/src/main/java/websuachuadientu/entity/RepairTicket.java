package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "repair_tickets")
@Getter
@Setter
public class RepairTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String ticketCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false, length = 200)
    private String device;

    @Column(nullable = false)
    private LocalDate receivedDate;

    private LocalDate completedDate;

    @Column(nullable = false, length = 50)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private Employee technician;

    @OneToOne(mappedBy = "repairTicket", fetch = FetchType.LAZY)
    private RepairQuote quote;
}
