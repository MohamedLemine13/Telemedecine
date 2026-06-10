package com.irt42.telemedecine.doctor.infrastructure;

import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {

    Optional<DoctorProfile> findByAccountId(UUID accountId);

    /**
     * Search verified doctors with optional filters. Specialty filter matches
     * by Specialty.code (e.g. "CARDIOLOGY"). Language filter matches a tag in
     * doctor_language. Both are AND'd if both are provided.
     */
    @Query("""
        select distinct d from DoctorProfile d
            left join d.specialties s
            left join d.languages   l
        where d.verified = true
          and (:specialty is null or s.code = :specialty)
          and (:language is null or l = :language)
        """)
    Page<DoctorProfile> search(@Param("specialty") String specialty,
                               @Param("language") String language,
                               Pageable pageable);

    long countByVerifiedTrue();
}
