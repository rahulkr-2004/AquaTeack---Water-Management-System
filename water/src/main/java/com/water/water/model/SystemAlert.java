package com.water.water.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "system_alerts")
public class SystemAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "household_id")
    private Household household; // Can be null for general/building-wide alerts

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "target_user_id")
    private User targetUser; // Specific user this alert is for (if any)

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "date", nullable = false)
    private LocalDate date = LocalDate.now();

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private String type; // e.g. "LEAK", "MAINTENANCE", "BILLING", "REGISTRATION"

    @Transient
    private boolean resolved = false;

    public void setDate(Object dateObj) {
        if (dateObj instanceof LocalDate) {
            this.date = (LocalDate) dateObj;
            this.createdAt = ((LocalDate) dateObj).atStartOfDay();
        } else if (dateObj instanceof LocalDateTime) {
            this.date = ((LocalDateTime) dateObj).toLocalDate();
            this.createdAt = (LocalDateTime) dateObj;
        } else {
            this.date = LocalDate.now();
            this.createdAt = LocalDateTime.now();
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.date == null) this.date = this.createdAt.toLocalDate();
    }

    @JsonIgnore
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "alert_read_by",
        joinColumns = @JoinColumn(name = "alert_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> readByUsers = new HashSet<>();

    @JsonIgnore
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "alert_cleared_by",
        joinColumns = @JoinColumn(name = "alert_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> clearedByUsers = new HashSet<>();
}
