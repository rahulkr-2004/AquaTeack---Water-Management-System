package com.water.water.repository;

import com.water.water.model.Apartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    // Helps us prevent creating duplicate apartment buildings
    boolean existsByName(String name);
    java.util.Optional<Apartment> findByName(String name);
}