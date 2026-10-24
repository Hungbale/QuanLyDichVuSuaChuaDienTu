package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.RevokedToken;

import java.util.Date;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {
    boolean existsByIdAndExpiresAtAfter(String id, Date now);
    void deleteByExpiresAtBefore(Date now);
}
