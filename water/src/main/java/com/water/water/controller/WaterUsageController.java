package com.water.water.controller;

import com.water.water.dto.WaterUsageRequest;
import com.water.water.model.WaterUsageLog;
import com.water.water.service.WaterUsageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/usage")
public class WaterUsageController {

    @Autowired
    private WaterUsageService waterUsageService;

    // --- 1. Single Entry Endpoint ---
    @PostMapping("/log")
    public ResponseEntity<?> logUsage(@Valid @RequestBody WaterUsageRequest request) {
        try {
            WaterUsageLog log = waterUsageService.logWaterUsage(request);
            return ResponseEntity.ok(log);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 2. Bulk Upload Endpoint ---
    @PostMapping("/bulk-upload")
    public ResponseEntity<?> uploadBulkUsage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a valid CSV file to upload.");
        }

        try {
            List<WaterUsageLog> savedLogs = waterUsageService.processBulkCsvUpload(file);
            if (savedLogs.isEmpty()) {
                return ResponseEntity.badRequest().body("Upload processed but 0 records were saved. Please ensure your CSV matches the exact format and Household IDs exist in the system.");
            }
            return ResponseEntity.ok("Successfully processed and saved " + savedLogs.size() + " records.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 3. Get Logs (filtered by authorization) ---
    @GetMapping("/logs")
    public ResponseEntity<?> getLogs(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");

        return ResponseEntity.ok(waterUsageService.getLogsForUser(email, role));
    }

    // --- 4. Get Apartment Average (for comparison view) ---
    @GetMapping("/apartment-average")
    public ResponseEntity<?> getApartmentAverage(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        return ResponseEntity.ok(java.util.Collections.singletonMap("average", waterUsageService.getApartmentAverage(email)));
    }

    // --- 5. Get Similar-Sized Household Average ---
    @GetMapping("/similar-average")
    public ResponseEntity<?> getSimilarSizedHouseholdAverage(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        return ResponseEntity.ok(java.util.Collections.singletonMap("average", waterUsageService.getSimilarSizedHouseholdAverage(email)));
    }
}