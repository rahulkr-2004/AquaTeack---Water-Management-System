package com.water.water.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class BillingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testGetCycles_Unauthorized() throws Exception {
        // Without JWT token, it should be unauthorized or forbidden
        mockMvc.perform(get("/api/billing/cycles"))
                .andExpect(status().isForbidden());
    }
}
