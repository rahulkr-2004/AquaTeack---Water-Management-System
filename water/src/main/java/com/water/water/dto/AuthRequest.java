package com.water.water.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthRequest {
    /**
     * Accepts either an email address OR a username handle.
     * The backend will try email first, then fall back to username.
     */
    @NotBlank(message = "Email or username is required")
    private String email; // Field name kept as "email" for backwards-compat with existing frontend calls

    @NotBlank(message = "Password is required")
    private String password;
}