import { describe, it, expect } from "vitest";
import { paymentReceiptEmail, leaveStatusEmail, salaryDisbursedEmail } from "@/lib/emailTemplates";

describe("paymentReceiptEmail", () => {
  it("includes the INR amount, receipt and student name", () => {
    const m = paymentReceiptEmail({ name: "Asha", amount: 12500, receiptNumber: "RCPT-1", institutionName: "Bishop Heber" });
    expect(m.subject).toContain("₹12,500");
    expect(m.html).toContain("Asha");
    expect(m.html).toContain("₹12,500");
    expect(m.html).toContain("RCPT-1");
    expect(m.html).toContain("Bishop Heber");
    expect(m.text).toContain("₹12,500");
  });

  it("omits the receipt row when none is given", () => {
    const m = paymentReceiptEmail({ name: "Asha", amount: 500 });
    expect(m.html).not.toContain("Receipt no.");
  });
});

describe("leaveStatusEmail", () => {
  it("reflects approved/rejected and the date range", () => {
    const a = leaveStatusEmail({ name: "Arun", status: "approved", leaveType: "casual", fromDate: "2026-06-20", toDate: "2026-06-21" });
    expect(a.subject).toContain("approved");
    expect(a.html).toContain("2026-06-20 → 2026-06-21");
    const r = leaveStatusEmail({ name: "Arun", status: "rejected", leaveType: "sick", fromDate: "2026-06-20", toDate: "2026-06-20" });
    expect(r.subject).toContain("rejected");
    expect(r.html).toContain("2026-06-20");
  });
});

describe("salaryDisbursedEmail", () => {
  it("includes month and amount when provided", () => {
    const m = salaryDisbursedEmail({ name: "Arun", month: "2026-06", amount: 48000 });
    expect(m.subject).toContain("2026-06");
    expect(m.html).toContain("₹48,000");
  });
});

describe("HTML escaping", () => {
  it("escapes user-supplied values to prevent markup injection", () => {
    const m = paymentReceiptEmail({ name: '<script>x</script>', amount: 100 });
    expect(m.html).not.toContain("<script>x</script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});
