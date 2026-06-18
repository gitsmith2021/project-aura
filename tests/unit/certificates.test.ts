import { describe, it, expect } from "vitest";
import {
  STUDENT_CERT_TYPES, STAFF_CERT_TYPES, CERTIFICATE_LABELS, CERTIFICATE_PREFIX,
  CERT_STATUSES, STATUS_LABELS, STATUS_STYLES,
  isStudentCertificate, requesterOf, formatCertificateNo,
  certificateTitle, certificateBody, formatLongDate,
  type CertificateType, type CertContext,
} from "@/lib/certificates";

const ALL: CertificateType[] = [...STUDENT_CERT_TYPES, ...STAFF_CERT_TYPES];

describe("certificate metadata completeness", () => {
  it("has 10 distinct types split 5 student / 5 staff", () => {
    expect(STUDENT_CERT_TYPES).toHaveLength(5);
    expect(STAFF_CERT_TYPES).toHaveLength(5);
    expect(new Set(ALL).size).toBe(10);
  });
  it("labels and prefixes every type", () => {
    for (const t of ALL) {
      expect(CERTIFICATE_LABELS[t]).toBeTruthy();
      expect(CERTIFICATE_PREFIX[t]).toBeTruthy();
    }
  });
  it("has labels/styles for every status", () => {
    for (const s of CERT_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
      expect(STATUS_STYLES[s]).toBeTruthy();
    }
  });
});

describe("requester classification", () => {
  it("maps student vs staff certificates correctly", () => {
    expect(isStudentCertificate("bonafide")).toBe(true);
    expect(isStudentCertificate("offer_letter")).toBe(false);
    expect(requesterOf("transfer_certificate")).toBe("student");
    expect(requesterOf("salary_certificate")).toBe("staff");
  });
});

describe("formatCertificateNo", () => {
  it("zero-pads the sequence to 4 digits", () => {
    expect(formatCertificateNo("BON", 2026, 7)).toBe("BON/2026/0007");
    expect(formatCertificateNo("TC", 2026, 1234)).toBe("TC/2026/1234");
  });
});

describe("certificateTitle", () => {
  it("uppercases the label", () => {
    expect(certificateTitle("bonafide")).toBe("BONAFIDE CERTIFICATE");
    expect(certificateTitle("noc")).toBe("NO OBJECTION CERTIFICATE");
  });
});

describe("certificateBody", () => {
  const studentCtx: CertContext = {
    holderName: "Asha Rao", institution: "Aura College",
    rollNo: "21CS045", program: "B.Tech CSE", year: 3, department: "Computer Science",
    purpose: "applying for an education loan",
  };

  it("returns non-empty prose for every type", () => {
    for (const t of ALL) {
      const body = certificateBody(t, { holderName: "X", institution: "Y" });
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((p) => p.length > 0)).toBe(true);
    }
  });

  it("embeds the student descriptor and purpose", () => {
    const body = certificateBody("bonafide", studentCtx).join(" ");
    expect(body).toContain("Asha Rao");
    expect(body).toContain("21CS045");
    expect(body).toContain("Computer Science");
    expect(body).toContain("education loan");
  });

  it("omits the descriptor parenthetical when no student fields are present", () => {
    const body = certificateBody("bonafide", { holderName: "Asha Rao", institution: "Aura College" }).join(" ");
    expect(body).toContain("Asha Rao is a bonafide student");
    expect(body).not.toContain("()");
  });

  it("uses staff designation/employee id for staff certificates", () => {
    const body = certificateBody("experience_certificate", {
      holderName: "Dr. Mehta", institution: "Aura College",
      designation: "Associate Professor", employeeId: "EMP-12", joiningDate: "01 January 2020", relievingDate: "31 May 2026",
    }).join(" ");
    expect(body).toContain("Associate Professor");
    expect(body).toContain("EMP-12");
    expect(body).toContain("01 January 2020");
    expect(body).toContain("31 May 2026");
  });

  it("falls back to a default purpose line", () => {
    const body = certificateBody("noc", { holderName: "X", institution: "Y" }).join(" ");
    expect(body).toContain("issued on request");
  });
});

describe("formatLongDate", () => {
  it("formats ISO dates and handles empties", () => {
    expect(formatLongDate("2026-06-19")).toBe("19 June 2026");
    expect(formatLongDate(null)).toBe("—");
    expect(formatLongDate("garbage")).toBe("garbage");
  });
});
