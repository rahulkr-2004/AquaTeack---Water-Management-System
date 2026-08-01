package com.water.water.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ColonyRequest {
    @NotBlank(message = "Colony name is required")
    private String name;

    private String address;

    // Optional list of building names to create inside this colony
    private List<String> buildings;
}
