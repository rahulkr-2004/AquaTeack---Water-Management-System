package com.water.water.repository;

import com.water.water.model.WaterPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WaterPurchaseRepository extends JpaRepository<WaterPurchase, Long> {
    List<WaterPurchase> findByApartmentId(Long apartmentId);
}
