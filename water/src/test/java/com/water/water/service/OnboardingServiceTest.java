package com.water.water.service;

import com.water.water.dto.ApartmentRequest;
import com.water.water.dto.HouseholdRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Household;
import com.water.water.model.Role;
import com.water.water.model.User;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OnboardingServiceTest {

    @Mock
    private ApartmentRepository apartmentRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private OnboardingService onboardingService;

    @Test
    void testRegisterApartment_Success() {
        ApartmentRequest request = new ApartmentRequest();
        request.setName("Sunset Villas");
        request.setAddress("123 Sunset Blvd");

        when(apartmentRepository.existsByName(request.getName())).thenReturn(false);
        
        Apartment savedApartment = new Apartment();
        savedApartment.setId(1L);
        savedApartment.setName(request.getName());
        savedApartment.setAddress(request.getAddress());
        
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(savedApartment);

        Apartment result = onboardingService.registerApartment(request);

        assertNotNull(result);
        assertEquals("Sunset Villas", result.getName());
        verify(apartmentRepository).save(any(Apartment.class));
    }

    @Test
    void testRegisterApartment_AlreadyExists() {
        ApartmentRequest request = new ApartmentRequest();
        request.setName("Sunset Villas");

        when(apartmentRepository.existsByName(request.getName())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            onboardingService.registerApartment(request);
        });
        assertEquals("An apartment with this name already exists!", exception.getMessage());
    }

    @Test
    void testRegisterHousehold_Success() {
        HouseholdRequest request = new HouseholdRequest();
        request.setApartmentId(1L);
        request.setBlock("A");
        request.setFlatNumber("101");
        request.setHasMeter(true);

        Apartment apartment = new Apartment();
        apartment.setId(1L);

        when(apartmentRepository.findById(1L)).thenReturn(Optional.of(apartment));
        when(householdRepository.existsByApartmentIdAndBlockAndFlatNumber(1L, "A", "101")).thenReturn(false);

        Household savedHousehold = new Household();
        savedHousehold.setId(1L);
        savedHousehold.setBlock("A");
        savedHousehold.setFlatNumber("101");
        
        when(householdRepository.save(any(Household.class))).thenReturn(savedHousehold);

        Household result = onboardingService.registerHousehold(request);

        assertNotNull(result);
        assertEquals("101", result.getFlatNumber());
    }

    @Test
    void testRegisterHousehold_ApartmentNotFound() {
        HouseholdRequest request = new HouseholdRequest();
        request.setApartmentId(1L);

        when(apartmentRepository.findById(1L)).thenReturn(Optional.empty());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            onboardingService.registerHousehold(request);
        });
        assertEquals("Error: Apartment not found!", exception.getMessage());
    }

    @Test
    void testGetUsersForAdmin_SuperAdmin() {
        when(userRepository.findByRole(Role.ROLE_COMMUNITY_ADMIN)).thenReturn(List.of(new User()));
        when(userRepository.findByRole(Role.ROLE_USER)).thenReturn(List.of(new User()));

        List<User> users = onboardingService.getUsersForAdmin("admin@test.com", "ROLE_ADMIN");

        assertEquals(2, users.size());
    }
}
