package com.water.water.controller;

import com.water.water.dto.ApartmentRequest;
import com.water.water.dto.ColonyRequest;
import com.water.water.dto.HouseholdRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Building;
import com.water.water.model.Household;
import com.water.water.model.User;
import com.water.water.service.OnboardingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class OnboardingController {

    @Autowired
    private OnboardingService onboardingService;

    // --- 0. Create Colony with Buildings (batch) --- Super Admin only
    @PostMapping("/colony")
    public ResponseEntity<?> createColony(@Valid @RequestBody ColonyRequest request, Authentication authentication) {
        boolean isSuperAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
        if (!isSuperAdmin) {
            return ResponseEntity.status(403).body("Error: Only Super Admin can create a colony.");
        }
        try {
            Apartment colony = onboardingService.createColonyWithBuildings(request);
            return ResponseEntity.ok(colony);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 0a. Add a Building to an existing Colony --- Admin/Community Admin
    @PostMapping("/colony/{colonyId}/building")
    public ResponseEntity<?> addBuildingToColony(@PathVariable Long colonyId, @RequestBody Map<String, String> request, Authentication authentication) {
        System.out.println("[ADD_BUILDING] Endpoint hit for colonyId: " + colonyId + " | request: " + request + " | auth: " + authentication);
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        boolean isAdminOrCommunityAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority())
                        || "ROLE_COMMUNITY_ADMIN".equals(a.getAuthority()) || "COMMUNITY_ADMIN".equals(a.getAuthority()));
        if (!isAdminOrCommunityAdmin) {
            System.out.println("[ADD_BUILDING] Access denied: User authorities: " + authentication.getAuthorities());
            return ResponseEntity.status(403).body("Error: Admin access required to add buildings.");
        }
        String buildingName = request.get("name");
        if (buildingName == null || buildingName.isBlank()) {
            return ResponseEntity.badRequest().body("Building name is required.");
        }
        try {
            Building b = onboardingService.addBuildingToColony(colonyId, buildingName.trim());
            System.out.println("[ADD_BUILDING] Successfully added building: " + b.getName() + " (ID: " + b.getId() + ")");
            return ResponseEntity.ok(b);
        } catch (IllegalArgumentException e) {
            System.out.println("[ADD_BUILDING] IllegalArgumentException: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("[ADD_BUILDING] Error Persisting Building: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error adding building: " + e.getMessage());
        }
    }

    // --- 0b. Get all buildings for a colony --- Admin/Community Admin
    @GetMapping("/colony/{colonyId}/buildings")
    public ResponseEntity<?> getBuildingsForColony(@PathVariable Long colonyId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        return ResponseEntity.ok(onboardingService.getBuildingsForColony(colonyId));
    }

    // --- 0c. Soft-delete a Building --- Admin/Community Admin
    @DeleteMapping("/building/{buildingId}")
    public ResponseEntity<?> deleteBuilding(@PathVariable Long buildingId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        boolean isAdminOrCommunityAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_COMMUNITY_ADMIN".equals(a.getAuthority()));
        if (!isAdminOrCommunityAdmin) {
            return ResponseEntity.status(403).body("Error: Admin access required to delete a building.");
        }
        try {
            onboardingService.softDeleteBuilding(buildingId);
            return ResponseEntity.ok("Building deleted successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 0d. Assign Building to a Community Admin --- Super Admin only
    @PostMapping("/assign-admin-building")
    public ResponseEntity<?> assignAdminBuilding(@RequestBody Map<String, Long> request, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body("Error: Only Super Admin can assign buildings.");
        }
        Long adminId = request.get("adminId");
        Long buildingId = request.get("buildingId");
        if (adminId == null) return ResponseEntity.badRequest().body("adminId is required.");
        try {
            User updated = onboardingService.assignAdminBuilding(adminId, buildingId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 1. Register a New Apartment (Colony) ---
    @PostMapping("/apartment")
    public ResponseEntity<?> registerApartment(@Valid @RequestBody ApartmentRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        boolean isAdminOrCommunityAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_COMMUNITY_ADMIN".equals(a.getAuthority()));
        if (!isAdminOrCommunityAdmin) {
            return ResponseEntity.status(403).body("Error: Admin access required to register a building/colony.");
        }
        try {
            Apartment apartment = onboardingService.registerApartment(request);
            return ResponseEntity.ok(apartment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 2. Register a New Household ---
    @PostMapping("/household")
    public ResponseEntity<?> registerHousehold(@Valid @RequestBody HouseholdRequest request, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_COMMUNITY_ADMIN"))) {
            return ResponseEntity.status(403).body("Error: Only Community Admin can register a flat.");
        }
        try {
            Household household = onboardingService.registerHousehold(request);
            return ResponseEntity.ok(household);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 2b. Delete a Household Flat --- Admin / Community Admin
    @DeleteMapping("/household/{id}")
    public ResponseEntity<?> deleteHousehold(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        boolean isAdminOrCommunityAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority())
                        || "ROLE_COMMUNITY_ADMIN".equals(a.getAuthority()) || "COMMUNITY_ADMIN".equals(a.getAuthority()));
        if (!isAdminOrCommunityAdmin) {
            return ResponseEntity.status(403).body("Error: Admin access required to delete a household flat.");
        }
        try {
            onboardingService.deleteHousehold(id);
            return ResponseEntity.ok("Household flat deleted successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting household flat: " + e.getMessage());
        }
    }

    // --- 3. Get All Apartments ---
    @GetMapping("/apartments")
    public ResponseEntity<?> getAllApartments(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String adminEmail = authentication.getName();
        String adminRole = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");
        return ResponseEntity.ok(onboardingService.getAllApartments(adminEmail, adminRole));
    }

    // --- 4. Get All Households ---
    @GetMapping("/households")
    public ResponseEntity<?> getAllHouseholds(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String adminEmail = authentication.getName();
        String adminRole = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");
        return ResponseEntity.ok(onboardingService.getAllHouseholds(adminEmail, adminRole));
    }

    // --- 5. Get Users (SCOPED by role) ---
    @GetMapping("/users")
    public ResponseEntity<?> getUsers(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String email = authentication.getName();
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            return ResponseEntity.ok(onboardingService.getUsersForAdmin(email, role));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 5.5. Invite Resident ---
    @PostMapping("/invite-resident")
    public ResponseEntity<?> inviteResident(@RequestBody Map<String, String> request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");

            String name = request.get("name");
            String email = request.get("email");
            String aptIdStr = request.get("apartmentId");
            Long apartmentId = (aptIdStr != null && !aptIdStr.isBlank()) ? Long.valueOf(aptIdStr) : null;
            String block = request.get("block");
            String flatNumber = request.get("flatNumber");

            return ResponseEntity.ok(onboardingService.inviteResident(name, email, apartmentId, block, flatNumber, adminEmail, adminRole));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Invitation failed: " + e.getMessage());
        }
    }

    // --- 6. Assign Resident to Household ---
    @PostMapping("/assign-resident")
    public ResponseEntity<?> assignResident(@RequestBody Map<String, Long> request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            Long userId = request.get("userId");
            Long householdId = request.get("householdId");
            if (userId == null) {
                return ResponseEntity.badRequest().body("User ID is required!");
            }
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            User user = onboardingService.assignResidentToHousehold(userId, householdId, adminRole);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 7. Configure Water Meter (Toggle on/off) ---
    @PutMapping("/household/{id}/meter")
    public ResponseEntity<?> configureMeter(@PathVariable Long id, @RequestBody Map<String, Boolean> request) {
        try {
            Boolean hasMeter = request.get("hasMeter");
            if (hasMeter == null) {
                return ResponseEntity.badRequest().body("hasMeter field is required!");
            }
            Household household = onboardingService.updateMeterStatus(id, hasMeter);
            return ResponseEntity.ok(household);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 8. Get Pending Approvals (SCOPED) ---
    @GetMapping("/pending-approvals")
    public ResponseEntity<?> getPendingApprovals(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String email = authentication.getName();
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            return ResponseEntity.ok(onboardingService.getPendingApprovals(email, role));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 9. Approve a Registration (with auto-linking) ---
    @PostMapping("/approve-user/{userId}")
    public ResponseEntity<?> approveUser(@PathVariable Long userId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            User approved = onboardingService.approveUser(userId, adminEmail, adminRole);
            return ResponseEntity.ok(approved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 10. Reject a Registration ---
    @PostMapping("/reject-user/{userId}")
    public ResponseEntity<?> rejectUser(@PathVariable Long userId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            onboardingService.rejectUser(userId, adminEmail, adminRole);
            return ResponseEntity.ok("User registration rejected successfully!");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 10.5. Request Document Reupload ---
    @PostMapping("/request-reupload/{userId}")
    public ResponseEntity<?> requestReuploadUser(@PathVariable Long userId, @RequestBody(required=false) Map<String, String> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            String reason = payload != null ? payload.get("reason") : null;
            onboardingService.requestReuploadUser(userId, adminEmail, adminRole, reason);
            return ResponseEntity.ok("Reupload request sent successfully!");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 11. Create User (Admin-created, auto-approved) ---
    @PostMapping("/create-user")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            String name = request.get("name");
            String email = request.get("email");
            String password = request.get("password");
            String role = request.get("role");

            if (name == null || email == null || password == null || role == null) {
                return ResponseEntity.badRequest().body("Name, email, password, and role are required!");
            }

            User created = onboardingService.createUser(name, email, password, role, adminEmail, adminRole);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 12. Update User ---
    @PutMapping("/update-user/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody Map<String, Object> request,
                                         Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            String name = request.containsKey("name") && request.get("name") != null ? request.get("name").toString() : null;
            String email = request.containsKey("email") && request.get("email") != null ? request.get("email").toString() : null;
            
            Long householdId = null;
            if (request.containsKey("householdId") && request.get("householdId") != null) {
                Object val = request.get("householdId");
                if (val instanceof Number) {
                    householdId = ((Number) val).longValue();
                } else {
                    String rawId = val.toString().trim();
                    if (!rawId.isEmpty()) {
                        if (rawId.contains(".")) {
                            rawId = rawId.substring(0, rawId.indexOf('.'));
                        }
                        householdId = Long.valueOf(rawId);
                    }
                }
            }

            User updated = onboardingService.updateUser(userId, name, email, householdId, adminEmail, adminRole);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 13. Delete a User ---
    @DeleteMapping("/delete-user/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminEmail = authentication.getName();
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            onboardingService.deleteUser(userId, adminEmail, adminRole);
            return ResponseEntity.ok("User deleted successfully!");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 14. Assign Managing Admin (Super Admin only) ---
    @PostMapping("/assign-managed-admin")
    public ResponseEntity<?> assignManagedAdmin(@RequestBody Map<String, Long> request,
                                                 Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            Long userId = request.get("userId");
            Long communityAdminId = request.get("communityAdminId");

            if (userId == null) {
                return ResponseEntity.badRequest().body("userId is required!");
            }

            User updated = onboardingService.assignManagedAdmin(userId, communityAdminId, adminRole);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // --- 14.5. Assign Apartment to Community Admin (Super Admin only) ---
    @PostMapping("/assign-admin-apartment")
    public ResponseEntity<?> assignAdminApartment(@RequestBody Map<String, Long> request,
                                                 Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String adminRole = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");
            Long adminId = request.get("adminId");
            Long apartmentId = request.get("apartmentId");

            if (adminId == null) {
                return ResponseEntity.badRequest().body("adminId is required!");
            }

            User updated = onboardingService.assignAdminApartment(adminId, apartmentId, adminRole);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}