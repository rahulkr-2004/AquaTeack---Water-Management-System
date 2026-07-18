package com.water.water.repository;

import com.water.water.model.WaterUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface WaterUsageLogRepository extends JpaRepository<WaterUsageLog, Long> {

    // The Brains will use this to prevent duplicate daily entries
    boolean existsByHouseholdIdAndDate(Long householdId, LocalDate date);

    // The Brains will use this to find yesterday's reading so it can calculate today's consumption
    WaterUsageLog findTopByHouseholdIdOrderByDateDesc(Long householdId);

    java.util.List<WaterUsageLog> findByHouseholdIdOrderByDateDesc(Long householdId);

    java.util.List<WaterUsageLog> findAllByOrderByDateDesc();

    @org.springframework.data.jpa.repository.Query("SELECT AVG(w.consumptionLiters) FROM WaterUsageLog w WHERE w.household.apartment.id = :apartmentId")
    Double findAverageConsumptionByApartment(@org.springframework.data.repository.query.Param("apartmentId") Long apartmentId);

    @org.springframework.data.jpa.repository.Query("SELECT AVG(w.consumptionLiters) FROM WaterUsageLog w WHERE w.household.apartment.id = :apartmentId AND w.household.areaSqm >= :minArea AND w.household.areaSqm <= :maxArea")
    Double findAverageConsumptionByApartmentAndAreaRange(@org.springframework.data.repository.query.Param("apartmentId") Long apartmentId, @org.springframework.data.repository.query.Param("minArea") Double minArea, @org.springframework.data.repository.query.Param("maxArea") Double maxArea);
}