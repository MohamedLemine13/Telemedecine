package com.irt42.telemedecine.auth.infrastructure;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.RoleCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    /**
     * Admin account browser: optional substring match on email and optional
     * role filter. The coalesce idiom keeps both binds typed for Postgres when
     * the filter is absent (see AppointmentRepository for the same trick).
     */
    @Query("""
        select distinct a from Account a
            left join a.roles r
        where lower(a.email) like lower(concat('%', coalesce(:q, ''), '%'))
          and r.code = coalesce(:role, r.code)
        order by a.createdAt desc
        """)
    Page<Account> searchForAdmin(@Param("q") String q,
                                 @Param("role") RoleCode role,
                                 Pageable pageable);
}
