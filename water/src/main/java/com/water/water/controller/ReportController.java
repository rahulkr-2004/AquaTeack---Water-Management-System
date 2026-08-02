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
    public ResponseEntity<?> getSummaryReport() {
        try {
            List<WaterUsageLog> logs = waterUsageLogRepository.findAll();
            List<WaterPurchase> purchases = waterPurchaseRepository.findAll();
            List<Bill> bills = billRepository.findAll();

            double totalConsumedLiters = logs.stream().mapToDouble(log -> log.getConsumptionLiters()).sum();
            double totalPurchasedLiters = purchases.stream().mapToDouble(p -> p.getLiters()).sum();
            BigDecimal totalPurchasedCost = purchases.stream()
                    .map(p -> p.getCost())
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
            BigDecimal totalBilledAmount = bills.stream()
                    .map(b -> b.getAmount())
                    .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            // Group consumption by apartment
            Map<String, Double> consumptionByApartment = new HashMap<>();
            for (WaterUsageLog log : logs) {
                if (log.getHousehold() != null && log.getHousehold().getApartment() != null) {
                    String aptName = log.getHousehold().getApartment().getName();
                    consumptionByApartment.put(aptName, consumptionByApartment.getOrDefault(aptName, 0.0) + log.getConsumptionLiters());
                }
            }

            Map<String, Object> summary = new HashMap<>();
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

