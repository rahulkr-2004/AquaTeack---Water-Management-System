package com.water.water.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()

                        // Shared admin endpoints (both Super Admin & Community Admin)
                        .requestMatchers(
                                "/api/admin/apartments",
                                "/api/admin/households",
                                "/api/admin/users",
                                "/api/admin/pending-approvals",
                                "/api/admin/approve-user/**",
                                "/api/admin/reject-user/**",
                                "/api/admin/delete-user/**",
                                "/api/admin/create-user",
                                "/api/admin/update-user/**",
                                "/api/admin/assign-resident",
                                "/api/admin/household",
                                "/api/admin/invite-resident"
                        ).hasAnyRole("ADMIN", "COMMUNITY_ADMIN")

                        // Super Admin only endpoints
                        .requestMatchers(
                                "/api/admin/assign-managed-admin"
                        ).hasRole("ADMIN")

                        // Infrastructure administration write endpoints
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Tariff plans endpoints
                        .requestMatchers("/api/tariffs/list").hasAnyRole("USER", "COMMUNITY_ADMIN", "ADMIN")
                        .requestMatchers("/api/tariffs/**").hasRole("ADMIN")

                        // Billing endpoints
                        .requestMatchers("/api/billing/bills", "/api/billing/pay/**", "/api/billing/bill/*/pdf").hasAnyRole("USER", "COMMUNITY_ADMIN", "ADMIN")
                        .requestMatchers("/api/billing/admin-bill").hasRole("ADMIN")
                        .requestMatchers("/api/billing/**").hasAnyRole("COMMUNITY_ADMIN", "ADMIN")

                        // Water purchases endpoints
                        .requestMatchers("/api/purchases/**").hasAnyRole("COMMUNITY_ADMIN", "ADMIN")

                        // System alerts endpoints
                        .requestMatchers("/api/alerts/**").hasAnyRole("USER", "COMMUNITY_ADMIN", "ADMIN")

                        // Reports endpoints
                        .requestMatchers("/api/reports/**").hasAnyRole("COMMUNITY_ADMIN", "ADMIN")

                        // Residents and Admins can log water usage
                        .requestMatchers("/api/usage/**").hasAnyRole("USER", "COMMUNITY_ADMIN", "ADMIN")

                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}