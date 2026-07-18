package com.water.water.controller;

import com.water.water.dto.AuthRequest;
import com.water.water.dto.AuthResponse;
import com.water.water.dto.RegisterRequest;
import com.water.water.model.Role;
import com.water.water.model.User;
import com.water.water.repository.UserRepository;
import com.water.water.security.JwtUtil;
import com.water.water.repository.InvitationRepository;
import com.water.water.model.Invitation;
import com.water.water.model.Household;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.ApartmentRepository;
import com.water.water.model.Apartment;
import com.water.water.model.SystemAlert;
import com.water.water.repository.SystemAlertRepository;
import com.water.water.model.WaterUsageLog;
import com.water.water.repository.WaterUsageLogRepository;
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
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private HouseholdRepository householdRepository;
    
    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    // --- REGISTRATION API ---
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        // 1. Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // 2. Create the new user
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // 3. Hash the password before saving!
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // 4. Assign the role
        try {
            Role role = Role.valueOf(request.getRole().toUpperCase());
            if (role == Role.ROLE_USER) {
                return ResponseEntity.badRequest().body("Error: Residents must be invited by a Community Admin.");
            }
            user.setRole(role);
            // Super Admins are auto-approved, Community Admins need doc verification
            user.setApproved(role == Role.ROLE_ADMIN);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: Invalid role specified.");
        }

        // Save optional personal details
        if (request.getGender() != null && !request.getGender().isBlank()) user.setGender(request.getGender());
        if (request.getMobileNo() != null && !request.getMobileNo().isBlank()) user.setMobileNo(request.getMobileNo());

        userRepository.save(user);
        
        // For Community Admins, return their ID so frontend can show doc upload page
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(request.getRole())) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Community Admin registered! Please upload documents for verification.");
            resp.put("requiresVerification", true);
            resp.put("userId", userRepository.findByEmail(request.getEmail()).map(u -> u.getId()).orElse(null));
            return ResponseEntity.ok(resp);
        }
        return ResponseEntity.ok("User registered successfully!");
    }

    // --- COMMUNITY ADMIN DOCUMENT VERIFICATION ---
    @PostMapping("/verify-admin-docs")
    public ResponseEntity<?> verifyAdminDocs(@RequestBody Map<String, String> request) {
        String userIdStr = request.get("userId");
        String aadharBase64 = request.get("documentAadhar");
        String photoBase64 = request.get("documentPhoto");
        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        String alternateNo = request.get("alternateNo");

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
        user.setAlternateNo(alternateNo);
        userRepository.save(user);

        // Notify Super Admin
        SystemAlert adminAlert = new SystemAlert();
        adminAlert.setHousehold(null);
        adminAlert.setTitle("New Community Admin Registration");
        adminAlert.setMessage("A new community admin registration request has been submitted by " + user.getName() + " (" + user.getEmail() + "). Please review and verify their documents.");
        adminAlert.setDate(java.time.LocalDate.now());
        adminAlert.setType("REGISTRATION");
        adminAlert.setResolved(false);
        systemAlertRepository.save(adminAlert);

        return ResponseEntity.ok("Documents submitted! Awaiting Super Admin approval.");
    }

    @GetMapping("/invitation/{token}")
    public ResponseEntity<?> getInvitationDetails(@PathVariable String token) {
        Invitation inv = invitationRepository.findByToken(token).orElse(null);
        if (inv == null) {
            return ResponseEntity.badRequest().body("Error: Invalid or expired invitation token.");
        }
        
        Map<String, Object> details = new java.util.HashMap<>();
        details.put("name", inv.getName());
        details.put("email", inv.getEmail());
        details.put("block", inv.getBlock());
        details.put("flatNumber", inv.getFlatNumber());
        details.put("status", inv.getStatus());
        
        Apartment apt = apartmentRepository.findById(inv.getApartmentId()).orElse(null);
        details.put("apartmentName", apt != null ? apt.getName() : "Unknown Apartment");
        
        return ResponseEntity.ok(details);
    }

    // --- INVITATION VERIFICATION API ---
    @PostMapping("/verify-invitation")
    public ResponseEntity<?> verifyInvitation(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String aadharBase64 = request.get("documentAadhar");
        String photoBase64 = request.get("documentPhoto");
        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        String alternateNo = request.get("alternateNo");
        
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
        inv.setAlternateNo(alternateNo);
        inv.setStatus("VERIFIED");
        invitationRepository.save(inv);
        
        return ResponseEntity.ok(inv);
    }

    // --- REGISTER FROM INVITATION API ---
    @PostMapping("/register-invited")
    public ResponseEntity<?> registerInvited(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String password = request.get("password");
        
        Invitation inv = invitationRepository.findByToken(token).orElse(null);
        if (inv == null || !"VERIFIED".equals(inv.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Invalid invitation or documents not verified.");
        }
        
        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body("Error: Password must be at least 6 characters!");
        }
        
        // Find or create Household
        Household hh = householdRepository.findByApartmentIdAndBlockAndFlatNumber(
            inv.getApartmentId(), inv.getBlock(), inv.getFlatNumber()
        ).orElseGet(() -> {
            Apartment apt = apartmentRepository.findById(inv.getApartmentId()).orElse(null);
            if (apt == null) throw new IllegalArgumentException("Apartment not found");
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
        user.setEmail(inv.getEmail());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.ROLE_USER);
        user.setApproved(false); // Needs Community Admin approval
        user.setDocumentAadhar(inv.getDocumentAadhar());
        user.setDocumentPhoto(inv.getDocumentPhoto());
        user.setGender(inv.getGender());
        user.setMobileNo(inv.getMobileNo());
        user.setAlternateNo(inv.getAlternateNo());
        user.setHousehold(hh);
        userRepository.save(user);
        
        // CREATE METER READING 0L IF ACTIVE METER
        if (hh.isHasMeter()) {
            java.util.List<WaterUsageLog> existingLogs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(hh.getId());
            if (existingLogs == null || existingLogs.isEmpty()) {
                WaterUsageLog log = new WaterUsageLog();
                log.setHousehold(hh);
                log.setDate(java.time.LocalDate.now());
                log.setReadingLiters(0.0);
                log.setConsumptionLiters(0.0);
                waterUsageLogRepository.save(log);
            }
        }
        
        inv.setStatus("REGISTERED");
        invitationRepository.save(inv);

        // Notify Invitee Community Admin and Super Admin
        SystemAlert residentAlert = new SystemAlert();
        residentAlert.setHousehold(hh);
        residentAlert.setTitle("New Resident Registration");
        residentAlert.setMessage("A new resident registration request has been submitted by " + inv.getName() + " for Block " + inv.getBlock() + ", Flat " + inv.getFlatNumber() + ". Please review and verify their documents.");
        residentAlert.setDate(java.time.LocalDate.now());
        residentAlert.setType("REGISTRATION");
        residentAlert.setResolved(false);
        systemAlertRepository.save(residentAlert);
        
        return ResponseEntity.ok("Resident registered successfully!");
    }

    // --- LOGIN API ---
    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@Valid @RequestBody AuthRequest authRequest) throws Exception {

        // 1. Authenticate the user with Spring Security
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getEmail(), authRequest.getPassword())
            );
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Incorrect email or password");
        }

        // 2. Fetch their details, check if approved, and generate a JWT
        User user = userRepository.findByEmail(authRequest.getEmail()).orElse(null);
        if (user != null && !user.isApproved()) {
            return ResponseEntity.status(403).body("Error: Your account is pending approval.");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(authRequest.getEmail());
        final String jwt = jwtUtil.generateToken(userDetails);

        // 3. Return the token to the user
        return ResponseEntity.ok(new AuthResponse(jwt));
    }

    // --- PROFILE GET API ---
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
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("gender", user.getGender());
        profile.put("mobileNo", user.getMobileNo());
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

    // --- PROFILE UPDATE API ---
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
        String password = request.get("password");

        if (name != null && !name.trim().isEmpty()) {
            user.setName(name);
        }
        if (newEmail != null && !newEmail.trim().isEmpty()) {
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body("Error: Email is already in use!");
            }
            user.setEmail(newEmail);
        }
        if (password != null && !password.trim().isEmpty()) {
            if (password.length() < 6) {
                return ResponseEntity.badRequest().body("Error: Password must be at least 6 characters!");
            }
            user.setPassword(passwordEncoder.encode(password));
        }

        String gender = request.get("gender");
        String mobileNo = request.get("mobileNo");
        if (gender != null && !gender.trim().isEmpty()) user.setGender(gender);
        if (mobileNo != null && !mobileNo.trim().isEmpty()) user.setMobileNo(mobileNo);

        userRepository.save(user);
        return ResponseEntity.ok("Profile updated successfully!");
    }
}