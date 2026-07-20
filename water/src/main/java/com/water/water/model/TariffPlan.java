package com.water.water.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tariff_plans")
public class TariffPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @Column(name = "base_rate", nullable = false)
    private BigDecimal baseRate;

    @Column(name = "excess_rate", nullable = false)
    private BigDecimal excessRate;

    @Column(name = "base_limit_kl", nullable = false)
    private Integer baseLimitKl; // Example: 10 kL before excess rate kicks in

    @Column(name = "base_limit_days")
    private Integer baseLimitDays = 30; // The number of days the base limit applies to (e.g., 7 days, 30 days)
}