package com.water.water.controller;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
}
