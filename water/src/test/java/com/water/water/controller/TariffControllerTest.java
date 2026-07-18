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
public class TariffControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testGetTariffs_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/tariffs"))
                .andExpect(status().isForbidden());
    }
}
