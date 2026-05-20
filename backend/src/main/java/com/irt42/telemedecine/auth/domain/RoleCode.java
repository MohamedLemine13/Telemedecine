package com.irt42.telemedecine.auth.domain;

/**
 * Role identifiers shared between the database (role.code column) and the
 * JWT `roles` claim. Keep these in lockstep with V1__init.sql's CHECK constraint.
 */
public enum RoleCode {
    ROLE_PATIENT,
    ROLE_DOCTOR,
    ROLE_ADMIN
}
