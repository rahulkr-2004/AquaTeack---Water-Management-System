package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import com.water.water.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leak-scan")
public class LeakScanController {

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping("/scan")
    public ResponseEntity<?> runLeakScan(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        Role role = currentUser.getRole();
        if (role != Role.ROLE_ADMIN && role != Role.ROLE_COMMUNITY_ADMIN) {
            return ResponseEntity.status(403).body("Access denied. Leak Scan is only for Admins.");
        }

        List<Household> households;
        if (role == Role.ROLE_COMMUNITY_ADMIN) {
            if (currentUser.getManagedApartment() == null) {
                return ResponseEntity.ok(Map.of(
                    "scannedHouseholdsCount", 0,
                    "suspectedLeaksCount", 0,
                    "totalWaterLossLitersPerDay", 0,
                    "totalFinancialLossEst", 0,
                    "lastScanTimestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                    "leaks", Collections.emptyList()
                ));
            }
            Long aptId = currentUser.getManagedApartment().getId();
            households = householdRepository.findAll().stream()
                .filter(h -> h.getApartment() != null && h.getApartment().getId().equals(aptId))
                .collect(Collectors.toList());
        } else {
            households = householdRepository.findAll();
        }

        List<Map<String, Object>> leakSuspects = new ArrayList<>();
        double totalLossLiters = 0;
        double totalCostLoss = 0;
        int scannedCount = households.size();

        List<SystemAlert> existingAlerts = systemAlertRepository.findAll();

        for (Household hh : households) {
            List<WaterUsageLog> logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(hh.getId());
            if (logs.isEmpty()) continue;

            WaterUsageLog latestLog = logs.get(0);
            double latestConsumption = latestLog.getConsumptionLiters();

            // Calculate baseline average over historical logs
            double sum = 0;
            int count = 0;
            for (int i = 0; i < Math.min(logs.size(), 14); i++) {
                sum += logs.get(i).getConsumptionLiters();
                count++;
            }
            double baselineAverage = count > 0 ? sum / count : 150.0;
            if (baselineAverage < 50.0) baselineAverage = 150.0;

            // Standard deviation calculation
            double varianceSum = 0;
            for (int i = 0; i < Math.min(logs.size(), 14); i++) {
                varianceSum += Math.pow(logs.get(i).getConsumptionLiters() - baselineAverage, 2);
            }
            double sigma = count > 1 ? Math.sqrt(varianceSum / count) : 40.0;
            if (sigma < 20.0) sigma = 20.0;

            double deviationLiters = latestConsumption - baselineAverage;
            double deviationPercent = baselineAverage > 0 ? (deviationLiters / baselineAverage) * 100.0 : 0.0;
            double zScore = sigma > 0 ? (latestConsumption - baselineAverage) / sigma : 0.0;

            boolean isLeak = false;
            String riskLevel = "NORMAL";
            String leakType = "Normal Flow";
            String recommendation = "No leak detected. Meter reading matches historical patterns.";

            if (latestConsumption > 800.0 || zScore > 3.0) {
                isLeak = true;
                riskLevel = "CRITICAL";
                leakType = "Major Pipe Burst / Main Supply Surge";
                recommendation = "Inspect main supply lines and immediate isolation valves. High continuous loss detected.";
            } else if (latestConsumption > 500.0 || zScore > 2.0 || latestLog.isAnomaly()) {
                isLeak = true;
                riskLevel = "HIGH";
                leakType = "Abnormal Daily Consumption Spike";
                recommendation = "Check for open outdoor taps, running flush valves, or underground line leaks.";
            } else if (latestConsumption > 350.0 && latestConsumption > baselineAverage * 1.6) {
                isLeak = true;
                riskLevel = "WARNING";
                leakType = "Continuous Baseline Drift";
                recommendation = "Check internal plumbing fixtures, dripping faucets, or toilet tank seals.";
            }

            if (isLeak) {
                double lossLitersPerDay = Math.max(100.0, Math.round(latestConsumption - baselineAverage));
                double monthlyEstCost = Math.round(lossLitersPerDay * 0.08 * 30);

                totalLossLiters += lossLitersPerDay;
                totalCostLoss += monthlyEstCost;

                User resident = userRepository.findByHouseholdId(hh.getId()).stream()
                    .filter(u -> u.getRole() == Role.ROLE_USER)
                    .findFirst().orElse(null);

                Optional<SystemAlert> alertOpt = existingAlerts.stream()
                    .filter(a -> "LEAK".equalsIgnoreCase(a.getType()) && a.getHousehold() != null && a.getHousehold().getId().equals(hh.getId()))
                    .findFirst();

                Map<String, Object> suspect = new HashMap<>();
                suspect.put("householdId", hh.getId());
                suspect.put("flatNumber", hh.getFlatNumber() != null ? hh.getFlatNumber() : "N/A");
                suspect.put("block", hh.getBlock() != null ? hh.getBlock() : "A");
                suspect.put("apartmentId", hh.getApartment() != null ? hh.getApartment().getId() : null);
                suspect.put("apartmentName", hh.getApartment() != null ? hh.getApartment().getName() : "Main Complex");
                suspect.put("residentName", resident != null ? resident.getName() : "Unassigned Resident");
                suspect.put("residentEmail", resident != null ? resident.getEmail() : "N/A");
                suspect.put("residentPhone", resident != null && resident.getMobileNo() != null ? resident.getMobileNo() : "N/A");
                suspect.put("latestReading", latestLog.getReadingLiters());
                suspect.put("latestConsumption", Math.round(latestConsumption));
                suspect.put("baselineAverage", Math.round(baselineAverage));
                suspect.put("deviationPercentage", Math.round(deviationPercent));
                suspect.put("zScore", Math.round(zScore * 10.0) / 10.0);
                suspect.put("riskLevel", riskLevel);
                suspect.put("leakType", leakType);
                suspect.put("recommendation", recommendation);
                suspect.put("estimatedLossLitersPerDay", lossLitersPerDay);
                suspect.put("estimatedMonthlyCost", monthlyEstCost);
                suspect.put("detectedDate", latestLog.getDate().toString());
                suspect.put("alertIssued", alertOpt.isPresent());
                suspect.put("alertId", alertOpt.map(a -> a.getId()).orElse(null));

                leakSuspects.add(suspect);
            }
        }

        leakSuspects.sort((a, b) -> {
            int rankA = "CRITICAL".equals(a.get("riskLevel")) ? 3 : "HIGH".equals(a.get("riskLevel")) ? 2 : 1;
            int rankB = "CRITICAL".equals(b.get("riskLevel")) ? 3 : "HIGH".equals(b.get("riskLevel")) ? 2 : 1;
            return Integer.compare(rankB, rankA);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("scannedHouseholdsCount", scannedCount);
        response.put("suspectedLeaksCount", leakSuspects.size());
        response.put("totalWaterLossLitersPerDay", Math.round(totalLossLiters));
        response.put("totalFinancialLossEst", Math.round(totalCostLoss));
        response.put("lastScanTimestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        response.put("leaks", leakSuspects);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/notify")
    public ResponseEntity<?> issueLeakNotification(@RequestBody Map<String, Object> body, Authentication authentication) {
        try {
            if (authentication == null) return ResponseEntity.status(401).body("Not authenticated");
            Long householdId = Long.valueOf(body.get("householdId").toString());
            String leakType = body.containsKey("leakType") ? body.get("leakType").toString() : "Abnormal Water Usage";
            String customMsg = body.containsKey("message") ? body.get("message").toString() : "";

            Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household not found"));

            User resident = userRepository.findByHouseholdId(householdId).stream()
                .filter(u -> u.getRole() == Role.ROLE_USER)
                .findFirst().orElse(null);

            String title = "🚨 URGENT: Water Leak Detected (" + household.getFlatNumber() + ")";
            String message = customMsg.isEmpty()
                ? "AquaTrack Leak Scanner detected potential leakage (" + leakType + ") in Flat " + household.getFlatNumber() + ". Please inspect faucets and valves immediately."
                : customMsg;

            SystemAlert alert = new SystemAlert();
            alert.setHousehold(household);
            alert.setTargetUser(resident);
            alert.setTitle(title);
            alert.setMessage(message);
            alert.setType("LEAK");
            alert.setDate(LocalDate.now());
            alert.setResolved(false);

            SystemAlert savedAlert = systemAlertRepository.save(alert);

            if (resident != null && resident.getEmail() != null) {
                emailService.sendEmail(resident.getEmail(), "AquaTrack Urgent Leak Warning: Flat " + household.getFlatNumber(), message);
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Leak notification sent to resident of Flat " + household.getFlatNumber(),
                "alertId", savedAlert.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to issue leak alert: " + e.getMessage());
        }
    }

    @PostMapping("/resolve/{householdId}")
    public ResponseEntity<?> resolveLeakAlert(@PathVariable Long householdId, Authentication authentication) {
        try {
            if (authentication == null) return ResponseEntity.status(401).body("Not authenticated");

            List<SystemAlert> alerts = systemAlertRepository.findAll().stream()
                .filter(a -> "LEAK".equalsIgnoreCase(a.getType()) && a.getHousehold() != null && a.getHousehold().getId().equals(householdId))
                .collect(Collectors.toList());

            if (alerts.isEmpty()) {
                return ResponseEntity.ok(Map.of("message", "No active leak alerts found for household ID " + householdId));
            }

            User adminUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            for (SystemAlert alert : alerts) {
                if (adminUser != null) {
                    alert.getReadByUsers().add(adminUser);
                }
                alert.setResolved(true);
            }
            systemAlertRepository.saveAll(alerts);

            return ResponseEntity.ok(Map.of("success", true, "message", "Leak alerts marked as resolved for household ID " + householdId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error resolving leak: " + e.getMessage());
        }
    }
}
