package com.water.water.service;

import com.water.water.dto.WaterUsageRequest;
import com.water.water.model.Household;
import com.water.water.model.WaterUsageLog;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.WaterUsageLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WaterUsageServiceTest {

    @Mock
    private WaterUsageLogRepository waterUsageLogRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @InjectMocks
    private WaterUsageService waterUsageService;

    private Household mockHousehold;
    private WaterUsageRequest mockRequest;

    @BeforeEach
    void setUp() {
        mockHousehold = new Household();
        mockHousehold.setId(1L);
        mockHousehold.setBlock("A");
        mockHousehold.setFlatNumber("101");

        mockRequest = new WaterUsageRequest();
        mockRequest.setHouseholdId(1L);
        mockRequest.setDate(LocalDate.now());
        mockRequest.setReadingLiters(500.0);
    }

    @Test
    void testLogWaterUsage_Success_FirstReading() {
        when(householdRepository.findById(1L)).thenReturn(Optional.of(mockHousehold));
        when(waterUsageLogRepository.existsByHouseholdIdAndDate(1L, mockRequest.getDate())).thenReturn(false);
        when(waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(1L)).thenReturn(null);

        WaterUsageLog savedLog = new WaterUsageLog();
        savedLog.setReadingLiters(500.0);
        savedLog.setConsumptionLiters(0.0);
        when(waterUsageLogRepository.save(any(WaterUsageLog.class))).thenReturn(savedLog);

        WaterUsageLog result = waterUsageService.logWaterUsage(mockRequest);

        assertNotNull(result);
        assertEquals(0.0, result.getConsumptionLiters());
        verify(waterUsageLogRepository).save(any(WaterUsageLog.class));
    }

    @Test
    void testLogWaterUsage_Success_SubsequentReading() {
        when(householdRepository.findById(1L)).thenReturn(Optional.of(mockHousehold));
        when(waterUsageLogRepository.existsByHouseholdIdAndDate(1L, mockRequest.getDate())).thenReturn(false);

        WaterUsageLog lastLog = new WaterUsageLog();
        lastLog.setReadingLiters(200.0);
        when(waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(1L)).thenReturn(lastLog);

        WaterUsageLog savedLog = new WaterUsageLog();
        savedLog.setReadingLiters(500.0);
        savedLog.setConsumptionLiters(300.0);
        when(waterUsageLogRepository.save(any(WaterUsageLog.class))).thenReturn(savedLog);

        WaterUsageLog result = waterUsageService.logWaterUsage(mockRequest);

        assertNotNull(result);
        assertEquals(300.0, result.getConsumptionLiters());
    }

    @Test
    void testLogWaterUsage_HouseholdNotFound() {
        when(householdRepository.findById(1L)).thenReturn(Optional.empty());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            waterUsageService.logWaterUsage(mockRequest);
        });
        assertEquals("Error: Household not found!", exception.getMessage());
    }

    @Test
    void testLogWaterUsage_DuplicateDate() {
        when(householdRepository.findById(1L)).thenReturn(Optional.of(mockHousehold));
        when(waterUsageLogRepository.existsByHouseholdIdAndDate(1L, mockRequest.getDate())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            waterUsageService.logWaterUsage(mockRequest);
        });
        assertEquals("Error: A reading for this date has already been submitted!", exception.getMessage());
    }

    @Test
    void testLogWaterUsage_LowerReading() {
        when(householdRepository.findById(1L)).thenReturn(Optional.of(mockHousehold));
        when(waterUsageLogRepository.existsByHouseholdIdAndDate(1L, mockRequest.getDate())).thenReturn(false);

        WaterUsageLog lastLog = new WaterUsageLog();
        lastLog.setReadingLiters(600.0);
        when(waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(1L)).thenReturn(lastLog);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            waterUsageService.logWaterUsage(mockRequest);
        });
        assertEquals("Error: New meter reading cannot be lower than the previous reading!", exception.getMessage());
    }

    @Test
    void testProcessBulkCsvUpload_Success() {
        String csvData = "householdId,date,readingLiters\n1,2023-10-01,150.5\n";
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", csvData.getBytes());

        when(householdRepository.findById(1L)).thenReturn(Optional.of(mockHousehold));
        when(waterUsageLogRepository.existsByHouseholdIdAndDate(eq(1L), any(LocalDate.class))).thenReturn(false);
        when(waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(1L)).thenReturn(null);

        WaterUsageLog savedLog = new WaterUsageLog();
        when(waterUsageLogRepository.save(any(WaterUsageLog.class))).thenReturn(savedLog);

        List<WaterUsageLog> results = waterUsageService.processBulkCsvUpload(file);
        assertEquals(1, results.size());
    }
}
