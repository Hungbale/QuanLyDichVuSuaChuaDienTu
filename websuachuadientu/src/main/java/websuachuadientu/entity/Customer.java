package websuachuadientu.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customers")
@Getter
@Setter
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết tới tài khoản đăng nhập - MỖI Customer ứng với đúng 1 User
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true)
    private String customerCode;

    @Column(nullable = false)
    private String fullName;

    // Đã XÓA field email - lấy qua user.getEmail() thay vì lưu lặp lại

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private Integer repairCount = 0;

    @Column(nullable = false)
    private String status = "ACTIVE";
}