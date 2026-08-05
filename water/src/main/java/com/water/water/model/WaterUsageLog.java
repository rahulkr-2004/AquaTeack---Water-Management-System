package com.water.water.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "water_usage_logs", indexes = {
    @Index(name = "idx_wul_household_date", columnList = "household_id, date"),
    @Index(name = "idx_wul_date", columnList = "date"),
    @Index(name = "idx_wul_anomaly", columnList = "is_anomaly")
})
public class WaterUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "reading_liters", nullable = false)
    private Double readingLiters;

    @Column(name = "consumption_liters", nullable = false)
    private Double consumptionLiters;

    @Column(name = "is_anomaly", nullable = false)
    private boolean isAnomaly = false;

    @PrePersist
    protected void onCreate() {
        if (this.date == null) {
            this.date = LocalDate.now();
        }
    }
}