package com.sevacare.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Utility class for generating, signing, decoding, and validating JSON Web Tokens (JWT).
 */
@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long jwtExpirationSeconds;
    private final String issuer;

    public JwtTokenProvider(
            @Value("${jwt.secret:sevacare-jwt-super-secret-key-2026-production-hmac-sha256-minimum-256-bits}") String secret,
            @Value("${jwt.expiration.seconds:86400}") long jwtExpirationSeconds,
            @Value("${jwt.issuer:sevacare-security-service}") String issuer) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.jwtExpirationSeconds = jwtExpirationSeconds;
        this.issuer = issuer;
    }

    public long getExpirationInSeconds() {
        return this.jwtExpirationSeconds;
    }

    /**
     * Generate a signed JWT token containing the verified user details and authorities.
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + (jwtExpirationSeconds * 1000));

        String roleName = user.getRole().name();
        String springAuthority = "ROLE_" + roleName;

        return Jwts.builder()
                .subject(user.getPhone())
                .issuer(issuer)
                .audience().add("sevacare-app").and()
                .issuedAt(now)
                .expiration(expiryDate)
                .claim("phone", user.getPhone())
                .claim("name", user.getName())
                .claim("role", roleName)
                .claim("authorities", List.of(springAuthority))
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Validate the cryptographic signature and expiration of a JWT token.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getPhoneFromToken(String token) {
        return getClaimsFromToken(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return (String) getClaimsFromToken(token).get("role");
    }

    @SuppressWarnings("unchecked")
    public List<GrantedAuthority> getAuthoritiesFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        List<String> authorities = (List<String>) claims.get("authorities");
        if (authorities == null || authorities.isEmpty()) {
            String role = (String) claims.get("role");
            return List.of(new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "PATIENT")));
        }
        return authorities.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }
}
