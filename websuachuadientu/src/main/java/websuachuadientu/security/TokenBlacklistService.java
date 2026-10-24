package websuachuadientu.security;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.entity.RevokedToken;
import websuachuadientu.repository.RevokedTokenRepository;

import java.util.Date;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {
    private final RevokedTokenRepository repository;

    @Transactional
    public void blacklist(String jti, Date expiration) {
        if (jti == null || expiration == null) {
            return;
        }
        Date now = new Date();
        repository.deleteByExpiresAtBefore(now);
        if (expiration.after(now)) {
            RevokedToken token = new RevokedToken();
            token.setId(jti);
            token.setExpiresAt(expiration);
            repository.save(token);
        }
    }

    public boolean isBlacklisted(String jti) {
        return jti != null && repository.existsByIdAndExpiresAtAfter(jti, new Date());
    }
}
