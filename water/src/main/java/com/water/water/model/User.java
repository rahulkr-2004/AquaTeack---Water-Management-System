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
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // A User belongs to a Household (Admins might have this as null)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "household_id")
    private Household household;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String username; // Optional unique handle; login works via email OR username

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    // This uses the Role enum you just created!
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean approved = false;

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

    @Column(name = "whatsapp_no", length = 20)
    private String whatsappNo; // WhatsApp number (repurposed from alternateNo)

    // The Community Admin who manages this household user (null for admins themselves)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "managed_by_admin_id")
    @JsonIgnoreProperties({"managedByAdmin", "password", "household"})
    private User managedByAdmin;

    // The Colony (Apartment) managed by this Community Admin (null for users and super admin)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "managed_apartment_id")
    @JsonIgnoreProperties({"households"})
    private Apartment managedApartment;

    // The specific Building/Block within the colony managed by this Community Admin
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "managed_building_id")
    @JsonIgnoreProperties({"colony"})
    private Building managedBuilding;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}