package com.irt42.telemedecine.admin.application;

import com.irt42.telemedecine.admin.domain.VerificationCase;
import com.irt42.telemedecine.admin.infrastructure.VerificationCaseRepository;
import com.irt42.telemedecine.doctor.events.CredentialUploadedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * When a credential is uploaded, ensure there's a PENDING verification case
 * for the doctor. If one already exists (regardless of status) we reset it
 * to PENDING — uploading new evidence reopens review.
 */
@Component
public class VerificationCaseListener {

    private final VerificationCaseRepository repo;

    public VerificationCaseListener(VerificationCaseRepository repo) {
        this.repo = repo;
    }

    @EventListener
    @Transactional
    public void on(CredentialUploadedEvent event) {
        VerificationCase vc = repo.findByDoctorId(event.doctorId()).orElseGet(() -> {
            VerificationCase fresh = new VerificationCase();
            fresh.setDoctorId(event.doctorId());
            return fresh;
        });
        vc.setStatus(VerificationCase.Status.PENDING);
        vc.setReviewerId(null);
        vc.setDecisionNote(null);
        vc.setDecidedAt(null);
        repo.save(vc);
    }
}
