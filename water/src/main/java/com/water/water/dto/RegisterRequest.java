package com.water.water.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Name is required")
    private String name;

    // Username: optional unique handle; if provided, must be alphanumeric+underscore
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Role is required")
    private String role; // "ROLE_ADMIN", "ROLE_COMMUNITY_ADMIN", or "ROLE_USER"

    private String gender;      // Optional: "Male", "Female", "Other"
    private String mobileNo;    // Optional: Indian 10-digit mobile
    private String whatsappNo;  // Optional: WhatsApp number

    // Community Admin colony/building assignment
    private Long colonyId;          // ID of the Apartment/Colony they wish to manage
    private Long buildingId;        // ID of the specific Building within that colony
    private String customBuildingName; // Optional proposed new building name
}