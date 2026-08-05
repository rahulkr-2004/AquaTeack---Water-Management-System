package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private WaterPurchaseRepository waterPurchaseRepository;

    @Autowired
    private BillRepository billRepository;


    @GetMapping("/summary")
    public ResponseEntity<?> getSummaryReport(@org.springframework.web.bind.annotation.RequestParam(required = false) String month) {
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

    /**
     * Returns block-wise consumption for current month and previous month.
     * Response: [ { block: "A", currentMonth: 1200.0, prevMonth: 980.0 }, ... ]
     */
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

            // block -> { currentMonth, prevMonth }
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

            // Sort alphabetically by block name
            result.sort(Comparator.comparing(r -> r.get("block").toString()));

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}

