package websuachuadientu.security;

import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    public void blacklist(String jti, Date expiration) {
        if (jti == null || expiration == null) {
            return;
        }
        cleanup();
        blacklist.put(jti, expiration.getTime());
    }

    public boolean isBlacklisted(String jti) {
        if (jti == null) {
            return false;
        }
        cleanup();
        Long expiry = blacklist.get(jti);
        if (expiry == null) {
            return false;
        }
        if (expiry < System.currentTimeMillis()) {
            blacklist.remove(jti);
            return false;
        }
        return true;
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        blacklist.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}
