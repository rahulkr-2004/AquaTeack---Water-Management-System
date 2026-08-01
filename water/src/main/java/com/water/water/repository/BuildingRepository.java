package com.water.water.repository;

import com.water.water.model.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {
    List<Building> findByColonyIdAndDeletedFalse(Long colonyId);
    boolean existsByNameIgnoreCaseAndColonyIdAndDeletedFalse(String name, Long colonyId);
    Optional<Building> findByNameIgnoreCaseAndColonyIdAndDeletedFalse(String name, Long colonyId);
}
