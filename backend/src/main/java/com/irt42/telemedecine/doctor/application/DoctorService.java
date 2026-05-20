package com.irt42.telemedecine.doctor.application;

import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.doctor.api.dto.CredentialDto;
import com.irt42.telemedecine.doctor.api.dto.DoctorProfileDto;
import com.irt42.telemedecine.doctor.api.dto.SpecialtyDto;
import com.irt42.telemedecine.doctor.api.dto.UpdateDoctorProfileRequest;
import com.irt42.telemedecine.doctor.domain.Credential;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.doctor.domain.Specialty;
import com.irt42.telemedecine.doctor.events.CredentialUploadedEvent;
import com.irt42.telemedecine.doctor.infrastructure.CredentialRepository;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import com.irt42.telemedecine.doctor.infrastructure.SpecialtyRepository;
import com.irt42.telemedecine.storage.LocalFileStorage;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DoctorService {

    private final DoctorProfileRepository repo;
    private final SpecialtyRepository specialties;
    private final CredentialRepository credentials;
    private final AccountRepository accounts;
    private final LocalFileStorage storage;
    private final ApplicationEventPublisher events;

    public DoctorService(DoctorProfileRepository repo,
                         SpecialtyRepository specialties,
                         CredentialRepository credentials,
                         AccountRepository accounts,
                         LocalFileStorage storage,
                         ApplicationEventPublisher events) {
        this.repo = repo;
        this.specialties = specialties;
        this.credentials = credentials;
        this.accounts = accounts;
        this.storage = storage;
        this.events = events;
    }

    // ── Public search ──────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<DoctorProfileDto> search(String specialty, String language, int page, int size) {
        PageRequest pageable = PageRequest.of(
            page, Math.min(size, 100),
            Sort.by(Sort.Direction.DESC, "ratingAverage", "ratingCount")
        );
        return repo.search(specialty, language, pageable).map(DoctorProfileDto::publicView);
    }

    @Transactional(readOnly = true)
    public DoctorProfileDto getById(UUID id) {
        DoctorProfile d = repo.findById(id).orElseThrow(notFound("Doctor not found"));
        if (!d.isVerified()) throw notFound("Doctor not found").get();
        return DoctorProfileDto.publicView(d);
    }

    // ── "me" endpoints (authenticated doctor) ──────────────────────────────
    @Transactional
    public DoctorProfileDto getOrCreateMine(UUID accountId) {
        DoctorProfile d = repo.findByAccountId(accountId).orElseGet(() -> {
            DoctorProfile np = new DoctorProfile();
            np.setAccount(accounts.findById(accountId).orElseThrow(notFound("Account not found")));
            return repo.save(np);
        });
        return DoctorProfileDto.from(d);
    }

    @Transactional
    public DoctorProfileDto updateMine(UUID accountId, UpdateDoctorProfileRequest req) {
        DoctorProfile d = loadMine(accountId);
        if (req.firstName() != null)        d.setFirstName(req.firstName());
        if (req.lastName() != null)         d.setLastName(req.lastName());
        if (req.title() != null)            d.setTitle(req.title());
        if (req.bio() != null)              d.setBio(req.bio());
        if (req.consultationFee() != null)  d.setConsultationFee(req.consultationFee());
        if (req.currency() != null)         d.setCurrency(req.currency());

        if (req.specialties() != null) {
            Set<Specialty> resolved = req.specialties().stream()
                .map(code -> specialties.findByCode(code).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown specialty: " + code)))
                .collect(Collectors.toCollection(HashSet::new));
            d.setSpecialties(resolved);
        }
        if (req.languages() != null) {
            d.setLanguages(new HashSet<>(req.languages()));
        }
        return DoctorProfileDto.from(d);
    }

    @Transactional(readOnly = true)
    public List<SpecialtyDto> listSpecialties() {
        return specialties.findAll(Sort.by("code")).stream().map(SpecialtyDto::from).toList();
    }

    // ── Credential upload (single multipart POST) ──────────────────────────
    @Transactional
    public CredentialDto uploadCredential(UUID accountId,
                                          Credential.Kind kind,
                                          String issuer,
                                          MultipartFile file) {
        DoctorProfile d = loadMine(accountId);

        LocalFileStorage.Stored stored;
        try {
            stored = storage.store("credentials", file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        Credential c = new Credential();
        c.setDoctor(d);
        c.setKind(kind);
        c.setIssuer(issuer);
        c.setDocumentKey(stored.key());
        c.setDocumentName(stored.name());
        c.setContentType(stored.contentType());
        c.setSizeBytes(stored.sizeBytes());
        c.setStatus(Credential.Status.PENDING);
        credentials.save(c);
        d.getCredentials().add(c);

        events.publishEvent(new CredentialUploadedEvent(d.getId(), c.getId()));

        return CredentialDto.from(c);
    }

    // ── helpers ────────────────────────────────────────────────────────────
    private DoctorProfile loadMine(UUID accountId) {
        return repo.findByAccountId(accountId).orElseGet(() -> {
            getOrCreateMine(accountId);
            return repo.findByAccountId(accountId).orElseThrow();
        });
    }

    private static java.util.function.Supplier<ResponseStatusException> notFound(String msg) {
        return () -> new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }
}
