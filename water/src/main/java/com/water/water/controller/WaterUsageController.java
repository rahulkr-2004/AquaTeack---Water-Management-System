package com.water.water.controller;

import com.water.water.dto.WaterUsageRequest;
import com.water.water.model.WaterUsageLog;
import com.water.water.service.WaterUsageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
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

    // --- 3. Bulk Upload Template Download ---
    @GetMapping("/bulk-template")
    public ResponseEntity<?> downloadBulkTemplate(
            @RequestParam("startDate") String startDateStr,
            @RequestParam("endDate") String endDateStr,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }

        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");

        try {
            LocalDate startDate = LocalDate.parse(startDateStr);
            LocalDate endDate = LocalDate.parse(endDateStr);
            String csv = waterUsageService.generateBulkUploadTemplate(email, role, startDate, endDate);

            if (!csv.contains("\n") || csv.lines().count() <= 1) {
                return ResponseEntity.badRequest().body("No households with meters and assigned residents found for the selected period.");
            }

            String filename = "AquaTrack_Meter_Readings_Log_" + startDate + "_to_" + endDate + ".csv";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csv);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 4. Get Logs (filtered by authorization) ---
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

    // --- 5. Get Apartment Average (for comparison view) ---
    @GetMapping("/apartment-average")
    public ResponseEntity<?> getApartmentAverage(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        return ResponseEntity.ok(java.util.Collections.singletonMap("average", waterUsageService.getApartmentAverage(email)));
    }

    // --- 6. Get Similar-Sized Household Average ---
    @GetMapping("/similar-average")
    public ResponseEntity<?> getSimilarSizedHouseholdAverage(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        return ResponseEntity.ok(java.util.Collections.singletonMap("average", waterUsageService.getSimilarSizedHouseholdAverage(email)));
    }
    // --- 7. Recalculate Consumption (Fix Legacy Data) ---
    @PostMapping("/recalculate-consumption")
    public ResponseEntity<?> recalculateConsumption(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).body("Not authenticated");
        String role = authentication.getAuthorities().stream().map(a -> a.getAuthority()).findFirst().orElse("");
        if (!"ROLE_ADMIN".equals(role)) return ResponseEntity.status(403).body("Admin only");
        try {
            int fixed = waterUsageService.recalculateAllConsumption();
            return ResponseEntity.ok("Recalculated consumption for " + fixed + " logs.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // --- 8. Seed Meter Readings for User Harsh ---
    @PostMapping("/seed-harsh")
    public ResponseEntity<?> seedHarshReadings() {
        try {
            String result = waterUsageService.seedMeterReadingsForHarsh();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error seeding Harsh readings: " + e.getMessage());
        }
    }

    // --- 9. Real-Time Apartment Conservation Leaderboard Endpoint ---
    @GetMapping("/leaderboard")
    public ResponseEntity<?> getApartmentLeaderboard(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        return ResponseEntity.ok(waterUsageService.getApartmentLeaderboard(email));
    }
}
