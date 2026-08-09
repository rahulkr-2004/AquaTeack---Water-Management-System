package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired private WaterUsageLogRepository waterUsageLogRepository;
    @Autowired private HouseholdRepository householdRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TariffPlanRepository tariffPlanRepository;
    @Autowired private com.water.water.service.DemoDataSeeder demoDataSeeder;

    @PostMapping("/seed-demo-data")
    public ResponseEntity<String> seedDemoData() {
        try {
            String result = demoDataSeeder.seedDemoData();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error seeding demo data: " + e.getMessage());
        }
    }
    @Autowired
    private WaterPurchaseRepository waterPurchaseRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;


    @GetMapping("/summary")
    public ResponseEntity<?> getSummaryReport(@RequestParam(required = false) String month) {
        try {
            List<WaterUsageLog> logs = waterUsageLogRepository.findAll();
            List<WaterPurchase> purchases = waterPurchaseRepository.findAll();
            List<Bill> bills = billRepository.findAll();

            // Extract all unique months (YYYY-MM) available across logs, purchases, and bills
            Set<String> monthSet = new TreeSet<>(Collections.reverseOrder());
            for (WaterUsageLog l : logs) {
                if (l.getDate() != null) {
                    monthSet.add(l.getDate().toString().substring(0, 7));
                }
            }
            for (WaterPurchase p : purchases) {
                if (p.getDate() != null) {
                    monthSet.add(p.getDate().toString().substring(0, 7));
                }
            }
            for (Bill b : bills) {
                if (b.getBillingCycle() != null && b.getBillingCycle().getStartDate() != null) {
                    monthSet.add(b.getBillingCycle().getStartDate().toString().substring(0, 7));
                }
            }
            List<String> availableMonths = new ArrayList<>(monthSet);

            // Filter by month if provided and not ALL
            if (month != null && !month.isBlank() && !"ALL".equalsIgnoreCase(month)) {
                String target = month.trim();
                logs = logs.stream()
                        .filter(l -> l.getDate() != null && l.getDate().toString().startsWith(target))
                        .toList();
                purchases = purchases.stream()
                        .filter(p -> p.getDate() != null && p.getDate().toString().startsWith(target))
                        .toList();
                bills = bills.stream()
                        .filter(b -> b.getBillingCycle() != null && b.getBillingCycle().getStartDate() != null && b.getBillingCycle().getStartDate().toString().startsWith(target))
                        .toList();
            }

            double totalConsumedLiters = logs.stream()
                    .mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0)
                    .sum();
            double totalPurchasedLiters = purchases.stream()
                    .mapToDouble(p -> p != null ? p.getLiters() : 0.0)
                    .sum();
            BigDecimal totalPurchasedCost = purchases.stream()
                    .map(p -> p.getCost() != null ? p.getCost() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalBilledAmount = bills.stream()
                    .map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            // Group consumption by apartment
            Map<String, Double> consumptionByApartment = new HashMap<>();
            for (WaterUsageLog log : logs) {
                if (log.getHousehold() != null && log.getHousehold().getApartment() != null) {
                    String aptName = log.getHousehold().getApartment().getName();
                    double val = log.getConsumptionLiters() != null ? log.getConsumptionLiters() : 0.0;
                    consumptionByApartment.put(aptName, consumptionByApartment.getOrDefault(aptName, 0.0) + val);
                }
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("selectedMonth", (month == null || month.isBlank()) ? "ALL" : month);
            summary.put("availableMonths", availableMonths);
            summary.put("totalConsumedLiters", totalConsumedLiters);
            summary.put("totalPurchasedLiters", totalPurchasedLiters);
            summary.put("totalPurchasedCost", totalPurchasedCost);
            summary.put("totalBilledAmount", totalBilledAmount);
            summary.put("consumptionByApartment", consumptionByApartment);

            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/block-consumption")
    public ResponseEntity<?> getBlockConsumption(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            LocalDate now = LocalDate.now();
            String currentMonthPrefix = now.getYear() + "-" + String.format("%02d", now.getMonthValue());
            LocalDate prevMonthDate = now.minusMonths(1);
            String prevMonthPrefix = prevMonthDate.getYear() + "-" + String.format("%02d", prevMonthDate.getMonthValue());

            List<WaterUsageLog> allLogs = waterUsageLogRepository.findAll();

            Map<String, double[]> blockData = new LinkedHashMap<>();

            for (WaterUsageLog log : allLogs) {
                if (log.getHousehold() == null || log.getDate() == null) continue;
                String block = log.getHousehold().getBlock();
                if (block == null || block.isBlank()) block = "Unassigned";

                blockData.putIfAbsent(block, new double[]{0.0, 0.0});

                String dateStr = log.getDate().toString();
                double liters = log.getConsumptionLiters() != null ? log.getConsumptionLiters() : 0.0;

                if (dateStr.startsWith(currentMonthPrefix)) {
                    blockData.get(block)[0] += liters;
                } else if (dateStr.startsWith(prevMonthPrefix)) {
                    blockData.get(block)[1] += liters;
                }
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (Map.Entry<String, double[]> entry : blockData.entrySet()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("block", entry.getKey());
                row.put("currentMonth", Math.round(entry.getValue()[0] * 10.0) / 10.0);
                row.put("prevMonth", Math.round(entry.getValue()[1] * 10.0) / 10.0);
                result.add(row);
            }

            result.sort(Comparator.comparing(r -> r.get("block").toString()));

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // =========================================================================
    // ROLE-BASED ANALYTICS SUMMARY
    // =========================================================================

    @GetMapping("/role-summary")
    public ResponseEntity<?> getRoleSummary(Authentication authentication,
                                            @RequestParam(required = false) String month) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");
        }
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User profile not found");
            }

            Map<String, Object> report = buildReportDataForUser(currentUser, month);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // =========================================================================
    // EXPORT PDF REPORT (ROLE-BASED)
    // =========================================================================

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(Authentication authentication,
                                           @RequestParam(required = false) String month) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Map<String, Object> report = buildReportDataForUser(currentUser, month);
            byte[] pdfBytes = generatePdfReportBytes(currentUser, report, month);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = buildLogicalFilename(currentUser, report, month, "pdf");
            headers.setContentDispositionFormData("attachment", filename);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // =========================================================================
    // EXPORT CSV REPORT (ROLE-BASED)
    // =========================================================================

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(Authentication authentication,
                                           @RequestParam(required = false) String month) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            User currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Map<String, Object> report = buildReportDataForUser(currentUser, month);
            String csvStr = generateCsvReportString(currentUser, report, month);
            byte[] csvBytes = csvStr.getBytes(StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
            String filename = buildLogicalFilename(currentUser, report, month, "csv");
            headers.setContentDispositionFormData("attachment", filename);

            return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String buildLogicalFilename(User user, Map<String, Object> report, String month, String ext) {
        String period = (month != null && !month.isBlank() && !"ALL".equalsIgnoreCase(month)) ? month.trim() : "AllTime";
        
        if (user.getRole() == Role.ROLE_ADMIN) {
            return String.format("AquaTrack_SuperAdmin_Water_Analytics_Report_AllSocieties_%s.%s", period, ext);
        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            String society = report.get("societyName") != null ? report.get("societyName").toString().trim().replaceAll("[^a-zA-Z0-9]", "_") : "Community";
            return String.format("AquaTrack_Community_Water_Report_%s_%s.%s", society, period, ext);
        } else {
            String flat = report.get("flatNumber") != null ? report.get("flatNumber").toString().trim().replaceAll("[^a-zA-Z0-9]", "") : "Flat";
            String block = report.get("block") != null ? report.get("block").toString().trim().replaceAll("[^a-zA-Z0-9]", "") : "A";
            String name = user.getName() != null ? user.getName().trim().replaceAll("[^a-zA-Z0-9]", "_") : "Resident";
            return String.format("AquaTrack_Water_Usage_Statement_Flat_%s_Block_%s_%s_%s.%s", flat, block, name, period, ext);
        }
    }

    // =========================================================================
    // HELPER: BUILD DATA FOR ROLE
    // =========================================================================

    private Map<String, Object> buildReportDataForUser(User user, String month) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("role", user.getRole().name());
        data.put("userName", user.getName());
        data.put("userEmail", user.getEmail());
        data.put("selectedMonth", (month == null || month.isBlank()) ? "ALL" : month);
        data.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        String targetMonth = (month != null && !month.isBlank() && !"ALL".equalsIgnoreCase(month)) ? month.trim() : null;

        if (user.getRole() == Role.ROLE_ADMIN) {
            // --- SUPER ADMIN REPORT DATA ---
            List<WaterUsageLog> logs = waterUsageLogRepository.findAll();
            List<WaterPurchase> purchases = waterPurchaseRepository.findAll();
            List<Bill> bills = billRepository.findAll();
            List<Apartment> apartments = apartmentRepository.findAll();
            List<Household> households = householdRepository.findAll();

            if (targetMonth != null) {
                logs = logs.stream().filter(l -> l.getDate() != null && l.getDate().toString().startsWith(targetMonth)).toList();
                purchases = purchases.stream().filter(p -> p.getDate() != null && p.getDate().toString().startsWith(targetMonth)).toList();
                bills = bills.stream().filter(b -> b.getBillingCycle() != null && b.getBillingCycle().getStartDate() != null && b.getBillingCycle().getStartDate().toString().startsWith(targetMonth)).toList();
            }

            double totalConsumed = logs.stream().mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0).sum();
            double totalPurchased = purchases.stream().mapToDouble(p -> p != null ? p.getLiters() : 0.0).sum();
            BigDecimal totalCost = purchases.stream().map(p -> p.getCost() != null ? p.getCost() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalRevenue = bills.stream().map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalPaidRevenue = bills.stream().filter(b -> b != null && b.isPaid()).map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalPendingDues = totalRevenue.subtract(totalPaidRevenue);
            double collectionEfficiency = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? (totalPaidRevenue.doubleValue() / totalRevenue.doubleValue()) * 100.0 : 0.0;

            // Block wise breakdown
            Map<String, Double> blockConsumption = new LinkedHashMap<>();
            for (WaterUsageLog l : logs) {
                String block = (l.getHousehold() != null && l.getHousehold().getBlock() != null) ? l.getHousehold().getBlock() : "Unassigned";
                blockConsumption.put(block, blockConsumption.getOrDefault(block, 0.0) + (l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0));
            }

            // Apartment breakdown
            List<Map<String, Object>> aptList = new ArrayList<>();
            for (Apartment apt : apartments) {
                double aptConsumed = logs.stream()
                        .filter(l -> l.getHousehold() != null && l.getHousehold().getApartment() != null && l.getHousehold().getApartment().getId().equals(apt.getId()))
                        .mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0).sum();
                List<Bill> aptBills = bills.stream()
                        .filter(b -> b.getHousehold() != null && b.getHousehold().getApartment() != null && b.getHousehold().getApartment().getId().equals(apt.getId()))
                        .toList();
                BigDecimal aptBilled = aptBills.stream().map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
                BigDecimal aptPaid = aptBills.stream().filter(b -> b != null && b.isPaid()).map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
                long hCount = households.stream().filter(h -> h.getApartment() != null && h.getApartment().getId().equals(apt.getId())).count();

                Map<String, Object> aMap = new LinkedHashMap<>();
                aMap.put("name", apt.getName());
                aMap.put("code", apt.getAddress() != null ? apt.getAddress() : "N/A");
                aMap.put("households", hCount);
                aMap.put("consumedLiters", aptConsumed);
                aMap.put("billedAmount", aptBilled);
                aMap.put("paidAmount", aptPaid);
                aptList.add(aMap);
            }

            // Purchase Orders Log List
            List<Map<String, Object>> purchaseList = new ArrayList<>();
            for (WaterPurchase p : purchases) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("date", p.getDate() != null ? p.getDate().toString() : "N/A");
                pm.put("supplierName", p.getSupplierName() != null ? p.getSupplierName() : "Tanker Vendor");
                pm.put("societyName", p.getApartment() != null ? p.getApartment().getName() : "All Societies");
                pm.put("liters", p.getLiters());
                pm.put("cost", p.getCost() != null ? p.getCost() : BigDecimal.ZERO);
                pm.put("invoiceNumber", p.getInvoiceNumber() != null ? p.getInvoiceNumber() : ("INV-T-" + p.getId()));
                purchaseList.add(pm);
            }

            data.put("totalConsumedLiters", totalConsumed);
            data.put("totalPurchasedLiters", totalPurchased);
            data.put("netReserveLiters", totalPurchased - totalConsumed);
            data.put("totalPurchasedCost", totalCost);
            data.put("totalBilledAmount", totalRevenue);
            data.put("totalPaidRevenue", totalPaidRevenue);
            data.put("totalPendingDues", totalPendingDues);
            data.put("collectionEfficiency", Math.round(collectionEfficiency * 10.0) / 10.0);
            data.put("totalBills", bills.size());
            data.put("paidBills", bills.stream().filter(b -> b != null && b.isPaid()).count());
            data.put("totalApartments", apartments.size());
            data.put("totalHouseholds", households.size());
            data.put("blockConsumption", blockConsumption);
            data.put("apartmentBreakdown", aptList);
            data.put("purchaseOrders", purchaseList);

        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            // --- COMMUNITY ADMIN REPORT DATA ---
            Apartment managedApt = user.getManagedApartment();
            Long aptId = managedApt != null ? managedApt.getId() : null;

            List<WaterUsageLog> logs = waterUsageLogRepository.findAll().stream()
                    .filter(l -> aptId == null || (l.getHousehold() != null && l.getHousehold().getApartment() != null && l.getHousehold().getApartment().getId().equals(aptId)))
                    .toList();
            List<WaterPurchase> purchases = waterPurchaseRepository.findAll().stream()
                    .filter(p -> aptId == null || (p.getApartment() != null && p.getApartment().getId().equals(aptId)))
                    .toList();
            List<Bill> bills = billRepository.findAll().stream()
                    .filter(b -> aptId == null || (b.getHousehold() != null && b.getHousehold().getApartment() != null && b.getHousehold().getApartment().getId().equals(aptId)))
                    .toList();
            List<Household> households = householdRepository.findAll().stream()
                    .filter(h -> aptId == null || (h.getApartment() != null && h.getApartment().getId().equals(aptId)))
                    .toList();

            if (targetMonth != null) {
                logs = logs.stream().filter(l -> l.getDate() != null && l.getDate().toString().startsWith(targetMonth)).toList();
                purchases = purchases.stream().filter(p -> p.getDate() != null && p.getDate().toString().startsWith(targetMonth)).toList();
                bills = bills.stream().filter(b -> b.getBillingCycle() != null && b.getBillingCycle().getStartDate() != null && b.getBillingCycle().getStartDate().toString().startsWith(targetMonth)).toList();
            }

            double totalConsumed = logs.stream().mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0).sum();
            double totalPurchased = purchases.stream().mapToDouble(p -> p != null ? p.getLiters() : 0.0).sum();
            BigDecimal totalCost = purchases.stream().map(p -> p.getCost() != null ? p.getCost() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalRevenue = bills.stream().map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalPaidRevenue = bills.stream().filter(b -> b != null && b.isPaid()).map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalPendingDues = totalRevenue.subtract(totalPaidRevenue);
            double collectionEfficiency = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? (totalPaidRevenue.doubleValue() / totalRevenue.doubleValue()) * 100.0 : 0.0;

            // Block wise breakdown for this community
            Map<String, Double> blockConsumption = new LinkedHashMap<>();
            for (WaterUsageLog l : logs) {
                String block = (l.getHousehold() != null && l.getHousehold().getBlock() != null) ? l.getHousehold().getBlock() : "Unassigned";
                blockConsumption.put(block, blockConsumption.getOrDefault(block, 0.0) + (l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0));
            }

            // Purchase Orders Log List for this community
            List<Map<String, Object>> purchaseList = new ArrayList<>();
            for (WaterPurchase p : purchases) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("date", p.getDate() != null ? p.getDate().toString() : "N/A");
                pm.put("supplierName", p.getSupplierName() != null ? p.getSupplierName() : "Tanker Vendor");
                pm.put("liters", p.getLiters());
                pm.put("cost", p.getCost() != null ? p.getCost() : BigDecimal.ZERO);
                pm.put("invoiceNumber", p.getInvoiceNumber() != null ? p.getInvoiceNumber() : ("INV-T-" + p.getId()));
                purchaseList.add(pm);
            }

            // Household summary list for this community
            List<Map<String, Object>> hhList = new ArrayList<>();
            for (Household h : households) {
                double hConsumed = logs.stream()
                        .filter(l -> l.getHousehold() != null && l.getHousehold().getId().equals(h.getId()))
                        .mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0).sum();
                List<Bill> hBills = bills.stream().filter(b -> b.getHousehold() != null && b.getHousehold().getId().equals(h.getId())).toList();
                BigDecimal hBilled = hBills.stream().map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
                boolean isPaid = !hBills.isEmpty() && hBills.stream().allMatch(b -> b != null && b.isPaid());

                // Find resident user
                List<User> hUsers = userRepository.findByHouseholdId(h.getId());
                String rName = hUsers.isEmpty() ? "Unassigned" : hUsers.get(0).getName();

                Map<String, Object> hMap = new LinkedHashMap<>();
                hMap.put("flatNumber", h.getFlatNumber());
                hMap.put("block", h.getBlock());
                hMap.put("residentName", rName);
                hMap.put("consumedLiters", hConsumed);
                hMap.put("billedAmount", hBilled);
                hMap.put("paidStatus", hBills.isEmpty() ? "NO BILL" : (isPaid ? "PAID" : "UNPAID"));
                hhList.add(hMap);
            }

            data.put("societyName", managedApt != null ? managedApt.getName() : "Community");
            data.put("societyCode", managedApt != null ? managedApt.getAddress() : "N/A");
            data.put("totalConsumedLiters", totalConsumed);
            data.put("totalPurchasedLiters", totalPurchased);
            data.put("netReserveLiters", totalPurchased - totalConsumed);
            data.put("totalPurchasedCost", totalCost);
            data.put("totalBilledAmount", totalRevenue);
            data.put("totalPaidRevenue", totalPaidRevenue);
            data.put("totalPendingDues", totalPendingDues);
            data.put("collectionEfficiency", Math.round(collectionEfficiency * 10.0) / 10.0);
            data.put("totalHouseholds", households.size());
            data.put("blockConsumption", blockConsumption);
            data.put("householdList", hhList);
            data.put("purchaseOrders", purchaseList);

        } else {
            // --- RESIDENT REPORT DATA ---
            Household household = user.getHousehold();
            Long householdId = household != null ? household.getId() : null;

            List<WaterUsageLog> logs = new ArrayList<>();
            List<Bill> bills = new ArrayList<>();

            if (householdId != null) {
                logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(householdId);
                bills = billRepository.findByHouseholdId(householdId);
            }

            if (targetMonth != null) {
                logs = logs.stream().filter(l -> l.getDate() != null && l.getDate().toString().startsWith(targetMonth)).toList();
                bills = bills.stream().filter(b -> b.getBillingCycle() != null && b.getBillingCycle().getStartDate() != null && b.getBillingCycle().getStartDate().toString().startsWith(targetMonth)).toList();
            }

            double totalConsumed = logs.stream().mapToDouble(l -> l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0).sum();
            double avgDaily = logs.isEmpty() ? 0.0 : totalConsumed / logs.size();
            BigDecimal totalBilled = bills.stream().map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalPaid = bills.stream().filter(b -> b != null && b.isPaid()).map(b -> b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal pendingBalance = totalBilled.subtract(totalPaid);

            // Log details
            List<Map<String, Object>> logList = new ArrayList<>();
            for (WaterUsageLog l : logs) {
                Map<String, Object> lm = new LinkedHashMap<>();
                lm.put("date", l.getDate() != null ? l.getDate().toString() : "N/A");
                lm.put("consumedLiters", l.getConsumptionLiters() != null ? l.getConsumptionLiters() : 0.0);
                logList.add(lm);
            }

            // Bill details
            List<Map<String, Object>> billList = new ArrayList<>();
            for (Bill b : bills) {
                Map<String, Object> bm = new LinkedHashMap<>();
                bm.put("invoiceNumber", b.getInvoiceNumber());
                bm.put("period", (b.getBillingCycle() != null ? b.getBillingCycle().getStartDate() + " to " + b.getBillingCycle().getEndDate() : "N/A"));
                bm.put("consumedLiters", b.getConsumptionLiters());
                bm.put("amount", b.getAmount());
                bm.put("paid", b.isPaid());
                billList.add(bm);
            }

            data.put("flatNumber", household != null ? household.getFlatNumber() : "N/A");
            data.put("block", household != null ? household.getBlock() : "N/A");
            data.put("societyName", (household != null && household.getApartment() != null) ? household.getApartment().getName() : "N/A");
            data.put("totalConsumedLiters", totalConsumed);
            data.put("avgDailyLiters", Math.round(avgDaily * 10.0) / 10.0);
            data.put("totalBilledAmount", totalBilled);
            data.put("totalPaidAmount", totalPaid);
            data.put("pendingBalance", pendingBalance);
            data.put("usageLogs", logList);
            data.put("bills", billList);
        }

        return data;
    }

    // =========================================================================
    // HELPER: GENERATE PDF BYTES
    // =========================================================================

    private byte[] generatePdfReportBytes(User user, Map<String, Object> report, String month) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(document, baos);
        document.open();

        Color primaryBlue = new Color(37, 99, 235);
        Color navyHeader = new Color(15, 23, 42);
        Color darkText = new Color(30, 41, 59);
        Color grayText = new Color(100, 116, 139);
        Color lightGrayBg = new Color(248, 250, 252);
        Color altRowBg = new Color(241, 245, 249);
        Color cardBg = new Color(239, 246, 255);
        Color greenStatus = new Color(16, 163, 74);
        Color redStatus = new Color(220, 38, 38);

        Font fTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, primaryBlue);
        Font fSub = FontFactory.getFont(FontFactory.HELVETICA, 9, grayText);
        Font fHeading = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, navyHeader);
        Font fMetaLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, darkText);
        Font fMetaVal = FontFactory.getFont(FontFactory.HELVETICA, 9, grayText);
        Font fTh = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
        Font fTd = FontFactory.getFont(FontFactory.HELVETICA, 9, darkText);
        Font fTdBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, darkText);
        Font fKpiLbl = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, grayText);
        Font fKpiVal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, primaryBlue);
        Font fPaid = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, greenStatus);
        Font fUnpaid = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, redStatus);

        // Header Table
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{3.2f, 1.8f});

        PdfPCell leftC = new PdfPCell();
        leftC.setBorder(Rectangle.NO_BORDER);
        Phrase pLogo = new Phrase();
        pLogo.add(new Chunk("AquaTrack Water Analytics\n", fTitle));
        leftC.addElement(pLogo);
        leftC.addElement(new Paragraph("Enterprise Water Utility & Financial Intelligence Audit", fSub));
        header.addCell(leftC);

        PdfPCell rightC = new PdfPCell();
        rightC.setBorder(Rectangle.NO_BORDER);
        rightC.setHorizontalAlignment(Element.ALIGN_RIGHT);
        String roleTitle = user.getRole() == Role.ROLE_ADMIN ? "SUPER ADMIN REPORT" :
                (user.getRole() == Role.ROLE_COMMUNITY_ADMIN ? "COMMUNITY ADMIN STATEMENT" : "RESIDENT STATEMENT");
        Paragraph pRole = new Paragraph(roleTitle, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, navyHeader));
        pRole.setAlignment(Element.ALIGN_RIGHT);
        rightC.addElement(pRole);
        Paragraph pGen = new Paragraph("Generated: " + report.get("generatedAt"), fSub);
        pGen.setAlignment(Element.ALIGN_RIGHT);
        rightC.addElement(pGen);
        header.addCell(rightC);

        document.add(header);
        document.add(new Chunk(new LineSeparator(1.5f, 100, primaryBlue, Element.ALIGN_CENTER, -4)));
        document.add(new Paragraph("\n"));

        // Metadata Info Box
        PdfPTable metaBox = new PdfPTable(4);
        metaBox.setWidthPercentage(100);

        addMetaCell(metaBox, "Statement Period:", report.get("selectedMonth") != null ? report.get("selectedMonth").toString() : "ALL", fMetaLbl, fMetaVal, lightGrayBg);
        addMetaCell(metaBox, "Account User:", user.getName() + " (" + user.getEmail() + ")", fMetaLbl, fMetaVal, lightGrayBg);

        if (user.getRole() == Role.ROLE_USER) {
            addMetaCell(metaBox, "Flat & Block:", "Flat " + report.get("flatNumber") + " (" + report.get("block") + ")", fMetaLbl, fMetaVal, lightGrayBg);
            addMetaCell(metaBox, "Society Name:", report.get("societyName") != null ? report.get("societyName").toString() : "AquaTrack", fMetaLbl, fMetaVal, lightGrayBg);
        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            addMetaCell(metaBox, "Managed Society:", report.get("societyName") != null ? report.get("societyName").toString() : "Community", fMetaLbl, fMetaVal, lightGrayBg);
            addMetaCell(metaBox, "Total Households:", String.valueOf(report.get("totalHouseholds")), fMetaLbl, fMetaVal, lightGrayBg);
        } else {
            addMetaCell(metaBox, "Total Societies:", String.valueOf(report.get("totalApartments")), fMetaLbl, fMetaVal, lightGrayBg);
            addMetaCell(metaBox, "Total Households:", String.valueOf(report.get("totalHouseholds")), fMetaLbl, fMetaVal, lightGrayBg);
        }

        document.add(metaBox);
        document.add(new Paragraph("\n"));

        // Content Based on Role
        if (user.getRole() == Role.ROLE_ADMIN) {
            // --- SUPER ADMIN REPORT ---
            document.add(new Paragraph("1. System Key Performance Indicators (KPIs)", fHeading));
            document.add(new Paragraph("\n"));

            PdfPTable kpiGrid = new PdfPTable(4);
            kpiGrid.setWidthPercentage(100);

            addKpiBox(kpiGrid, "TOTAL CONSUMED", report.get("totalConsumedLiters") + " L", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "WATER PROCURED", report.get("totalPurchasedLiters") + " L", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "PROCUREMENT COST", "INR " + report.get("totalPurchasedCost"), fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "BILLED REVENUE", "INR " + report.get("totalBilledAmount"), fKpiLbl, fKpiVal, cardBg);

            document.add(kpiGrid);
            document.add(new Paragraph("\n"));

            // Water Balance & Revenue Audit
            document.add(new Paragraph("2. Water Supply Balance & Financial Collection Audit", fHeading));
            document.add(new Paragraph("\n"));

            PdfPTable finTb = new PdfPTable(4);
            finTb.setWidthPercentage(100);
            addTh(finTb, "Net Reserve Balance", fTh, navyHeader);
            addTh(finTb, "Paid Collections", fTh, navyHeader);
            addTh(finTb, "Outstanding Dues", fTh, navyHeader);
            addTh(finTb, "Collection Rate", fTh, navyHeader);

            double netReserve = Double.parseDouble(report.get("netReserveLiters").toString());
            addTd(finTb, (netReserve >= 0 ? "+" : "") + netReserve + " L", fTdBold, Color.WHITE);
            addTd(finTb, "INR " + report.get("totalPaidRevenue"), fPaid, Color.WHITE);
            addTd(finTb, "INR " + report.get("totalPendingDues"), fUnpaid, Color.WHITE);
            addTd(finTb, report.get("collectionEfficiency") + "%", fTdBold, Color.WHITE);

            document.add(finTb);
            document.add(new Paragraph("\n\n"));

            // Building Block Breakdown
            document.add(new Paragraph("3. Building Block Water Consumption Breakdown", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            Map<String, Double> blockMap = (Map<String, Double>) report.get("blockConsumption");
            PdfPTable blockTb = new PdfPTable(3);
            blockTb.setWidthPercentage(100);
            addTh(blockTb, "Block Identifier", fTh, navyHeader);
            addTh(blockTb, "Volume Consumed (Liters)", fTh, navyHeader);
            addTh(blockTb, "Share of Total Consumption", fTh, navyHeader);

            double totalSystemConsumed = Double.parseDouble(report.get("totalConsumedLiters").toString());

            if (blockMap != null && !blockMap.isEmpty()) {
                int rowIdx = 0;
                for (Map.Entry<String, Double> entry : blockMap.entrySet()) {
                    Color bg = (rowIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(blockTb, "Block " + entry.getKey(), fTdBold, bg);
                    addTd(blockTb, entry.getValue() + " L", fTd, bg);
                    double share = totalSystemConsumed > 0 ? (entry.getValue() / totalSystemConsumed) * 100.0 : 0.0;
                    addTd(blockTb, Math.round(share * 10.0) / 10.0 + "%", fTd, bg);
                    rowIdx++;
                }
            } else {
                addTd(blockTb, "No block consumption logged.", fTd, Color.WHITE);
                addTd(blockTb, "0 L", fTd, Color.WHITE);
                addTd(blockTb, "0%", fTd, Color.WHITE);
            }
            document.add(blockTb);
            document.add(new Paragraph("\n\n"));

            // Water Procurement Tanker Purchase Orders Log
            document.add(new Paragraph("4. Water Supply Tanker Procurement Purchase Orders", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> purchases = (List<Map<String, Object>>) report.get("purchaseOrders");
            PdfPTable purTb = new PdfPTable(5);
            purTb.setWidthPercentage(100);
            addTh(purTb, "Date", fTh, navyHeader);
            addTh(purTb, "Supplier / Vendor", fTh, navyHeader);
            addTh(purTb, "Society Destination", fTh, navyHeader);
            addTh(purTb, "Volume (Liters)", fTh, navyHeader);
            addTh(purTb, "Cost (INR)", fTh, navyHeader);

            if (purchases != null && !purchases.isEmpty()) {
                int pIdx = 0;
                for (Map<String, Object> p : purchases) {
                    Color bg = (pIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(purTb, String.valueOf(p.get("date")), fTd, bg);
                    addTd(purTb, String.valueOf(p.get("supplierName")), fTdBold, bg);
                    addTd(purTb, String.valueOf(p.get("societyName")), fTd, bg);
                    addTd(purTb, p.get("liters") + " L", fTd, bg);
                    addTd(purTb, "INR " + p.get("cost"), fTdBold, bg);
                    pIdx++;
                }
            } else {
                addTd(purTb, "No procurement orders.", fTd, Color.WHITE);
                addTd(purTb, "-", fTd, Color.WHITE);
                addTd(purTb, "-", fTd, Color.WHITE);
                addTd(purTb, "0 L", fTd, Color.WHITE);
                addTd(purTb, "INR 0", fTd, Color.WHITE);
            }
            document.add(purTb);
            document.add(new Paragraph("\n\n"));

            // Societies Directory & Billing Performance
            document.add(new Paragraph("5. Societies Directory & Financial Ledger", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> aptList = (List<Map<String, Object>>) report.get("apartmentBreakdown");
            PdfPTable aptTb = new PdfPTable(6);
            aptTb.setWidthPercentage(100);
            addTh(aptTb, "Society Name", fTh, navyHeader);
            addTh(aptTb, "Address", fTh, navyHeader);
            addTh(aptTb, "Flats", fTh, navyHeader);
            addTh(aptTb, "Consumed (L)", fTh, navyHeader);
            addTh(aptTb, "Billed (INR)", fTh, navyHeader);
            addTh(aptTb, "Paid (INR)", fTh, navyHeader);

            if (aptList != null && !aptList.isEmpty()) {
                int aIdx = 0;
                for (Map<String, Object> apt : aptList) {
                    Color bg = (aIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(aptTb, String.valueOf(apt.get("name")), fTdBold, bg);
                    addTd(aptTb, String.valueOf(apt.get("code")), fTd, bg);
                    addTd(aptTb, String.valueOf(apt.get("households")), fTd, bg);
                    addTd(aptTb, apt.get("consumedLiters") + " L", fTd, bg);
                    addTd(aptTb, "INR " + apt.get("billedAmount"), fTd, bg);
                    addTd(aptTb, "INR " + apt.get("paidAmount"), fPaid, bg);
                    aIdx++;
                }
            } else {
                addTd(aptTb, "No society records.", fTd, Color.WHITE);
                addTd(aptTb, "-", fTd, Color.WHITE);
                addTd(aptTb, "0", fTd, Color.WHITE);
                addTd(aptTb, "0 L", fTd, Color.WHITE);
                addTd(aptTb, "INR 0", fTd, Color.WHITE);
                addTd(aptTb, "INR 0", fTd, Color.WHITE);
            }
            document.add(aptTb);

        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            // --- COMMUNITY ADMIN REPORT ---
            document.add(new Paragraph("1. Community Water & Financial Metrics (" + report.get("societyName") + ")", fHeading));
            document.add(new Paragraph("\n"));

            PdfPTable kpiGrid = new PdfPTable(4);
            kpiGrid.setWidthPercentage(100);

            addKpiBox(kpiGrid, "TOTAL CONSUMED", report.get("totalConsumedLiters") + " L", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "TANKER PROCURED", report.get("totalPurchasedLiters") + " L", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "TANKER EXPENSE", "INR " + report.get("totalPurchasedCost"), fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "BILLED REVENUE", "INR " + report.get("totalBilledAmount"), fKpiLbl, fKpiVal, cardBg);

            document.add(kpiGrid);
            document.add(new Paragraph("\n"));

            // Water Balance & Revenue Audit
            document.add(new Paragraph("2. Water Reserve & Fee Collection Summary", fHeading));
            document.add(new Paragraph("\n"));

            PdfPTable finTb = new PdfPTable(4);
            finTb.setWidthPercentage(100);
            addTh(finTb, "Net Supply Balance", fTh, navyHeader);
            addTh(finTb, "Collected Revenue", fTh, navyHeader);
            addTh(finTb, "Outstanding Dues", fTh, navyHeader);
            addTh(finTb, "Collection Rate", fTh, navyHeader);

            double netReserve = Double.parseDouble(report.get("netReserveLiters").toString());
            addTd(finTb, (netReserve >= 0 ? "+" : "") + netReserve + " L", fTdBold, Color.WHITE);
            addTd(finTb, "INR " + report.get("totalPaidRevenue"), fPaid, Color.WHITE);
            addTd(finTb, "INR " + report.get("totalPendingDues"), fUnpaid, Color.WHITE);
            addTd(finTb, report.get("collectionEfficiency") + "%", fTdBold, Color.WHITE);

            document.add(finTb);
            document.add(new Paragraph("\n\n"));

            // Block Consumption Breakdown
            document.add(new Paragraph("3. Block-wise Consumption Breakdown", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            Map<String, Double> blockMap = (Map<String, Double>) report.get("blockConsumption");
            PdfPTable blockTb = new PdfPTable(3);
            blockTb.setWidthPercentage(100);
            addTh(blockTb, "Block Name", fTh, navyHeader);
            addTh(blockTb, "Volume Consumed (Liters)", fTh, navyHeader);
            addTh(blockTb, "Percentage Share", fTh, navyHeader);

            double totalCommConsumed = Double.parseDouble(report.get("totalConsumedLiters").toString());

            if (blockMap != null && !blockMap.isEmpty()) {
                int rIdx = 0;
                for (Map.Entry<String, Double> entry : blockMap.entrySet()) {
                    Color bg = (rIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(blockTb, "Block " + entry.getKey(), fTdBold, bg);
                    addTd(blockTb, entry.getValue() + " L", fTd, bg);
                    double share = totalCommConsumed > 0 ? (entry.getValue() / totalCommConsumed) * 100.0 : 0.0;
                    addTd(blockTb, Math.round(share * 10.0) / 10.0 + "%", fTd, bg);
                    rIdx++;
                }
            } else {
                addTd(blockTb, "No block logs found.", fTd, Color.WHITE);
                addTd(blockTb, "0 L", fTd, Color.WHITE);
                addTd(blockTb, "0%", fTd, Color.WHITE);
            }
            document.add(blockTb);
            document.add(new Paragraph("\n\n"));

            // Tanker Orders Log
            document.add(new Paragraph("4. Water Supply Tanker Procurement Log", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> purchases = (List<Map<String, Object>>) report.get("purchaseOrders");
            PdfPTable purTb = new PdfPTable(4);
            purTb.setWidthPercentage(100);
            addTh(purTb, "Date", fTh, navyHeader);
            addTh(purTb, "Supplier / Vendor", fTh, navyHeader);
            addTh(purTb, "Volume (Liters)", fTh, navyHeader);
            addTh(purTb, "Cost (INR)", fTh, navyHeader);

            if (purchases != null && !purchases.isEmpty()) {
                int pIdx = 0;
                for (Map<String, Object> p : purchases) {
                    Color bg = (pIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(purTb, String.valueOf(p.get("date")), fTd, bg);
                    addTd(purTb, String.valueOf(p.get("supplierName")), fTdBold, bg);
                    addTd(purTb, p.get("liters") + " L", fTd, bg);
                    addTd(purTb, "INR " + p.get("cost"), fTdBold, bg);
                    pIdx++;
                }
            } else {
                addTd(purTb, "No procurement orders.", fTd, Color.WHITE);
                addTd(purTb, "-", fTd, Color.WHITE);
                addTd(purTb, "0 L", fTd, Color.WHITE);
                addTd(purTb, "INR 0", fTd, Color.WHITE);
            }
            document.add(purTb);
            document.add(new Paragraph("\n\n"));

            // Household Directory & Billing Ledger
            document.add(new Paragraph("5. Household Directory & Billing Ledger", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> hhList = (List<Map<String, Object>>) report.get("householdList");
            PdfPTable hhTb = new PdfPTable(6);
            hhTb.setWidthPercentage(100);
            addTh(hhTb, "Flat No", fTh, navyHeader);
            addTh(hhTb, "Block", fTh, navyHeader);
            addTh(hhTb, "Resident Name", fTh, navyHeader);
            addTh(hhTb, "Consumed (L)", fTh, navyHeader);
            addTh(hhTb, "Billed Amount", fTh, navyHeader);
            addTh(hhTb, "Status", fTh, navyHeader);

            if (hhList != null && !hhList.isEmpty()) {
                int hIdx = 0;
                for (Map<String, Object> item : hhList) {
                    Color bg = (hIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(hhTb, String.valueOf(item.get("flatNumber")), fTdBold, bg);
                    addTd(hhTb, String.valueOf(item.get("block")), fTd, bg);
                    addTd(hhTb, String.valueOf(item.get("residentName")), fTd, bg);
                    addTd(hhTb, item.get("consumedLiters") + " L", fTd, bg);
                    addTd(hhTb, "INR " + item.get("billedAmount"), fTd, bg);
                    String status = String.valueOf(item.get("paidStatus"));
                    addTdWithFont(hhTb, status, "PAID".equalsIgnoreCase(status) ? fPaid : fUnpaid, bg);
                    hIdx++;
                }
            } else {
                addTd(hhTb, "No household records.", fTd, Color.WHITE);
                addTd(hhTb, "-", fTd, Color.WHITE);
                addTd(hhTb, "-", fTd, Color.WHITE);
                addTd(hhTb, "0 L", fTd, Color.WHITE);
                addTd(hhTb, "INR 0", fTd, Color.WHITE);
                addTd(hhTb, "N/A", fTd, Color.WHITE);
            }
            document.add(hhTb);

        } else {
            // --- RESIDENT REPORT ---
            document.add(new Paragraph("1. Household Consumption & Dues Summary", fHeading));
            document.add(new Paragraph("\n"));

            PdfPTable kpiGrid = new PdfPTable(4);
            kpiGrid.setWidthPercentage(100);

            addKpiBox(kpiGrid, "TOTAL CONSUMED", report.get("totalConsumedLiters") + " L", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "AVG DAILY USAGE", report.get("avgDailyLiters") + " L/day", fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "TOTAL INVOICED", "INR " + report.get("totalBilledAmount"), fKpiLbl, fKpiVal, cardBg);
            addKpiBox(kpiGrid, "PENDING DUES", "INR " + report.get("pendingBalance"), fKpiLbl, fKpiVal, cardBg);

            document.add(kpiGrid);
            document.add(new Paragraph("\n\n"));

            document.add(new Paragraph("2. Billing & Payment History Ledger", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> bills = (List<Map<String, Object>>) report.get("bills");
            PdfPTable billTb = new PdfPTable(5);
            billTb.setWidthPercentage(100);
            addTh(billTb, "Invoice No", fTh, navyHeader);
            addTh(billTb, "Cycle Period", fTh, navyHeader);
            addTh(billTb, "Volume Consumed", fTh, navyHeader);
            addTh(billTb, "Amount", fTh, navyHeader);
            addTh(billTb, "Status", fTh, navyHeader);

            if (bills != null && !bills.isEmpty()) {
                int bIdx = 0;
                for (Map<String, Object> b : bills) {
                    Color bg = (bIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(billTb, String.valueOf(b.get("invoiceNumber")), fTdBold, bg);
                    addTd(billTb, String.valueOf(b.get("period")), fTd, bg);
                    addTd(billTb, b.get("consumedLiters") + " L", fTd, bg);
                    addTd(billTb, "INR " + (b.get("amount") != null ? b.get("amount") : "0"), fTd, bg);
                    boolean isPaid = Boolean.TRUE.equals(b.get("paid"));
                    addTdWithFont(billTb, isPaid ? "PAID" : "UNPAID", isPaid ? fPaid : fUnpaid, bg);
                    bIdx++;
                }
            } else {
                addTd(billTb, "No invoices issued.", fTd, Color.WHITE);
                addTd(billTb, "-", fTd, Color.WHITE);
                addTd(billTb, "0 L", fTd, Color.WHITE);
                addTd(billTb, "INR 0", fTd, Color.WHITE);
                addTd(billTb, "N/A", fTd, Color.WHITE);
            }
            document.add(billTb);
            document.add(new Paragraph("\n\n"));

            document.add(new Paragraph("3. Daily Water Meter Reading Audit Logs", fHeading));
            document.add(new Paragraph("\n"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> usageLogs = (List<Map<String, Object>>) report.get("usageLogs");
            PdfPTable logTb = new PdfPTable(3);
            logTb.setWidthPercentage(100);
            addTh(logTb, "Date", fTh, navyHeader);
            addTh(logTb, "Volume Consumed (Liters)", fTh, navyHeader);
            addTh(logTb, "Usage Level Indicator", fTh, navyHeader);

            if (usageLogs != null && !usageLogs.isEmpty()) {
                int lIdx = 0;
                for (Map<String, Object> log : usageLogs) {
                    Color bg = (lIdx % 2 == 0) ? Color.WHITE : altRowBg;
                    addTd(logTb, String.valueOf(log.get("date")), fTd, bg);
                    double liters = Double.parseDouble(log.get("consumedLiters").toString());
                    addTd(logTb, liters + " L", fTdBold, bg);
                    String level = liters > 500 ? "HIGH CONSUMPTION" : (liters > 250 ? "MODERATE" : "NORMAL");
                    Font lvlFont = liters > 500 ? fUnpaid : fTd;
                    addTdWithFont(logTb, level, lvlFont, bg);
                    lIdx++;
                }
            } else {
                addTd(logTb, "No daily meter logs.", fTd, Color.WHITE);
                addTd(logTb, "0 L", fTd, Color.WHITE);
                addTd(logTb, "N/A", fTd, Color.WHITE);
            }
            document.add(logTb);
        }

        // Footer note
        document.add(new Paragraph("\n\n"));
        document.add(new Chunk(new LineSeparator(0.8f, 100, grayText, Element.ALIGN_CENTER, -2)));
        Paragraph pFooter = new Paragraph("AquaTrack Smart Water Management Utility • Official Certified Analytical Statement • Confidential", fSub);
        pFooter.setAlignment(Element.ALIGN_CENTER);
        document.add(pFooter);

        document.close();
        return baos.toByteArray();
    }

    // =========================================================================
    // HELPER: GENERATE CSV STRING
    // =========================================================================

    private String generateCsvReportString(User user, Map<String, Object> report, String month) {
        StringBuilder sb = new StringBuilder();
        sb.append("AquaTrack Water Management System - Enterprise Audit Statement\n");
        sb.append("Report Type,").append(user.getRole().name().replace("ROLE_", "")).append(" EXECUTIVE REPORT\n");
        sb.append("User Name,").append(user.getName()).append("\n");
        sb.append("User Email,").append(user.getEmail()).append("\n");
        sb.append("Statement Period,").append(report.get("selectedMonth") != null ? report.get("selectedMonth") : "ALL").append("\n");
        sb.append("Generated At,").append(report.get("generatedAt")).append("\n\n");

        if (user.getRole() == Role.ROLE_ADMIN) {
            sb.append("--- 1. SYSTEM KEY PERFORMANCE INDICATORS ---\n");
            sb.append("Total Procured (Liters),Total Consumed (Liters),Net Reserve (Liters),Procurement Cost (INR),Billed Revenue (INR),Paid Revenue (INR),Outstanding Dues (INR),Collection Rate (%)\n");
            sb.append(report.get("totalPurchasedLiters")).append(",")
                    .append(report.get("totalConsumedLiters")).append(",")
                    .append(report.get("netReserveLiters")).append(",")
                    .append(report.get("totalPurchasedCost")).append(",")
                    .append(report.get("totalBilledAmount")).append(",")
                    .append(report.get("totalPaidRevenue")).append(",")
                    .append(report.get("totalPendingDues")).append(",")
                    .append(report.get("collectionEfficiency")).append("\n\n");

            sb.append("--- 2. BLOCK-WISE CONSUMPTION BREAKDOWN ---\n");
            sb.append("Block Name,Consumed Liters\n");
            @SuppressWarnings("unchecked")
            Map<String, Double> blockMap = (Map<String, Double>) report.get("blockConsumption");
            if (blockMap != null) {
                for (Map.Entry<String, Double> e : blockMap.entrySet()) {
                    sb.append("\"Block ").append(e.getKey()).append("\",").append(e.getValue()).append("\n");
                }
            }

            sb.append("\n--- 3. WATER PROCUREMENT TANKER PURCHASE ORDERS ---\n");
            sb.append("Date,Supplier/Vendor,Society Destination,Liters Purchased,Cost (INR),Invoice Number\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> purchases = (List<Map<String, Object>>) report.get("purchaseOrders");
            if (purchases != null) {
                for (Map<String, Object> p : purchases) {
                    sb.append("\"").append(p.get("date")).append("\",\"")
                            .append(p.get("supplierName")).append("\",\"")
                            .append(p.get("societyName")).append("\",")
                            .append(p.get("liters")).append(",")
                            .append(p.get("cost")).append(",\"")
                            .append(p.get("invoiceNumber")).append("\"\n");
                }
            }

            sb.append("\n--- 4. SOCIETIES DIRECTORY & FINANCIAL LEDGER ---\n");
            sb.append("Society Name,Address/Code,Households Count,Consumed Liters,Billed Revenue (INR),Paid Collected (INR)\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> aptList = (List<Map<String, Object>>) report.get("apartmentBreakdown");
            if (aptList != null) {
                for (Map<String, Object> a : aptList) {
                    sb.append("\"").append(a.get("name")).append("\",\"")
                            .append(a.get("code")).append("\",")
                            .append(a.get("households")).append(",")
                            .append(a.get("consumedLiters")).append(",")
                            .append(a.get("billedAmount")).append(",")
                            .append(a.get("paidAmount")).append("\n");
                }
            }

        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            sb.append("--- 1. COMMUNITY EXECUTIVE SUMMARY (").append(report.get("societyName")).append(") ---\n");
            sb.append("Total Consumed (L),Tanker Procured (L),Net Reserve (L),Tanker Cost (INR),Billed Revenue (INR),Paid Collected (INR),Outstanding Dues (INR),Collection Rate (%)\n");
            sb.append(report.get("totalConsumedLiters")).append(",")
                    .append(report.get("totalPurchasedLiters")).append(",")
                    .append(report.get("netReserveLiters")).append(",")
                    .append(report.get("totalPurchasedCost")).append(",")
                    .append(report.get("totalBilledAmount")).append(",")
                    .append(report.get("totalPaidRevenue")).append(",")
                    .append(report.get("totalPendingDues")).append(",")
                    .append(report.get("collectionEfficiency")).append("\n\n");

            sb.append("--- 2. BLOCK-WISE CONSUMPTION BREAKDOWN ---\n");
            sb.append("Block Name,Consumed Liters\n");
            @SuppressWarnings("unchecked")
            Map<String, Double> blockMap = (Map<String, Double>) report.get("blockConsumption");
            if (blockMap != null) {
                for (Map.Entry<String, Double> e : blockMap.entrySet()) {
                    sb.append("\"Block ").append(e.getKey()).append("\",").append(e.getValue()).append("\n");
                }
            }

            sb.append("\n--- 3. WATER PROCUREMENT TANKER LOG ---\n");
            sb.append("Date,Supplier/Vendor,Liters Purchased,Cost (INR),Invoice Number\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> purchases = (List<Map<String, Object>>) report.get("purchaseOrders");
            if (purchases != null) {
                for (Map<String, Object> p : purchases) {
                    sb.append("\"").append(p.get("date")).append("\",\"")
                            .append(p.get("supplierName")).append("\",")
                            .append(p.get("liters")).append(",")
                            .append(p.get("cost")).append(",\"")
                            .append(p.get("invoiceNumber")).append("\"\n");
                }
            }

            sb.append("\n--- 4. HOUSEHOLD CONSUMPTION & BILLING DIRECTORY ---\n");
            sb.append("Flat Number,Block,Resident Name,Consumed Liters,Billed Amount (INR),Payment Status\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> hhList = (List<Map<String, Object>>) report.get("householdList");
            if (hhList != null) {
                for (Map<String, Object> item : hhList) {
                    sb.append("\"").append(item.get("flatNumber")).append("\",\"")
                            .append(item.get("block")).append("\",\"")
                            .append(item.get("residentName")).append("\",")
                            .append(item.get("consumedLiters")).append(",")
                            .append(item.get("billedAmount")).append(",\"")
                            .append(item.get("paidStatus")).append("\"\n");
                }
            }

        } else {
            sb.append("--- 1. HOUSEHOLD SUMMARY ---\n");
            sb.append("Flat Number,Block,Society Name,Total Consumed (L),Avg Daily Usage (L/day),Total Billed (INR),Paid (INR),Pending Dues (INR)\n");
            sb.append("\"").append(report.get("flatNumber")).append("\",\"")
                    .append(report.get("block")).append("\",\"")
                    .append(report.get("societyName")).append("\",")
                    .append(report.get("totalConsumedLiters")).append(",")
                    .append(report.get("avgDailyLiters")).append(",")
                    .append(report.get("totalBilledAmount")).append(",")
                    .append(report.get("totalPaidAmount")).append(",")
                    .append(report.get("pendingBalance")).append("\n\n");

            sb.append("--- 2. INVOICE & PAYMENT HISTORY ---\n");
            sb.append("Invoice Number,Billing Cycle Period,Volume Consumed (L),Billed Amount (INR),Payment Status\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> bills = (List<Map<String, Object>>) report.get("bills");
            if (bills != null) {
                for (Map<String, Object> b : bills) {
                    sb.append("\"").append(b.get("invoiceNumber")).append("\",\"")
                            .append(b.get("period")).append("\",")
                            .append(b.get("consumedLiters")).append(",")
                            .append(b.get("amount")).append(",\"")
                            .append(Boolean.TRUE.equals(b.get("paid")) ? "PAID" : "UNPAID").append("\"\n");
                }
            }

            sb.append("\n--- 3. DAILY WATER METER READING LOGS ---\n");
            sb.append("Date,Consumed Liters,Consumption Level\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> usageLogs = (List<Map<String, Object>>) report.get("usageLogs");
            if (usageLogs != null) {
                for (Map<String, Object> log : usageLogs) {
                    double liters = Double.parseDouble(log.get("consumedLiters").toString());
                    String level = liters > 500 ? "HIGH CONSUMPTION" : (liters > 250 ? "MODERATE" : "NORMAL");
                    sb.append("\"").append(log.get("date")).append("\",")
                            .append(liters).append(",\"")
                            .append(level).append("\"\n");
                }
            }
        }

        return sb.toString();
    }

    private void addMetaCell(PdfPTable table, String label, String val, Font lblFont, Font valFont, Color bg) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bg);
        cell.setPadding(6);
        cell.setBorderColor(new Color(226, 232, 240));
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", lblFont));
        p.add(new Chunk(val, valFont));
        cell.addElement(p);
        table.addCell(cell);
    }

    private void addKpiBox(PdfPTable table, String title, String val, Font lblFont, Font valFont, Color bg) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bg);
        cell.setPadding(8);
        cell.setBorderColor(new Color(191, 219, 254));
        Paragraph pLbl = new Paragraph(title, lblFont);
        Paragraph pVal = new Paragraph(val, valFont);
        cell.addElement(pLbl);
        cell.addElement(pVal);
        table.addCell(cell);
    }

    private void addTh(PdfPTable table, String title, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(title, font));
        cell.setBackgroundColor(bg);
        cell.setPadding(7);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorderColor(new Color(30, 41, 59));
        table.addCell(cell);
    }

    private void addTd(PdfPTable table, String val, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(val, font));
        cell.setPadding(6);
        cell.setBackgroundColor(bg);
        cell.setBorderColor(new Color(226, 232, 240));
        table.addCell(cell);
    }

    private void addTdWithFont(PdfPTable table, String val, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(val, font));
        cell.setPadding(6);
        cell.setBackgroundColor(bg);
        cell.setBorderColor(new Color(226, 232, 240));
        table.addCell(cell);
    }
}
