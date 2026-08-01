package com.water.water.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("aceruser12003@gmail.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            System.out.println("Email sent successfully to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ". Error: " + e.getMessage());
        }
    }
    
    public void sendOveruseAlert(String to, String householdId, double usage) {
        String subject = "AquaTrack: High Water Usage Alert";
        String body = "Dear Resident,\n\nYour household (ID: " + householdId + ") has recorded high water usage today (" + usage + " Liters).\n\nPlease check for potential leaks or consider reducing consumption to avoid higher tier billing rates.\n\nThank you,\nAquaTrack System";
        sendEmail(to, subject, body);
    }
}
