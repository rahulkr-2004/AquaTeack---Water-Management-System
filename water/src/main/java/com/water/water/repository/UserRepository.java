package com.water.water.repository;

import com.water.water.model.Role;
import com.water.water.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Login / auth
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // All pending (for Super Admin)
    List<User> findByApprovedFalse();

    // Pending by role (e.g., pending community admin registrations)
    List<User> findByApprovedFalseAndRole(Role role);

    // Find all users by role
    List<User> findByRole(Role role);

    // Find household users managed by a specific community admin
    List<User> findByManagedByAdminId(Long adminId);

    // Find pending household users managed by a specific community admin
    List<User> findByManagedByAdminIdAndApprovedFalse(Long adminId);

    // Find approved users by role
    List<User> findByRoleAndApprovedTrue(Role role);

    // Find all users allocated to a household (a household may have both a community admin and a resident)
    List<User> findByHouseholdId(Long householdId);
}