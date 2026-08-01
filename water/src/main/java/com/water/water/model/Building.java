package com.water.water.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "buildings")
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // The colony (Apartment) this building belongs to
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "colony_id")
    @JsonIgnoreProperties({"households", "buildings"})
    private Apartment colony;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;
}
