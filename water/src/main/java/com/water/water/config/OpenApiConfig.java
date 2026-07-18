package com.water.water.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI aquaTrackOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AquaTrack API")
                        .description("API Documentation for AquaTrack Web-Based Water Usage Monitoring and Billing Administration Platform")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("AquaTrack Team")
                                .email("support@aquatrack.com")));
    }
}
