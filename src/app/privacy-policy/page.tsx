import Link from "next/link";
import { ShieldCheck, Building2, ArrowLeft } from "lucide-react";
import { RETENTION_POLICIES, CONSENT_TYPE_META, CONSENT_TYPES, ERASURE_SLA_HOURS } from "@/lib/dataRetention";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How AURA collects, processes and protects personal data under India's Digital Personal Data Protection Act, 2023.",
};

const SECTIONS = [
  { id: "what-we-collect", title: "1. What We Collect" },
  { id: "why-we-process", title: "2. Why We Process It" },
  { id: "consent", title: "3. Consent" },
  { id: "your-rights", title: "4. Your Rights" },
  { id: "retention", title: "5. Data Retention" },
  { id: "security", title: "6. Security" },
  { id: "children", title: "7. Children's Data" },
  { id: "grievance", title: "8. Grievance Officer" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-violet-600 flex items-center justify-center border border-violet-500">
              <Building2 size={15} className="text-white" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">AURA</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ShieldCheck size={20} className="text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        </div>
        <p className="text-xs text-slate-500 mb-8">
          Effective 12 June 2026 · Published under the Digital Personal Data Protection Act, 2023 (DPDP Act)
        </p>

        <p className="text-sm leading-relaxed mb-6">
          AURA is an academic ERP platform operated on behalf of the educational institutions that use it.
          Your institution is the <strong>Data Fiduciary</strong> under the DPDP Act; AURA processes personal
          data on its behalf. This policy explains what is collected, why, how long it is kept, and the
          rights you can exercise at any time from your portal&apos;s{" "}
          <em>Privacy &amp; Data</em> page.
        </p>

        {/* TOC */}
        <nav className="mb-10 bg-white border border-slate-200 rounded-xl p-4">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-violet-600 hover:text-violet-800 transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="what-we-collect" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">1. What We Collect</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
            <li><strong>Identity data</strong> — name, date of birth, photograph, roll/employee number, contact details.</li>
            <li><strong>Academic data</strong> — enrolment, attendance, internal assessment (CIA) and examination marks, promotions.</li>
            <li><strong>Financial data</strong> — fee structures, payments (processed by Razorpay; card details never touch AURA), salaries for staff.</li>
            <li><strong>NFC card identifiers</strong> — the serial number of your campus ID card, used only for attendance. No fingerprint, face or other biometric template is stored.</li>
            <li><strong>Medical data</strong> — infirmary visit records, only where your institution enables that module and you consent.</li>
            <li><strong>Technical data</strong> — IP address and browser identifier recorded alongside consent actions, as proof of consent.</li>
          </ul>
        </section>

        <section id="why-we-process" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">2. Why We Process It</h2>
          <p className="text-sm leading-relaxed mb-2">
            Personal data is processed solely to deliver educational services: maintaining academic records,
            recording attendance, collecting fees, paying salaries, issuing certificates and meeting
            statutory reporting duties (NAAC, NIRF, AISHE, UGC). It is never sold and never used for
            third-party advertising.
          </p>
        </section>

        <section id="consent" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">3. Consent</h2>
          <p className="text-sm leading-relaxed mb-3">
            On first sign-in you are asked for consent that is <strong>free, specific, informed and
            unambiguous</strong>. Each consent is recorded with a timestamp and can be reviewed or withdrawn
            at any time from your portal. The consents we capture:
          </p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {CONSENT_TYPES.map((t) => (
                  <tr key={t} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap align-top">
                      {CONSENT_TYPE_META[t].label}
                      {CONSENT_TYPE_META[t].required && (
                        <span className="ml-1.5 text-[10px] font-bold text-violet-600 uppercase">required</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{CONSENT_TYPE_META[t].description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed mt-3">
            Withdrawing an optional consent stops that processing immediately. The two required consents are
            necessary to operate your account — to withdraw those, submit a data erasure request instead.
          </p>
        </section>

        <section id="your-rights" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">4. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
            <li><strong>Access</strong> — view the personal data held about you through your portal.</li>
            <li><strong>Correction</strong> — ask your institution&apos;s office to correct inaccurate data.</li>
            <li><strong>Withdrawal</strong> — withdraw any optional consent at any time from <em>Privacy &amp; Data</em>.</li>
            <li>
              <strong>Erasure</strong> — request deletion of your personal data. Requests are resolved within{" "}
              <strong>{ERASURE_SLA_HOURS} hours</strong>; where law requires data to be retained (e.g. financial
              records), the refusal and its reason are documented and shown to you.
            </li>
            <li><strong>Grievance</strong> — escalate to the Grievance Officer below, and thereafter to the Data Protection Board of India.</li>
          </ul>
        </section>

        <section id="retention" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">5. Data Retention</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Data category</th>
                  <th className="px-4 py-2.5 font-semibold">Kept for</th>
                  <th className="px-4 py-2.5 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION_POLICIES.map((p) => (
                  <tr key={p.key} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2.5 font-medium">{p.category}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.period}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="security" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">6. Security</h2>
          <p className="text-sm leading-relaxed">
            Data is stored in Supabase (PostgreSQL) with row-level security isolating every institution&apos;s
            data, encrypted in transit (TLS) and at rest. Payment webhooks are HMAC-verified, payment card
            data is handled entirely by Razorpay (PCI-DSS), and access to records is role-restricted
            (admin / HOD / staff / student).
          </p>
        </section>

        <section id="children" className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">7. Children&apos;s Data</h2>
          <p className="text-sm leading-relaxed">
            For students under 18, the DPDP Act requires verifiable parental consent. Institutions collect
            this consent during admission, and AURA records it in the same consent ledger. Personal data of
            minors is never used for tracking, behavioural monitoring or targeted advertising.
          </p>
        </section>

        <section id="grievance" className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-3">8. Grievance Officer</h2>
          <p className="text-sm leading-relaxed">
            Each institution designates its own Grievance Officer for data protection matters — contact your
            institution&apos;s administrative office. Platform-level concerns can be raised with the AURA data
            protection team via the contact details published on your institution&apos;s portal. Complaints are
            acknowledged within 72 hours.
          </p>
        </section>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © 2026 AURA · Academic ERP for Educational Institutions
      </footer>
    </div>
  );
}
