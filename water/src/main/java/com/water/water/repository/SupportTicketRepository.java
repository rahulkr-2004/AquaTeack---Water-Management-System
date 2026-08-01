package com.water.water.repository;

import com.water.water.model.SupportTicket;
import com.water.water.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByRaisedBy(User raisedBy);
    List<SupportTicket> findByAssignedTo(User assignedTo);
}
