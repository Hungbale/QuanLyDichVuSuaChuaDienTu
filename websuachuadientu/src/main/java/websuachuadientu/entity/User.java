package websuachuadientu.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    // Vẫn giữ role ở đây - đây là nơi DUY NHẤT lưu role để phân quyền login
    @Column(nullable = false)
    private String role = "CUSTOMER"; // CUSTOMER hoặc EMPLOYEE
}