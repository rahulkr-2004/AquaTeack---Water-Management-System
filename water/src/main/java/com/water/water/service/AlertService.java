package com.water.water.service;

import com.water.water.model.Household;
import com.water.water.model.SystemAlert;
import com.water.water.model.TariffPlan;
import com.water.water.model.WaterUsageLog;
import com.water.water.repository.HouseholdRepository;
import com.water.water.repository.SystemAlertRepository;
import com.water.water.repository.TariffPlanRepository;
import com.water.water.repository.WaterUsageLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class AlertService {

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private WaterUsageLogRepository waterUsageLogRepository;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private TariffPlanRepository tariffPlanRepository;

    @Autowired
    private com.water.water.repository.UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    // Run every day at 1 AM
    @Scheduled(cron = "0 0 1 * * ?")
    public void checkUsageThresholds() {
        System.out.println("Running scheduled task: Checking usage thresholds...");
        List<Household> households = householdRepository.findAll();

        for (Household household : households) {
            if (!household.isHasMeter()) continue;

            // Get tariff plan for the apartment
            Optional<TariffPlan> tariffPlanOpt = tariffPlanRepository.findByApartmentId(household.getApartment().getId());
            if (tariffPlanOpt.isEmpty()) continue;

            int limitLiters = tariffPlanOpt.get().getBaseLimitKl() * 1000;

            // Get the latest reading (assuming it represents total current billing cycle or just a daily check)
            WaterUsageLog lastLog = waterUsageLogRepository.findTopByHouseholdIdOrderByDateDesc(household.getId());
            if (lastLog == null) continue;

            // Just for demonstration, let's say if daily consumption exceeds a fraction of the monthly limit
            // Or if consumption > threshold, we flag. Let's use daily consumption > 1000L as a hardcoded threshold for now, 
            // or we use the baseLimitKl / 30 for daily threshold.
            double dailyThreshold = limitLiters / 30.0;

            if (lastLog.getConsumptionLiters() > dailyThreshold) {
                createAlert(household, "High Daily Usage", 
                    "Your daily water usage of " + lastLog.getConsumptionLiters() + "L exceeds the recommended daily threshold of " + String.format("%.2f", dailyThreshold) + "L.", 
                    "OVERUSE");
            }
        }
    }

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void detectStatisticalOutliers() {
        System.out.println("Running scheduled task: Detecting statistical outliers...");
        List<Household> households = householdRepository.findAll();

        for (Household household : households) {
            if (!household.isHasMeter()) continue;

            List<WaterUsageLog> logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(household.getId());
            if (logs.size() < 7) continue; // Need at least 7 days of data for stats

            // Calculate mean
            double sum = 0;
            for (WaterUsageLog log : logs) {
                sum += log.getConsumptionLiters();
            }
            double mean = sum / logs.size();

            // Calculate standard deviation (sigma)
            double varianceSum = 0;
            for (WaterUsageLog log : logs) {
                varianceSum += Math.pow(log.getConsumptionLiters() - mean, 2);
            }
            double variance = varianceSum / logs.size();
            double sigma = Math.sqrt(variance);

            WaterUsageLog latestLog = logs.get(0);
            
            // Flag if usage > 2σ above household average
            if (latestLog.getConsumptionLiters() > (mean + 2 * sigma)) {
                createAlert(household, "Potential Leak Detected", 
                    "Your recent usage of " + latestLog.getConsumptionLiters() + "L is significantly higher than your average of " + String.format("%.2f", mean) + "L. Please check for potential leaks.", 
                    "LEAK");
            }
        }
    }

    private void createAlert(Household household, String title, String message, String type) {
        SystemAlert alert = new SystemAlert();
        alert.setHousehold(household);
        alert.setTitle(title);
        alert.setMessage(message);
        alert.setType(type);
        alert.setDate(LocalDate.now());
        alert.setResolved(false);
        systemAlertRepository.save(alert);

        java.util.List<com.water.water.model.User> users = userRepository.findByHouseholdId(household.getId());
        for (com.water.water.model.User user : users) {
            emailService.sendEmail(user.getEmail(), "AquaTrack Alert: " + title, message);
        }
    }
}
