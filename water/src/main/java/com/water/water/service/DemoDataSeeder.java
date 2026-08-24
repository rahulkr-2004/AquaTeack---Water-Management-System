package com.water.water.service;

import com.water.water.model.*;
import com.water.water.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import java.util.*;

@Service
public class DemoDataSeeder {

    @Autowired private UserRepository userRepository;
    @Autowired private ApartmentRepository apartmentRepository;
    @Autowired private BuildingRepository buildingRepository;
    @Autowired private HouseholdRepository householdRepository;
    @Autowired private WaterUsageLogRepository waterUsageLogRepository;
    @Autowired private BillingCycleRepository billingCycleRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private TariffPlanRepository tariffPlanRepository;
    @Autowired private WaterPurchaseRepository waterPurchaseRepository;
    @Autowired private SupportTicketRepository supportTicketRepository;
    @Autowired private SystemAlertRepository systemAlertRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Transactional
    public String seedDemoData() {
        // 0. Get or Create Colony "Jeet Homes" & Super Admin "Krishna Mohan"
        Apartment jeetHomes = apartmentRepository.findByName("Jeet Homes")
                .orElseGet(() -> {
                    Apartment a = new Apartment();
                    a.setName("Jeet Homes");
                    a.setAddress("Sector 21, Aqua City");
                    return apartmentRepository.save(a);
                });

        User krishna = userRepository.findByEmail("superadmin@gmail.com").orElseGet(() -> {
            User u = new User();
            u.setName("Krishna Mohan");
            u.setEmail("superadmin@gmail.com");
            u.setPassword(passwordEncoder.encode("Password@123"));
            u.setRole(Role.ROLE_ADMIN);
            u.setApproved(true);
            u.setManagedApartment(jeetHomes);
            u.setMobileNo("9988776655");
            return userRepository.save(u);
        });
        krishna.setName("Krishna Mohan");
        krishna.setPassword(passwordEncoder.encode("Password@123"));
        krishna.setRole(Role.ROLE_ADMIN);
        krishna.setApproved(true);
        krishna.setManagedApartment(jeetHomes);
        krishna.setMobileNo("9988776655");
        userRepository.save(krishna);

        // 1. Get or Create Apartment "Green Valley Heights"
        Apartment apt = apartmentRepository.findByName("Green Valley Heights")
                .orElseGet(() -> apartmentRepository.findAll().stream().findFirst().orElseGet(() -> {
                    Apartment a = new Apartment();
                    a.setName("Green Valley Heights");
                    a.setAddress("Sector 45, Green Park Avenue");
                    return apartmentRepository.save(a);
                }));

        // 2. Ensure Tariff Plan exists for this Apartment
        TariffPlan tariff = tariffPlanRepository.findByApartmentId(apt.getId()).orElseGet(() -> {
            TariffPlan t = new TariffPlan();
            t.setApartment(apt);
            t.setBaseRate(new BigDecimal("30.00"));
            t.setBaseLimitKl(12.0);
            t.setBaseLimitDays(30);
            t.setExcessRate(new BigDecimal("60.00"));
            return tariffPlanRepository.save(t);
        });

        // 3. Create Blocks / Buildings
        String[] blockNames = {"Block A", "Block B", "Block C", "Block 5"};
        Map<String, Building> buildingMap = new HashMap<>();
        for (String bName : blockNames) {
            Building b = buildingRepository.findByNameIgnoreCaseAndColonyIdAndDeletedFalse(bName, apt.getId())
                    .orElseGet(() -> {
                        Building newB = new Building();
                        newB.setName(bName);
                        newB.setColony(apt);
                        return buildingRepository.save(newB);
                    });
            buildingMap.put(bName, b);
        }

        // 4. Configure Community Admins:
        //    - User ID 6 (admin.blocka@aquatrack.com) as "Rajesh Sharma (Block A Admin)"
        //    - User ID 4 (rahul.admin@aquatrack.com / communityadmin@gmail.com) as "Rahul Kumar (Block 5 Admin)" for Block 5
        User user6 = userRepository.findById(6L).orElseGet(() -> userRepository.findByEmail("admin.blocka@aquatrack.com").orElse(null));
        if (user6 != null) {
            user6.setName("Rajesh Sharma (Block A Admin)");
            user6.setEmail("admin.blocka@aquatrack.com");
            user6.setRole(Role.ROLE_COMMUNITY_ADMIN);
            user6.setApproved(true);
            user6.setManagedApartment(apt);
            user6.setManagedBuilding(buildingMap.get("Block A"));
            userRepository.save(user6);
        }

        User user4 = userRepository.findById(4L).orElseGet(() -> userRepository.findByEmail("rahul.admin@aquatrack.com").orElseGet(() -> 
            userRepository.findByEmail("communityadmin@gmail.com").orElseGet(() -> {
                User u = new User();
                u.setName("Rahul Kumar (Block 5 Admin)");
                u.setEmail("communityadmin@gmail.com");
                u.setPassword(passwordEncoder.encode("adminpassword"));
                u.setRole(Role.ROLE_COMMUNITY_ADMIN);
                u.setApproved(true);
                u.setManagedApartment(apt);
                u.setManagedBuilding(buildingMap.get("Block 5"));
                u.setMobileNo("9876543210");
                return userRepository.save(u);
            })
        ));

        user4.setName("Rahul Kumar (Block 5 Admin)");
        user4.setRole(Role.ROLE_COMMUNITY_ADMIN);
        user4.setApproved(true);
        user4.setManagedApartment(apt);
        user4.setManagedBuilding(buildingMap.get("Block 5"));
        user4 = userRepository.save(user4);

        User adminB = userRepository.findByEmail("admin.blockb@aquatrack.com").orElseGet(() -> {
            User u = new User();
            u.setName("Vikram Singh (Block B Admin)");
            u.setEmail("admin.blockb@aquatrack.com");
            u.setPassword(passwordEncoder.encode("password123"));
            u.setRole(Role.ROLE_COMMUNITY_ADMIN);
            u.setApproved(true);
            u.setManagedApartment(apt);
            u.setManagedBuilding(buildingMap.get("Block B"));
            u.setMobileNo("9876543210");
            return userRepository.save(u);
        });

        User adminC = userRepository.findByEmail("admin.blockc@aquatrack.com").orElseGet(() -> {
            User u = new User();
            u.setName("Sunita Deshmukh (Block C Admin)");
            u.setEmail("admin.blockc@aquatrack.com");
            u.setPassword(passwordEncoder.encode("password123"));
            u.setRole(Role.ROLE_COMMUNITY_ADMIN);
            u.setApproved(true);
            u.setManagedApartment(apt);
            u.setManagedBuilding(buildingMap.get("Block C"));
            u.setMobileNo("9876543210");
            return userRepository.save(u);
        });

        Map<String, User> adminUserMap = new HashMap<>();
        adminUserMap.put("Block 5", user4); // User ID 4 is the active Community Admin for Block 5
        adminUserMap.put("Block A", user6); // User ID 6 is the active Community Admin for Block A
        adminUserMap.put("Block B", adminB);
        adminUserMap.put("Block C", adminC);

        // 5. Create Resident Users & Households (Assigned under Block Admins, including Block 5 Admin Rahul)
        List<String[]> residentSpecs = List.of(
            // Block 5 (Under Community Admin Rahul Kumar - User ID 4)
            new String[]{"Amit Patel", "amit.blocka@aquatrack.com", "Block 5", "101", "4"},
            new String[]{"Priya Sharma", "priya.blocka@aquatrack.com", "Block 5", "102", "3"},
            new String[]{"Rohan Verma", "rohan.blocka@aquatrack.com", "Block 5", "103", "5"},
            new String[]{"Siddharth Rahul", "siddharth.blocka@aquatrack.com", "Block 5", "104", "4"},
            new String[]{"Kavita Rahul", "kavita.blocka@aquatrack.com", "Block 5", "105", "3"},
            new String[]{"Vikram Deshmukh", "vikram.blocka@aquatrack.com", "Block 5", "106", "4"},
            new String[]{"Sneha Reddy", "sneha.blocka@aquatrack.com", "Block 5", "107", "3"},

            // Block B (Under Vikram Singh)
            new String[]{"Suresh Kumar", "suresh.blockb@aquatrack.com", "Block B", "201", "4"},
            new String[]{"Neha Gupta", "neha.blockb@aquatrack.com", "Block B", "202", "2"},
            new String[]{"Ananya Rao", "ananya.blockb@aquatrack.com", "Block B", "203", "4"},

            // Block C (Under Sunita Deshmukh)
            new String[]{"Karan Malhotra", "karan.blockc@aquatrack.com", "Block C", "301", "3"},
            new String[]{"Meera Nair", "meera.blockc@aquatrack.com", "Block C", "302", "4"},
            new String[]{"Deepak Joshi", "deepak.blockc@aquatrack.com", "Block C", "303", "2"}
        );

        // Migrate any legacy households with block "A" or flats 101-107 to "5"
        for (Household hh : householdRepository.findAll()) {
            if ("A".equalsIgnoreCase(hh.getBlock()) || "Block A".equalsIgnoreCase(hh.getBlock()) || (hh.getFlatNumber() != null && hh.getFlatNumber().startsWith("10"))) {
                hh.setBlock("5");
                householdRepository.save(hh);
            }
        }

        List<Household> seededHouseholds = new ArrayList<>();
        Map<String, User> residentUserMap = new HashMap<>();
        Random rand = new Random(42);

        for (String[] spec : residentSpecs) {
            String name = spec[0];
            String email = spec[1];
            String blockName = spec[2];
            String flatNum = spec[3];
            String blockCode = blockName.replace("Block ", "").trim();

            Household household = householdRepository.findByApartmentIdAndBlockAndFlatNumber(apt.getId(), blockCode, flatNum)
                    .orElseGet(() -> householdRepository.findByApartmentIdAndBlockAndFlatNumber(apt.getId(), "A", flatNum)
                    .orElseGet(() -> {
                        Household hh = new Household();
                        hh.setApartment(apt);
                        hh.setBlock(blockCode);
                        hh.setFlatNumber(flatNum);
                        hh.setHasMeter(true);
                        hh.setAreaSqm(110.0);
                        return householdRepository.save(hh);
                    }));

            household.setBlock(blockCode);
            householdRepository.save(household);

            User admin = adminUserMap.get(blockName);

            User resident = userRepository.findByEmail(email).orElseGet(() -> {
                User u = new User();
                u.setName(name);
                u.setEmail(email);
                u.setPassword(passwordEncoder.encode("password123"));
                u.setRole(Role.ROLE_USER);
                u.setApproved(true);
                u.setHousehold(household);
                u.setManagedByAdmin(admin);
                u.setMobileNo("9123456789");
                return userRepository.save(u);
            });

            resident.setHousehold(household);
            resident.setManagedByAdmin(admin);
            resident.setApproved(true);
            userRepository.save(resident);

            seededHouseholds.add(household);
            residentUserMap.put(email, resident);

            // 6. Generate 3 Months Water Logs for this household (May 1, 2026 to August 9, 2026)
            seedWaterLogsForHousehold(household, rand);
        }

        // Ensure user ID 4 (Rahul Kumar) is explicitly set as managedByAdmin for all Block 5 residents and User 5 (Harsh)
        final User targetAdmin = user4;
        for (User u : userRepository.findAll()) {
            if (u.getHousehold() != null) {
                String b = u.getHousehold().getBlock();
                if ("5".equals(b) || "Block 5".equals(b) || "A".equals(b) || "Block A".equals(b) || (u.getHousehold().getFlatNumber() != null && u.getHousehold().getFlatNumber().startsWith("10"))) {
                    u.getHousehold().setBlock("5");
                    householdRepository.save(u.getHousehold());
                    u.setManagedByAdmin(targetAdmin);
                    userRepository.save(u);
                }
            }
        }

        userRepository.findById(5L).ifPresent(h -> {
            h.setManagedByAdmin(targetAdmin);
            userRepository.save(h);
            if (h.getHousehold() != null && !seededHouseholds.contains(h.getHousehold())) {
                seedWaterLogsForHousehold(h.getHousehold(), rand);
                seededHouseholds.add(h.getHousehold());
            }
        });

        // 7. Create Billing Cycles for May 2026, June 2026, July 2026, and August 2026
        seedBillingCyclesAndBills(apt, seededHouseholds, tariff);

        // 8. Seed Bulk Water Purchases for May, June, July, and August 2026
        seedWaterPurchases(apt);

        // 9. Seed Realistic Support Tickets
        seedSupportTickets(residentUserMap, adminUserMap);

        // 10. Seed System Alerts
        seedSystemAlerts(seededHouseholds);

        return "Successfully seeded 3 Community Admins, 9 Resident households across 3 Blocks, 3 months of daily water usage logs, paid bills up to July 2026, bulk water purchase logs, support tickets, and system alerts!";
    }

    private void seedWaterLogsForHousehold(Household hh, Random rand) {
        LocalDate startDate = LocalDate.of(2026, 5, 1);
        LocalDate endDate = LocalDate.now();

        double cumulativeMeter = 125000.0 + (hh.getId() != null ? hh.getId() * 1500 : 0);

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            if (!waterUsageLogRepository.existsByHouseholdIdAndDate(hh.getId(), d)) {
                double baseUsage = 230.0 + rand.nextInt(120); // 230 - 350 Liters daily
                if (d.getDayOfWeek().getValue() >= 6) {
                    baseUsage += 40.0;
                }

                cumulativeMeter += baseUsage;

                WaterUsageLog log = new WaterUsageLog();
                log.setHousehold(hh);
                log.setDate(d);
                log.setReadingLiters(cumulativeMeter);
                log.setConsumptionLiters(baseUsage);
                log.setAnomaly(baseUsage > 420);
                waterUsageLogRepository.save(log);
            }
        }
    }

    private void seedBillingCyclesAndBills(Apartment apt, List<Household> households, TariffPlan tariff) {
        Object[][] cycleDefs = new Object[][]{
            {"May 2026", LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 31), true, true, LocalDate.of(2026, 6, 3)},
            {"June 2026", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), true, true, LocalDate.of(2026, 7, 4)},
            {"July 2026", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31), true, true, LocalDate.of(2026, 8, 3)},
            {"August 2026 (Current)", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), false, false, null}
        };

        for (Object[] cdef : cycleDefs) {
            LocalDate start = (LocalDate) cdef[1];
            LocalDate end = (LocalDate) cdef[2];
            boolean isFinalized = (Boolean) cdef[3];
            boolean isPaid = (Boolean) cdef[4];
            LocalDate payDate = (LocalDate) cdef[5];

            List<BillingCycle> existingCycles = billingCycleRepository.findByApartmentId(apt.getId());
            BillingCycle cycle = existingCycles.stream()
                    .filter(c -> c.getStartDate().equals(start))
                    .findFirst()
                    .orElseGet(() -> {
                        BillingCycle bc = new BillingCycle();
                        bc.setApartment(apt);
                        bc.setStartDate(start);
                        bc.setEndDate(end);
                        bc.setFinalized(isFinalized);
                        bc.setTotalBulkCost(new BigDecimal("15000.00"));
                        return billingCycleRepository.save(bc);
                    });

            cycle.setFinalized(isFinalized);
            billingCycleRepository.save(cycle);

            for (Household hh : households) {
                List<User> users = userRepository.findByHouseholdId(hh.getId());
                if (users.isEmpty()) continue;
                User resident = users.get(0);

                List<Bill> existingBills = billRepository.findByHouseholdId(hh.getId());
                boolean billExists = existingBills.stream().anyMatch(b -> b.getBillingCycle().getId().equals(cycle.getId()));

                if (!billExists) {
                    List<WaterUsageLog> logs = waterUsageLogRepository.findByHouseholdIdOrderByDateDesc(hh.getId());
                    double totalConsumption = logs.stream()
                            .filter(l -> !l.getDate().isBefore(start) && !l.getDate().isAfter(end))
                            .mapToDouble(l -> l.getConsumptionLiters())
                            .sum();

                    if (totalConsumption <= 0) totalConsumption = 8500.0;

                    BigDecimal baseRatePerLiter = tariff.getBaseRate().divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP);
                    BigDecimal excessRatePerLiter = tariff.getExcessRate().divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP);
                    long baseLimitLiters = (long) (tariff.getBaseLimitKl() * 1000.0);

                    long consumed = (long) totalConsumption;
                    long baseQty = Math.min(consumed, baseLimitLiters);
                    long excessQty = Math.max(0, consumed - baseLimitLiters);

                    BigDecimal baseCharge = baseRatePerLiter.multiply(new BigDecimal(baseQty)).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal excessCharge = excessRatePerLiter.multiply(new BigDecimal(excessQty)).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal sharedCost = new BigDecimal("150.00");
                    BigDecimal subtotal = baseCharge.add(excessCharge).add(sharedCost);
                    BigDecimal tax = subtotal.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal platformFee = new BigDecimal("5.00");
                    BigDecimal totalAmount = subtotal.add(tax).add(platformFee);

                    Bill bill = new Bill();
                    bill.setHousehold(hh);
                    bill.setTargetUser(resident);
                    bill.setBillingCycle(cycle);
                    bill.setConsumptionLiters(totalConsumption);
                    bill.setBaseCharge(baseCharge);
                    bill.setExcessCharge(excessCharge);
                    bill.setSharedCostAllocation(sharedCost);
                    bill.setTaxAmount(tax);
                    bill.setPlatformFee(platformFee);
                    bill.setAmount(totalAmount);
                    bill.setPaid(isPaid);
                    if (isPaid && payDate != null) {
                        bill.setPaymentDate(payDate.atTime(14, 30));
                        bill.setRazorpayPaymentId("pay_MOCK_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                        bill.setRazorpayOrderId("order_MOCK_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    }
                    bill.setInvoiceNumber("INV-" + start.getYear() + "-" + String.format("%02d", start.getMonthValue()) + "-" + hh.getFlatNumber());
                    billRepository.save(bill);
                }
            }
        }
    }

    private void seedWaterPurchases(Apartment apt) {
        Object[][] purchaseSpecs = new Object[][]{
            {LocalDate.of(2026, 5, 10), 15000.0, new BigDecimal("3750.00"), "Jal Shakti Water Tankers", "WP-2026-05-101", "Block 5"},
            {LocalDate.of(2026, 5, 24), 20000.0, new BigDecimal("5000.00"), "Metro Water Supply", "WP-2026-05-102", "Block A"},
            {LocalDate.of(2026, 6, 12), 15000.0, new BigDecimal("3750.00"), "Aqua Pure Tankers", "WP-2026-06-201", "Block B"},
            {LocalDate.of(2026, 6, 26), 18000.0, new BigDecimal("4500.00"), "Jal Shakti Water Tankers", "WP-2026-06-202", "Block C"},
            {LocalDate.of(2026, 7, 8),  15000.0, new BigDecimal("3750.00"), "Metro Water Supply", "WP-2026-07-301", "Block 5"},
            {LocalDate.of(2026, 7, 22), 22000.0, new BigDecimal("5500.00"), "Ganga Water Services", "WP-2026-07-302", "Block A"},
            {LocalDate.of(2026, 8, 4),  15000.0, new BigDecimal("3750.00"), "Jal Shakti Water Tankers", "WP-2026-08-401", "Block 5"}
        };

        List<WaterPurchase> existingPurchases = waterPurchaseRepository.findByApartmentId(apt.getId());

        for (Object[] spec : purchaseSpecs) {
            LocalDate date = (LocalDate) spec[0];
            double liters = (Double) spec[1];
            BigDecimal cost = (BigDecimal) spec[2];
            String supplier = (String) spec[3];
            String invNum = (String) spec[4];
            String blockName = (String) spec[5];

            WaterPurchase wp = existingPurchases.stream()
                    .filter(p -> p.getInvoiceNumber() != null && p.getInvoiceNumber().equals(invNum))
                    .findFirst()
                    .orElseGet(() -> {
                        WaterPurchase newWp = new WaterPurchase();
                        newWp.setApartment(apt);
                        newWp.setDate(date);
                        newWp.setLiters(liters);
                        newWp.setCost(cost);
                        newWp.setSupplierName(supplier);
                        newWp.setInvoiceNumber(invNum);
                        return newWp;
                    });

            wp.setBlockName(blockName);
            waterPurchaseRepository.save(wp);
        }
    }

    private void seedSupportTickets(Map<String, User> residentUserMap, Map<String, User> adminUserMap) {
        if (supportTicketRepository.count() > 0) return;

        User amit = residentUserMap.get("amit.blocka@aquatrack.com");
        User neha = residentUserMap.get("neha.blockb@aquatrack.com");
        User karan = residentUserMap.get("karan.blockc@aquatrack.com");
        User rohan = residentUserMap.get("rohan.blocka@aquatrack.com");

        User adminA = adminUserMap.get("Block A");
        User adminB = adminUserMap.get("Block B");
        User adminC = adminUserMap.get("Block C");

        if (amit != null && adminA != null) {
            SupportTicket t1 = new SupportTicket();
            t1.setTitle("Low water pressure in kitchen faucet");
            t1.setDescription("Experiencing low pressure during morning peak hours (7 AM - 9 AM).");
            t1.setStatus("RESOLVED");
            t1.setResolutionNotes("Cleaned main inlet filter and inspected flow control valve.");
            t1.setRaisedBy(amit);
            t1.setAssignedTo(adminA);
            supportTicketRepository.save(t1);
        }

        if (neha != null && adminB != null) {
            SupportTicket t2 = new SupportTicket();
            t2.setTitle("Digital meter screen display flickering");
            t2.setDescription("Digital display screen on meter #B-202 flickers during reading taking.");
            t2.setStatus("IN_PROGRESS");
            t2.setRaisedBy(neha);
            t2.setAssignedTo(adminB);
            supportTicketRepository.save(t2);
        }

        if (karan != null && adminC != null) {
            SupportTicket t3 = new SupportTicket();
            t3.setTitle("Minor pipe seepage near main riser");
            t3.setDescription("Noticed minor water drops near the floor riser in Block C 3rd floor shaft.");
            t3.setStatus("RESOLVED");
            t3.setResolutionNotes("Replaced rubber washer gasket on vertical pipe joint.");
            t3.setRaisedBy(karan);
            t3.setAssignedTo(adminC);
            supportTicketRepository.save(t3);
        }

        if (rohan != null && adminA != null) {
            SupportTicket t4 = new SupportTicket();
            t4.setTitle("Query regarding excess tariff calculation in July bill");
            t4.setDescription("Would like clarification on the excess volume limit application for July.");
            t4.setStatus("OPEN");
            t4.setRaisedBy(rohan);
            t4.setAssignedTo(adminA);
            supportTicketRepository.save(t4);
        }
    }

    private void seedSystemAlerts(List<Household> households) {
        if (systemAlertRepository.count() > 0) return;

        Household hhBlockA = households.stream().filter(h -> "103".equals(h.getFlatNumber())).findFirst().orElse(households.get(0));

        SystemAlert a1 = new SystemAlert();
        a1.setHousehold(hhBlockA);
        a1.setTitle("High Continuous Water Flow Alert");
        a1.setMessage("Continuous flow detected in Flat 103 (Block A) exceeding 400L daily threshold. Potential pipe leakage.");
        a1.setDate(LocalDate.now().minusDays(2));
        a1.setType("LEAK");
        systemAlertRepository.save(a1);

        SystemAlert a2 = new SystemAlert();
        a2.setTitle("Overhead Water Tank Sanitation Notice");
        a2.setMessage("Scheduled cleaning and chlorination of main overhead storage tanks on 15-Aug-2026 from 10:00 AM to 02:00 PM.");
        a2.setDate(LocalDate.now().minusDays(1));
        a2.setType("MAINTENANCE");
        systemAlertRepository.save(a2);

        SystemAlert a3 = new SystemAlert();
        a3.setTitle("July 2026 Billing Statements Published");
        a3.setMessage("July 2026 monthly water consumption statements have been calculated and published for resident payments.");
        a3.setDate(LocalDate.now().minusDays(6));
        a3.setType("BILLING");
        systemAlertRepository.save(a3);
    }
}
