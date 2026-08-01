package com.water.water.repository;

import com.water.water.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByHouseholdId(Long householdId);
    void deleteByHouseholdId(Long householdId);
    List<Bill> findByBillingCycleId(Long billingCycleId);

    // Bills targeting a specific user (Community Admin bills)
    List<Bill> findByTargetUserId(Long userId);

    // Bills for households in a list (for scoped community admin billing)
    List<Bill> findByHouseholdIdIn(List<Long> householdIds);
}
