package com.water.water.controller;

import com.water.water.model.Apartment;
import com.water.water.model.WaterPurchase;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.WaterPurchaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchases")
public class WaterPurchaseController {

    @Autowired
    private WaterPurchaseRepository waterPurchaseRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @GetMapping
    public ResponseEntity<List<WaterPurchase>> getPurchases() {
        return ResponseEntity.ok(waterPurchaseRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createPurchase(@RequestBody Map<String, Object> request) {
        try {
            Long apartmentId = Long.valueOf(request.get("apartmentId").toString());
            LocalDate date = LocalDate.parse(request.get("date").toString());
            double liters = Double.parseDouble(request.get("liters").toString());
            BigDecimal cost = new BigDecimal(request.get("cost").toString());
            String supplierName = request.get("supplierName").toString();
            String invoiceNumber = request.containsKey("invoiceNumber") && request.get("invoiceNumber") != null
                    ? request.get("invoiceNumber").toString()
                    : "";

            Apartment apartment = apartmentRepository.findById(apartmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Apartment not found!"));

            WaterPurchase purchase = new WaterPurchase();
            purchase.setApartment(apartment);
            purchase.setDate(date);
            purchase.setLiters(liters);
            purchase.setCost(cost);
            purchase.setSupplierName(supplierName);
            purchase.setInvoiceNumber(invoiceNumber);

            return ResponseEntity.ok(waterPurchaseRepository.save(purchase));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
