package com.water.water.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class WaterUsageRequest {
    @NotNull(message = "Household ID is required")
    private Long householdId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @Min(value = 0, message = "Meter reading cannot be negative")
    private double readingLiters;
}