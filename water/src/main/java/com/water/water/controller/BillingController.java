package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import org.json.JSONObject;
import com.razorpay.RazorpayClient;
import com.razorpay.Order;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import java.awt.Color;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import java.io.ByteArrayOutputStream;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Autowired
    private BillingCycleRepository billingCycleRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private TariffPlanRepository tariffPlanRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @GetMapping("/cycles")
    public ResponseEntity<List<BillingCycle>> getCycles(Authentication authentication) {
        if (authentication != null) {
            String role = authentication.getAuthorities().stream().map(a -> a.getAuthority()).findFirst().orElse("");
            if ("ROLE_COMMUNITY_ADMIN".equals(role)) {
                User admin = userRepository.findByEmail(authentication.getName()).orElse(null);
                if (admin != null && admin.getManagedApartment() != null) {
                    List<BillingCycle> cycles = billingCycleRepository.findAll().stream()
                            .filter(c -> c.getApartment() != null && c.getApartment().getId().equals(admin.getManagedApartment().getId()))
                            .collect(Collectors.toList());
                    return ResponseEntity.ok(cycles);
                }
                return ResponseEntity.ok(new ArrayList<>());
            }
        }
        return ResponseEntity.ok(billingCycleRepository.findAll());
    }

    @PostMapping("/cycle")
    public ResponseEntity<?> createCycle(@RequestBody Map<String, Object> request) {
        try {
            Long apartmentId = Long.valueOf(request.get("apartmentId").toString());
            LocalDate startDate = LocalDate.parse(request.get("startDate").toString());
            LocalDate endDate = LocalDate.parse(request.get("endDate").toString());
            BigDecimal totalBulkCost = request.containsKey("totalBulkCost") && request.get("totalBulkCost") != null
                    ? new BigDecimal(request.get("totalBulkCost").toString())
                    : BigDecimal.ZERO;

            Apartment apartment = apartmentRepository.findById(apartmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Apartment not found!"));

            BillingCycle cycle = new BillingCycle();
            cycle.setApartment(apartment);
            cycle.setStartDate(startDate);
            cycle.setEndDate(endDate);
            cycle.setTotalBulkCost(totalBulkCost);
            cycle.setFinalized(false);

            return ResponseEntity.ok(billingCycleRepository.save(cycle));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/cycle/{id}")
    public ResponseEntity<?> deleteCycle(@PathVariable Long id, Authentication authentication) {
        try {
            BillingCycle cycle = billingCycleRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Billing cycle not found!"));

            if (cycle.isFinalized()) {
                return ResponseEntity.badRequest().body("Error: Cannot delete a finalized billing cycle!");
            }

            List<Bill> associatedBills = billRepository.findByBillingCycleId(id);
            if (associatedBills != null && !associatedBills.isEmpty()) {
                billRepository.deleteAll(associatedBills);
            }

            billingCycleRepository.delete(cycle);
            return ResponseEntity.ok("Billing cycle deleted successfully!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }


    @PostMapping("/cycle/{id}/finalize")
    public ResponseEntity<?> finalizeCycle(@PathVariable Long id, Authentication authentication) {
        try {
            BillingCycle cycle = billingCycleRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Billing cycle not found!"));

            if (cycle.isFinalized()) {
                return ResponseEntity.badRequest().body("Error: Billing cycle is already finalized!");
            }

            // Debug: log who is calling finalize and with what authorities
            String callerEmail = authentication.getName();
            java.util.Collection<?> callerAuthorities = authentication.getAuthorities();
            System.out.println("[FINALIZE] Called by: " + callerEmail + " | authorities: " + callerAuthorities + " | cycleId: " + id);

            // Role check: only community admins and super admins can finalize
            boolean isAdmin = callerAuthorities.stream()
                    .map(a -> a.toString())
                    .anyMatch(a -> a.contains("ADMIN"));
            if (!isAdmin) {
                System.out.println("[FINALIZE] BLOCKED - user does not have ADMIN authority");
                return ResponseEntity.status(403).body("Access Denied: Only Community Admins can finalize billing cycles.");
            }

            // Determine which households to bill for this cycle
            User user = userRepository.findByEmail(callerEmail).orElse(null);
            List<Household> householdsToProcess;
            if (user != null && user.getManagedApartment() != null) {
                householdsToProcess = householdRepository.findAll().stream()
                        .filter(h -> h.getApartment() != null && h.getApartment().getId().equals(user.getManagedApartment().getId()))
                        .collect(Collectors.toList());
            } else {
                householdsToProcess = householdRepository.findAll().stream()
                        .filter(h -> h.getApartment() != null && h.getApartment().getId().equals(cycle.getApartment().getId()))
                        .collect(Collectors.toList());
            }

            if (householdsToProcess.isEmpty()) {
                return ResponseEntity.badRequest().body("No registered households/flats found in this apartment block. Please add households first.");
            }

            List<Bill> generatedBills = new ArrayList<>();

            TariffPlan tariff = tariffPlanRepository.findByApartmentId(cycle.getApartment().getId()).orElse(null);
            BigDecimal baseRate = tariff != null ? tariff.getBaseRate() : new BigDecimal("30.0");
            BigDecimal excessRate = tariff != null ? tariff.getExcessRate() : new BigDecimal("60.0");
            double baseLimitKl = tariff != null ? tariff.getBaseLimitKl() : 15.0;
            int baseLimitDays = (tariff != null && tariff.getBaseLimitDays() != null) ? tariff.getBaseLimitDays() : 30;

            // Calculate proportional base limit based on cycle length vs base limit days
            long cycleDays = java.time.temporal.ChronoUnit.DAYS.between(cycle.getStartDate(), cycle.getEndDate()) + 1;
            double proportionalBaseLimitKl = baseLimitKl * ((double) cycleDays / baseLimitDays);

            double meteredConsumptionSum = 0;
            double meteredAreaSum = 0;
            java.util.Map<Long, Double> householdConsumptions = new java.util.HashMap<>();

            for (Household h : householdsToProcess) {
                List<WaterUsageLog> logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(h.getId());
                double consumptionLiters = 0.0;
                if (logs != null) {
                    for (WaterUsageLog log : logs) {
                        if (log.getDate() != null
                                && (log.getDate().isAfter(cycle.getStartDate()) || log.getDate().isEqual(cycle.getStartDate()))
                                && (log.getDate().isBefore(cycle.getEndDate()) || log.getDate().isEqual(cycle.getEndDate()))) {
                            consumptionLiters += log.getConsumptionLiters();
                        }
                    }
                }
                householdConsumptions.put(h.getId(), consumptionLiters);
                boolean hasMeter = Boolean.TRUE.equals(h.isHasMeter());
                double area = (h.getAreaSqm() > 0) ? h.getAreaSqm() : 100.0;
                if (hasMeter && consumptionLiters > 0) {
                    meteredConsumptionSum += consumptionLiters;
                    meteredAreaSum += area;
                }
            }

            double avgConsumptionPerSqm = (meteredAreaSum > 0) ? (meteredConsumptionSum / meteredAreaSum) : 5.0;

            for (Household h : householdsToProcess) {
                boolean hasMeter = Boolean.TRUE.equals(h.isHasMeter());
                double area = (h.getAreaSqm() > 0) ? h.getAreaSqm() : 100.0;
                if (!hasMeter) {
                    double estimated = avgConsumptionPerSqm * area;
                    householdConsumptions.put(h.getId(), estimated);
                }
            }

            for (Household h : householdsToProcess) {
                double consumptionLiters = householdConsumptions.get(h.getId());

                double baseLimitLiters = proportionalBaseLimitKl * 1000.0;
                BigDecimal baseCost = BigDecimal.ZERO;
                BigDecimal excessCost = BigDecimal.ZERO;

                if (consumptionLiters <= baseLimitLiters) {
                    baseCost = baseRate.multiply(BigDecimal.valueOf(consumptionLiters / 1000.0));
                } else {
                    baseCost = baseRate.multiply(BigDecimal.valueOf(baseLimitLiters / 1000.0));
                    excessCost = excessRate.multiply(BigDecimal.valueOf((consumptionLiters - baseLimitLiters) / 1000.0));
                }

                BigDecimal sharedCostAllocation = BigDecimal.ZERO;

                BigDecimal subtotal = baseCost.add(excessCost);
                BigDecimal taxAmount = subtotal.multiply(new BigDecimal("0.05")).setScale(2, java.math.RoundingMode.HALF_UP);
                BigDecimal platformFee = new BigDecimal("5.00");
                BigDecimal billAmount = subtotal.add(taxAmount).add(platformFee).setScale(2, java.math.RoundingMode.HALF_UP);

                Bill bill = new Bill();
                bill.setHousehold(h);
                bill.setBillingCycle(cycle);
                bill.setConsumptionLiters(consumptionLiters);
                bill.setBaseCharge(baseCost);
                bill.setExcessCharge(excessCost);
                bill.setSharedCostAllocation(sharedCostAllocation);
                bill.setTaxAmount(taxAmount);
                bill.setPlatformFee(platformFee);
                bill.setAmount(billAmount);
                bill.setPaid(false);
                bill.setInvoiceNumber("INV-" + cycle.getStartDate().getYear() + "-" + (100000 + h.getId()) + "-" + id);

                bill = billRepository.save(bill);
                generatedBills.add(bill);

                // Notify User
                try {
                    SystemAlert alert = new SystemAlert();
                    alert.setHousehold(h);
                    alert.setTitle("New Bill Generated");
                    alert.setMessage("A new bill of ₹" + billAmount + " has been generated for the period " + cycle.getStartDate() + " to " + cycle.getEndDate() + ".");
                    alert.setDate(LocalDate.now());
                    alert.setType("BILLING");
                    systemAlertRepository.save(alert);
                } catch (Exception ex) {
                    System.err.println("Alert creation failed: " + ex.getMessage());
                }
            }

            cycle.setFinalized(true);
            billingCycleRepository.save(cycle);

            return ResponseEntity.ok(generatedBills);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/cycle/{id}/bills")
    public ResponseEntity<?> getCycleBills(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        List<Bill> allCycleBills = billRepository.findByBillingCycleId(id);

        if (user.getRole() == Role.ROLE_ADMIN) {
            return ResponseEntity.ok(allCycleBills);
        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            List<User> managedUsers = userRepository.findByManagedByAdminId(user.getId());
            List<Long> managedHouseholdIds = managedUsers.stream()
                    .filter(u -> u.getHousehold() != null)
                    .map(u -> u.getHousehold().getId())
                    .collect(Collectors.toList());
            List<Bill> filteredBills = allCycleBills.stream()
                    .filter(b -> (b.getHousehold() != null && managedHouseholdIds.contains(b.getHousehold().getId())) || 
                                 (b.getTargetUser() != null && b.getTargetUser().getId().equals(user.getId())))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(filteredBills);
        } else {
            List<Bill> filteredBills = allCycleBills.stream()
                    .filter(b -> b.getHousehold() != null && user.getHousehold() != null && b.getHousehold().getId().equals(user.getHousehold().getId()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(filteredBills);
        }
    }

    // =========================================================================
    // SCOPED BILL RETRIEVAL
    // =========================================================================

    @GetMapping("/bills")
    public ResponseEntity<?> getBills(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        if (user.getRole() == Role.ROLE_USER) {
            // Household user: see only their household bills + bills targeting them
            List<Bill> result = new ArrayList<>();
            if (user.getHousehold() != null) {
                result.addAll(billRepository.findByHouseholdId(user.getHousehold().getId()));
            }
            return ResponseEntity.ok(result);
        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            // Community Admin: see bills for their managed households + bills targeting themselves
            List<User> managedUsers = userRepository.findByManagedByAdminId(user.getId());
            List<Long> managedHouseholdIds = managedUsers.stream()
                    .filter(u -> u.getHousehold() != null)
                    .map(u -> u.getHousehold().getId())
                    .collect(Collectors.toList());
            if (user.getManagedApartment() != null) {
                userRepository.findByRole(Role.ROLE_USER).stream()
                        .filter(u -> u.getHousehold() != null && u.getHousehold().getApartment().getId().equals(user.getManagedApartment().getId()))
                        .forEach(u -> managedHouseholdIds.add(u.getHousehold().getId()));
            }
            List<Long> distinctIds = managedHouseholdIds.stream().distinct().collect(Collectors.toList());

            List<Bill> result = new ArrayList<>();
            if (!distinctIds.isEmpty()) {
                result.addAll(billRepository.findByHouseholdIdIn(distinctIds));
            }
            // Also include bills directly targeting this community admin
            result.addAll(billRepository.findByTargetUserId(user.getId()));
            return ResponseEntity.ok(result);
        } else {
            // Super Admin: see all bills
            return ResponseEntity.ok(billRepository.findAll());
        }
    }

    // =========================================================================
    // GENERATE ADMIN BILL (Super Admin → Community Admin)
    // =========================================================================

    @PostMapping("/admin-bill")
    public ResponseEntity<?> createAdminBill(@RequestBody Map<String, Object> request,
                                              Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");

            if (!"ROLE_ADMIN".equals(role)) {
                return ResponseEntity.status(403).body("Access Denied: Only Super Admin can generate admin bills.");
            }

            Long targetUserId = Long.valueOf(request.get("targetUserId").toString());
            Long billingCycleId = Long.valueOf(request.get("billingCycleId").toString());
            BigDecimal amount = new BigDecimal(request.get("amount").toString());

            User targetUser = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Target user not found!"));
            BillingCycle cycle = billingCycleRepository.findById(billingCycleId)
                    .orElseThrow(() -> new IllegalArgumentException("Billing cycle not found!"));

            Bill bill = new Bill();
            bill.setTargetUser(targetUser);
            bill.setBillingCycle(cycle);
            bill.setAmount(amount);
            bill.setConsumptionLiters(0);
            bill.setPaid(false);
            bill.setInvoiceNumber("ADM-" + cycle.getStartDate().getYear() + "-" + targetUserId + "-" + System.currentTimeMillis() % 10000);

            return ResponseEntity.ok(billRepository.save(bill));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // =========================================================================
    // UPDATE BILL
    // =========================================================================

    @PutMapping("/bill/{billId}")
    public ResponseEntity<?> updateBill(@PathVariable Long billId, @RequestBody Map<String, Object> request,
                                        Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            Bill bill = billRepository.findById(billId)
                    .orElseThrow(() -> new IllegalArgumentException("Bill not found!"));

            if (request.containsKey("amount")) {
                bill.setAmount(new BigDecimal(request.get("amount").toString()));
            }
            if (request.containsKey("paid")) {
                bill.setPaid(Boolean.parseBoolean(request.get("paid").toString()));
                if (bill.isPaid()) {
                    bill.setPaymentDate(LocalDateTime.now());
                }
            }

            return ResponseEntity.ok(billRepository.save(bill));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // =========================================================================
    // DELETE BILL
    // =========================================================================

    @DeleteMapping("/bill/{billId}")
    public ResponseEntity<?> deleteBill(@PathVariable Long billId, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst().orElse("ROLE_USER");

            Bill bill = billRepository.findById(billId)
                    .orElseThrow(() -> new IllegalArgumentException("Bill not found!"));

            // Community Admin can only delete bills for their managed households
            if ("ROLE_COMMUNITY_ADMIN".equals(role)) {
                String email = authentication.getName();
                User admin = userRepository.findByEmail(email)
                        .orElseThrow(() -> new IllegalArgumentException("Admin not found!"));
                List<User> managedUsers = userRepository.findByManagedByAdminId(admin.getId());
                List<Long> managedHouseholdIds = managedUsers.stream()
                        .filter(u -> u.getHousehold() != null)
                        .map(u -> u.getHousehold().getId())
                        .distinct()
                        .collect(Collectors.toList());

                if (bill.getHousehold() == null || !managedHouseholdIds.contains(bill.getHousehold().getId())) {
                    return ResponseEntity.status(403).body("Access Denied: This bill is not under your management.");
                }
            } else if (!"ROLE_ADMIN".equals(role)) {
                return ResponseEntity.status(403).body("Access Denied");
            }

            billRepository.delete(bill);
            return ResponseEntity.ok("Bill deleted successfully!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pay/{billId}")
    public ResponseEntity<?> payBill(@PathVariable Long billId) {
        try {
            Bill bill = billRepository.findById(billId)
                    .orElseThrow(() -> new IllegalArgumentException("Bill not found!"));
            bill.setPaid(true);
            bill.setPaymentDate(LocalDateTime.now());
            bill = billRepository.save(bill);
            
            // Notify Admins
            List<User> admins = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ROLE_COMMUNITY_ADMIN)
                    .collect(Collectors.toList());
            for (User admin : admins) {
                SystemAlert adminAlert = new SystemAlert();
                adminAlert.setTargetUser(admin);
                adminAlert.setTitle("Bill Paid");
                adminAlert.setMessage("Bill " + bill.getInvoiceNumber() + " for Flat " + (bill.getHousehold() != null ? bill.getHousehold().getFlatNumber() : "?") + " has been paid.");
                adminAlert.setDate(LocalDate.now());
                adminAlert.setType("PAYMENT");
                systemAlertRepository.save(adminAlert);
            }
            
            return ResponseEntity.ok(bill);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pay/razorpay/create-order/{billId}")
    public ResponseEntity<?> createRazorpayOrder(@PathVariable Long billId) {
        try {
            Bill bill = billRepository.findById(billId)
                    .orElseThrow(() -> new IllegalArgumentException("Bill not found!"));
            
            int amountInPaise = bill.getAmount().multiply(new BigDecimal(100)).intValue();
            
            try {
                RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                
                JSONObject orderRequest = new JSONObject();
                orderRequest.put("amount", amountInPaise);
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", "inv_" + bill.getInvoiceNumber());
                
                Order order = razorpay.orders.create(orderRequest);
                
                bill.setRazorpayOrderId(order.get("id"));
                billRepository.save(bill);
                
                Map<String, Object> response = new HashMap<>();
                response.put("orderId", order.get("id"));
                response.put("amount", amountInPaise);
                response.put("currency", "INR");
                response.put("keyId", razorpayKeyId);
                response.put("billId", bill.getId());
                
                return ResponseEntity.ok(response);
            } catch (Exception re) {
                System.err.println("Razorpay SDK Error, falling back to mock order: " + re.getMessage());
                throw re;
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pay/razorpay/verify")
    public ResponseEntity<?> verifyRazorpayPayment(@RequestBody Map<String, String> request) {
        try {
            String razorpayPaymentId = request.get("razorpayPaymentId");
            String razorpayOrderId = request.get("razorpayOrderId");
            String razorpaySignature = request.get("razorpaySignature");
            Long billId = Long.valueOf(request.get("billId"));
            
            Bill bill = billRepository.findById(billId)
                    .orElseThrow(() -> new IllegalArgumentException("Bill not found!"));
            
            boolean isValid = false;
            try {
                JSONObject options = new JSONObject();
                options.put("razorpay_order_id", razorpayOrderId);
                options.put("razorpay_payment_id", razorpayPaymentId);
                options.put("razorpay_signature", razorpaySignature);
                
                isValid = com.razorpay.Utils.verifyPaymentSignature(options, razorpayKeySecret);
            } catch (Exception e) {
                System.err.println("Razorpay signature verification exception: " + e.getMessage());
                isValid = false;
            }
            
            if (isValid) {
                bill.setPaid(true);
                bill.setPaymentDate(LocalDateTime.now());
                bill.setRazorpayPaymentId(razorpayPaymentId);
                bill.setRazorpaySignature(razorpaySignature);
                bill = billRepository.save(bill);

                // Notify Admins
                List<User> admins = userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ROLE_COMMUNITY_ADMIN)
                        .collect(Collectors.toList());
                for (User admin : admins) {
                    SystemAlert adminAlert = new SystemAlert();
                    adminAlert.setTargetUser(admin);
                    adminAlert.setTitle("Bill Paid");
                    adminAlert.setMessage("Bill " + bill.getInvoiceNumber() + " for Flat " + (bill.getHousehold() != null ? bill.getHousehold().getFlatNumber() : "?") + " has been paid.");
                    adminAlert.setDate(LocalDate.now());
                    adminAlert.setType("PAYMENT");
                    systemAlertRepository.save(adminAlert);
                }

                return ResponseEntity.ok(bill);
            } else {
                return ResponseEntity.badRequest().body("Error: Razorpay payment signature verification failed.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
    @GetMapping("/bill/{billId}/pdf")
    public ResponseEntity<byte[]> downloadBillPdf(@PathVariable Long billId) {
        try {
            Bill bill = billRepository.findById(billId).orElseThrow(() -> new IllegalArgumentException("Bill not found!"));

            String signatoryName = "COMMUNITY ADMIN";
            if (bill.getHousehold() != null) {
                List<User> householdUsers = userRepository.findByHouseholdId(bill.getHousehold().getId());
                for (User u : householdUsers) {
                    if (u.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
                        signatoryName = u.getName().toUpperCase();
                        break;
                    } else if (u.getManagedByAdmin() != null) {
                        signatoryName = u.getManagedByAdmin().getName().toUpperCase();
                        break;
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Colors
            Color primaryBlue = new Color(37, 99, 235);
            Color darkText = new Color(30, 41, 59);
            Color grayText = new Color(100, 116, 139);
            Color lightGrayBg = new Color(248, 250, 252);
            Color lightGreenBg = new Color(220, 252, 231);
            Color darkGreen = new Color(22, 163, 74);
            Color tableHeaderBg = new Color(15, 23, 42);
            Color lightRedBg = new Color(254, 242, 242);
            Color redText = new Color(220, 38, 38);
            Color orangeBg = new Color(255, 247, 237);
            Color orangeBorder = new Color(253, 186, 116);
            Color orangeText = new Color(234, 88, 12);

            // Fonts
            Font fLogoA = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, primaryBlue);
            Font fLogoB = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(56, 189, 248));
            Font fLogoSub = FontFactory.getFont(FontFactory.HELVETICA, 8, grayText);
            Font fInvoiceTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, darkText);
            Font fInvoiceNo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, grayText);
            Font fPaidBadge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkGreen);
            
            Font fBox1Title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, darkText);
            Font fBox1Sub = FontFactory.getFont(FontFactory.HELVETICA, 9, grayText);
            Font fIsoBadge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, primaryBlue);
            
            Font fSectionLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, grayText);
            Font fEntityName = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, darkText);
            Font fNormal = FontFactory.getFont(FontFactory.HELVETICA, 9, grayText);
            
            Font fGridLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, grayText);
            Font fGridVal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, darkText);
            
            Font fTh = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            Font fTdBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkText);
            Font fTdNorm = FontFactory.getFont(FontFactory.HELVETICA, 9, grayText);
            Font fTdGreen = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkGreen);
            Font fTdRed = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, redText);
            Font fTdRedSub = FontFactory.getFont(FontFactory.HELVETICA, 9, redText);

            // -- TOP HEADER --
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new float[]{2f, 1f});
            
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            Phrase pLogo = new Phrase();
            pLogo.add(new Chunk("Aqua", fLogoA));
            pLogo.add(new Chunk("Track\n", fLogoB));
            logoCell.addElement(pLogo);
            logoCell.addElement(new Paragraph("Smart Water Utility Management System", fLogoSub));
            logoCell.addElement(new Paragraph("Reg. No: AQWMS/2024/GOV-0471 | GST: 27AAQCA9876B1ZM", fLogoSub));
            header.addCell(logoCell);
            
            PdfPCell rightH = new PdfPCell();
            rightH.setBorder(Rectangle.NO_BORDER);
            rightH.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph pInv = new Paragraph("INVOICE\n", fInvoiceTitle);
            pInv.setAlignment(Element.ALIGN_RIGHT);
            rightH.addElement(pInv);
            Paragraph pInvNo = new Paragraph("#" + bill.getInvoiceNumber() + "\n\n", fInvoiceNo);
            pInvNo.setAlignment(Element.ALIGN_RIGHT);
            rightH.addElement(pInvNo);
            
            if (bill.isPaid()) {
                PdfPTable badgeTb = new PdfPTable(1);
                badgeTb.setWidthPercentage(40);
                badgeTb.setHorizontalAlignment(Element.ALIGN_RIGHT);
                PdfPCell badgeC = new PdfPCell(new Phrase("PAID", fPaidBadge));
                badgeC.setBackgroundColor(lightGreenBg);
                badgeC.setBorderColor(lightGreenBg);
                badgeC.setHorizontalAlignment(Element.ALIGN_CENTER);
                badgeC.setPaddingTop(4);
                badgeC.setPaddingBottom(5);
                badgeTb.addCell(badgeC);
                rightH.addElement(badgeTb);
            }
            header.addCell(rightH);
            document.add(header);
            
            LineSeparator ls = new LineSeparator(1.5f, 100, primaryBlue, Element.ALIGN_CENTER, -10);
            document.add(new Chunk(ls));
            document.add(new Paragraph("\n"));

            // -- BOX 1 (Official Bill Receipt) --
            PdfPTable box1 = new PdfPTable(2);
            box1.setWidthPercentage(100);
            box1.setWidths(new float[]{3f, 1f});
            
            PdfPCell b1l = new PdfPCell();
            b1l.setBorder(Rectangle.LEFT | Rectangle.TOP | Rectangle.BOTTOM);
            b1l.setBorderColor(new Color(226, 232, 240));
            b1l.setBackgroundColor(lightGrayBg);
            b1l.setPadding(15);
            b1l.addElement(new Paragraph("AquaTrack Water Authority — Official Bill Receipt", fBox1Title));
            b1l.addElement(new Paragraph("Issued under the Water Utility Services Act • Urban Housing & Infrastructure Division", fBox1Sub));
            box1.addCell(b1l);
            
            PdfPCell b1r = new PdfPCell();
            b1r.setBorder(Rectangle.RIGHT | Rectangle.TOP | Rectangle.BOTTOM);
            b1r.setBorderColor(new Color(226, 232, 240));
            b1r.setBackgroundColor(lightGrayBg);
            b1r.setPadding(15);
            b1r.setHorizontalAlignment(Element.ALIGN_RIGHT);
            b1r.setVerticalAlignment(Element.ALIGN_MIDDLE);
            
            PdfPTable isoTb = new PdfPTable(1);
            isoTb.setWidthPercentage(100);
            PdfPCell isoC = new PdfPCell(new Phrase("✔ ISO 9001:2015 CERTIFIED", fIsoBadge));
            isoC.setBorderColor(primaryBlue);
            isoC.setBorderWidth(1f);
            isoC.setBackgroundColor(Color.WHITE);
            isoC.setPadding(5);
            isoC.setHorizontalAlignment(Element.ALIGN_CENTER);
            isoTb.addCell(isoC);
            b1r.addElement(isoTb);
            box1.addCell(b1r);
            document.add(box1);
            document.add(new Paragraph("\n"));

            // -- BOX 2 (Parties) --
            PdfPTable box2 = new PdfPTable(2);
            box2.setWidthPercentage(100);
            
            PdfPCell b2l = new PdfPCell();
            b2l.setBorder(Rectangle.NO_BORDER);
            b2l.addElement(new Paragraph("SERVICE PROVIDER", fSectionLbl));
            b2l.addElement(new Paragraph("AquaTrack Water Authority", fEntityName));
            b2l.addElement(new Paragraph("Community Water Utility Management Division", fNormal));
            b2l.addElement(new Paragraph("Helpline: 1800-AQA-HELP (Toll Free)", fNormal));
            b2l.addElement(new Paragraph("Email: support@aquatrack.in", fNormal));
            b2l.addElement(new Paragraph("Website: www.aquatrack.in", fNormal));
            box2.addCell(b2l);
            
            String cName = bill.getTargetUser() != null ? bill.getTargetUser().getName() : "Resident";
            String cApt = "Flat Resident";
            String cId = "AQ-USR-" + String.format("%06d", bill.getTargetUser() != null ? bill.getTargetUser().getId() : 0);
            if (bill.getHousehold() != null) {
                cApt = "Resident — House " + bill.getHousehold().getFlatNumber();
                if (bill.getHousehold().getApartment() != null) {
                    cApt += "\nApartment Block: " + bill.getHousehold().getApartment().getName();
                }
            }
            
            PdfPCell b2r = new PdfPCell();
            b2r.setBorder(Rectangle.NO_BORDER);
            Paragraph plbl = new Paragraph("BILLED TO", fSectionLbl);
            plbl.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(plbl);
            Paragraph pname = new Paragraph(cName, fEntityName);
            pname.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(pname);
            Paragraph pApt = new Paragraph(cApt, fNormal);
            pApt.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(pApt);
            Paragraph pId = new Paragraph("AquaTrack Consumer ID: " + cId, fNormal);
            pId.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(pId);
            Paragraph pMeter = new Paragraph("Meter No: WMID-" + (bill.getHousehold() != null ? bill.getHousehold().getId() : "123"), fNormal);
            pMeter.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(pMeter);
            Paragraph pType = new Paragraph("Connection Type: Residential", fNormal);
            pType.setAlignment(Element.ALIGN_RIGHT);
            b2r.addElement(pType);
            box2.addCell(b2r);
            document.add(box2);
            document.add(new Paragraph("\n"));
            
            // -- BOX 3 (Grid) --
            // Fetch real tariff
            TariffPlan tariff = tariffPlanRepository.findByApartmentId(bill.getBillingCycle().getApartment().getId()).orElse(null);
            BigDecimal baseRatePerLiter = tariff != null ? tariff.getBaseRate().divide(new BigDecimal("1000"), 4, java.math.RoundingMode.HALF_UP) : new BigDecimal("0.03");
            BigDecimal excessRatePerLiter = tariff != null ? tariff.getExcessRate().divide(new BigDecimal("1000"), 4, java.math.RoundingMode.HALF_UP) : new BigDecimal("0.06");
            double baseLimitKlPlan = tariff != null ? tariff.getBaseLimitKl() : 10.0;
            int baseLimitDays = (tariff != null && tariff.getBaseLimitDays() != null) ? tariff.getBaseLimitDays() : 30;

            long cycleDaysPdf = java.time.temporal.ChronoUnit.DAYS.between(bill.getBillingCycle().getStartDate(), bill.getBillingCycle().getEndDate()) + 1;
            double proportionalBaseLimitKl = baseLimitKlPlan * ((double) cycleDaysPdf / baseLimitDays);
            long actualBaseLimitLiters = (long) (proportionalBaseLimitKl * 1000.0);

            PdfPTable box3 = new PdfPTable(4);
            box3.setWidthPercentage(100);
            Color gridBorder = new Color(203, 213, 225);
            addGridCell(box3, "INVOICE DATE", bill.getBillingCycle().getStartDate().toString(), gridBorder, fGridLbl, fGridVal);
            addGridCell(box3, "DUE DATE", bill.getBillingCycle().getEndDate().plusDays(5).toString(), gridBorder, fGridLbl, fGridVal);
            addGridCell(box3, "CONSUMPTION", bill.getConsumptionLiters() + " Liters", gridBorder, fGridLbl, fGridVal);
            addGridCell(box3, "RATE / LITER", "₹" + String.format("%.4f", baseRatePerLiter), gridBorder, fGridLbl, fGridVal);
            document.add(box3);
            document.add(new Paragraph("\n"));

            // -- CHARGES TABLE --
            PdfPTable t = new PdfPTable(4);
            t.setWidthPercentage(100);
            t.setWidths(new float[]{4f, 1.5f, 1.5f, 1.5f});
            
            addTh(t, "DESCRIPTION", tableHeaderBg, fTh, Element.ALIGN_LEFT);
            addTh(t, "QTY (LITERS)", tableHeaderBg, fTh, Element.ALIGN_CENTER);
            addTh(t, "UNIT RATE (₹)", tableHeaderBg, fTh, Element.ALIGN_CENTER);
            addTh(t, "AMOUNT (₹)", tableHeaderBg, fTh, Element.ALIGN_RIGHT);
            
            long consumed = (long) bill.getConsumptionLiters();
            long baseQty = Math.min(consumed, actualBaseLimitLiters);
            long excessQty = Math.max(0, consumed - actualBaseLimitLiters);
            
            PdfPCell c1a = new PdfPCell();
            c1a.setBorderColor(gridBorder); c1a.setBorder(Rectangle.BOTTOM); c1a.setPadding(10);
            c1a.addElement(new Paragraph("Standard Consumption Charge", fTdBold));
            c1a.addElement(new Paragraph("Within cycle limit (" + actualBaseLimitLiters + " L)", fTdGreen));
            t.addCell(c1a);
            addTd(t, baseQty + " L", gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, String.format("%.4f", baseRatePerLiter), gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, "₹" + String.format("%.2f", bill.getBaseCharge() != null ? bill.getBaseCharge() : BigDecimal.ZERO), gridBorder, fTdGreen, Element.ALIGN_RIGHT);
            
            if (excessQty > 0) {
                PdfPCell c2a = new PdfPCell();
                c2a.setBackgroundColor(lightRedBg);
                c2a.setBorderColor(gridBorder); c2a.setBorder(Rectangle.BOTTOM); c2a.setPadding(10);
                c2a.addElement(new Paragraph("⚠ Excess Consumption Charge", fTdRed));
                c2a.addElement(new Paragraph(excessQty + " L above cycle limit — penalty rate applies", fTdRedSub));
                t.addCell(c2a);
                addTd(t, excessQty + " L", gridBorder, fTdRedSub, Element.ALIGN_CENTER, lightRedBg);
                addTd(t, String.format("%.4f", excessRatePerLiter), gridBorder, fTdRedSub, Element.ALIGN_CENTER, lightRedBg);
                addTd(t, "+₹" + String.format("%.2f", bill.getExcessCharge() != null ? bill.getExcessCharge() : BigDecimal.ZERO), gridBorder, fTdRed, Element.ALIGN_RIGHT, lightRedBg);
            }
            
            if (bill.getSharedCostAllocation() != null && bill.getSharedCostAllocation().compareTo(BigDecimal.ZERO) > 0) {
                PdfPCell c3a = new PdfPCell();
                c3a.setBorderColor(gridBorder); c3a.setBorder(Rectangle.BOTTOM); c3a.setPadding(10);
                c3a.addElement(new Paragraph("Maintenance & Infrastructure Cess", fTdNorm));
                t.addCell(c3a);
                addTd(t, "—", gridBorder, fTdNorm, Element.ALIGN_CENTER);
                addTd(t, "—", gridBorder, fTdNorm, Element.ALIGN_CENTER);
                addTd(t, String.format("%.2f", bill.getSharedCostAllocation()), gridBorder, fTdNorm, Element.ALIGN_RIGHT);
            }
            
            BigDecimal subtotalPdf = (bill.getBaseCharge() != null ? bill.getBaseCharge() : BigDecimal.ZERO)
                    .add(bill.getExcessCharge() != null ? bill.getExcessCharge() : BigDecimal.ZERO)
                    .add(bill.getSharedCostAllocation() != null ? bill.getSharedCostAllocation() : BigDecimal.ZERO);
            BigDecimal taxPdf = bill.getTaxAmount() != null && bill.getTaxAmount().compareTo(BigDecimal.ZERO) > 0
                    ? bill.getTaxAmount()
                    : subtotalPdf.multiply(new BigDecimal("0.05")).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal platformFeePdf = bill.getPlatformFee() != null ? bill.getPlatformFee() : new BigDecimal("5.00");

            PdfPCell c4a = new PdfPCell();
            c4a.setBorderColor(gridBorder); c4a.setBorder(Rectangle.BOTTOM); c4a.setPadding(10);
            c4a.addElement(new Paragraph("GST / Government Tax (5%)", fTdNorm));
            t.addCell(c4a);
            addTd(t, "—", gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, "5%", gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, "₹" + String.format("%.2f", taxPdf), gridBorder, fTdNorm, Element.ALIGN_RIGHT);

            PdfPCell c5a = new PdfPCell();
            c5a.setBorderColor(gridBorder); c5a.setBorder(Rectangle.BOTTOM); c5a.setPadding(10);
            c5a.addElement(new Paragraph("Platform Convenience Fee", fTdNorm));
            t.addCell(c5a);
            addTd(t, "—", gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, "Flat", gridBorder, fTdNorm, Element.ALIGN_CENTER);
            addTd(t, "₹" + String.format("%.2f", platformFeePdf), gridBorder, fTdNorm, Element.ALIGN_RIGHT);
            document.add(t);
            document.add(new Paragraph("\n"));
            
            // -- TOTALS --
            PdfPTable totTb = new PdfPTable(2);
            totTb.setWidthPercentage(40);
            totTb.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totTb.setWidths(new float[]{1.5f, 1f});
            
            addNoBorderRow(totTb, "Subtotal", "₹" + String.format("%.2f", subtotalPdf), fNormal);
            addNoBorderRow(totTb, "Tax (GST 5%)", "₹" + String.format("%.2f", taxPdf), fNormal);
            addNoBorderRow(totTb, "Platform Fee", "₹" + String.format("%.2f", platformFeePdf), fNormal);
            
            PdfPCell tl = new PdfPCell(new Paragraph("Total Payable", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, darkText)));
            tl.setBorder(Rectangle.TOP); tl.setBorderColor(primaryBlue); tl.setBorderWidth(2f); tl.setPaddingTop(10);
            totTb.addCell(tl);
            PdfPCell tr = new PdfPCell(new Paragraph("₹" + String.format("%.2f", bill.getAmount()), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, primaryBlue)));
            tr.setBorder(Rectangle.TOP); tr.setBorderColor(primaryBlue); tr.setBorderWidth(2f); tr.setPaddingTop(10);
            tr.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totTb.addCell(tr);
            document.add(totTb);
            document.add(new Paragraph("\n"));
            
            // -- TERMS --
            PdfPTable termsTb = new PdfPTable(1);
            termsTb.setWidthPercentage(100);
            PdfPCell termC = new PdfPCell();
            termC.setBackgroundColor(orangeBg);
            termC.setBorderColor(orangeBorder);
            termC.setBorderWidthLeft(4f);
            termC.setBorderWidthTop(0); termC.setBorderWidthRight(0); termC.setBorderWidthBottom(0);
            termC.setPadding(15);
            termC.addElement(new Paragraph("⚠ IMPORTANT PAYMENT TERMS & POLICIES", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, orangeText)));
            termC.addElement(new Paragraph("This invoice is due on " + bill.getBillingCycle().getEndDate().plusDays(5).toString() + ". Late payment may result in a 2% penalty surcharge per month and potential suspension of water supply. For disputes or queries, contact your Community Admin or call our helpline 1800-AQA-HELP.", fBox1Sub));
            termsTb.addCell(termC);
            document.add(termsTb);
            
            // -- NEXT PAGE FOR PAID --
            if (bill.isPaid() && (bill.getRazorpayPaymentId() != null || bill.getRazorpayOrderId() != null)) {
                document.newPage(); // Important to trigger second page for receipt
                
                PdfPTable rzTb = new PdfPTable(2);
                rzTb.setWidthPercentage(100);
                
                PdfPCell rzHead = new PdfPCell(new Paragraph("✅ Payment Confirmed — Razorpay Transaction Receipt", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkGreen)));
                rzHead.setColspan(2);
                rzHead.setBackgroundColor(new Color(240, 253, 244));
                rzHead.setBorderColor(new Color(134, 239, 172));
                rzHead.setBorderWidthTop(1); rzHead.setBorderWidthLeft(1); rzHead.setBorderWidthRight(1); rzHead.setBorderWidthBottom(0);
                rzHead.setPadding(10);
                rzTb.addCell(rzHead);
                
                PdfPCell rzBodyL = new PdfPCell();
                rzBodyL.setBackgroundColor(new Color(240, 253, 244));
                rzBodyL.setBorderColor(new Color(134, 239, 172));
                rzBodyL.setBorderWidthBottom(1); rzBodyL.setBorderWidthLeft(1); rzBodyL.setBorderWidthRight(0); rzBodyL.setBorderWidthTop(0);
                rzBodyL.setPadding(10);
                rzBodyL.addElement(new Paragraph("PAYMENT ID\n\nORDER ID\n\nPAID AT\n\nGATEWAY", fSectionLbl));
                rzTb.addCell(rzBodyL);
                
                PdfPCell rzBodyR = new PdfPCell();
                rzBodyR.setBackgroundColor(new Color(240, 253, 244));
                rzBodyR.setBorderColor(new Color(134, 239, 172));
                rzBodyR.setBorderWidthBottom(1); rzBodyR.setBorderWidthLeft(0); rzBodyR.setBorderWidthRight(1); rzBodyR.setBorderWidthTop(0);
                rzBodyR.setPadding(10);
                Paragraph rpVals = new Paragraph(
                    (bill.getRazorpayPaymentId() != null ? bill.getRazorpayPaymentId() : "—") + "\n\n" +
                    (bill.getRazorpayOrderId() != null ? bill.getRazorpayOrderId() : "—") + "\n\n" +
                    (bill.getPaymentDate() != null ? bill.getPaymentDate().toString().replace("T", " ") : "—") + "\n\n" +
                    "Razorpay Payments Pvt. Ltd.", 
                    FontFactory.getFont(FontFactory.COURIER, 10, darkText)
                );
                rpVals.setAlignment(Element.ALIGN_RIGHT);
                rzBodyR.addElement(rpVals);
                rzTb.addCell(rzBodyR);
                document.add(rzTb);
            }
            
            document.add(new Paragraph("\n"));
            LineSeparator sepF = new LineSeparator(0.5f, 100, new Color(203, 213, 225), Element.ALIGN_CENTER, -10);
            document.add(new Chunk(sepF));
            document.add(new Paragraph("\n"));
            
            // -- FOOTER --
            PdfPTable fTb = new PdfPTable(2);
            fTb.setWidthPercentage(100);
            PdfPCell fL = new PdfPCell();
            fL.setBorder(Rectangle.NO_BORDER);
            fL.addElement(new Paragraph("PAYMENT METHODS ACCEPTED", fSectionLbl));
            fL.addElement(new Paragraph("UPI • QR Scan • Net Banking\nCheque payable to: AquaTrack Water Authority\nBank: State Water Utility Bank\nA/C: 00AQWU9087312 • IFSC: AQUA0001234", fNormal));
            fTb.addCell(fL);
            
            PdfPCell fR = new PdfPCell();
            fR.setBorder(Rectangle.NO_BORDER);
            Paragraph fRlbl = new Paragraph("IMPORTANT NOTICES", fSectionLbl);
            fRlbl.setAlignment(Element.ALIGN_RIGHT);
            fR.addElement(fRlbl);
            Paragraph fRval = new Paragraph("• Conserve water — report leaks immediately.\n• Meter tampering is a punishable offence.\n• Keep this receipt for your records.\n• Duplicate bills: admin@aquatrack.in", fNormal);
            fRval.setAlignment(Element.ALIGN_RIGHT);
            fR.addElement(fRval);
            fTb.addCell(fR);
            document.add(fTb);
            document.add(new Paragraph("\n"));
            
            // -- SIGNATORY & STAMP --
            PdfPTable sigTb = new PdfPTable(2);
            sigTb.setWidthPercentage(100);
            
            PdfPCell sigL = new PdfPCell();
            sigL.setBorder(Rectangle.NO_BORDER);
            sigL.setVerticalAlignment(Element.ALIGN_BOTTOM);
            sigL.addElement(new Paragraph(signatoryName, FontFactory.getFont(FontFactory.COURIER_BOLD, 11, primaryBlue)));
            LineSeparator sigLine = new LineSeparator(1f, 50, grayText, Element.ALIGN_LEFT, 0);
            sigL.addElement(new Chunk(sigLine));
            sigL.addElement(new Paragraph("AUTHORIZED SIGNATORY", fSectionLbl));
            sigTb.addCell(sigL);
            
            PdfPCell sigR = new PdfPCell();
            sigR.setBorder(Rectangle.NO_BORDER);
            sigR.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph verP = new Paragraph("Verified & Issued by AquaTrack System\n" + (bill.isPaid() && bill.getPaymentDate() != null ? bill.getPaymentDate().toLocalDate().toString() : java.time.LocalDate.now().toString()), fNormal);
            verP.setAlignment(Element.ALIGN_RIGHT);
            sigR.addElement(verP);
            
            if (bill.isPaid()) {
                String dStr = bill.getPaymentDate() != null ? bill.getPaymentDate().toLocalDate().toString() : java.time.LocalDate.now().toString();
                com.lowagie.text.Image stamp = generateStampImage(dStr);
                stamp.setAlignment(Element.ALIGN_RIGHT);
                stamp.setSpacingBefore(10);
                sigR.addElement(stamp);
            }
            sigTb.addCell(sigR);
            document.add(sigTb);
            
            document.close();

            HttpHeaders headers = new HttpHeaders();
            String invFilename = buildLogicalInvoiceFilename(bill);
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + invFilename + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, "application/pdf");
            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String buildLogicalInvoiceFilename(Bill bill) {
        String inv = bill.getInvoiceNumber() != null ? bill.getInvoiceNumber().replaceAll("[^a-zA-Z0-9-]", "_") : "INV";
        String flat = (bill.getHousehold() != null && bill.getHousehold().getFlatNumber() != null) ? bill.getHousehold().getFlatNumber().replaceAll("[^a-zA-Z0-9]", "") : "N/A";
        String block = (bill.getHousehold() != null && bill.getHousehold().getBlock() != null) ? bill.getHousehold().getBlock().replaceAll("[^a-zA-Z0-9]", "") : "A";
        String name = (bill.getTargetUser() != null && bill.getTargetUser().getName() != null) ? bill.getTargetUser().getName().trim().replaceAll("[^a-zA-Z0-9]", "_") : "Resident";
        
        String monthStr = "Current";
        if (bill.getBillingCycle() != null && bill.getBillingCycle().getStartDate() != null) {
            monthStr = bill.getBillingCycle().getStartDate().format(DateTimeFormatter.ofPattern("MMM_yyyy"));
        }
        
        return String.format("AquaTrack_Invoice_%s_Flat_%s_Block_%s_%s_%s.pdf", inv, flat, block, name, monthStr);
    }

    private void addTh(PdfPTable t, String txt, Color bg, Font f, int align) {
        PdfPCell c = new PdfPCell(new Phrase(txt, f));
        c.setBackgroundColor(bg); c.setBorderColor(Color.WHITE);
        c.setPaddingTop(8); c.setPaddingBottom(8); c.setPaddingLeft(10); c.setPaddingRight(10);
        c.setHorizontalAlignment(align); c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        t.addCell(c);
    }

    private void addTd(PdfPTable t, String txt, Color bc, Font f, int align) {
        addTd(t, txt, bc, f, align, Color.WHITE);
    }
    
    private void addTd(PdfPTable t, String txt, Color bc, Font f, int align, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(txt, f));
        c.setBorderColor(bc); c.setBorder(Rectangle.BOTTOM); c.setBackgroundColor(bg);
        c.setPaddingTop(10); c.setPaddingBottom(10); c.setPaddingLeft(10); c.setPaddingRight(10);
        c.setHorizontalAlignment(align); c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        t.addCell(c);
    }

    private void addGridCell(PdfPTable t, String lbl, String val, Color bc, Font fl, Font fv) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(bc); c.setPadding(10);
        c.addElement(new Paragraph(lbl, fl));
        c.addElement(new Paragraph(val, fv));
        t.addCell(c);
    }

    private void addNoBorderRow(PdfPTable table, String desc, String amt, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase(desc, font));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingBottom(5);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(amt, font));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setPaddingBottom(5);
        table.addCell(c2);
    }

    private com.lowagie.text.Image generateStampImage(String dateStr) throws Exception {
        int width = 240;
        int height = 240;
        java.awt.image.BufferedImage bufferedImage = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g2d = bufferedImage.createGraphics();
        
        g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        
        // Cornflower Blue stamp color from screenshot
        java.awt.Color color = new java.awt.Color(99, 140, 240);
        g2d.setColor(color);
        g2d.setStroke(new java.awt.BasicStroke(4));
        
        // Outer circle
        g2d.drawOval(10, 10, width - 20, height - 20);
        
        // Inner circle
        g2d.setStroke(new java.awt.BasicStroke(1.5f));
        g2d.drawOval(20, 20, width - 40, height - 40);
        
        // Draw little dots on the inner circle (as seen in stamp)
        int cx = width / 2;
        int cy = height / 2;
        int radius = (width - 40) / 2;
        for (int i = 0; i < 6; i++) {
            double angle = i * Math.PI / 3;
            int x = (int) (cx + radius * Math.cos(angle)) - 3;
            int y = (int) (cy + radius * Math.sin(angle)) - 3;
            g2d.fillOval(x, y, 6, 6);
        }
        
        // "PAID" in the center
        g2d.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 46));
        String mainText = "PAID";
        java.awt.FontMetrics fm = g2d.getFontMetrics();
        g2d.drawString(mainText, cx - fm.stringWidth(mainText) / 2, cy + 15);
        
        // Circular Text - Top
        g2d.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 16));
        drawCircularText(g2d, "AQUATRACK WATER AUTHORITY", cx, cy, radius - 15, -Math.PI / 2, true);
        
        // Circular Text - Bottom
        drawCircularText(g2d, "ISSUED: " + dateStr, cx, cy, radius - 15, Math.PI / 2, false);
        
        g2d.dispose();
        
        // Apply blur
        float weight = 1.0f / 9.0f;
        float[] elements = new float[9];
        for (int i = 0; i < 9; i++) {
            elements[i] = weight;
        }
        java.awt.image.Kernel kernel = new java.awt.image.Kernel(3, 3, elements);
        java.awt.image.ConvolveOp op = new java.awt.image.ConvolveOp(kernel, java.awt.image.ConvolveOp.EDGE_NO_OP, null);
        bufferedImage = op.filter(bufferedImage, null);

        
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(bufferedImage, "png", baos);
        com.lowagie.text.Image img = com.lowagie.text.Image.getInstance(baos.toByteArray());
        img.scaleToFit(110, 110);
        return img;
    }

    private void drawCircularText(java.awt.Graphics2D g, String text, int cx, int cy, int r, double startAngle, boolean top) {
        java.awt.FontMetrics fm = g.getFontMetrics();
        double totalAngle = 0;
        for (char c : text.toCharArray()) {
            totalAngle += (double) fm.charWidth(c) / r;
        }
        
        double currentAngle = startAngle - (totalAngle / 2);
        if (!top) {
            currentAngle = startAngle + (totalAngle / 2);
        }
        
        for (char c : text.toCharArray()) {
            double charAngle = (double) fm.charWidth(c) / r;
            if (top) {
                currentAngle += charAngle / 2;
            } else {
                currentAngle -= charAngle / 2;
            }
            
            java.awt.geom.AffineTransform old = g.getTransform();
            g.translate(cx + r * Math.cos(currentAngle), cy + r * Math.sin(currentAngle));
            if (top) {
                g.rotate(currentAngle + Math.PI / 2);
            } else {
                g.rotate(currentAngle - Math.PI / 2);
            }
            g.drawString(String.valueOf(c), -fm.charWidth(c) / 2, fm.getAscent() / 2 - 2);
            g.setTransform(old);
            
            if (top) {
                currentAngle += charAngle / 2;
            } else {
                currentAngle -= charAngle / 2;
            }
        }
    }
}
