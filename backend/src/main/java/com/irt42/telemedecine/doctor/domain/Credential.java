package com.irt42.telemedecine.doctor.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "credential")
@Getter
@Setter
@NoArgsConstructor
public class Credential extends BaseEntity {

    public enum Kind { DIPLOMA, BOARD_CERT, LICENSE, OTHER }
    public enum Status { PENDING, APPROVED, REJECTED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 32)
    private Kind kind;

    @Column(name = "issuer", length = 255)
    private String issuer;

    @Column(name = "issued_on")
    private LocalDate issuedOn;

    @Column(name = "document_key", nullable = false, length = 2048)
    private String documentKey;

    @Column(name = "document_name", length = 255)
    private String documentName;

    @Column(name = "content_type", length = 128)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.PENDING;
}
