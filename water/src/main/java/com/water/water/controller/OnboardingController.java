package com.water.water.controller;

import com.water.water.dto.ApartmentRequest;
import com.water.water.dto.HouseholdRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Household;
import com.water.water.model.User;
import com.water.water.service.OnboardingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class OnboardingController {

    @Autowired
    private OnboardingService onboardingService;

    // --- 1. Register a New Apartment ---
    @PostMapping("/apartment")
    public ResponseEntity<?> registerApartment(@Valid @RequestBody ApartmentRequest request, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body("Error: Only Super Admin can register a building.");
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

    // --- 3. Get All Apartments ---
    @GetMapping("/apartments")
    public ResponseEntity<List<Apartment>> getAllApartments() {
        return ResponseEntity.ok(onboardingService.getAllApartments());
    }

    // --- 4. Get All Households ---
    @GetMapping("/households")
    public ResponseEntity<List<Household>> getAllHouseholds() {
        return ResponseEntity.ok(onboardingService.getAllHouseholds());
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
            Long apartmentId = Long.valueOf(request.get("apartmentId"));
            String block = request.get("block");
            String flatNumber = request.get("flatNumber");
            
            return ResponseEntity.ok(onboardingService.inviteResident(name, email, apartmentId, block, flatNumber, adminEmail, adminRole));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
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

    // --- 15. Reset Database (Super Admin only, password verified) ---
    @PostMapping("/reset-database")
    public ResponseEntity<?> resetDatabase(@RequestBody Map<String, String> request, Authentication authentication) {
        System.out.println("DEBUG: Entering resetDatabase endpoint!");
        if (authentication == null) {
            System.out.println("DEBUG: Authentication is null!");
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String adminRole = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .findFirst().orElse("ROLE_USER");
        System.out.println("DEBUG: Authenticated user: " + authentication.getName() + " with role: " + adminRole);
        if (!"ROLE_ADMIN".equals(adminRole)) {
            System.out.println("DEBUG: Role is NOT ROLE_ADMIN!");
            return ResponseEntity.status(403).body("Error: Only Super Admin can perform database reset.");
        }
        
        String password = request.get("password");
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Verification password is required.");
        }

        String superAdminEmail = authentication.getName();
        boolean success = onboardingService.verifyAndPasswordResetDatabase(superAdminEmail, password);
        if (success) {
            return ResponseEntity.ok("Database reset completed successfully!");
        } else {
            return ResponseEntity.status(401).body("Error: Password verification failed.");
        }
    }
}