package com.water.water.controller;

import com.water.water.model.Role;
import com.water.water.model.SupportTicket;
import com.water.water.model.SystemAlert;
import com.water.water.model.User;
import com.water.water.repository.SupportTicketRepository;
import com.water.water.repository.SystemAlertRepository;
import com.water.water.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/support")
@CrossOrigin(origins = "*")
public class SupportController {

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    @GetMapping("/tickets")
    public ResponseEntity<?> getTickets() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        List<SupportTicket> raisedByMe = supportTicketRepository.findByRaisedBy(user);
        List<SupportTicket> assignedToMe = supportTicketRepository.findByAssignedTo(user);
        
        Map<String, List<SupportTicket>> response = new HashMap<>();
        response.put("raisedByMe", raisedByMe);
        response.put("assignedToMe", assignedToMe);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/tickets")
    public ResponseEntity<?> createTicket(@RequestBody SupportTicket ticket) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        ticket.setRaisedBy(user);
        
        if (user.getRole() == Role.ROLE_USER) {
            ticket.setAssignedTo(user.getManagedByAdmin());
        } else if (user.getRole() == Role.ROLE_COMMUNITY_ADMIN) {
            List<User> superAdmins = userRepository.findByRole(Role.ROLE_ADMIN);
            if (!superAdmins.isEmpty()) {
                ticket.setAssignedTo(superAdmins.get(0));
            }
        }
        
        ticket.setStatus("OPEN");
        SupportTicket savedTicket = supportTicketRepository.save(ticket);

        // Generate Notification / System Alert for new support ticket
        try {
            SystemAlert alert = new SystemAlert();
            alert.setTitle("New Support Ticket: " + (savedTicket.getTitle() != null ? savedTicket.getTitle() : "Issue Raised"));
            String flatInfo = user.getHousehold() != null ? " (Flat " + user.getHousehold().getFlatNumber() + ")" : "";
            alert.setMessage("Ticket #" + savedTicket.getId() + " raised by " + user.getName() + flatInfo + ": " + 
                    (savedTicket.getDescription() != null && !savedTicket.getDescription().isBlank() ? savedTicket.getDescription() : savedTicket.getTitle()));
            alert.setDate(LocalDate.now());
            alert.setType("SUPPORT");
            alert.setHousehold(user.getHousehold());
            alert.setTargetUser(savedTicket.getAssignedTo()); // Send directly to the assigned admin
            systemAlertRepository.save(alert);
        } catch (Exception e) {
            System.err.println("Failed to create support notification: " + e.getMessage());
        }

        return ResponseEntity.ok(savedTicket);
    }

    @PutMapping("/tickets/{id}/status")
    public ResponseEntity<?> updateTicketStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Optional<SupportTicket> ticketOpt = supportTicketRepository.findById(id);
        if (!ticketOpt.isPresent()) return ResponseEntity.notFound().build();
        SupportTicket ticket = ticketOpt.get();

        if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().getId().equals(user.getId()) && user.getRole() != Role.ROLE_ADMIN) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        if (request.containsKey("status")) {
            ticket.setStatus(request.get("status"));
        }
        if (request.containsKey("resolutionNotes")) {
            ticket.setResolutionNotes(request.get("resolutionNotes"));
        }

        SupportTicket savedTicket = supportTicketRepository.save(ticket);

        // Generate Notification / System Alert for ticket status update to ticket creator
        try {
            if (savedTicket.getRaisedBy() != null) {
                SystemAlert alert = new SystemAlert();
                alert.setTitle("Support Ticket #" + savedTicket.getId() + " Updated");
                String notes = savedTicket.getResolutionNotes() != null && !savedTicket.getResolutionNotes().isBlank() 
                        ? ". Resolution: " + savedTicket.getResolutionNotes() 
                        : "";
                alert.setMessage("Your support ticket '" + savedTicket.getTitle() + "' status is now: " + savedTicket.getStatus() + notes);
                alert.setDate(LocalDate.now());
                alert.setType("SUPPORT");
                alert.setHousehold(savedTicket.getRaisedBy().getHousehold());
                alert.setTargetUser(savedTicket.getRaisedBy()); // Send directly to the resident who raised the ticket
                systemAlertRepository.save(alert);
            }
        } catch (Exception e) {
            System.err.println("Failed to create support update notification: " + e.getMessage());
        }

        return ResponseEntity.ok(savedTicket);
    }
}
