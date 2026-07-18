package com.water.water.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "households")
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @Column(nullable = false)
    private String block;

    @Column(name = "flat_number", nullable = false)
    private String flatNumber;

    @Column(name = "has_meter", nullable = false)
    private boolean hasMeter = true;

    @Column(name = "area_sqm", nullable = false)
    private double areaSqm = 100.0;
}