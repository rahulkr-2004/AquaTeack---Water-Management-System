package com.water.water.controller;

import com.water.water.model.Apartment;
import com.water.water.model.TariffPlan;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.TariffPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    @GetMapping("/list")
    public ResponseEntity<List<TariffPlan>> getTariffs() {
        return ResponseEntity.ok(tariffPlanRepository.findAll());
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveTariff(@RequestBody Map<String, Object> request) {
        try {
            Long apartmentId = Long.valueOf(request.get("apartmentId").toString());
            BigDecimal baseRate = new BigDecimal(request.get("baseRate").toString());
            BigDecimal excessRate = new BigDecimal(request.get("excessRate").toString());
            Integer baseLimitKl = Integer.valueOf(request.get("baseLimitKl").toString());
            Integer baseLimitDays = request.containsKey("baseLimitDays") ? Integer.valueOf(request.get("baseLimitDays").toString()) : 30;

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
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
