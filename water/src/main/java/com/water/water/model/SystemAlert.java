package com.water.water.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
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

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String type; // e.g. "LEAK", "MAINTENANCE", "BILLING"

    @Transient
    private boolean resolved = false;

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
