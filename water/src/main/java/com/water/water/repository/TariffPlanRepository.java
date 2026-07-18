package com.water.water.repository;

import com.water.water.model.TariffPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TariffPlanRepository extends JpaRepository<TariffPlan, Long> {
    Optional<TariffPlan> findByApartmentId(Long apartmentId);
}
