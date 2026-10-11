package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "employees")
@Getter
@Setter
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết tới tài khoản đăng nhập - MỖI Employee ứng với đúng 1 User
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true)
    private String employeeCode;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String phone;

    // Đã XÓA field role - dùng chung role bên User, tránh trùng lặp/lệch dữ liệu

    @Column(nullable = false)
    private String status = "ACTIVE";
}