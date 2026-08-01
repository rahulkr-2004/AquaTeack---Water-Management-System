package com.water.water.security;

import com.water.water.model.User;
import com.water.water.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Supports dual-login: the "username" field from Spring Security is
     * used as-is to look up the user by EITHER their email OR their username.
     * The JWT subject is always stored as the user's EMAIL to keep auth consistent.
     */
    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // Try email first, then fall back to username handle
        User user = userRepository.findByEmailOrUsername(identifier)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email or username: " + identifier));

        java.util.List<org.springframework.security.core.GrantedAuthority> authorities = new java.util.ArrayList<>();
        String roleStr = user.getRole().name();
        authorities.add(new SimpleGrantedAuthority(roleStr));
        if (roleStr.startsWith("ROLE_")) {
            authorities.add(new SimpleGrantedAuthority(roleStr.substring(5)));
        } else {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleStr));
        }

        System.out.println("[AUTH] Loading user: " + user.getEmail() + " | authorities: " + authorities);

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}