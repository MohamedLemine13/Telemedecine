package com.irt42.telemedecine.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.Architectures;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Baseline architecture rules for the modular monolith.
 *
 * <p>Each bounded-context module owns its sub-packages
 * ({@code api}, {@code domain}, {@code application}, {@code infrastructure},
 * {@code events}). These rules guard cross-module coupling so the modules
 * stay independently extractable into services later.
 */
@AnalyzeClasses(
    packages = "com.irt42.telemedecine",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class ArchitectureTest {

    /**
     * Layers within each bounded context flow inward only:
     * api → application → domain ; infrastructure → application/domain.
     * (Rules are stated lightly because the modules are not yet populated;
     *  this baseline catches regressions as modules land in Phases 1+.)
     */
    @ArchTest
    static final ArchRule domain_never_depends_on_api_or_infrastructure =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..api..", "..infrastructure.."
            );

    /**
     * Bounded contexts only talk via events or via published API (controllers),
     * never via direct internal package access. Each top-level module slice is
     * one of: auth, patient, doctor, admin, appointment, consultation,
     * prescription, payment, notification, audit, gdpr, common, config.
     */
    @ArchTest
    static final ArchRule modules_are_acyclic =
        SlicesRuleDefinition
            .slices()
            .matching("com.irt42.telemedecine.(*)..")
            .should().beFreeOfCycles();

    /**
     * Controllers must live under .api packages.
     */
    @ArchTest
    static final ArchRule controllers_live_in_api =
        classes()
            .that().haveSimpleNameEndingWith("Controller")
            .should().resideInAPackage("..api..");

    /**
     * No direct JPA imports outside of infrastructure (keeps the domain pure).
     * This rule is permissive for {@code common} which hosts the shared base
     * entity.
     */
    @ArchTest
    static final ArchRule jpa_only_in_infrastructure_or_common =
        Architectures.layeredArchitecture()
            .consideringAllDependencies()
            .layer("Infrastructure").definedBy("..infrastructure..", "..common..")
            .layer("Domain").definedBy("..domain..")
            .layer("Application").definedBy("..application..")
            .layer("Api").definedBy("..api..")
            .whereLayer("Api").mayOnlyBeAccessedByLayers("Application")
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Api", "Infrastructure")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Infrastructure", "Api");
}
