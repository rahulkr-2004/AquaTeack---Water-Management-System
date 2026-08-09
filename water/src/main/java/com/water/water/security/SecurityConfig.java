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
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Allow all CORS preflight OPTIONS requests without auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/auth/**").permitAll()

                        // All admin endpoints — both Super Admin & Community Admin
                        .requestMatchers("/api/admin/**")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_COMMUNITY_ADMIN", "ADMIN", "COMMUNITY_ADMIN")

                        // Tariff plans endpoints
                        .requestMatchers("/api/tariffs/list")
                            .hasAnyAuthority("ROLE_USER", "ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "USER", "COMMUNITY_ADMIN", "ADMIN")
                        .requestMatchers("/api/tariffs/**")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_COMMUNITY_ADMIN", "ADMIN", "COMMUNITY_ADMIN")

                        // Billing endpoints
                        .requestMatchers("/api/billing/bills", "/api/billing/pay/**", "/api/billing/bill/*/pdf")
                            .hasAnyAuthority("ROLE_USER", "ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "USER", "COMMUNITY_ADMIN", "ADMIN")
                        // Finalize and delete handled by controller auth check
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/billing/cycle/**")
                            .authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/billing/cycle/**")
                            .authenticated()
                        .requestMatchers("/api/billing/**")
                            .hasAnyAuthority("ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "COMMUNITY_ADMIN", "ADMIN")

                        // Water purchases endpoints
                        .requestMatchers("/api/purchases/**")
                            .hasAnyAuthority("ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "COMMUNITY_ADMIN", "ADMIN")

                        // System alerts endpoints
                        .requestMatchers("/api/alerts/**")
                            .hasAnyAuthority("ROLE_USER", "ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "USER", "COMMUNITY_ADMIN", "ADMIN")

                        // Leak Scan endpoints
                        .requestMatchers("/api/leak-scan/**")
                            .hasAnyAuthority("ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "COMMUNITY_ADMIN", "ADMIN")

                        // Reports endpoints
                        .requestMatchers("/api/reports/seed-demo-data").permitAll()
                        .requestMatchers("/api/reports/**").authenticated()

                        // Residents and Admins can log water usage
                        .requestMatchers("/api/usage/**")
                            .hasAnyAuthority("ROLE_USER", "ROLE_COMMUNITY_ADMIN", "ROLE_ADMIN", "USER", "COMMUNITY_ADMIN", "ADMIN")

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

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOriginPatterns(java.util.Arrays.asList("*"));
        configuration.setAllowedMethods(java.util.Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(java.util.Arrays.asList("*"));
        configuration.setExposedHeaders(java.util.Arrays.asList("Content-Disposition", "content-disposition"));
        configuration.setAllowCredentials(true);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}