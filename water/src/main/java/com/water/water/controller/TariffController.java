package com.water.water.controller;

import com.water.water.model.Apartment;
import com.water.water.model.TariffPlan;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.TariffPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import com.water.water.model.User;
import com.water.water.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tariffs")
public class TariffController {

    @Autowired
    private TariffPlanRepository tariffPlanRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/list")
    public ResponseEntity<List<TariffPlan>> getTariffs() {
        return ResponseEntity.ok(tariffPlanRepository.findAll());
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveTariff(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            if (request == null || !request.containsKey("apartmentId") || request.get("apartmentId") == null || request.get("apartmentId").toString().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Error: Apartment ID is required.");
            }
            Long apartmentId = Long.valueOf(request.get("apartmentId").toString().trim());
            
            if (authentication != null) {
                String email = authentication.getName();
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null && ("ROLE_COMMUNITY_ADMIN".equals(user.getRole().name()) || "COMMUNITY_ADMIN".equals(user.getRole().name()))) {
                    if (user.getManagedApartment() == null || !user.getManagedApartment().getId().equals(apartmentId)) {
                        return ResponseEntity.status(403).body("Error: You can only define a tariff plan for your managed apartment.");
                    }
                }
            }

            String baseRateStr = request.get("baseRate") != null ? request.get("baseRate").toString().trim() : "0";
            String excessRateStr = request.get("excessRate") != null ? request.get("excessRate").toString().trim() : "0";
            String baseLimitKlStr = request.get("baseLimitKl") != null ? request.get("baseLimitKl").toString().trim() : "0";
            String baseLimitDaysStr = (request.containsKey("baseLimitDays") && request.get("baseLimitDays") != null) ? request.get("baseLimitDays").toString().trim() : "30";

            if (baseRateStr.isEmpty()) baseRateStr = "0";
            if (excessRateStr.isEmpty()) excessRateStr = "0";
            if (baseLimitKlStr.isEmpty()) baseLimitKlStr = "0";
            if (baseLimitDaysStr.isEmpty()) baseLimitDaysStr = "30";

            BigDecimal baseRate = new BigDecimal(baseRateStr);
            BigDecimal excessRate = new BigDecimal(excessRateStr);
            Integer baseLimitKl = (int) Math.round(Double.parseDouble(baseLimitKlStr));
            Integer baseLimitDays = (int) Math.round(Double.parseDouble(baseLimitDaysStr));

            Apartment apartment = apartmentRepository.findById(apartmentId)
                    .orElseThrow(() -> new IllegalArgumentException("Apartment not found!"));

            TariffPlan tariffPlan = tariffPlanRepository.findByApartmentId(apartmentId)
                    .orElse(new TariffPlan());

            tariffPlan.setApartment(apartment);
            tariffPlan.setBaseRate(baseRate);
            tariffPlan.setExcessRate(excessRate);
            tariffPlan.setBaseLimitKl(baseLimitKl);
            tariffPlan.setBaseLimitDays(baseLimitDays);

            return ResponseEntity.ok(tariffPlanRepository.save(tariffPlan));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}

