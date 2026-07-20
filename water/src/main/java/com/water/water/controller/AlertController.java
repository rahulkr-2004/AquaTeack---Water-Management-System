package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @GetMapping
    public ResponseEntity<?> getAlerts(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        List<SystemAlert> alerts = new ArrayList<>();

        List<SystemAlert> dbAlerts = systemAlertRepository.findAll();

        // 2. Scan water usage logs for dynamic leaks (> 500 liters spike in a single day)
        List<WaterUsageLog> logs;
        if (user.getRole() == Role.ROLE_USER) {
            if (user.getHousehold() != null) {
                logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(user.getHousehold().getId());
            } else {
                logs = new ArrayList<>();
            }
        } else {
            logs = waterUsageLogRepository.findAll();
        }

        for (WaterUsageLog log : logs) {
            if (log.getConsumptionLiters() > 500.0) {
                // Check if this leak alert already exists in DB
                boolean exists = dbAlerts.stream().anyMatch(a -> 
                    "LEAK".equals(a.getType()) && 
                    a.getDate().equals(log.getDate()) && 
                    a.getHousehold() != null && log.getHousehold() != null &&
                    a.getHousehold().getId().equals(log.getHousehold().getId())
                );
                
                if (!exists) {
                    SystemAlert leakAlert = new SystemAlert();
                    leakAlert.setHousehold(log.getHousehold());
                    leakAlert.setTitle("High Consumption Warning");
                    leakAlert.setMessage("Flat " + (log.getHousehold() != null ? log.getHousehold().getFlatNumber() : "?") +
                            " consumed " + Math.round(log.getConsumptionLiters()) + " liters on " + log.getDate() + 
                            ", which exceeds the abnormal usage threshold of 500L/day. Check for open taps or pipe leaks.");
                    leakAlert.setDate(log.getDate());
                    leakAlert.setType("LEAK");
                    leakAlert.setResolved(false);
                    
                    systemAlertRepository.save(leakAlert);
                    dbAlerts.add(leakAlert);
                }
            }
        }

        for (SystemAlert alert : dbAlerts) {
            if (alert.getClearedByUsers().contains(user)) {
                continue;
            }
            boolean shouldAdd = false;
            if (user.getRole() == Role.ROLE_USER) {
                if ("REGISTRATION".equalsIgnoreCase(alert.getType())) {
                    shouldAdd = false;
                } else if (alert.getTargetUser() != null && alert.getTargetUser().getId().equals(user.getId())) {
                    shouldAdd = true;
                } else if (alert.getHousehold() != null && user.getHousehold() != null && alert.getHousehold().getId().equals(user.getHousehold().getId())) {
                    shouldAdd = true;
                } else if (alert.getHousehold() == null && alert.getTargetUser() == null) {
                    String type = alert.getType();
                    if ("BROADCAST".equalsIgnoreCase(type) || "MAINTENANCE".equalsIgnoreCase(type) || "GENERAL".equalsIgnoreCase(type) || "INFO".equalsIgnoreCase(type)) {
                        shouldAdd = true;
                    }
                }
            } else {
                // Admins see all their targeted alerts + all other general/household alerts
                if (alert.getTargetUser() != null && !alert.getTargetUser().getId().equals(user.getId())) {
                    shouldAdd = false;
                } else {
                    shouldAdd = true;
                }
            }
            if (shouldAdd) {
                alert.setResolved(alert.getReadByUsers().contains(user));
                alerts.add(alert);
            }
        }

        alerts.sort((a, b) -> Long.compare(b.getId(), a.getId()));

        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/create")
    public ResponseEntity<?> createAlert(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            String title = request.get("title").toString();
            String message = request.get("message").toString();
            String type = request.get("type").toString();
            Long householdId = request.containsKey("householdId") && request.get("householdId") != null
                    ? Long.valueOf(request.get("householdId").toString())
                    : null;

            SystemAlert alert = new SystemAlert();
            alert.setTitle(title);
            alert.setMessage(message);
            alert.setType(type);
            alert.setDate(LocalDate.now());
            alert.setResolved(false);

            if (householdId != null) {
                Household household = householdRepository.findById(householdId)
                        .orElseThrow(() -> new IllegalArgumentException("Household not found"));
                alert.setHousehold(household);
            }

            return ResponseEntity.ok(systemAlertRepository.save(alert));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/resolve/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> resolveAlert(@PathVariable Long id, Authentication authentication) {
        try {
            SystemAlert alert = systemAlertRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Alert not found!"));
            if (authentication != null) {
                User user = userRepository.findByEmail(authentication.getName()).orElse(null);
                if (user != null) {
                    alert.getReadByUsers().add(user);
                    return ResponseEntity.ok(systemAlertRepository.save(alert));
                }
            }
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/clear-all")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> clearAllAlerts(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        List<SystemAlert> dbAlerts = systemAlertRepository.findAll();
        List<SystemAlert> toClear = new ArrayList<>();
        
        for (SystemAlert alert : dbAlerts) {
            boolean isTargetedAtUser = false;
            if (alert.getTargetUser() != null && alert.getTargetUser().getId().equals(user.getId())) {
                isTargetedAtUser = true;
            } else if (alert.getHousehold() != null && user.getHousehold() != null && alert.getHousehold().getId().equals(user.getHousehold().getId())) {
                isTargetedAtUser = true;
            } else if (alert.getHousehold() == null && alert.getTargetUser() == null) {
                // building-wide
                isTargetedAtUser = true;
            } else if (user.getRole() != Role.ROLE_USER) {
                // Admins clearing alerts they see (e.g., household alerts)
                if (alert.getTargetUser() == null) {
                    isTargetedAtUser = true;
                }
            }

            if (isTargetedAtUser) {
                alert.getClearedByUsers().add(user);
                toClear.add(alert);
            }
        }
        
        if (!toClear.isEmpty()) {
            systemAlertRepository.saveAll(toClear);
        }
        
        return ResponseEntity.ok(Map.of("message", "All alerts cleared"));
    }

    @PostMapping("/mark-all-read")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> markAllRead(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        List<SystemAlert> dbAlerts = systemAlertRepository.findAll();
        List<SystemAlert> toUpdate = new ArrayList<>();
        
        for (SystemAlert alert : dbAlerts) {
            boolean isTargetedAtUser = false;
            if (alert.getTargetUser() != null && alert.getTargetUser().getId().equals(user.getId())) {
                isTargetedAtUser = true;
            } else if (alert.getHousehold() != null && user.getHousehold() != null && alert.getHousehold().getId().equals(user.getHousehold().getId())) {
                isTargetedAtUser = true;
            } else if (alert.getHousehold() == null && alert.getTargetUser() == null) {
                isTargetedAtUser = true;
            } else if (user.getRole() != Role.ROLE_USER) {
                if (alert.getTargetUser() == null) {
                    isTargetedAtUser = true;
                }
            }

            if (isTargetedAtUser && !alert.getReadByUsers().contains(user)) {
                alert.getReadByUsers().add(user);
                toUpdate.add(alert);
            }
        }
        
        if (!toUpdate.isEmpty()) {
            systemAlertRepository.saveAll(toUpdate);
        }
        
        return ResponseEntity.ok(Map.of("message", "All alerts marked as read"));
    }
}
