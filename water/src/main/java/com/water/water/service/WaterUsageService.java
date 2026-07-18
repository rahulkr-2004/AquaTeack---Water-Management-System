package com.water.water.service;

import com.water.water.dto.WaterUsageRequest;
import com.water.water.model.Household;
import com.water.water.model.WaterUsageLog;
import com.water.water.model.User;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.UserRepository;
import com.water.water.repository.WaterUsageLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class WaterUsageService {

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private UserRepository userRepository;

    // --- 1. Single Manual Entry ---
    public WaterUsageLog logWaterUsage(WaterUsageRequest request) {
        Household household = householdRepository.findById(request.getHouseholdId())
                .orElseThrow(() -> new IllegalArgumentException("Error: Household not found!"));

        if (waterUsageLogRepository.existsByHouseholdIdAndDate(request.getHouseholdId(), request.getDate())) {
            throw new IllegalArgumentException("Error: A reading for this date has already been submitted!");
        }

        WaterUsageLog lastLog = waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(request.getHouseholdId());

        double consumption = 0.0;

        if (lastLog != null) {
            if (request.getReadingLiters() < lastLog.getReadingLiters()) {
                throw new IllegalArgumentException("Error: New meter reading cannot be lower than the previous reading!");
            }
            consumption = request.getReadingLiters() - lastLog.getReadingLiters();
        } else {
            // First reading acts as a baseline, so consumption is 0.0
            consumption = 0.0;
        }

        WaterUsageLog newLog = new WaterUsageLog();
        newLog.setHousehold(household);
        newLog.setDate(request.getDate());
        newLog.setReadingLiters(request.getReadingLiters());
        newLog.setConsumptionLiters(consumption);

        return waterUsageLogRepository.save(newLog);
    }

    // --- 2. Bulk CSV Upload ---
    public List<WaterUsageLog> processBulkCsvUpload(MultipartFile file) {
        List<WaterUsageLog> savedLogs = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isFirstLine = true;

            while ((line = br.readLine()) != null) {
                // Skip the header row
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }

                String[] data = line.split(",");
                if (data.length < 3) continue; // Skip bad or empty rows

                try {
                    // Clean up potential BOM characters from the first column if the header was missing
                    String householdStr = data[0].trim();
                    if (householdStr.startsWith("\uFEFF")) {
                        householdStr = householdStr.substring(1);
                    }
                    
                    // Parse the CSV columns
                    Long householdId = Long.parseLong(householdStr);
                    
                    // Handle different date formats (e.g., from Excel)
                    String dateStr = data[1].trim();
                    LocalDate date;
                    if (dateStr.contains("/")) {
                        dateStr = dateStr.replace("/", "-");
                    }
                    if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) {
                        date = LocalDate.parse(dateStr, java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                    } else {
                        date = LocalDate.parse(dateStr); // Default to yyyy-MM-dd
                    }

                    double readingLiters = Double.parseDouble(data[2].trim());

                    // Create a request and route it through our existing smart logic!
                    WaterUsageRequest request = new WaterUsageRequest();
                    request.setHouseholdId(householdId);
                    request.setDate(date);
                    request.setReadingLiters(readingLiters);

                    WaterUsageLog savedLog = logWaterUsage(request);
                    savedLogs.add(savedLog);
                } catch (Exception e) {
                    // Skip any rows that fail (like duplicate dates) and keep processing the rest
                    System.out.println("Skipped row due to error: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage());
        }

        return savedLogs;
    }

    public List<WaterUsageLog> getLogsForUser(String email, String role) {
        if ("ROLE_ADMIN".equals(role) || "ROLE_COMMUNITY_ADMIN".equals(role)) {
            return waterUsageLogRepository.findAllByOrderByDateDesc();
        }

        // If ROLE_USER, get their household and filter logs
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        if (user.getHousehold() == null) {
            return new ArrayList<>();
        }

        return waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(user.getHousehold().getId());
    }

    public Double getApartmentAverage(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));
        
        if (user.getHousehold() == null || user.getHousehold().getApartment() == null) {
            return 0.0;
        }

        Double avg = waterUsageLogRepository.findAverageConsumptionByApartment(user.getHousehold().getApartment().getId());
        return avg != null ? avg : 0.0;
    }

    public Double getSimilarSizedHouseholdAverage(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));
        
        if (user.getHousehold() == null || user.getHousehold().getApartment() == null) {
            return 0.0;
        }

        Household h = user.getHousehold();
        Double minArea = h.getAreaSqm() * 0.85; // +/- 15% range
        Double maxArea = h.getAreaSqm() * 1.15;

        Double avg = waterUsageLogRepository.findAverageConsumptionByApartmentAndAreaRange(h.getApartment().getId(), minArea, maxArea);
        return avg != null ? avg : 0.0;
    }
}