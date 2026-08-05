package com.water.water.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "invitations", indexes = {
    @Index(name = "idx_invitation_email", columnList = "email"),
    @Index(name = "idx_invitation_token", columnList = "token")
})
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    // Proper FK relationship to Apartment — fixes referential integrity issue
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    @JsonIgnoreProperties({"households", "buildings"})
    private Apartment apartment;

    @Column(nullable = false)
    private String block;

    @Column(name = "flat_number", nullable = false)
    private String flatNumber;

    @Lob
    @Column(name = "document_aadhar", columnDefinition = "LONGTEXT")
    private String documentAadhar;

    @Lob
    @Column(name = "document_photo", columnDefinition = "LONGTEXT")
    private String documentPhoto;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "mobile_no", length = 20)
    private String mobileNo;

    @Column(name = "alternate_no", length = 20)
    private String alternateNo;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, VERIFIED, REGISTERED

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Convenience getter for backward compatibility.
     * Returns the apartment's ID without breaking callers that use getApartmentId().
     */
    public Long getApartmentId() {
        return apartment != null ? apartment.getId() : null;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
