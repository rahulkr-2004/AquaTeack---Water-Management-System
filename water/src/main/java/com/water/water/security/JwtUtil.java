package com.water.water.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    private Key signingKey;

    @PostConstruct
    public void init() {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // Set token expiration time (10 hours for this project)
    private final long JWT_TOKEN_VALIDITY = 1000 * 60 * 60 * 10;

    // Pulls the user's email (username) out of the token
    public String extractUsername(String token) {
        return extractClaim(token, claims -> claims.getSubject());
    }

    // Checks when the token expires
    public Date extractExpiration(String token) {
        return extractClaim(token, claims -> claims.getExpiration());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Called when a user successfully logs in to give them a token
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        String role = userDetails.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");
        claims.put("roles", role);
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + JWT_TOKEN_VALIDITY))
                .signWith(signingKey)
                .compact();
    }

    // Validates the token to ensure nobody tampered with it
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}