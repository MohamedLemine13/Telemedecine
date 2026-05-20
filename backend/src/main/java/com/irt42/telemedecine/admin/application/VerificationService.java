package com.irt42.telemedecine.admin.application;

import com.irt42.telemedecine.admin.api.dto.VerificationCaseDto;
import com.irt42.telemedecine.admin.domain.VerificationCase;
import com.irt42.telemedecine.admin.infrastructure.VerificationCaseRepository;
import com.irt42.telemedecine.doctor.api.dto.DoctorProfileDto;
import com.irt42.telemedecine.doctor.domain.Credential;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import com.irt42.telemedecine.storage.LocalFileStorage;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.time.Instant;
import java.util.UUID;

/**
 * Admin view + decisions on doctor verification cases. The credential download
 * endpoint streams the file directly from {@link LocalFileStorage} after
 * checking that the credential belongs to the case being reviewed.
 */
@Service
public class VerificationService {

    public record CredentialDownload(Resource resource, String name, String contentType) {}

    private final VerificationCaseRepository cases;
    private final DoctorProfileRepository doctors;
    private final LocalFileStorage storage;

    public VerificationService(VerificationCaseRepository cases,
                               DoctorProfileRepository doctors,
                               LocalFileStorage storage) {
        this.cases = cases;
        this.doctors = doctors;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Page<VerificationCaseDto> list(VerificationCase.Status status, int page, int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100),
            Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<VerificationCase> rows = (status == null)
            ? cases.findAll(pageable)
            : cases.findByStatus(status, pageable);
        return rows.map(this::toDtoWithDoctor);
    }

    @Transactional(readOnly = true)
    public VerificationCaseDto get(UUID id) {
        VerificationCase vc = cases.findById(id).orElseThrow(notFound("Case not found"));
        return toDtoWithDoctor(vc);
    }

    /** Stream a credential's file. Looks the credential up via the case so the
     *  URL itself acts as an authorisation token (admin only via the controller). */
    @Transactional(readOnly = true)
    public CredentialDownload downloadCredential(UUID caseId, UUID credentialId) {
        VerificationCase vc = cases.findById(caseId).orElseThrow(notFound("Case not found"));
        DoctorProfile doctor = doctors.findById(vc.getDoctorId()).orElseThrow(notFound("Doctor not found"));
        Credential cred = doctor.getCredentials().stream()
            .filter(c -> c.getId().equals(credentialId))
            .findFirst()
            .orElseThrow(notFound("Credential not found"));

        var path = storage.resolve(cred.getDocumentKey());
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.GONE, "File no longer available");
        }
        return new CredentialDownload(
            new FileSystemResource(path),
            cred.getDocumentName(),
            cred.getContentType()
        );
    }

    @Transactional
    public VerificationCaseDto approve(UUID caseId, UUID reviewerId, String note) {
        VerificationCase vc = cases.findById(caseId).orElseThrow(notFound("Case not found"));
        vc.setStatus(VerificationCase.Status.APPROVED);
        vc.setReviewerId(reviewerId);
        vc.setDecisionNote(note);
        vc.setDecidedAt(Instant.now());

        DoctorProfile d = doctors.findById(vc.getDoctorId()).orElseThrow(notFound("Doctor not found"));
        d.setVerified(true);
        d.getCredentials().forEach(c -> {
            if (c.getStatus() == Credential.Status.PENDING) c.setStatus(Credential.Status.APPROVED);
        });

        return toDtoWithDoctor(vc);
    }

    @Transactional
    public VerificationCaseDto reject(UUID caseId, UUID reviewerId, String note) {
        VerificationCase vc = cases.findById(caseId).orElseThrow(notFound("Case not found"));
        vc.setStatus(VerificationCase.Status.REJECTED);
        vc.setReviewerId(reviewerId);
        vc.setDecisionNote(note);
        vc.setDecidedAt(Instant.now());

        DoctorProfile d = doctors.findById(vc.getDoctorId()).orElseThrow(notFound("Doctor not found"));
        d.setVerified(false);
        d.getCredentials().forEach(c -> {
            if (c.getStatus() == Credential.Status.PENDING) c.setStatus(Credential.Status.REJECTED);
        });

        return toDtoWithDoctor(vc);
    }

    private VerificationCaseDto toDtoWithDoctor(VerificationCase vc) {
        DoctorProfileDto doctorDto = doctors.findById(vc.getDoctorId())
            .map(DoctorProfileDto::from)
            .orElse(null);
        return VerificationCaseDto.from(vc, doctorDto);
    }

    private static java.util.function.Supplier<ResponseStatusException> notFound(String msg) {
        return () -> new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }
}
