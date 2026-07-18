package com.water.water.repository;

import com.water.water.model.SystemAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SystemAlertRepository extends JpaRepository<SystemAlert, Long> {
    List<SystemAlert> findByHouseholdId(Long householdId);
}
