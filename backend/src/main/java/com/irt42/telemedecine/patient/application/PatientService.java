package com.irt42.telemedecine.patient.application;

import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.patient.api.dto.AllergyDto;
import com.irt42.telemedecine.patient.api.dto.LabResultDto;
import com.irt42.telemedecine.patient.api.dto.PatientProfileDto;
import com.irt42.telemedecine.patient.api.dto.TreatmentDto;
import com.irt42.telemedecine.patient.api.dto.UpdatePatientProfileRequest;
import com.irt42.telemedecine.patient.domain.Allergy;
import com.irt42.telemedecine.patient.domain.LabResult;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import com.irt42.telemedecine.patient.domain.Treatment;
import com.irt42.telemedecine.patient.infrastructure.PatientProfileRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Patient profile + sub-resources. Profiles are lazily created on first read
 * so a freshly signed-up patient can immediately call {@code GET /api/patients/me}
 * without an explicit "create" step.
 */
@Service
public class PatientService {

    private final PatientProfileRepository repo;
    private final AccountRepository accounts;

    @PersistenceContext
    private EntityManager em;

    public PatientService(PatientProfileRepository repo, AccountRepository accounts) {
        this.repo = repo;
        this.accounts = accounts;
    }

    @Transactional
    public PatientProfileDto getOrCreateMine(UUID accountId) {
        PatientProfile p = repo.findByAccountId(accountId).orElseGet(() -> {
            PatientProfile pp = new PatientProfile();
            pp.setAccount(accounts.findById(accountId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found")));
            return repo.save(pp);
        });
        return PatientProfileDto.from(p);
    }

    @Transactional
    public PatientProfileDto updateMine(UUID accountId, UpdatePatientProfileRequest req) {
        PatientProfile p = loadMine(accountId);
        if (req.firstName() != null)      p.setFirstName(req.firstName());
        if (req.lastName() != null)       p.setLastName(req.lastName());
        if (req.dateOfBirth() != null)    p.setDateOfBirth(req.dateOfBirth());
        if (req.gender() != null)         p.setGender(req.gender());
        if (req.medicalHistory() != null) p.setMedicalHistory(req.medicalHistory());
        return PatientProfileDto.from(p);
    }

    // ── Allergies ───────────────────────────────────────────────────────────
    @Transactional
    public AllergyDto addAllergy(UUID accountId, AllergyDto dto) {
        PatientProfile p = loadMine(accountId);
        Allergy a = new Allergy();
        a.setPatient(p);
        a.setSubstance(dto.substance());
        a.setSeverity(dto.severity());
        a.setNotes(dto.notes());
        p.getAllergies().add(a);
        em.flush();  // assigns generated id before the DTO is built
        return AllergyDto.from(a);
    }

    @Transactional
    public void deleteAllergy(UUID accountId, UUID allergyId) {
        PatientProfile p = loadMine(accountId);
        p.getAllergies().removeIf(a -> a.getId().equals(allergyId));
    }

    // ── Treatments ──────────────────────────────────────────────────────────
    @Transactional
    public TreatmentDto addTreatment(UUID accountId, TreatmentDto dto) {
        PatientProfile p = loadMine(accountId);
        Treatment t = new Treatment();
        t.setPatient(p);
        t.setMedication(dto.medication());
        t.setDosage(dto.dosage());
        t.setFrequency(dto.frequency());
        t.setStartedOn(dto.startedOn());
        t.setEndedOn(dto.endedOn());
        t.setNotes(dto.notes());
        p.getTreatments().add(t);
        em.flush();
        return TreatmentDto.from(t);
    }

    @Transactional
    public void deleteTreatment(UUID accountId, UUID id) {
        PatientProfile p = loadMine(accountId);
        p.getTreatments().removeIf(t -> t.getId().equals(id));
    }

    // ── Lab results ─────────────────────────────────────────────────────────
    @Transactional
    public LabResultDto addLabResult(UUID accountId, LabResultDto dto) {
        PatientProfile p = loadMine(accountId);
        LabResult r = new LabResult();
        r.setPatient(p);
        r.setLabel(dto.label());
        r.setPerformedOn(dto.performedOn());
        r.setResultValue(dto.resultValue());
        r.setUnit(dto.unit());
        r.setNotes(dto.notes());
        r.setDocumentUrl(dto.documentUrl());
        p.getLabResults().add(r);
        em.flush();
        return LabResultDto.from(r);
    }

    @Transactional
    public void deleteLabResult(UUID accountId, UUID id) {
        PatientProfile p = loadMine(accountId);
        p.getLabResults().removeIf(r -> r.getId().equals(id));
    }

    // ── helpers ─────────────────────────────────────────────────────────────
    private PatientProfile loadMine(UUID accountId) {
        return repo.findByAccountId(accountId).orElseGet(() -> {
            getOrCreateMine(accountId);
            return repo.findByAccountId(accountId).orElseThrow();
        });
    }
}
