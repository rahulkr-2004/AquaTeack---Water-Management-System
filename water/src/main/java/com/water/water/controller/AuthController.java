package com.water.water.controller;

import com.water.water.dto.AuthRequest;
import com.water.water.dto.AuthResponse;
import com.water.water.dto.RegisterRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Building;
import com.water.water.model.Household;
import com.water.water.model.Invitation;
import com.water.water.model.Role;
import com.water.water.model.SystemAlert;
import com.water.water.model.User;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.BuildingRepository;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.InvitationRepository;
import com.water.water.repository.SystemAlertRepository;
import com.water.water.repository.UserRepository;
import com.water.water.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserDetailsService userDetailsService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private InvitationRepository invitationRepository;
    @Autowired private HouseholdRepository householdRepository;
    @Autowired private ApartmentRepository apartmentRepository;
    @Autowired private BuildingRepository buildingRepository;
    @Autowired private SystemAlertRepository systemAlertRepository;

    // ──────────────────────────────────────────────────────────────────────────
    // USERNAME AVAILABILITY CHECK  (public — no auth)
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        if (username == null || username.isBlank() || username.length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("available", false, "message", "Username must be at least 3 characters."));
        }
        if (!username.matches("^[a-zA-Z0-9_\\.]+$")) {
            return ResponseEntity.badRequest().body(Map.of("available", false, "message", "Only letters, numbers, underscores and dots allowed."));
        }
        boolean taken = userRepository.existsByUsername(username.toLowerCase());
        if (taken) {
            return ResponseEntity.ok(Map.of("available", false, "message", "Username is already taken."));
        }
        return ResponseEntity.ok(Map.of("available", true, "message", "Username is available!"));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC COLONY/BUILDING ENDPOINTS  (for registration dropdowns)
    // ──────────────────────────────────────────────────────────────────────────

    /** Returns all colonies for the Community Admin registration dropdown. */
    @GetMapping("/colonies")
    public ResponseEntity<?> getColonies() {
        List<Apartment> colonies = apartmentRepository.findAll();
        return ResponseEntity.ok(colonies);
    }

    /**
     * Returns buildings under a specific colony that are AVAILABLE
     * (i.e. no approved Community Admin is currently assigned to them).
     */
    @GetMapping("/colonies/{colonyId}/available-buildings")
    public ResponseEntity<?> getAvailableBuildings(@PathVariable Long colonyId) {
        List<Building> allBuildings = buildingRepository.findByColonyIdAndDeletedFalse(colonyId);

        // Filter out buildings that already have an assigned + approved Community Admin
        List<Building> available = allBuildings.stream()
                .filter(b -> userRepository.findAll().stream()
                        .noneMatch(u -> u.getRole() == Role.ROLE_COMMUNITY_ADMIN
                                && u.isApproved()
                                && u.getManagedBuilding() != null
                                && u.getManagedBuilding().getId().equals(b.getId())))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(available);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REGISTRATION API
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        // 1. Block residents from self-registering
        if ("ROLE_USER".equalsIgnoreCase(request.getRole())) {
            return ResponseEntity.badRequest().body("Error: Residents must be invited by a Community Admin.");
        }

        // 2. Email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // 3. Username uniqueness (if provided)
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String uname = request.getUsername().toLowerCase().trim();
            if (!uname.matches("^[a-zA-Z0-9_\\.]+$")) {
                return ResponseEntity.badRequest().body("Error: Username can only contain letters, numbers, underscores and dots.");
            }
            if (userRepository.existsByUsername(uname)) {
                return ResponseEntity.badRequest().body("Error: Username is already taken.");
            }
        }

        // 4. Create user
        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().toLowerCase().trim());
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(request.getUsername().toLowerCase().trim());
        }
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // 5. Assign role
        try {
            Role role = Role.valueOf(request.getRole().toUpperCase());
            user.setRole(role);
            // Super Admins are auto-approved; Community Admins must wait for Super Admin approval
            user.setApproved(role == Role.ROLE_ADMIN);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: Invalid role specified.");
        }

        // 6. Optional personal details
        if (request.getGender() != null && !request.getGender().isBlank()) user.setGender(request.getGender());
        if (request.getMobileNo() != null && !request.getMobileNo().isBlank()) user.setMobileNo(request.getMobileNo());
        if (request.getWhatsappNo() != null && !request.getWhatsappNo().isBlank()) user.setWhatsappNo(request.getWhatsappNo());

        // 7. For Community Admins: assign colony + building from their selection or proposed custom building
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(request.getRole())) {
            if (request.getColonyId() != null) {
                Apartment colony = apartmentRepository.findById(request.getColonyId()).orElse(null);
                if (colony != null) user.setManagedApartment(colony);
            }
            if (request.getBuildingId() != null) {
                Building building = buildingRepository.findById(request.getBuildingId()).orElse(null);
                if (building != null) user.setManagedBuilding(building);
            } else if (request.getCustomBuildingName() != null && !request.getCustomBuildingName().isBlank() && user.getManagedApartment() != null) {
                String customName = request.getCustomBuildingName().trim();
                Building b = buildingRepository.findByNameIgnoreCaseAndColonyIdAndDeletedFalse(customName, user.getManagedApartment().getId()).orElse(null);
                if (b == null) {
                    b = new Building();
                    b.setName(customName);
                    b.setColony(user.getManagedApartment());
                    b.setDeleted(false);
                    b = buildingRepository.save(b);
                }
                user.setManagedBuilding(b);
            }
        }

        userRepository.save(user);

        // 8. Community Admin: return userId for legacy doc-upload flow + notify Super Admin
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(request.getRole())) {
            // Create system alert for Super Admin
            SystemAlert alert = new SystemAlert();
            alert.setHousehold(null);
            alert.setTitle("New Community Admin Registration");
            alert.setMessage("A new Community Admin has registered: " + user.getName() +
                    " (" + user.getEmail() + ")" +
                    (user.getManagedApartment() != null ? " for colony: " + user.getManagedApartment().getName() : "") +
                    (user.getManagedBuilding() != null ? " / " + user.getManagedBuilding().getName() : "") +
                    ". Please review and approve.");
            alert.setDate(java.time.LocalDate.now());
            alert.setType("REGISTRATION");
            alert.setResolved(false);
            systemAlertRepository.save(alert);

            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Registration submitted! A Super Admin will review and approve your account. You will be notified by email once approved.");
            resp.put("requiresApproval", true);
            resp.put("userId", user.getId());
            return ResponseEntity.ok(resp);
        }

        return ResponseEntity.ok("User registered successfully!");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMUNITY ADMIN DOCUMENT VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/verify-admin-docs")
    public ResponseEntity<?> verifyAdminDocs(@RequestBody Map<String, String> request) {
        String userIdStr = request.get("userId");
        String aadharBase64 = request.get("documentAadhar");
        String photoBase64 = request.get("documentPhoto");
        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        String whatsappNo = request.get("whatsappNo");

        if (userIdStr == null || aadharBase64 == null || photoBase64 == null || gender == null || mobileNo == null) {
            return ResponseEntity.badRequest().body("Error: All fields and documents are required.");
        }

        User user = userRepository.findById(Long.parseLong(userIdStr)).orElse(null);
        if (user == null || user.getRole() != Role.ROLE_COMMUNITY_ADMIN) {
            return ResponseEntity.badRequest().body("Error: Invalid user.");
        }

        user.setDocumentAadhar(aadharBase64);
        user.setDocumentPhoto(photoBase64);
        user.setGender(gender);
        user.setMobileNo(mobileNo);
        if (whatsappNo != null && !whatsappNo.isBlank()) user.setWhatsappNo(whatsappNo);
        userRepository.save(user);

        // Notify Super Admin
        SystemAlert adminAlert = new SystemAlert();
        adminAlert.setHousehold(null);
        adminAlert.setTitle("Community Admin Documents Uploaded");
        adminAlert.setMessage("Community Admin " + user.getName() + " (" + user.getEmail() + ") has uploaded their verification documents. Please review and approve.");
        adminAlert.setDate(java.time.LocalDate.now());
        adminAlert.setType("REGISTRATION");
        adminAlert.setResolved(false);
        systemAlertRepository.save(adminAlert);

        return ResponseEntity.ok("Documents submitted! Awaiting Super Admin approval.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // INVITATION DETAIL FETCH
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/invitation/{token}")
    public ResponseEntity<?> getInvitationDetails(@PathVariable String token) {
        Invitation inv = invitationRepository.findByToken(token).orElse(null);
        if (inv == null) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired invitation token.");
        }

        Map<String, Object> details = new HashMap<>();
        details.put("name", inv.getName());
        details.put("email", inv.getEmail());
        details.put("block", inv.getBlock());
        details.put("flatNumber", inv.getFlatNumber());
        details.put("status", inv.getStatus());

        Apartment apt = apartmentRepository.findById(inv.getApartmentId()).orElse(null);
        details.put("apartmentName", apt != null ? apt.getName() : "Unknown Colony");

        return ResponseEntity.ok(details);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // INVITATION VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/verify-invitation")
    public ResponseEntity<?> verifyInvitation(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String aadharBase64 = request.get("documentAadhar");
        String photoBase64 = request.get("documentPhoto");
        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        String whatsappNo = request.get("whatsappNo");

        Invitation inv = invitationRepository.findByToken(token).orElse(null);
        if (inv == null || !"PENDING".equals(inv.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired invitation token.");
        }

        if (aadharBase64 == null || photoBase64 == null || gender == null || mobileNo == null) {
            return ResponseEntity.badRequest().body("Error: All fields and documents are required.");
        }

        inv.setDocumentAadhar(aadharBase64);
        inv.setDocumentPhoto(photoBase64);
        inv.setGender(gender);
        inv.setMobileNo(mobileNo);
        inv.setAlternateNo(whatsappNo); // stored in alternateNo column
        inv.setStatus("VERIFIED");
        invitationRepository.save(inv);

        return ResponseEntity.ok(inv);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REGISTER FROM INVITATION
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/register-invited")
    public ResponseEntity<?> registerInvited(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String password = request.get("password");
        String username = request.get("username");

        Invitation inv = invitationRepository.findByToken(token).orElse(null);
        if (inv == null || !"VERIFIED".equals(inv.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Invalid invitation or documents not verified.");
        }

        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body("Error: Password must be at least 6 characters!");
        }

        // Username uniqueness check
        if (username != null && !username.isBlank()) {
            String uname = username.toLowerCase().trim();
            if (userRepository.existsByUsername(uname)) {
                return ResponseEntity.badRequest().body("Error: Username is already taken.");
            }
        }

        // Find or create Household
        Household hh = householdRepository.findByApartmentIdAndBlockAndFlatNumber(
            inv.getApartmentId(), inv.getBlock(), inv.getFlatNumber()
        ).orElseGet(() -> {
            Apartment apt = apartmentRepository.findById(inv.getApartmentId()).orElse(null);
            if (apt == null) throw new IllegalArgumentException("Colony not found");
            Household newHh = new Household();
            newHh.setApartment(apt);
            newHh.setBlock(inv.getBlock());
            newHh.setFlatNumber(inv.getFlatNumber());
            newHh.setHasMeter(true);
            return householdRepository.save(newHh);
        });

        // Create User
        User user = new User();
        user.setName(inv.getName());
        user.setEmail(inv.getEmail().toLowerCase().trim());
        if (username != null && !username.isBlank()) {
            user.setUsername(username.toLowerCase().trim());
        }
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.ROLE_USER);
        user.setApproved(false); // Needs Community Admin approval after KYC review
        user.setDocumentAadhar(inv.getDocumentAadhar());
        user.setDocumentPhoto(inv.getDocumentPhoto());
        user.setGender(inv.getGender());
        user.setMobileNo(inv.getMobileNo());
        user.setWhatsappNo(inv.getAlternateNo()); // alternateNo field stored whatsapp during invite verify
        user.setHousehold(hh);
        userRepository.save(user);

        inv.setStatus("REGISTERED");
        invitationRepository.save(inv);

        // Notify Community Admin and Super Admin
        SystemAlert alert = new SystemAlert();
        alert.setHousehold(hh);
        alert.setTitle("New Resident Registration");
        alert.setMessage("Resident " + inv.getName() + " has completed registration for Block " +
                inv.getBlock() + ", Flat " + inv.getFlatNumber() + ". Please review their KYC documents.");
        alert.setDate(java.time.LocalDate.now());
        alert.setType("REGISTRATION");
        alert.setResolved(false);
        systemAlertRepository.save(alert);

        return ResponseEntity.ok("Resident registered successfully! Please log in and complete your KYC verification.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LOGIN API  (supports email OR username)
    // ──────────────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@Valid @RequestBody AuthRequest authRequest) {
        // Resolve identifier to email (for Spring Security's authenticate call)
        String identifier = authRequest.getEmail(); // could be email or username
        User resolvedUser = userRepository.findByEmailOrUsername(identifier).orElse(null);
        if (resolvedUser == null) {
            return ResponseEntity.status(401).body("Incorrect email/username or password");
        }
        String canonicalEmail = resolvedUser.getEmail();

        // Authenticate via Spring Security (always using canonical email)
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(canonicalEmail, authRequest.getPassword())
            );
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Incorrect email/username or password");
        }

        // Check approval status
        if (!resolvedUser.isApproved()) {
            return ResponseEntity.status(403).body("Error: Your account is pending approval from a Super Admin.");
        }

        // Generate JWT using canonical email
        final UserDetails userDetails = userDetailsService.loadUserByUsername(canonicalEmail);
        final String jwt = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(jwt));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PROFILE GET API
    // ──────────────────────────────────────────────────────────────────────────
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("username", user.getUsername());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("gender", user.getGender());
        profile.put("mobileNo", user.getMobileNo());
        profile.put("whatsappNo", user.getWhatsappNo());
        profile.put("approved", user.isApproved());

        if (user.getManagedApartment() != null) {
            Map<String, Object> colony = new HashMap<>();
            colony.put("id", user.getManagedApartment().getId());
            colony.put("name", user.getManagedApartment().getName());
            colony.put("address", user.getManagedApartment().getAddress());
            profile.put("managedApartment", colony);
        } else {
            profile.put("managedApartment", null);
        }

        if (user.getManagedBuilding() != null) {
            Map<String, Object> building = new HashMap<>();
            building.put("id", user.getManagedBuilding().getId());
            building.put("name", user.getManagedBuilding().getName());
            profile.put("managedBuilding", building);
        } else {
            profile.put("managedBuilding", null);
        }

        if (user.getHousehold() != null) {
            Map<String, Object> hh = new HashMap<>();
            hh.put("id", user.getHousehold().getId());
            hh.put("block", user.getHousehold().getBlock());
            hh.put("flatNumber", user.getHousehold().getFlatNumber());
            hh.put("hasMeter", user.getHousehold().isHasMeter());
            if (user.getHousehold().getApartment() != null) {
                Map<String, Object> ap = new HashMap<>();
                ap.put("id", user.getHousehold().getApartment().getId());
                ap.put("name", user.getHousehold().getApartment().getName());
                ap.put("address", user.getHousehold().getApartment().getAddress());
                hh.put("apartment", ap);
            }
            profile.put("household", hh);
        } else {
            profile.put("household", null);
        }

        return ResponseEntity.ok(profile);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PROFILE UPDATE API
    // ──────────────────────────────────────────────────────────────────────────
    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(Authentication authentication, @RequestBody Map<String, String> request) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        String name = request.get("name");
        String newEmail = request.get("email");
        String newUsername = request.get("username");
        String password = request.get("password");
        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        String whatsappNo = request.get("whatsappNo");

        if (name != null && !name.trim().isEmpty()) user.setName(name.trim());
        if (gender != null && !gender.trim().isEmpty()) user.setGender(gender);
        if (mobileNo != null && !mobileNo.trim().isEmpty()) user.setMobileNo(mobileNo);
        if (whatsappNo != null && !whatsappNo.trim().isEmpty()) user.setWhatsappNo(whatsappNo);

        if (newEmail != null && !newEmail.trim().isEmpty()) {
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body("Error: Email is already in use!");
            }
            user.setEmail(newEmail.toLowerCase().trim());
        }

        if (newUsername != null && !newUsername.trim().isEmpty()) {
            String uname = newUsername.toLowerCase().trim();
            if (!uname.equals(user.getUsername()) && userRepository.existsByUsername(uname)) {
                return ResponseEntity.badRequest().body("Error: Username is already taken!");
            }
            user.setUsername(uname);
        }

        if (password != null && !password.trim().isEmpty()) {
            if (password.length() < 6) {
                return ResponseEntity.badRequest().body("Error: Password must be at least 6 characters!");
            }
            user.setPassword(passwordEncoder.encode(password));
        }

        userRepository.save(user);
        return ResponseEntity.ok("Profile updated successfully!");
    }
}