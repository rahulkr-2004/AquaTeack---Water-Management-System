package com.water.water.service;

import com.water.water.dto.ApartmentRequest;
import com.water.water.dto.ColonyRequest;
import com.water.water.dto.HouseholdRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Building;
import com.water.water.model.Household;
import com.water.water.model.Role;
import com.water.water.model.User;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.BuildingRepository;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.UserRepository;
import com.water.water.repository.InvitationRepository;
import com.water.water.repository.BillRepository;
import com.water.water.repository.WaterUsageLogRepository;
import com.water.water.repository.SystemAlertRepository;
import com.water.water.model.Invitation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
public class OnboardingService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private BillRepository billRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired(required = false)
    private JavaMailSender emailSender;

    @Value("${spring.mail.username:aceruser12003@gmail.com}")
    private String senderEmail;


    /**
     * Called on application startup to permanently drop legacy/orphaned tables
     * that were created under old schema names (e.g. 'tickets' -> now 'support_tickets').
     */
    public void dropLegacyTables() {
        try {
            try {
                entityManager.createNativeQuery("DROP TABLE IF EXISTS tickets").executeUpdate();
            } catch (Exception ignored) {}
            
            try {
                entityManager.createNativeQuery("ALTER TABLE buildings DROP COLUMN IF EXISTS deleted").executeUpdate();
            } catch (Exception ignored) {}

            System.out.println("Bootstrap: Legacy table cleanup complete.");
        } catch (Exception e) {
            System.err.println("Bootstrap: Legacy cleanup warning: " + e.getMessage());
        }
    }


    // ── Colony / Building Management ───────────────────────────────────────────

    /** Delete a household / flat configuration. */
    @org.springframework.transaction.annotation.Transactional
    public void deleteHousehold(Long householdId) {
        Household h = householdRepository.findById(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household flat not found."));

        List<User> users = userRepository.findByHouseholdId(householdId);
        for (User u : users) {
            u.setHousehold(null);
            userRepository.save(u);
        }

        waterUsageLogRepository.deleteByHouseholdId(householdId);
        billRepository.deleteByHouseholdId(householdId);
        systemAlertRepository.deleteByHouseholdId(householdId);
        householdRepository.delete(h);
    }

    /**
     * Create a new colony (Apartment) together with an initial set of buildings.
     * Building names are trimmed, lowercased for dedup-check, then title-cased for display.
     */
    public Apartment createColonyWithBuildings(ColonyRequest request) {
        String normalizedName = request.getName().trim();
        if (apartmentRepository.existsByName(normalizedName)) {
            throw new IllegalArgumentException("A colony with this name already exists!");
        }
        Apartment colony = new Apartment();
        colony.setName(normalizedName);
        colony.setAddress(request.getAddress() != null ? request.getAddress().trim() : "");
        colony = apartmentRepository.save(colony);

        if (request.getBuildings() != null) {
            for (String rawName : request.getBuildings()) {
                if (rawName == null || rawName.isBlank()) continue;
                String bName = rawName.trim();
                if (!buildingRepository.existsByNameIgnoreCaseAndColonyIdAndDeletedFalse(bName, colony.getId())) {
                    Building b = new Building();
                    b.setName(bName);
                    b.setColony(colony);
                    b.setDeleted(false);
                    buildingRepository.save(b);
                }
            }
        }
        return colony;
    }

    /** Add building(s) to an existing colony. Supports single or comma-separated names. */
    public Building addBuildingToColony(Long colonyId, String buildingName) {
        Apartment colony = apartmentRepository.findById(colonyId)
                .orElseThrow(() -> new IllegalArgumentException("Colony not found."));
        String rawInput = buildingName.trim();
        String[] names = rawInput.split(",");
        Building lastSaved = null;
        for (String name : names) {
            String bName = name.trim();
            if (bName.isEmpty()) continue;
            if (!buildingRepository.existsByNameIgnoreCaseAndColonyIdAndDeletedFalse(bName, colonyId)) {
                Building b = new Building();
                b.setName(bName);
                b.setColony(colony);
                b.setDeleted(false);
                lastSaved = buildingRepository.save(b);
            } else if (lastSaved == null) {
                lastSaved = buildingRepository.findByNameIgnoreCaseAndColonyIdAndDeletedFalse(bName, colonyId).orElse(null);
            }
        }
        if (lastSaved == null) {
            throw new IllegalArgumentException("Building(s) already exist in this colony.");
        }
        return lastSaved;
    }

    /** Get all active buildings for a colony. */
    public List<Building> getBuildingsForColony(Long colonyId) {
        return buildingRepository.findByColonyIdAndDeletedFalse(colonyId);
    }

    /**
     * Soft-delete a building (marks as deleted, retains history).
     * Also detaches any residents who lived in the building's block, 
     * preventing stale FK references without destroying historical billing data.
     */
    @org.springframework.transaction.annotation.Transactional
    public void softDeleteBuilding(Long buildingId) {
        Building b = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("Building not found."));

        // Cascade: detach residents whose household belongs to this building's block + apartment
        if (b.getColony() != null) {
            Long aptId = b.getColony().getId();
            String block = b.getName();
            List<Household> affectedHouseholds = householdRepository.findByApartmentIdAndBlock(aptId, block);
            for (Household h : affectedHouseholds) {
                // Detach residents from their household (preserves billing history)
                List<User> residents = userRepository.findByHouseholdId(h.getId());
                for (User resident : residents) {
                    resident.setHousehold(null);
                }
                userRepository.saveAll(residents);
            }
        }

        b.setDeleted(true);
        buildingRepository.save(b);
    }


    /** Assign a specific building to a Community Admin. */
    public User assignAdminBuilding(Long adminId, Long buildingId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found."));
        if (admin.getRole() != Role.ROLE_COMMUNITY_ADMIN) {
            throw new IllegalArgumentException("User is not a Community Admin.");
        }
        if (buildingId == null) {
            admin.setManagedBuilding(null);
        } else {
            Building b = buildingRepository.findById(buildingId)
                    .orElseThrow(() -> new IllegalArgumentException("Building not found."));
            admin.setManagedBuilding(b);
            admin.setManagedApartment(b.getColony());
        }
        return userRepository.save(admin);
    }

    // --- 1. Register a New Apartment Building ---
    public Apartment registerApartment(ApartmentRequest request) {
        if (apartmentRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("An apartment with this name already exists!");
        }
        Apartment apartment = new Apartment();
        apartment.setName(request.getName());
        apartment.setAddress(request.getAddress());
        return apartmentRepository.save(apartment);
    }

    // --- 1.5. Invite Resident (Community Admin / Super Admin) ---
    public Invitation inviteResident(String name, String email, Long apartmentId, String block, String flatNumber, String adminEmail, String adminRole) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Resident email is required.");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Resident name is required.");
        }
        if (userRepository.existsByEmail(email.trim())) {
            throw new IllegalArgumentException("A user with this email address is already registered.");
        }

        // Auto-resolve apartmentId from Community Admin profile if missing
        if (apartmentId == null) {
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            if (admin != null && admin.getManagedApartment() != null) {
                apartmentId = admin.getManagedApartment().getId();
            }
        }
        if (apartmentId == null && "ROLE_COMMUNITY_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Apartment/Colony ID is required. Please ensure your account has a managed colony assigned.");
        }
        
        // Resolve Apartment entity from ID
        Apartment invitationApartment = null;
        if (apartmentId != null) {
            invitationApartment = apartmentRepository.findById(apartmentId).orElse(null);
        }
        if (invitationApartment == null && "ROLE_COMMUNITY_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Apartment/Colony not found. Please ensure your account has a valid managed colony assigned.");
        }

        Invitation invitation = new Invitation();
        invitation.setToken(UUID.randomUUID().toString());
        invitation.setName(name);
        invitation.setEmail(email);
        invitation.setApartment(invitationApartment);
        invitation.setBlock(block);
        invitation.setFlatNumber(flatNumber);
        invitation.setStatus("PENDING");
        
        Invitation saved = invitationRepository.save(invitation);
        
        String inviteLink = "http://localhost:5173/invite?token=" + saved.getToken();
        
        if (emailSender != null) {
            try {
                String communityAdminName = userRepository.findByEmail(adminEmail)
                        .map(u -> u.getName())
                        .orElse("Your Community Admin");

                MimeMessage message = emailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                
                helper.setFrom(senderEmail);
                helper.setTo(email);
                helper.setSubject("🏡 Your AquaTrack Invitation — Complete Your Registration");
                
                String htmlMsg = "<!DOCTYPE html>" +
                        "<html lang='en'>" +
                        "<head>" +
                        "  <meta charset='UTF-8'>" +
                        "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                        "  <style>" +
                        "    * { margin: 0; padding: 0; box-sizing: border-box; }" +
                        "    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f1f5f9; }" +
                        "    .wrapper { background-color: #0f172a; padding: 40px 16px; }" +
                        "    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; }" +
                        "    .header { background: linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%); padding: 40px 32px; text-align: center; }" +
                        "    .logo-icon { font-size: 48px; margin-bottom: 12px; display: block; }" +
                        "    .logo-text { font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }" +
                        "    .logo-sub { font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 6px; font-weight: 500; }" +
                        "    .body { padding: 40px 32px; }" +
                        "    .badge { display: inline-block; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }" +
                        "    .greeting { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }" +
                        "    .intro { font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 28px; }" +
                        "    .details-card { background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 20px 24px; margin-bottom: 32px; }" +
                        "    .details-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }" +
                        "    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #1e293b; }" +
                        "    .detail-row:last-child { border-bottom: none; }" +
                        "    .detail-label { font-size: 12px; color: #64748b; font-weight: 600; width: 150px; flex-shrink: 0; }" +
                        "    .detail-value { font-size: 13px; color: #e2e8f0; font-weight: 600; }" +
                        "    .steps { margin-bottom: 32px; }" +
                        "    .steps-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }" +
                        "    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }" +
                        "    .step-num { width: 26px; height: 26px; min-width: 26px; background: linear-gradient(135deg, #2563eb, #0ea5e9); border-radius: 50%; text-align: center; line-height: 26px; font-size: 12px; font-weight: 800; color: white; }" +
                        "    .step-text { font-size: 13px; color: #94a3b8; line-height: 1.6; padding-top: 4px; }" +
                        "    .step-text strong { color: #cbd5e1; }" +
                        "    .cta-container { text-align: center; margin-bottom: 32px; }" +
                        "    .cta-btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #0ea5e9); color: #ffffff !important; text-decoration: none; padding: 18px 52px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 8px 24px rgba(37,99,235,0.4); }" +
                        "    .cta-note { font-size: 12px; color: #475569; margin-top: 14px; }" +
                        "    .divider { border: none; border-top: 1px solid #334155; margin: 28px 0; }" +
                        "    .footer { background: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #334155; }" +
                        "    .footer p { font-size: 12px; color: #475569; line-height: 1.8; }" +
                        "    .footer a { color: #3b82f6; text-decoration: none; }" +
                        "    @media only screen and (max-width: 600px) {" +
                        "      .wrapper { padding: 16px 8px !important; }" +
                        "      .card { border-radius: 14px !important; }" +
                        "      .header { padding: 30px 20px !important; }" +
                        "      .logo-text { font-size: 26px !important; }" +
                        "      .body { padding: 24px 20px !important; }" +
                        "      .greeting { font-size: 18px !important; }" +
                        "      .intro { font-size: 13px !important; }" +
                        "      .details-card { padding: 16px 16px !important; margin-bottom: 24px !important; }" +
                        "      .detail-row { display: block !important; padding: 8px 0 !important; }" +
                        "      .detail-label { width: 100% !important; margin-bottom: 4px !important; font-size: 11px !important; }" +
                        "      .detail-value { font-size: 12px !important; }" +
                        "      .cta-btn { display: block !important; padding: 16px 24px !important; font-size: 14px !important; width: 100% !important; text-align: center !important; }" +
                        "    }" +
                        "  </style>" +
                        "</head>" +
                        "<body>" +
                        "  <div class='wrapper'>" +
                        "    <div class='card'>" +
                        "      <div class='header'>" +
                        "        <span class='logo-icon'>💧</span>" +
                        "        <div class='logo-text'>AquaTrack</div>" +
                        "        <div class='logo-sub'>Smart Water Management System</div>" +
                        "      </div>" +
                        "      <div class='body'>" +
                        "        <span class='badge'>✧ Official Invitation</span>" +
                        "        <div class='greeting'>Welcome, " + name + "! 👋</div>" +
                        "        <p class='intro'>You have been officially invited by <strong>" + communityAdminName + "</strong> to join your community on <strong style='color:#e2e8f0'>AquaTrack</strong> — your building's smart platform for water management, real-time usage tracking, billing, and alerts.</p>" +
                        "        <div class='details-card'>" +
                        "          <div class='details-title'>📋 Your Registration Details</div>" +
                        "          <div class='detail-row'><div class='detail-label'>Full Name</div><div class='detail-value'>" + name + "</div></div>" +
                        "          <div class='detail-row'><div class='detail-label'>Email</div><div class='detail-value'>" + email + "</div></div>" +
                        "          <div class='detail-row'><div class='detail-label'>Block</div><div class='detail-value'>" + block + "</div></div>" +
                        "          <div class='detail-row'><div class='detail-label'>Flat Number</div><div class='detail-value'>" + flatNumber + "</div></div>" +
                        "          <div class='detail-row'><div class='detail-label'>Invited By</div><div class='detail-value'>" + communityAdminName + " (" + adminEmail + ")</div></div>" +
                        "        </div>" +
                        "        <div class='steps'>" +
                        "          <div class='steps-title'>🚀 How to Complete Registration</div>" +
                        "          <div class='step'><div class='step-num'>1</div><div class='step-text'><strong>Enter your details</strong> — Provide your gender and contact number.</div></div>" +
                        "          <div class='step'><div class='step-num'>2</div><div class='step-text'><strong>Upload documents</strong> — Submit your Aadhar/PAN and a recent photo for verification.</div></div>" +
                        "          <div class='step'><div class='step-num'>3</div><div class='step-text'><strong>Set a password</strong> — Secure your new AquaTrack account.</div></div>" +
                        "          <div class='step'><div class='step-num'>4</div><div class='step-text'><strong>Await approval</strong> — Your community admin will review and approve your account.</div></div>" +
                        "        </div>" +
                        "        <div class='cta-container'>" +
                        "          <a href='" + inviteLink + "' class='cta-btn'>🔗 Complete My Registration</a>" +
                        "          <p class='cta-note'>This link is unique to you and expires after use. Do not share it.</p>" +
                        "        </div>" +
                        "        <hr class='divider' />" +
                        "        <p style='font-size:13px;color:#64748b;line-height:1.7;'>If you believe this invitation was sent in error, please ignore this email. Contact your community administrator for assistance.</p>" +
                        "      </div>" +
                        "      <div class='footer'><p>&copy; 2026 AquaTrack Inc. All rights reserved.<br>This is an automated message — please do not reply directly to this email.</p></div>" +
                        "    </div>" +
                        "  </div>" +
                        "</body>" +
                        "</html>";
                
                helper.setText(htmlMsg, true);
                emailSender.send(message);
                System.out.println("Premium HTML Email sent successfully to: " + email);
            } catch (Exception e) {
                System.err.println("Failed to send HTML email to " + email + ": " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            // Mock email sending fallback if SMTP is not configured
            System.out.println("=====================================================");
            System.out.println("MOCK EMAIL SENT TO: " + email);
            System.out.println("Subject: You're invited to join AquaTrack!");
            System.out.println("Body: Please click the link to verify your documents and register: ");
            System.out.println(inviteLink);
            System.out.println("=====================================================");
        }

        return saved;
    }
    // --- 2. Register a New Flat inside a Building ---
    public Household registerHousehold(HouseholdRequest request) {
        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Apartment not found!"));

        if (householdRepository.existsByApartmentIdAndBlockAndFlatNumber(
                request.getApartmentId(), request.getBlock(), request.getFlatNumber())) {
            throw new IllegalArgumentException("Error: This flat already exists in this block!");
        }

        Household household = new Household();
        household.setApartment(apartment);
        household.setBlock(request.getBlock());
        household.setFlatNumber(request.getFlatNumber());
        household.setHasMeter(request.isHasMeter());
        return householdRepository.save(household);
    }

    public List<Apartment> getAllApartments(String adminEmail, String adminRole) {
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(adminRole) || "COMMUNITY_ADMIN".equals(adminRole);
        if (isCommunityAdmin) {
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            if (admin != null && admin.getManagedApartment() != null) {
                return List.of(admin.getManagedApartment());
            }
            return new ArrayList<>();
        }
        return apartmentRepository.findAll();
    }

    public List<Household> getAllHouseholds(String adminEmail, String adminRole) {
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(adminRole) || "COMMUNITY_ADMIN".equals(adminRole);
        if (isCommunityAdmin) {
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            if (admin != null && admin.getManagedApartment() != null) {
                return householdRepository.findAll().stream()
                        .filter(h -> h.getApartment().getId().equals(admin.getManagedApartment().getId()))
                        .collect(Collectors.toList());
            }
            return new ArrayList<>();
        }
        return householdRepository.findAll();
    }

    // =========================================================================
    // SCOPED USER RETRIEVAL — Hierarchical visibility
    // =========================================================================

    /**
     * Get users visible to the requesting admin.
     * - Super Admin: sees all Community Admins + all Household Users
     * - Community Admin: sees only their own managed household users
     */
    public List<User> getUsersForAdmin(String adminEmail, String adminRole) {
        boolean isSuperAdmin = "ROLE_ADMIN".equals(adminRole) || "ADMIN".equals(adminRole);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(adminRole) || "COMMUNITY_ADMIN".equals(adminRole);

        if (isSuperAdmin) {
            // Super Admin sees all non-super-admin users
            List<User> result = new ArrayList<>();
            result.addAll(userRepository.findByRole(Role.ROLE_COMMUNITY_ADMIN));
            result.addAll(userRepository.findByRole(Role.ROLE_USER));
            return result;
        } else if (isCommunityAdmin) {
            // Community Admin sees only their managed household users OR users in their managed apartment
            User admin = userRepository.findByEmail(adminEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));
            List<User> users = userRepository.findByManagedByAdminId(admin.getId());
            if (admin.getManagedApartment() != null) {
                List<User> apartmentUsers = userRepository.findByRole(Role.ROLE_USER).stream()
                        .filter(u -> u.getHousehold() != null && u.getHousehold().getApartment().getId().equals(admin.getManagedApartment().getId()))
                        .collect(Collectors.toList());
                // Merge without duplicates
                for (User u : apartmentUsers) {
                    if (users.stream().noneMatch(existing -> existing.getId().equals(u.getId()))) {
                        users.add(u);
                    }
                }
            }
            return users;
        }
        throw new IllegalArgumentException("Access Denied: Only administrators can view users.");
    }

    /**
     * Legacy method kept for backward compatibility — returns all users.
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // =========================================================================
    // SCOPED PENDING APPROVALS
    // =========================================================================

    /**
     * Get pending registration requests visible to the requesting admin.
     * - Super Admin: sees ALL pending users (Community Admins + Household Users)
     * - Community Admin: sees only pending ROLE_USER registrations (unmanaged ones)
     */
    public List<User> getPendingApprovals(String adminEmail, String role) {
        boolean isSuperAdmin = "ROLE_ADMIN".equals(role) || "ADMIN".equals(role);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(role) || "COMMUNITY_ADMIN".equals(role);

        if (isSuperAdmin) {
            // Super Admin sees all pending registrations
            return userRepository.findByApprovedFalse();
        } else if (isCommunityAdmin) {
            // Community Admin sees only pending household user registrations
            return userRepository.findByApprovedFalseAndRole(Role.ROLE_USER);
        }
        throw new IllegalArgumentException("Access Denied: Only administrators can view pending approvals.");
    }

    // =========================================================================
    // APPROVAL WITH AUTO-LINKING
    // =========================================================================

    /**
     * Approve a user registration.
     * - When a Community Admin approves a ROLE_USER, auto-link managedByAdmin to that Community Admin.
     * - Super Admin can approve anyone (Community Admins + Household Users).
     */
    public User approveUser(Long userId, String adminEmail, String adminRole) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        boolean isSuperAdmin = "ROLE_ADMIN".equals(adminRole) || "ADMIN".equals(adminRole);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(adminRole) || "COMMUNITY_ADMIN".equals(adminRole);

        if (isCommunityAdmin) {
            if (targetUser.getRole() != Role.ROLE_USER) {
                throw new IllegalArgumentException("Access Denied: Community Admin can only approve Resident registrations.");
            }
            // Auto-link: set managedByAdmin to this Community Admin
            User communityAdmin = userRepository.findByEmail(adminEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));
            targetUser.setManagedByAdmin(communityAdmin);
        } else if (!isSuperAdmin) {
            throw new IllegalArgumentException("Access Denied: Only administrators can approve registrations.");
        }

        targetUser.setApproved(true);
        User savedUser = userRepository.save(targetUser);

        // Ensure newly proposed building (if any) is active & fully visible to Super Admin and attached to Community Admin
        if (savedUser.getRole() == Role.ROLE_COMMUNITY_ADMIN && savedUser.getManagedBuilding() != null) {
            Building b = savedUser.getManagedBuilding();
            if (b.isDeleted()) {
                b.setDeleted(false);
                buildingRepository.save(b);
            }
        }

        return savedUser;
    }

    // =========================================================================
    // REJECT REGISTRATION
    // =========================================================================

    public void rejectUser(Long userId, String adminEmail, String adminRole) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        boolean isSuperAdmin = "ROLE_ADMIN".equals(adminRole) || "ADMIN".equals(adminRole);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(adminRole) || "COMMUNITY_ADMIN".equals(adminRole);

        if (isCommunityAdmin) {
            if (targetUser.getRole() != Role.ROLE_USER) {
                throw new IllegalArgumentException("Access Denied: Community Admin can only reject Resident registrations.");
            }
        } else if (!isSuperAdmin) {
            throw new IllegalArgumentException("Access Denied: Only administrators can reject registrations.");
        }

        // Reset the corresponding invitation to PENDING so they can register again
        if (targetUser.getRole() == Role.ROLE_USER) {
            Invitation inv = invitationRepository.findByEmail(targetUser.getEmail()).orElse(null);
            if (inv != null) {
                inv.setStatus("PENDING");
                inv.setDocumentAadhar(null);
                inv.setDocumentPhoto(null);
                inv.setGender(null);
                inv.setMobileNo(null);
                inv.setAlternateNo(null);
                invitationRepository.save(inv);
            }
        }

        userRepository.delete(targetUser);
    }

    public void requestReuploadUser(Long userId, String adminEmail, String adminRole, String reason) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        if ("ROLE_COMMUNITY_ADMIN".equals(adminRole)) {
            if (targetUser.getRole() != Role.ROLE_USER) {
                throw new IllegalArgumentException("Access Denied: Community Admin can only request reupload for Resident registrations.");
            }
        } else if (!"ROLE_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Access Denied: Only administrators can request document reupload.");
        }

        if (targetUser.getRole() == Role.ROLE_USER) {
            Invitation inv = invitationRepository.findByEmail(targetUser.getEmail()).orElse(null);
            if (inv != null) {
                inv.setStatus("PENDING");
                inv.setDocumentAadhar(null);
                inv.setDocumentPhoto(null);
                inv.setGender(null);
                inv.setMobileNo(null);
                inv.setAlternateNo(null);
                invitationRepository.save(inv);
                
                String inviteLink = "http://localhost:5173/?invite=" + inv.getToken();
                
                if (emailSender != null) {
                    try {
                        jakarta.mail.internet.MimeMessage message = emailSender.createMimeMessage();
                        org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true, "UTF-8");
                        helper.setFrom(senderEmail);
                        helper.setTo(inv.getEmail());
                        helper.setSubject("Action Required: Please Re-upload Your Documents - AquaTrack");
                        
                        String reasonHtml = "";
                        if (reason != null && !reason.trim().isEmpty()) {
                            reasonHtml = "<div style='background:#fef2f2; border-left:4px solid #ef4444; padding:15px; margin:20px 0; border-radius:4px;'><p style='color:#b91c1c; margin:0; font-weight:600;'>Reason provided by Admin:</p><p style='color:#991b1b; margin:5px 0 0 0;'>" + reason + "</p></div>";
                        }
                        
                        String htmlMsg = "<!DOCTYPE html><html><body style='margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,sans-serif;'>" +
                                "<div style='max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);'>" +
                                "<div style='background:linear-gradient(135deg, #ef4444, #dc2626);padding:30px;text-align:center;'><h1 style='color:#ffffff;margin:0;font-size:24px;font-weight:700;'>Document Re-upload Required</h1></div>" +
                                "<div style='padding:40px 30px;'><p style='font-size:16px;color:#334155;line-height:1.6;margin-top:0;'>Hi " + inv.getName() + ",</p>" +
                                "<p style='font-size:16px;color:#334155;line-height:1.6;'>Your Community Administrator has reviewed your registration for AquaTrack, but was unable to approve it due to issues with the uploaded documents.</p>" +
                                reasonHtml +
                                "<p style='font-size:16px;color:#334155;line-height:1.6;'>Please use your original invitation link below to restart the registration process and upload clear, valid documents.</p>" +
                                "<div style='text-align:center;margin:30px 0;'><a href='" + inviteLink + "' style='display:inline-block;padding:14px 28px;background-color:#ef4444;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 4px 6px rgba(239, 68, 68, 0.25);'>🔗 Re-upload Documents</a></div>" +
                                "<p style='font-size:14px;color:#64748b;line-height:1.6;'>If you need help, please contact your community administrator.</p>" +
                                "</div><div style='background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;'><p style='margin:0;color:#94a3b8;font-size:12px;'>&copy; 2026 AquaTrack Inc. All rights reserved.</p></div>" +
                                "</div></body></html>";
                        
                        helper.setText(htmlMsg, true);
                        emailSender.send(message);
                    } catch (Exception e) {
                        System.err.println("Failed to send reupload email: " + e.getMessage());
                    }
                }
            }
        }

        userRepository.delete(targetUser);
    }

    // =========================================================================
    // CRUD: CREATE USER (Admin-created)
    // =========================================================================

    /**
     * Admin can create a user directly (bypasses registration approval).
     * - Community Admin can create ROLE_USER under themselves
     * - Super Admin can create ROLE_USER or ROLE_COMMUNITY_ADMIN
     */
    public User createUser(String name, String email, String password, String roleName,
                           String adminEmail, String adminRole) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Error: Email is already in use!");
        }

        Role role;
        try {
            role = Role.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Error: Invalid role specified.");
        }

        if ("ROLE_COMMUNITY_ADMIN".equals(adminRole)) {
            if (role != Role.ROLE_USER) {
                throw new IllegalArgumentException("Access Denied: Community Admin can only create Resident users.");
            }
        } else if ("ROLE_ADMIN".equals(adminRole)) {
            if (role == Role.ROLE_ADMIN) {
                throw new IllegalArgumentException("Access Denied: Cannot create another Super Admin.");
            }
        } else {
            throw new IllegalArgumentException("Access Denied: Only administrators can create users.");
        }

        User newUser = new User();
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(password));
        newUser.setRole(role);
        newUser.setApproved(true); // Admin-created users are auto-approved

        // If created by Community Admin, auto-link
        if ("ROLE_COMMUNITY_ADMIN".equals(adminRole) && role == Role.ROLE_USER) {
            User communityAdmin = userRepository.findByEmail(adminEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));
            newUser.setManagedByAdmin(communityAdmin);
        }

        return userRepository.save(newUser);
    }

    // =========================================================================
    // CRUD: UPDATE USER
    // =========================================================================

    /**
     * Update user details (name, email).
     * - Community Admin can only update their own managed household users
     * - Super Admin can update any non-super-admin user
     */
    public User updateUser(Long userId, String name, String email, Long householdId,
                           String adminEmail, String adminRole) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        validateAdminScope(targetUser, adminEmail, adminRole);

        if (name != null && !name.trim().isEmpty()) {
            targetUser.setName(name);
        }
        if (email != null && !email.trim().isEmpty()) {
            if (!email.equals(targetUser.getEmail()) && userRepository.existsByEmail(email)) {
                throw new IllegalArgumentException("Error: Email is already in use!");
            }
            targetUser.setEmail(email);
        }

        // Update household assignment
        if (householdId == null || householdId <= 0) {
            targetUser.setHousehold(null);
        } else {
            if (targetUser.getRole() == Role.ROLE_COMMUNITY_ADMIN && !"ROLE_ADMIN".equals(adminRole)) {
                throw new IllegalArgumentException("Access Denied: Only Super Admin can assign households to Community Admins.");
            }
            Household household = householdRepository.findById(householdId)
                    .orElseThrow(() -> new IllegalArgumentException("Household not found!"));

            // Check if already allocated to another user
            List<User> existingOwners = userRepository.findByHouseholdId(householdId);
            boolean alreadyTaken = existingOwners.stream()
                    .anyMatch(o -> !o.getId().equals(userId));
            if (alreadyTaken) {
                throw new IllegalArgumentException("Error: This flat is already allocated to another resident.");
            }

            targetUser.setHousehold(household);
        }

        return userRepository.save(targetUser);
    }

    // =========================================================================
    // CRUD: DELETE USER
    // =========================================================================

    /**
     * Delete a user.
     * - Community Admin can only delete their own managed household users
     * - Super Admin can delete Community Admins + Household Users (not other Super Admins)
     */
    @Transactional
    public void deleteUser(Long userId, String adminEmail, String adminRole) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        validateAdminScope(targetUser, adminEmail, adminRole);

        // 1. Unlink managed residents if deleting a Community Admin
        List<User> managedUsers = userRepository.findAll().stream()
                .filter(u -> u.getManagedByAdmin() != null && u.getManagedByAdmin().getId().equals(userId))
                .collect(Collectors.toList());
        for (User resident : managedUsers) {
            resident.setManagedByAdmin(null);
            userRepository.save(resident);
        }

        // 2. Unlink target user from any System Alerts
        List<com.water.water.model.SystemAlert> alerts = systemAlertRepository.findAll().stream()
                .filter(a -> a.getTargetUser() != null && a.getTargetUser().getId().equals(userId))
                .collect(Collectors.toList());
        for (com.water.water.model.SystemAlert alert : alerts) {
            alert.setTargetUser(null);
            systemAlertRepository.save(alert);
        }

        // 3. Unlink target user from any Bills
        List<com.water.water.model.Bill> bills = billRepository.findAll().stream()
                .filter(b -> b.getTargetUser() != null && b.getTargetUser().getId().equals(userId))
                .collect(Collectors.toList());
        for (com.water.water.model.Bill bill : bills) {
            bill.setTargetUser(null);
            billRepository.save(bill);
        }

        // 4. Detach from Household and manage references
        targetUser.setHousehold(null);
        targetUser.setManagedApartment(null);
        targetUser.setManagedBuilding(null);
        targetUser.setManagedByAdmin(null);
        userRepository.save(targetUser);

        // 5. Safely delete user
        userRepository.delete(targetUser);
    }

    // =========================================================================
    // ASSIGN MANAGED ADMIN (Super Admin only)
    // =========================================================================

    /**
     * Super Admin can reassign a household user to a different Community Admin.
     */
    public User assignManagedAdmin(Long userId, Long communityAdminId, String adminRole) {
        if (!"ROLE_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Access Denied: Only Super Admin can reassign managing admins.");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        if (targetUser.getRole() != Role.ROLE_USER) {
            throw new IllegalArgumentException("Error: Can only assign managing admin for Household Users.");
        }

        if (communityAdminId == null) {
            targetUser.setManagedByAdmin(null);
        } else {
            User communityAdmin = userRepository.findById(communityAdminId)
                    .orElseThrow(() -> new IllegalArgumentException("Community Admin not found!"));
            if (communityAdmin.getRole() != Role.ROLE_COMMUNITY_ADMIN) {
                throw new IllegalArgumentException("Error: Target user is not a Community Admin.");
            }
            targetUser.setManagedByAdmin(communityAdmin);
        }

        return userRepository.save(targetUser);
    }

    // =========================================================================
    // ASSIGN APARTMENT TO COMMUNITY ADMIN (Super Admin only)
    // =========================================================================

    public User assignAdminApartment(Long adminId, Long apartmentId, String adminRole) {
        if (!"ROLE_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Access Denied: Only Super Admin can assign an apartment to a Community Admin.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));

        if (admin.getRole() != Role.ROLE_COMMUNITY_ADMIN) {
            throw new IllegalArgumentException("Error: Target user is not a Community Admin.");
        }

        if (apartmentId == null) {
            admin.setManagedApartment(null);
        } else {
            Apartment apartment = apartmentRepository.findById(apartmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Apartment not found!"));
            admin.setManagedApartment(apartment);
        }

        return userRepository.save(admin);
    }

    // =========================================================================
    // FLAT ASSIGNMENT
    // =========================================================================

    public User assignResidentToHousehold(Long userId, Long householdId, String adminRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN && !"ROLE_ADMIN".equals(adminRole)) {
            throw new IllegalArgumentException("Access Denied: Only Super Admin can assign households to Community Admins.");
        }

        if (householdId == null) {
            user.setHousehold(null);
        } else {
            Household household = householdRepository.findById(householdId)
                    .orElseThrow(() -> new IllegalArgumentException("Household not found!"));

            // Check if already allocated to another user
            List<User> existingOwners = userRepository.findByHouseholdId(householdId);
            boolean alreadyTaken = existingOwners.stream()
                    .anyMatch(o -> !o.getId().equals(userId));
            if (alreadyTaken) {
                throw new IllegalArgumentException("Error: This flat is already allocated to another resident.");
            }

            user.setHousehold(household);
        }
        return userRepository.save(user);
    }

    public Household updateMeterStatus(Long householdId, boolean hasMeter) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household not found!"));

        household.setHasMeter(hasMeter);
        return householdRepository.save(household);
    }

    // =========================================================================
    // HELPER: Validate admin scope for CRUD operations
    // =========================================================================

    private void validateAdminScope(User targetUser, String adminEmail, String adminRole) {
        boolean isSuperAdmin = "ROLE_ADMIN".equalsIgnoreCase(adminRole) || "ADMIN".equalsIgnoreCase(adminRole);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(adminRole) || "COMMUNITY_ADMIN".equalsIgnoreCase(adminRole);

        if (isCommunityAdmin) {
            if (targetUser.getRole() != Role.ROLE_USER) {
                throw new IllegalArgumentException("Access Denied: Community Admin can only manage Resident users.");
            }
            // Verify the target user is managed by this community admin
            User admin = userRepository.findByEmail(adminEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));
            if (targetUser.getManagedByAdmin() == null ||
                !targetUser.getManagedByAdmin().getId().equals(admin.getId())) {
                throw new IllegalArgumentException("Access Denied: This user is not under your management.");
            }
        } else if (isSuperAdmin) {
            if (targetUser.getRole() == Role.ROLE_ADMIN) {
                throw new IllegalArgumentException("Access Denied: Cannot modify another Super Admin.");
            }
        } else {
            throw new IllegalArgumentException("Access Denied: Only administrators can perform this action.");
        }
    }

}