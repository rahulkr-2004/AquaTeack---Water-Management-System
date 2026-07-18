package com.water.water.repository;

import com.water.water.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, Long> {
    // Helps us check if a specific flat already exists in a specific block
    boolean existsByApartmentIdAndBlockAndFlatNumber(Long apartmentId, String block, String flatNumber);
    
    java.util.Optional<Household> findByApartmentIdAndBlockAndFlatNumber(Long apartmentId, String block, String flatNumber);
}