package com.water.water;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import com.water.water.model.User;
import com.water.water.repository.UserRepository;
import com.water.water.repository.ApartmentRepository;
import com.water.water.repository.HouseholdRepository;
import java.util.List;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WaterApplication {

	public static void main(String[] args) {
		SpringApplication.run(WaterApplication.class, args);
	}

	@Bean
	public CommandLineRunner bootstrap(
			UserRepository userRepository,
			ApartmentRepository apartmentRepository,
			HouseholdRepository householdRepository,
			com.water.water.service.WaterUsageService waterUsageService,
			com.water.water.service.OnboardingService onboardingService,
			com.water.water.service.DemoDataSeeder demoDataSeeder) {
		return args -> {
			List<User> users = userRepository.findAll();
			for (User user : users) {
				if (!user.isApproved()) {
					user.setApproved(true);
					userRepository.save(user);
					System.out.println("Auto-approved existing user on startup: " + user.getEmail());
				}
			}

			// Automatically fix legacy consumption data on startup
			int fixed = waterUsageService.recalculateAllConsumption();
			System.out.println("Bootstrap: Recalculated consumption for " + fixed + " logs.");

			// Drop legacy/orphaned tables left over from old schema versions
			onboardingService.dropLegacyTables();

			// Seed meter readings for Harsh for last 6 months up to 3 Aug 2026
			String seedMsg = waterUsageService.seedMeterReadingsForHarsh();
			System.out.println("Bootstrap: " + seedMsg);

			// Seed 3 Community Admins, Residents, 3 Months Water Logs, and Paid Bills up to July
			String demoMsg = demoDataSeeder.seedDemoData();
			System.out.println("Bootstrap: " + demoMsg);
		};
	}
}

