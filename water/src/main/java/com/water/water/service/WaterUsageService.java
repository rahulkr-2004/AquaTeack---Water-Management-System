package com.water.water.service;

import com.water.water.dto.WaterUsageRequest;
import com.water.water.model.Apartment;
import com.water.water.model.Household;
import com.water.water.model.Role;
import com.water.water.model.WaterUsageLog;
import com.water.water.model.User;
import com.water.water.repository.ApartmentRepository;
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
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WaterUsageService {

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

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
            // This is the first/baseline reading. The meter is just being initialized.
            // No water has been 'consumed' yet — consumption starts from the NEXT reading.
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

            int householdCol = 0;
            int dateCol = 1;
            int readingCol = 2;
            int prevCol = -1;

            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                // Handle header row dynamically if present
                if (isFirstLine) {
                    isFirstLine = false;
                    String[] headers = line.split(",");
                    boolean hasHeaderKeywords = false;
                    for (int i = 0; i < headers.length; i++) {
                        String h = headers[i].trim().toLowerCase().replaceAll("[^a-z0-9]", "");
                        if (h.contains("household")) { householdCol = i; hasHeaderKeywords = true; }
                        else if (h.contains("date")) { dateCol = i; hasHeaderKeywords = true; }
                        else if (h.equals("readingliters") || h.contains("cumulat") || h.equals("reading")) { readingCol = i; hasHeaderKeywords = true; }
                        else if (h.contains("previous")) { prevCol = i; }
                    }
                    if (hasHeaderKeywords) {
                        continue; // Skip header row
                    }
                }

                String[] data = line.split(",", -1);
                if (data.length <= Math.max(householdCol, dateCol)) continue;

                try {
                    String householdStr = data[householdCol].trim();
                    if (householdStr.startsWith("\uFEFF")) {
                        householdStr = householdStr.substring(1);
                    }
                    if (householdStr.isEmpty()) continue;

                    Long householdId = Long.parseLong(householdStr);
                    Household household = householdRepository.findById(householdId).orElse(null);
                    if (household == null) continue;

                    String dateStr = data[dateCol].trim();
                    if (dateStr.isEmpty()) continue;

                    LocalDate date;
                    if (dateStr.contains("/")) {
                        dateStr = dateStr.replace("/", "-");
                    }
                    if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) {
                        date = LocalDate.parse(dateStr, java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                    } else if (dateStr.matches("\\d{1,2}-\\d{1,2}-\\d{4}")) {
                        date = LocalDate.parse(dateStr, java.time.format.DateTimeFormatter.ofPattern("d-M-yyyy"));
                    } else {
                        date = LocalDate.parse(dateStr);
                    }

                    // Try readingCol first, fallback to prevCol if readingCol is blank
                    String readingValStr = (readingCol >= 0 && readingCol < data.length) ? data[readingCol].trim() : "";
                    if (readingValStr.isEmpty() && prevCol >= 0 && prevCol < data.length) {
                        readingValStr = data[prevCol].trim();
                    }

                    if (readingValStr.isEmpty()) continue;

                    double readingLiters = Double.parseDouble(readingValStr);

                    // Check if log already exists for this household and date
                    WaterUsageLog existingLog = waterUsageLogRepository.findAll().stream()
                            .filter(l -> l.getHousehold() != null && l.getHousehold().getId().equals(householdId) && l.getDate().equals(date))
                            .findFirst().orElse(null);

                    if (existingLog != null) {
                        existingLog.setReadingLiters(readingLiters);
                        savedLogs.add(waterUsageLogRepository.save(existingLog));
                    } else {
                        WaterUsageLog newLog = new WaterUsageLog();
                        newLog.setHousehold(household);
                        newLog.setDate(date);
                        newLog.setReadingLiters(readingLiters);
                        newLog.setConsumptionLiters(0.0);
                        savedLogs.add(waterUsageLogRepository.save(newLog));
                    }
                } catch (Exception e) {
                    System.out.println("Skipped bulk row due to error: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV file: " + e.getMessage());
        }

        if (!savedLogs.isEmpty()) {
            recalculateAllConsumption();
        }

        return savedLogs;
    }

    /**
     * Generates a CSV template for bulk meter reading upload.
     * One row per household with a meter and assigned resident; reading date is the period end date.
     * First three columns match bulk-upload format; trailing columns are reference-only.
     */
    public String generateBulkUploadTemplate(String email, String role, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start date and end date are required.");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }
        if ("ROLE_USER".equals(role)) {
            throw new IllegalArgumentException("Access denied: only admins can download bulk upload templates.");
        }

        List<Household> households = getHouseholdsForAdmin(email, role).stream()
                .filter(h -> h != null && h.isHasMeter())
                .sorted(Comparator
                        .comparing((Household h) -> (h != null && h.getApartment() != null) ? h.getApartment().getName() : "")
                        .thenComparing((Household h) -> (h != null && h.getBlock() != null) ? h.getBlock() : "")
                        .thenComparing((Household h) -> (h != null && h.getFlatNumber() != null) ? h.getFlatNumber() : ""))
                .collect(Collectors.toList());

        StringBuilder csv = new StringBuilder();
        csv.append("householdId,date,readingLiters,previousReading,residentName,apartment,block,flatNumber\n");

        for (Household household : households) {
            User resident = userRepository.findByHouseholdId(household.getId()).stream()
                    .filter(u -> u.getRole() == Role.ROLE_USER && u.isApproved())
                    .findFirst()
                    .orElse(null);
            String residentName = resident != null ? resident.getName() : "Unassigned";

            WaterUsageLog lastLog = waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(household.getId());
            String previousReading = lastLog != null ? String.valueOf(lastLog.getReadingLiters()) : "0";

            for (LocalDate currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
                csv.append(household.getId()).append(',')
                        .append(currentDate).append(',')
                        .append(',') // readingLiters column to be filled in by admin
                        .append(previousReading).append(',')
                        .append(csvEscape(residentName)).append(',')
                        .append(csvEscape(household.getApartment() != null ? household.getApartment().getName() : "")).append(',')
                        .append(csvEscape(household.getBlock())).append(',')
                        .append(csvEscape(household.getFlatNumber()))
                        .append('\n');
            }
        }

        return csv.toString();
    }

    private List<Household> getHouseholdsForAdmin(String email, String role) {
        if ("ROLE_COMMUNITY_ADMIN".equals(role)) {
            User admin = userRepository.findByEmail(email).orElse(null);
            if (admin != null && admin.getManagedApartment() != null) {
                Long apartmentId = admin.getManagedApartment().getId();
                return householdRepository.findAll().stream()
                        .filter(h -> h.getApartment() != null && h.getApartment().getId().equals(apartmentId))
                        .collect(Collectors.toList());
            }
            return new ArrayList<>();
        }
        return householdRepository.findAll();
    }

    private String csvEscape(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    public List<WaterUsageLog> getLogsForUser(String email, String role) {
        boolean isSuperAdmin = "ROLE_ADMIN".equals(role) || "ADMIN".equals(role);
        boolean isCommunityAdmin = "ROLE_COMMUNITY_ADMIN".equals(role) || "COMMUNITY_ADMIN".equals(role);

        if (isSuperAdmin) {
            return waterUsageLogRepository.findAllByOrderByDateDesc().stream()
                    .filter(l -> !(l.getReadingLiters() == 0.0 && l.getConsumptionLiters() == 0.0))
                    .collect(Collectors.toList());
        }

        if (isCommunityAdmin) {
            User admin = userRepository.findByEmail(email).orElse(null);
            if (admin != null && admin.getManagedApartment() != null) {
                return waterUsageLogRepository.findAllByOrderByDateDesc().stream()
                        .filter(l -> l.getHousehold() != null && l.getHousehold().getApartment().getId().equals(admin.getManagedApartment().getId()))
                        .filter(l -> !(l.getReadingLiters() == 0.0 && l.getConsumptionLiters() == 0.0))
                        .collect(Collectors.toList());
            }
            return new ArrayList<>();
        }

        // If ROLE_USER, get their household and filter logs
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        if (user.getHousehold() == null) {
            return new ArrayList<>();
        }

        return waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(user.getHousehold().getId()).stream()
                .filter(l -> !(l.getReadingLiters() == 0.0 && l.getConsumptionLiters() == 0.0))
                .collect(Collectors.toList());
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

    @Autowired
    private ApartmentRepository apartmentRepository;

    public String seedMeterReadingsForHarsh() {
        // Find user Harsh by name, email or username
        User user = userRepository.findAll().stream()
                .filter(u -> u.getName() != null && u.getName().toLowerCase().contains("harsh"))
                .findFirst().orElse(null);

        if (user == null) {
            user = userRepository.findAll().stream()
                    .filter(u -> u.getEmail() != null && u.getEmail().toLowerCase().contains("harsh"))
                    .findFirst().orElse(null);
        }

        if (user == null) {
            // Create user Harsh if not present
            user = new User();
            user.setName("Harsh");
            user.setEmail("rahulamp2004@gmail.com");
            user.setRole(Role.ROLE_USER);
            user.setApproved(true);
            if (passwordEncoder != null) {
                user.setPassword(passwordEncoder.encode("password123"));
            } else {
                user.setPassword("password123");
            }
            user = userRepository.save(user);
        }

        Household household = user.getHousehold();
        if (household == null) {
            // Find or create household for Harsh
            Apartment apt = apartmentRepository.findAll().stream().findFirst().orElseGet(() -> {
                Apartment newApt = new Apartment();
                newApt.setName("Jeet Homes");
                newApt.setAddress("City Center");
                return apartmentRepository.save(newApt);
            });

            final Apartment finalApt = apt;
            household = householdRepository.findByApartmentIdAndBlockAndFlatNumber(apt.getId(), "5", "609")
                    .orElseGet(() -> {
                        Household hh = new Household();
                        hh.setApartment(finalApt);
                        hh.setBlock("5");
                        hh.setFlatNumber("609");
                        hh.setHasMeter(true);
                        return householdRepository.save(hh);
                    });

            user.setHousehold(household);
            userRepository.save(user);
        }

        // Generate logs for 6 months: 01-Feb-2026 to 03-Aug-2026
        LocalDate startDate = LocalDate.of(2026, 2, 1);
        LocalDate endDate = LocalDate.of(2026, 8, 3);

        List<WaterUsageLog> existing = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(household.getId());
        if (!existing.isEmpty()) {
            waterUsageLogRepository.deleteAll(existing);
        }

        List<WaterUsageLog> newLogs = new ArrayList<>();
        double currentMeterReading = 15000.0; // Baseline cumulative meter reading

        LocalDate date = startDate;
        java.util.Random random = new java.util.Random(42);

        while (!date.isAfter(endDate)) {
            double dailyUsage = 180 + random.nextInt(140);
            boolean isAnomaly = false;

            if (date.getDayOfMonth() == 15 || date.getDayOfMonth() == 28) {
                dailyUsage = 480 + random.nextInt(100);
                isAnomaly = true;
            }

            if (date.equals(startDate)) {
                WaterUsageLog log = new WaterUsageLog();
                log.setHousehold(household);
                log.setDate(date);
                log.setReadingLiters(currentMeterReading);
                log.setConsumptionLiters(0.0);
                log.setAnomaly(false);
                newLogs.add(log);
            } else {
                currentMeterReading += dailyUsage;
                WaterUsageLog log = new WaterUsageLog();
                log.setHousehold(household);
                log.setDate(date);
                log.setReadingLiters(currentMeterReading);
                log.setConsumptionLiters(dailyUsage);
                log.setAnomaly(isAnomaly);
                newLogs.add(log);
            }

            date = date.plusDays(1);
        }

        waterUsageLogRepository.saveAll(newLogs);
        recalculateAllConsumption();

        return "Successfully logged " + newLogs.size() + " meter readings for Harsh from 01-Feb-2026 up to 03-Aug-2026.";
    }

    /**
     * Recalculates consumptionLiters for all logs as proper delta (current - previous reading).
     * The first log per household gets consumptionLiters = 0 (baseline).
     * Run once to fix legacy data.
     */
    public int recalculateAllConsumption() {
        List<WaterUsageLog> allLogs = waterUsageLogRepository.findAllByOrderByDateDesc();

        // 1. Purge dummy registration 0L logs where readingLiters == 0 && consumptionLiters == 0
        List<WaterUsageLog> zeroLogs = allLogs.stream()
                .filter(l -> l.getReadingLiters() == 0.0 && l.getConsumptionLiters() == 0.0)
                .collect(Collectors.toList());
        if (!zeroLogs.isEmpty()) {
            waterUsageLogRepository.deleteAll(zeroLogs);
            allLogs.removeAll(zeroLogs);
        }

        // Group by household
        java.util.Map<Long, java.util.List<WaterUsageLog>> byHousehold = new java.util.HashMap<>();
        for (WaterUsageLog log : allLogs) {
            if (log.getHousehold() == null) continue;
            Long hhId = log.getHousehold().getId();
            byHousehold.computeIfAbsent(hhId, k -> new java.util.ArrayList<>()).add(log);
        }

        int fixedCount = 0;
        for (java.util.Map.Entry<Long, java.util.List<WaterUsageLog>> entry : byHousehold.entrySet()) {
            java.util.List<WaterUsageLog> logs = entry.getValue();
            // Sort ASC by date then id
            logs.sort((a, b) -> {
                int d = a.getDate().compareTo(b.getDate());
                return d != 0 ? d : Long.compare(a.getId(), b.getId());
            });

            for (int i = 0; i < logs.size(); i++) {
                WaterUsageLog log = logs.get(i);
                double consumption;
                if (i == 0) {
                    consumption = 0.0; // baseline
                } else {
                    double prev = logs.get(i - 1).getReadingLiters();
                    consumption = Math.max(0.0, log.getReadingLiters() - prev);
                }
                log.setConsumptionLiters(consumption);
                waterUsageLogRepository.save(log);
                fixedCount++;
            }
        }
        return fixedCount;
    }

    public List<java.util.Map<String, Object>> getApartmentLeaderboard(String email) {
        User currentUser = userRepository.findByEmail(email).orElse(null);
        Household userHousehold = currentUser != null ? currentUser.getHousehold() : null;
        Long apartmentId = userHousehold != null && userHousehold.getApartment() != null ? userHousehold.getApartment().getId() : null;

        List<Household> households;
        if (apartmentId != null) {
            households = householdRepository.findByApartmentId(apartmentId);
        } else {
            households = householdRepository.findAll();
        }

        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        List<java.util.Map<String, Object>> leaderboard = new ArrayList<>();

        for (Household h : households) {
            User resident = userRepository.findAll().stream()
                    .filter(u -> u.getHousehold() != null && u.getHousehold().getId().equals(h.getId()))
                    .findFirst().orElse(null);

            String residentName = resident != null && resident.getName() != null ? resident.getName() : "Flat " + h.getFlatNumber();
            boolean isUser = currentUser != null && currentUser.getHousehold() != null && currentUser.getHousehold().getId().equals(h.getId());

            List<WaterUsageLog> logs = waterUsageLogRepository.findByHouseholdIdAndDateAfter(h.getId(), thirtyDaysAgo);
            double totalUsageLiters = logs.stream().mapToDouble(WaterUsageLog::getConsumptionLiters).sum();
            int daysCount = Math.max(1, logs.size());
            double dailyAvg = totalUsageLiters / daysCount;

            if (totalUsageLiters <= 0) {
                // Realistic default baseline when meter has just been created
                dailyAvg = 280.0;
                totalUsageLiters = dailyAvg * 30;
            }

            int familySize = 4;
            double perCapitaDaily = Math.round((dailyAvg / familySize) * 10.0) / 10.0;

            java.util.Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("id", "hh_" + h.getId());
            entry.put("householdId", h.getId());
            entry.put("flat", h.getFlatNumber() != null ? h.getFlatNumber() : "N/A");
            entry.put("block", h.getBlock() != null ? h.getBlock() : "A");
            entry.put("resident", isUser ? residentName + " (You)" : residentName);
            entry.put("familySize", familySize);
            entry.put("perCapitaDaily", perCapitaDaily);
            entry.put("totalMonthly", Math.round(totalUsageLiters));
            entry.put("dailyAverage", Math.round(dailyAvg));
            entry.put("isUser", isUser);

            leaderboard.add(entry);
        }

        leaderboard.sort(Comparator.comparingDouble(a -> ((Number) a.get("perCapitaDaily")).doubleValue()));
        return leaderboard;
    }
}
