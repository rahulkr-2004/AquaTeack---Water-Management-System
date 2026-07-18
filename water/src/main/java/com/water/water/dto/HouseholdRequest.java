package com.water.water.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HouseholdRequest {
    @NotNull(message = "Apartment ID is required")
    private Long apartmentId;

    @NotBlank(message = "Block identifier is required")
    private String block;

    @NotBlank(message = "Flat number is required")
    private String flatNumber;

    private boolean hasMeter = true;
}