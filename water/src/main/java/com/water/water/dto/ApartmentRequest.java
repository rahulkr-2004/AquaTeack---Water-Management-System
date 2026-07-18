package com.water.water.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApartmentRequest {
    @NotBlank(message = "Apartment name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;
}