package com.irt42.telemedecine.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearer-jwt";

    @Bean
    public OpenAPI telemedecineOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Telemedecine API")
                .description("REST API for the Telemedecine platform (patient / doctor / admin spaces).")
                .version("v0.0.1")
                .contact(new Contact().name("IRT42").email("security@telemedecine.example"))
                .license(new License().name("TBD")))
            .components(new Components()
                .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
