# 🧠 Aura Knowledge Hub
## *One Institution. One Knowledge Repository.*

> **Document type:** Product Vision · Architecture · Roadmap Recommendation  
> **Status:** 🗓️ Strategic Deferred — Future Initiative  
> **Priority:** Low (Current Release) · High (Future Strategic Value)  
> **Author:** Principal Product Architect  
> **Date:** 2026-06-18  
> **Working name:** Aura Knowledge Hub (internal product code: AKH)

---

> ### ⏸️ Strategic Deferral Notice
>
> **Knowledge Hub is intentionally deferred until the core Aura Campus platform reaches operational maturity.**
>
> The vision and architecture documented here are fully approved. However, implementation will begin only after the completion of current roadmap priorities in this sequence:
>
> **Phase 5K → Phase 5L → Phase 6 (6A–6H) → Phase 7 (7A–7F) → Phase 8 (8A–8F) → Phase 7X (KH-1 through KH-5)**
>
> Knowledge Hub is a powerful long-term differentiator, but several higher-priority capabilities — Parent Portal, LMS, Transport, Online Exams, SaaS Billing, Mobile Apps — more directly impact customer adoption and implementation success in the near term.
>
> Knowledge Hub should be viewed as the **convergence layer** of:
> Library (4A) + Research (5I) + LMS (6G) + IQAC Evidence (7F) + Institutional Knowledge → rather than a standalone document repository. Each of those modules must reach maturity first for the Knowledge Hub to deliver its full value.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Core Concept](#3-vision--core-concept)
4. [User Personas & Benefits](#4-user-personas--benefits)
5. [Content Architecture](#5-content-architecture)
6. [Information Architecture](#6-information-architecture)
7. [Search & Discovery Engine](#7-search--discovery-engine)
8. [Permissions & Access Model](#8-permissions--access-model)
9. [Version Control & Content Lifecycle](#9-version-control--content-lifecycle)
10. [Analytics & Usage Intelligence](#10-analytics--usage-intelligence)
11. [AI Opportunities Roadmap](#11-ai-opportunities-roadmap)
12. [Strategic Value Analysis](#12-strategic-value-analysis)
13. [Aura Core Potential — Cross-Product Vision](#13-aura-core-potential--cross-product-vision)
14. [Roadmap Placement Recommendation](#14-roadmap-placement-recommendation)
15. [Implementation Stages](#15-implementation-stages)
16. [DEV_TRACKER Entry](#16-dev_tracker-entry)
17. [NAAC Criterion Alignment](#17-naac-criterion-alignment)
18. [Success Metrics](#18-success-metrics)

---

## 1. Executive Summary

Every academic institution produces a continuous stream of knowledge: lecture notes, research papers, accreditation evidence, laboratory manuals, SOPs, and decades of institutional experience. Today, almost none of it is captured in a form that can be searched, shared, or survived when the person who created it leaves the institution.

**Aura Knowledge Hub** is the answer to this institutional amnesia.

It is not a file-upload system. It is not a shared drive in the cloud. It is the **Digital Knowledge Brain of the institution** — a living, searchable, permission-aware repository that transforms scattered departmental knowledge into a connected, discoverable, institutional asset.

The Knowledge Hub will be positioned as Phase 7X in the Aura Campus roadmap — after the Library (4A), Research (4I/5I), LMS (6G), and IQAC/NAAC modules (7F) are complete. This sequencing is intentional: by Phase 7X, the institution already has rich structured content across all modules. The Knowledge Hub synthesizes and surfaces that content in a single, intelligent repository.

**Bottom line:** Knowledge Hub is the feature that transforms Aura Campus from a transactional ERP into an institutional intelligence platform.

---

## 2. Problem Statement

### The Institutional Knowledge Crisis

Academic institutions in India face a persistent, structural knowledge-management problem. It is not visible in any single incident — it accumulates silently over years and becomes catastrophic during NAAC accreditation cycles, leadership transitions, or when key faculty retire.

### Where Knowledge Lives Today

| Location | Problem |
|---|---|
| Personal laptops | Invisible to the institution. Lost when the person leaves. |
| Faculty computers | Department-siloed. Not searchable. No backup guarantee. |
| Department network drives | Unstructured. No metadata. No discovery mechanism. |
| Email attachments | Scattered, non-searchable, person-dependent. |
| WhatsApp groups | Ephemeral. No indexing. No retention. Illegal for official records. |
| Library physical archives | Not digitized. No cross-reference to current research. |
| Google Drive / OneDrive | Personal accounts. No institutional ownership. No RLS. Leaves with the person. |

### The Cost of This Problem

1. **Faculty Departure Risk.** When an experienced faculty member retires or resigns, 20 years of teaching materials, research notes, and institutional memory leave with them.

2. **Research Invisibility.** A Chemistry department may be running cutting-edge research that no other department or student knows about. Cross-fertilization of ideas never happens.

3. **NAAC Preparation Chaos.** Every five years, institutions spend months scrambling to collect evidence documents that should have been organized all along. The SSR process is painful precisely because institutional knowledge is not centralized.

4. **Departmental Silos.** A Computer Science faculty member who develops an excellent teaching framework for project management has no way to share it with the Business Studies department who teaches the same concept.

5. **Knowledge Duplication.** Multiple departments independently create similar SOPs, lab manuals, and assessment frameworks — wasting time on work already done elsewhere in the institution.

6. **Digital Transformation Stall.** Without a knowledge repository, institutions cannot move toward AI-assisted learning, research discovery, or intelligent accreditation support.

### The Gap in the Market

Most Indian EdTech platforms address transactions: fees, attendance, examinations. None address **institutional memory** at an infrastructure level. This is the whitespace Aura Knowledge Hub occupies.

---

## 3. Vision & Core Concept

### Vision Statement

> Create a centralized, cloud-based knowledge platform where faculty share teaching materials, departments collaborate across silos, students discover curated learning resources, the Library manages digital collections, IQAC preserves accreditation evidence, Research outputs are permanently archived, and all institutional knowledge becomes searchable — forever.

### The Core Concept

```
                    ┌─────────────────────────────┐
                    │   AURA KNOWLEDGE HUB         │
                    │                              │
                    │  The Digital Knowledge Brain │
                    │  of the Institution          │
                    └─────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │ CAPTURE   │      │  ORGANIZE   │    │  DISCOVER   │
    │           │      │             │    │             │
    │ Any user  │      │ Taxonomy,   │    │ Search,     │
    │ uploads   │      │ tags, dept, │    │ recommend,  │
    │ content   │      │ type, year  │    │ surface     │
    └───────────┘      └─────────────┘    └─────────────┘
```

### What It Is NOT

| ❌ It is NOT | ✅ It IS |
|---|---|
| A shared Google Drive | An institutional knowledge platform with identity, permissions, and governance |
| A document management system | A knowledge-sharing and discovery ecosystem |
| A file repository | A living institutional memory with search, analytics, and AI-readiness |
| Course-bound LMS content (Phase 6G) | Cross-institutional, cross-departmental knowledge that transcends any single course |
| A static archive | A dynamic, version-controlled, analytics-tracked knowledge base |

### Differentiating Principle

> Phase 6G (LMS) manages **course-specific study materials** — tightly bound to subjects, assignments, and student grade data. Knowledge Hub manages **institutional knowledge** — the broader intellectual capital of the institution that exists independent of any single course, semester, or cohort.

These two systems are complementary, not competing. LMS serves the classroom. Knowledge Hub serves the institution.

---

## 4. User Personas & Benefits

### 4.1 Management

**Access level:** Full institutional knowledge  
**Primary use case:** Strategic documents, institutional KPIs, policy archive

**Benefits:**
- Single source of truth for institutional policies and governance documents
- Immediate access to accreditation evidence without relying on staff to dig through files
- Historical record of institutional performance documents for strategic planning
- Dashboard view of knowledge health: what departments are contributing, what's missing

**Key resources accessed:**
- Board resolutions and governance documents
- Strategic plans and institutional reports
- NAAC/NIRF accreditation materials
- Annual reports and financial summaries

---

### 4.2 Principal / Director

**Access level:** Full institutional knowledge  
**Primary use case:** Policies, NAAC reports, institutional archives, department KPIs

**Benefits:**
- Real-time visibility into which departments are producing and sharing knowledge
- NAAC evidence organized by criterion — no scrambling before a NAAC visit
- Access to all department resources for holistic institutional leadership
- Evidence trail for governance and compliance decisions

---

### 4.3 IQAC Coordinator / Committee

**Access level:** All accreditation content + contribution rights  
**Primary use case:** SSR evidence organization, NAAC criterion-wise content management

**Benefits:**
- Dedicated content space for each NAAC criterion (1 through 7)
- Upload and organize SSR documents year-round — not just during accreditation cycles
- Track evidence completeness: "Criterion 3 Research — 14 papers uploaded, 0 for FDP"
- Connect directly to research outputs (5I), publications, appraisals (5E), and guest lectures (2H)
- Reduce NAAC preparation from months to days

**This is the highest-value persona for NAAC-affiliated institutions.**

---

### 4.4 HOD (Head of Department)

**Access level:** Institution-wide read + department-level write  
**Primary use case:** Departmental knowledge management, best-practice sharing

**Benefits:**
- Centralize all department resources in one searchable location
- Share department best practices with other HODs
- Ensure continuity when faculty change — departmental knowledge stays even when people leave
- Discover cross-departmental resources to enrich department programs

---

### 4.5 Faculty

**Access level:** Institution-wide read + own content write  
**Primary use case:** Upload teaching materials, discover cross-departmental resources

**Benefits:**
- Upload and organize all teaching materials in one place — permanently backed up
- Discover what other faculty across departments have shared (cross-pollination of teaching ideas)
- No more losing materials when a laptop crashes or changes are made
- Recognition and visibility for knowledge contributions (download counts, ratings)
- Reduce preparation time by discovering existing materials instead of recreating them

**Example:** A Computer Science faculty member working on an AI curriculum can discover the Chemistry department's recent machine-learning-for-drug-discovery presentation — directly relevant to AI applications discussion.

**Content a faculty member uploads:**
- Lecture presentations (PPT/PPTX/Google Slides link)
- Subject notes (PDF/DOCX)
- Assignment templates and question banks
- Lab manuals and experiment guides
- Reference materials (textbooks, research paper collections)
- FDP participation certificates and materials
- Video recordings (uploaded or linked from YouTube)

---

### 4.6 Students

**Access level:** Approved institution-wide learning resources  
**Primary use case:** Discover and access learning resources beyond their enrolled courses

**Benefits:**
- Access a broader range of materials than what their subject teacher uploads to the LMS
- Discover research papers and publications from their institution's faculty
- Find study materials from other departments for interdisciplinary learning
- Searchable resource discovery by topic, not just by enrolled course

**Note:** Student access is read-only and restricted to resources explicitly published for student visibility. This is distinct from LMS (6G) which is course-enrollment-gated.

---

### 4.7 Librarian

**Access level:** Full institutional read + Library collection management  
**Primary use case:** Curate digital collections, manage eBooks and digital journals

**Benefits:**
- Manage the institution's digital collection in one place alongside physical catalog (Phase 4A)
- Organize eBook subscriptions, journal licenses, and digital archives
- Create curated reading lists and research resource collections
- Track digital resource usage (downloads, access patterns) to inform future acquisitions

---

### 4.8 Staff (Non-Teaching / Administrative)

**Access level:** Administrative resources + relevant departmental content  
**Primary use case:** Access SOPs, HR policies, administrative circulars

**Benefits:**
- Always-available access to current SOPs and policies (no more "which version is latest?")
- Onboarding new staff using existing knowledge rather than tribal knowledge transfer
- Administrative circulars and notices permanently archived and searchable

---

## 5. Content Architecture

### 5.1 Academic Resources

> Teaching and learning materials created by faculty, shared institution-wide.

| Type | Format | Description |
|---|---|---|
| Lecture Notes | PDF, DOCX | Full notes or condensed summaries |
| Presentations | PPTX, Google Slides link | Lecture slide decks |
| Assignments | PDF, DOCX | Assignment sheets and templates |
| Question Banks | PDF, DOCX, XLSX | Subject-wise question collections |
| Lab Manuals | PDF, DOCX | Experiment guides and protocols |
| Syllabi | PDF | Program and subject syllabi |
| Reference Materials | PDF, external URL | Supplementary reading collections |
| Study Guides | PDF, DOCX | Exam preparation guides |

---

### 5.2 Research Resources

> Research outputs and scholarly materials produced by the institution.

| Type | Format | Description |
|---|---|---|
| Research Papers | PDF | Published journal papers |
| Publications | PDF, DOI link | Books, book chapters, conferences |
| Conference Papers | PDF | Presentations at conferences |
| Patents | PDF, patent number | Granted and pending patents |
| FDP Materials | PDF, PPTX | Faculty Development Programme content |
| Research Proposals | DOCX, PDF | Approved research project proposals |
| Project Reports | PDF | Completed research project outputs |

*Note: Research content in the Knowledge Hub mirrors and extends the Research & Publications module (Phase 5I). The connection is bidirectional — publications logged in 5I are discoverable here.*

---

### 5.3 Accreditation Resources

> Documents collected and organized for NAAC, NBA, NIRF, and AISHE compliance.

| Type | Format | Description |
|---|---|---|
| SSR Documents | PDF, DOCX | Self-Study Report evidence by criterion |
| NAAC Evidence | PDF, images | Criterion-wise supporting documents |
| NBA Reports | PDF | National Board of Accreditation materials |
| IQAC Records | PDF | Annual Quality Assurance Reports (AQAR) |
| Compliance Records | PDF | Regulatory compliance documentation |
| Best Practices | DOCX, PDF | Institutional best practice write-ups (NAAC C7) |
| Academic Audit Reports | PDF | Internal and external audit findings |

*This directly supports Phase 7F (IQAC & Compliance Reports) and Phase 7F-sub (SSR Builder).*

---

### 5.4 Administrative Resources

> Institutional governance and operational documentation.

| Type | Format | Description |
|---|---|---|
| Policies | PDF, DOCX | Institutional policies (HR, academic, conduct) |
| Circulars | PDF | Official circulars and orders |
| SOPs | PDF, DOCX | Standard Operating Procedures |
| HR Documents | PDF | Recruitment policies, service rules |
| Meeting Minutes | DOCX, PDF | Committee meeting records |
| Government Orders | PDF | University and government directives |
| Forms & Templates | DOCX, XLSX | Official forms for institutional use |

---

### 5.5 Library Resources

> Digital collections managed by the library team.

| Type | Format | Description |
|---|---|---|
| eBooks | PDF, EPUB, external link | Digital books (subscribed or open-access) |
| Journals | External link, PDF | Journal subscriptions and open-access journals |
| Digital Archives | PDF | Historical documents and archival materials |
| Thesis & Dissertations | PDF | Student research submissions |
| Reading Lists | Curated collection | Librarian-curated topical reading lists |

---

### 5.6 Multimedia Resources

> Audio-visual knowledge assets.

| Type | Format | Description |
|---|---|---|
| Recorded Lectures | Video link, MP4 | Faculty lecture recordings |
| Webinars | Video link | Webinar recordings and slides |
| FDP Videos | Video link | Faculty development programme recordings |
| Tutorial Videos | Video link | Subject-specific tutorial content |
| Event Recordings | Video link | Seminars, conferences, and guest lectures |

---

## 6. Information Architecture

### 6.1 Content Hierarchy

```
INSTITUTION (root)
│
├── 📚 ACADEMICS
│   ├── [Department Name]
│   │   ├── [Subject Name]
│   │   │   ├── Notes
│   │   │   ├── Presentations
│   │   │   ├── Question Banks
│   │   │   └── Lab Manuals
│   │   └── Department General
│   └── Cross-Departmental
│
├── 🔬 RESEARCH
│   ├── Publications
│   ├── Projects
│   ├── Patents
│   ├── FDP Materials
│   └── Conference Papers
│
├── 📋 ACCREDITATION
│   ├── NAAC — Criterion 1 (Curricular Aspects)
│   ├── NAAC — Criterion 2 (Teaching-Learning)
│   ├── NAAC — Criterion 3 (Research & Innovation)
│   ├── NAAC — Criterion 4 (Infrastructure)
│   ├── NAAC — Criterion 5 (Student Support)
│   ├── NAAC — Criterion 6 (Governance)
│   ├── NAAC — Criterion 7 (Institutional Values)
│   ├── NBA Reports
│   └── AISHE / NIRF
│
├── 🏛️ ADMINISTRATION
│   ├── Policies & Circulars
│   ├── SOPs
│   ├── HR Documents
│   └── Meeting Records
│
├── 📖 LIBRARY
│   ├── eBooks
│   ├── Journals
│   ├── Theses & Dissertations
│   └── Digital Archives
│
├── 🎓 EVENTS & TRAINING
│   ├── Guest Lectures
│   ├── Workshops
│   ├── Webinars
│   └── FDP Programs
│
└── 🎥 MULTIMEDIA
    ├── Recorded Lectures
    ├── Tutorial Videos
    └── Event Recordings
```

### 6.2 Content Metadata Schema

Every resource in the Knowledge Hub carries a standard metadata envelope:

| Field | Type | Description |
|---|---|---|
| `title` | TEXT | Resource title |
| `description` | TEXT | Short abstract or description |
| `content_type` | ENUM | Category from content types above |
| `file_url` | TEXT | Supabase Storage path or external URL |
| `external_url` | TEXT | For external links (YouTube, journals, DOI) |
| `department_id` | UUID | Owning department |
| `subject` | TEXT | Subject tag (if academic) |
| `academic_year` | TEXT | Academic year (e.g., 2025-26) |
| `tags` | TEXT[] | Free-form tags for discovery |
| `uploaded_by` | UUID | Staff member reference |
| `visibility` | ENUM | `public_institution`, `department`, `restricted` |
| `naac_criterion` | TEXT | Criterion tag for accreditation content |
| `version` | INTEGER | Version number |
| `is_published` | BOOLEAN | Draft vs published |
| `download_count` | INTEGER | Usage tracking |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## 7. Search & Discovery Engine

### 7.1 Global Full-Text Search

The Knowledge Hub's search is institution-wide by default. A single search box surfaces results across all content types, departments, and authors simultaneously.

**Technical approach:** PostgreSQL `tsvector` full-text search on `title + description + tags`, with department and content-type faceting. This leverages the existing Supabase/Postgres infrastructure without requiring external search infrastructure in initial phases.

**Search result card shows:**
- Resource title and description excerpt
- Content type badge (PPT, PDF, Video, etc.)
- Department and academic year
- Uploader name + upload date
- Download count
- Relevance score (implicit, shown as sort order)

### 7.2 Filters

Every search result can be narrowed with:

| Filter | Values |
|---|---|
| Department | All institution departments (from `departments` table) |
| Content Type | Notes, Presentations, Q-Banks, Research Papers, Policies, etc. |
| Author / Uploader | Staff name or department |
| Academic Year | Year selector (e.g., 2023-24, 2024-25, 2025-26) |
| NAAC Criterion | Criteria 1–7 (for accreditation filter) |
| Tags | Free-form tag cloud |
| Visibility | My department only / Institution-wide |
| Date Range | Upload date range picker |

### 7.3 Smart Discovery Features

Beyond search, the Knowledge Hub actively surfaces relevant resources:

| Feature | Description |
|---|---|
| **Recently Added** | Last 20 resources uploaded institution-wide |
| **Most Downloaded** | Top resources by download count this month/year |
| **Trending** | Resources with accelerating download velocity |
| **From Your Department** | Latest uploads from the viewer's department |
| **Related Resources** | Resources sharing tags or subject with what the user is currently viewing |
| **Recommended for You** | Based on the viewer's role, department, and browsing history |
| **NAAC Gap Alert** (IQAC only) | "Criterion 3 has only 2 documents — add more research evidence" |

### 7.4 Browse Mode

For users who prefer exploration over search:

- **Browse by Department** — A–Z list of departments with resource counts
- **Browse by Content Type** — Icon grid: Notes / Presentations / Q-Banks / Research / etc.
- **Browse by Academic Year** — Year-wise timeline view
- **Browse by NAAC Criterion** — Criterion 1–7 cards with evidence counts

---

## 8. Permissions & Access Model

### 8.1 Access Tiers

The Knowledge Hub uses a three-tier visibility model that maps to the existing Aura role system:

```
TIER 1 — INSTITUTION PUBLIC
  ┌────────────────────────────────────────────────────────┐
  │ Visible to ALL authenticated users of the institution  │
  │ (all roles: Management, Principal, HOD, Faculty,       │
  │  Students, Library, Non-Teaching, Alumni)              │
  │                                                        │
  │ Examples: Institutional policies, circulars,           │
  │ published research papers, library reading lists       │
  └────────────────────────────────────────────────────────┘

TIER 2 — DEPARTMENT
  ┌────────────────────────────────────────────────────────┐
  │ Visible to members of the specified department only    │
  │ + HODs of all departments + Management + Principal     │
  │                                                        │
  │ Examples: Department-specific SOPs, internal course    │
  │ material not ready for institution-wide sharing,       │
  │ department meeting minutes                             │
  └────────────────────────────────────────────────────────┘

TIER 3 — RESTRICTED
  ┌────────────────────────────────────────────────────────┐
  │ Explicit role-based access list                        │
  │ Defined per resource                                   │
  │                                                        │
  │ Examples: Draft accreditation reports (IQAC only),     │
  │ management financial documents, HR files,              │
  │ draft research submissions                             │
  └────────────────────────────────────────────────────────┘
```

### 8.2 Permission Matrix

| Action | Student | Faculty | HOD | IQAC | Librarian | Admin / Principal | Management |
|---|---|---|---|---|---|---|---|
| View Tier-1 resources | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Tier-2 (own dept) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Tier-2 (other dept) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Tier-3 (restricted) | ❌ | ❌ | Partial | ✅ (NAAC) | ❌ | ✅ | ✅ |
| Upload resources | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own uploads | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own uploads | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any upload | ❌ | ❌ | Dept only | ❌ | Library only | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View analytics | ❌ | Own only | Dept | ✅ | Library | ✅ | ✅ |

### 8.3 RLS Strategy

The permissions model maps directly to Aura's existing `private.get_user_authorizations()` helper and `institution_members` table. No new auth infrastructure is required — the Knowledge Hub inherits the Aura role system.

Specific RLS policies will be defined during implementation, following Aura's established pattern of `SECURITY DEFINER` helper functions for complex cross-table permission checks.

---

## 9. Version Control & Content Lifecycle

### 9.1 Version History

Every resource supports versioned updates:

- Faculty uploads Version 1 of a lecture presentation in August
- After a curriculum update, they upload Version 2 in January
- Both versions are retained; Version 2 becomes the default
- Viewers can explicitly access previous versions with a timestamp

**Version history shows:** version number, upload date, uploader, change notes (optional)

### 9.2 Content States

```
DRAFT ──► PUBLISHED ──► ARCHIVED
  │                         ▲
  └── (admin can force) ────┘
```

| State | Description |
|---|---|
| **Draft** | Visible only to uploader and admins. Not searchable. |
| **Published** | Active and discoverable per its visibility tier. |
| **Archived** | Preserved but no longer promoted in search results. Download still possible. |
| **Deleted** | Soft-deleted. Recoverable within 30 days. Hard-deleted after. |

### 9.3 Author Tracking

Every version records:
- Original uploader (immutable)
- Last editor (if different from uploader)
- Timestamp of each version
- Change notes (optional free-text field per version)

### 9.4 Retention Policy

| Content Type | Retention Period | Justification |
|---|---|---|
| Academic materials | Indefinite (institution's discretion) | Institutional IP |
| Research papers | Indefinite | Scholarly record |
| Accreditation evidence | Minimum 10 years | NAAC compliance |
| Administrative circulars | Minimum 7 years | Governance record |
| HR documents | Minimum 7 years | Labour law compliance |
| Multimedia | Indefinite unless storage cost triggers review | Institutional decision |

*Retention policy tracked in `src/lib/dataRetention.ts` per Aura Dev Rule 15.*

---

## 10. Analytics & Usage Intelligence

### 10.1 Department-Level Analytics

Administrators and HODs see a **Knowledge Contribution Dashboard**:

| Metric | Description |
|---|---|
| Total resources uploaded | Absolute count and growth trend |
| Uploads by department | Bar chart — which departments are most active |
| Top contributors | Faculty ranked by upload volume and download count |
| Undercontributing departments | Departments with fewer than N uploads in the last 90 days |
| Content type distribution | Pie/donut chart: notes vs PPTs vs videos vs research |
| Growth trend | Monthly upload volume over 12 months |

### 10.2 Resource-Level Analytics

Each resource's detail page shows:

| Metric | Description |
|---|---|
| Download count | Total all-time |
| Downloads this month | Trailing 30 days |
| Views | Resource page views (without download) |
| Unique viewers | Distinct authenticated users who accessed this resource |
| Version history | Upload dates per version |

### 10.3 NAAC Evidence Coverage

A dedicated IQAC analytics view shows:

| Metric | Description |
|---|---|
| Evidence count per criterion | How many documents support each of Criteria 1–7 |
| Gap analysis | Which criteria have fewer than the recommended number of evidence documents |
| Year-on-year growth | Evidence accumulation over successive academic years |
| Pending uploads | Content in Draft state that hasn't been published |

### 10.4 Strategic Analytics (Management / Principal)

| Metric | Description |
|---|---|
| Knowledge Health Score | Composite score based on upload volume, diversity, and currency |
| Institutional Memory Index | Ratio of knowledge captured vs estimated departmental output |
| Department participation rate | % of faculty who have uploaded at least one resource in the current AY |
| Cross-department discovery | How often users access resources from departments other than their own |

---

## 11. AI Opportunities Roadmap

The Knowledge Hub is designed from the ground up to be AI-ready. The following phases represent the evolution from traditional search to an intelligent institutional knowledge assistant.

### Phase KH-AI-1 — Traditional Full-Text Search *(Base — KH-2)*

**Technology:** PostgreSQL `tsvector` full-text search  
**Capability:** Keyword search across titles, descriptions, and tags  
**Timeline:** Included in base implementation  
**Investment:** No additional cost — uses existing Supabase Postgres

---

### Phase KH-AI-2 — AI-Enhanced Search *(KH-5)*

**Technology:** Vector embeddings + semantic search (pgvector extension on Supabase)  
**Capability:** Semantic understanding of search queries

> *"Show all presentations about machine learning uploaded in the past year"*

Instead of keyword matching, the system understands the conceptual intent of the query and returns semantically related resources even if exact keywords don't match.

**Implementation approach:**
- Generate embeddings for resource titles + descriptions on upload using an embedding model
- Store vectors in a `knowledge_embeddings` table (Supabase supports pgvector natively)
- Use cosine similarity for semantic search ranking
- Hybrid search: combine keyword + semantic scores for best results

---

### Phase KH-AI-3 — AI Summaries *(KH-5)*

**Technology:** Claude API (Anthropic)  
**Capability:** Automatic summarization of uploaded content

> *"You uploaded a 45-page research paper. Here's a 3-paragraph summary."*

Use cases:
- Research paper abstracts auto-generated for discoverability
- Long policy documents summarized for quick reference
- FDP materials condensed to key takeaways
- SSR documents summarized per criterion

**Privacy note:** Summarization happens server-side; document content is not retained by the AI provider after processing.

---

### Phase KH-AI-4 — Aura Knowledge Assistant *(KH-5 + future)*

**Technology:** RAG (Retrieval-Augmented Generation) using institution's own knowledge base  
**Capability:** Natural language questions answered using institutional knowledge

> *"Find all NAAC Criterion 3 documents from the 2022-23 academic year."*
>
> *"Show OBE presentations from the Computer Science department."*
>
> *"What are our institution's policies on faculty leave?"*
>
> *"Summarize the research published by the Chemistry department in the last two years."*

**Architecture:**
```
User Query
    │
    ▼
Query Embedding (semantic vector)
    │
    ▼
Similarity Search (pgvector — top-K relevant documents)
    │
    ▼
Context Assembly (retrieved document excerpts)
    │
    ▼
Claude API (RAG prompt: context + question)
    │
    ▼
Cited Answer (with source document links)
```

**Key principle:** The assistant always cites its sources. Every answer links back to the specific resource in the Knowledge Hub. This maintains trust and allows users to verify AI-generated answers.

**Scope boundary:** The Knowledge Assistant answers questions using institutional documents only. It does not hallucinate or draw on general internet knowledge for institutional-specific questions.

---

### AI Opportunity Timeline

| Phase | AI Feature | Technology | Readiness Trigger |
|---|---|---|---|
| KH-2 | Full-text search | PG tsvector | Available immediately |
| KH-5 | Semantic search | pgvector | After pgvector enabled on Supabase project |
| KH-5 | AI Summaries | Claude API | After Claude API key configured |
| Future | Knowledge Assistant | RAG + Claude | After substantial content accumulation (500+ resources) |

---

## 12. Strategic Value Analysis

### 12.1 Teaching & Learning

**Impact: High**

When faculty can discover existing high-quality teaching materials created by their peers, the average quality of teaching across the institution improves. A newly joined faculty member does not start from zero — they inherit the accumulated teaching wisdom of the institution. Cross-departmental material discovery creates unexpected connections that enrich interdisciplinary teaching.

**Measurable outcome:** Reduction in time faculty spend creating teaching materials from scratch; increase in material quality assessed through student feedback scores.

---

### 12.2 Research

**Impact: Very High**

Research collaboration within an institution is currently inhibited by lack of visibility. Faculty do not know what their colleagues are working on. The Knowledge Hub makes all research outputs visible, discoverable, and citable. This accelerates intra-institutional collaboration and eliminates duplicate research efforts.

**Measurable outcome:** Increase in co-authored publications among faculty from different departments; increase in total research output per academic year.

---

### 12.3 Accreditation

**Impact: Critical**

NAAC accreditation is a five-year cycle. Today, institutions spend 6–12 months before a NAAC visit scrambling to collect and organize evidence. With the Knowledge Hub, accreditation evidence is collected year-round, organized by criterion, and always current. The NAAC preparation cycle compresses from months to weeks.

**Measurable outcome:** Reduction in NAAC preparation effort; higher evidence completeness scores at time of submission; reduced risk of criterion-level deficiencies.

---

### 12.4 Collaboration

**Impact: High**

Departmental silos are a structural problem in Indian higher education. The Knowledge Hub breaks these silos by making every department's knowledge visible to every other department. HODs can discover what their peers are doing. Faculty can learn from cross-disciplinary approaches. The institution begins to function as a single connected knowledge entity rather than a collection of independent departments.

**Measurable outcome:** Increase in cross-department resource downloads; increase in faculty who access materials from departments other than their own.

---

### 12.5 Institutional Memory

**Impact: Transformational (Long-term)**

This is the compounding benefit of the Knowledge Hub. Every year that content is uploaded, the institution's knowledge base grows richer. When a faculty member retires after 25 years, their teaching materials, research notes, and institutional insights remain accessible. Over a decade, the institution builds an irreplaceable intellectual asset that no competing institution without a Knowledge Hub can match.

**Measurable outcome:** Knowledge base growth rate (resources per year); ratio of resources uploaded vs faculty turnover (the "memory retention" metric).

---

### 12.6 Competitive Differentiation

From a SaaS positioning perspective, the Knowledge Hub is a **moat-building feature**.

Once an institution's faculty and staff begin uploading to the Knowledge Hub, switching to another platform means losing their entire institutional knowledge repository. This creates strong retention:

- **Data lock-in:** The institution's knowledge is stored in Aura — not exportable to a competitor without significant effort
- **Network effects:** The more faculty upload, the more valuable the repository becomes for everyone, reinforcing the habit
- **Accreditation dependency:** When NAAC evidence is organized in the Knowledge Hub, institutions will not risk migrating to another platform before their accreditation cycle

---

## 13. Aura Core Potential — Cross-Product Vision

### 13.1 Current Product Scope

Today, the Knowledge Hub is scoped to Aura Campus — serving academic institutions.

### 13.2 Aura Core as the Enabler

Aura Core is the integration layer that bridges Aura Campus, Aura Build, and Aura Field. The Knowledge Hub, if abstracted into an Aura Core service, becomes a **knowledge infrastructure product** that serves all three verticals.

### 13.3 Cross-Product Vision

```
                    ┌─────────────────────────────────┐
                    │         AURA KNOWLEDGE           │
                    │         SERVICE (AKS)            │
                    │   Powered by Aura Core           │
                    └────────────┬────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼────────┐  ┌──────▼───────┐  ┌──────▼────────┐
    │   AURA CAMPUS    │  │  AURA BUILD  │  │  AURA FIELD   │
    │                  │  │              │  │               │
    │ • Lecture notes  │  │ • SOPs       │  │ • Service     │
    │ • Research papers│  │ • Safety     │  │   manuals     │
    │ • NAAC evidence  │  │   manuals    │  │ • Troubleshoot│
    │ • Lab manuals    │  │ • Project    │  │   guides      │
    │ • FDP materials  │  │   templates  │  │ • Field ops   │
    │ • Question banks │  │ • Standards  │  │   checklists  │
    │ • Policies       │  │ • QC guides  │  │ • Client docs │
    └──────────────────┘  └──────────────┘  └───────────────┘
```

### 13.4 Aura Campus: Academic Resources

The campus deployment is the richest and most complex use case — as described throughout this document.

### 13.5 Aura Build: Construction & Project Knowledge

For construction project management (Aura Build), the Knowledge Repository surfaces:

- **Standard Operating Procedures** for construction activities
- **Safety manuals** and site safety protocols
- **Project templates** — scope documents, tender templates, BOM formats
- **Quality control guides** for materials and workmanship
- **Government standards** and building code references
- **Lessons learned** from completed projects — institutionalizing site experience

*The "Faculty uploading lecture notes" pattern maps directly to "Site engineer uploading lessons learned from a completed project."*

### 13.6 Aura Field: Service & Operations Knowledge

For field service management (Aura Field), the Knowledge Repository surfaces:

- **Service manuals** for equipment types (searchable by model/make)
- **Troubleshooting guides** for common field problems
- **Field operations checklists** standardized across service teams
- **Client-specific documentation** — preferred procedures, site-specific SOPs
- **Training materials** for onboarding new field technicians
- **Warranty and compliance documents** for equipment categories

*The "Student discovering cross-departmental study materials" pattern maps directly to "Field technician discovering troubleshooting guides from senior service engineers."*

### 13.7 Evolution Path

| Stage | Description |
|---|---|
| **Stage 1 (Now)** | Knowledge Hub is a Aura Campus feature — academic knowledge management |
| **Stage 2 (Phase 7X)** | Fully built, proven, and adopted within Campus institutions |
| **Stage 3 (Aura Core)** | Architecture abstracted: multi-tenant knowledge service available as an Aura Core module |
| **Stage 4 (Aura Build + Field)** | Knowledge service extended to Build and Field with domain-specific content types |
| **Stage 5 (Aura Knowledge Service)** | Standalone knowledge product offered to institutions/enterprises that use only the knowledge layer |

---

## 14. Roadmap Placement Recommendation

### 14.1 The User's Proposal

The user proposed **Phase 7X — Knowledge Hub**, positioned after Phase 7 (Super Admin Panel). This is the correct recommendation. The reasoning below confirms and strengthens this placement.

### 14.2 Dependency Analysis

The Knowledge Hub needs the following to exist before it can deliver full value:

| Dependency | Status | Phase | Reason Required |
|---|---|---|---|
| Library (4A) | ✅ Complete | 4A | Librarian persona + digital collections require library context |
| Research & Publications (5I) | ✅ Complete | 5I | Research content feeds into Knowledge Hub; must not duplicate |
| User Roles (all phases) | ✅ Complete | Throughout | Permission model relies on existing role infrastructure |
| Document upload patterns (Storage) | ✅ Complete | Multiple phases | Supabase Storage patterns established; Knowledge Hub reuses them |
| LMS / Study Materials (6G) | 🔲 Pending | 6G | LMS establishes course-bound materials; Knowledge Hub is institution-wide. Building KH before LMS risks scope confusion. |
| IQAC / NAAC Compliance (7F) | 🔲 Pending | 7F | IQAC content types and NAAC criterion taxonomy must be defined before Knowledge Hub can organize accreditation evidence correctly |
| SSR Builder (7F-sub) | ✅ Complete | 7F-sub | Evidence organization and criterion vocabulary established here |
| Full-text search infrastructure | 🔲 Pending | KH-2 | Built within Knowledge Hub itself (no prior dependency) |

### 14.3 Why Phase 7X is Correct

```
Phase 6 completes ──► Phase 7 completes ──► Phase 7X (Knowledge Hub)
     (LMS ready)       (IQAC ready)            (synthesis layer)
```

**If built before Phase 6G (LMS):** The boundary between "LMS content" and "Knowledge Hub content" will be unclear to users. Faculty will ask "where do I upload this — LMS or Knowledge Hub?" The content model will be confused.

**If built before Phase 7F (IQAC):** The accreditation evidence taxonomy will not yet be defined. The Knowledge Hub's NAAC criterion organization will have to be rebuilt when IQAC is implemented.

**After both Phase 6 and Phase 7 are complete:** The Knowledge Hub slots in as a natural synthesis layer. LMS handles courses. IQAC handles compliance. Knowledge Hub handles everything else — the shared intellectual capital of the institution.

### 14.4 Recommended Roadmap Entry

```markdown
| 14 | [roadmap/14-phase7x-knowledge-hub.md](roadmap/14-phase7x-knowledge-hub.md) | Phase 7X — Aura Knowledge Hub (KH-1 through KH-5) | 🔲 Planned |
```

**Positioning in the Roadmap Index:** After Phase 7 (entry 9) and before Phase 8 (entry 10).

**In the Progress Tracker:**
```
Phase 7X  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%  (0/5 — KH-1 through KH-5 Planned)
```

**In the Feature Table:**
```
| 🔲 Phase 7X-KH1 | Knowledge Hub — Basic Repository (Upload, Categorize, Permissions) | Planned | — |
| 🔲 Phase 7X-KH2 | Knowledge Hub — Search & Discovery (Full-text, Filters, Browse) | Planned | — |
| 🔲 Phase 7X-KH3 | Knowledge Hub — Collaboration (Ratings, Bookmarks, Collections) | Planned | — |
| 🔲 Phase 7X-KH4 | Knowledge Hub — Analytics (Usage metrics, Dept insights, Gaps) | Planned | — |
| 🔲 Phase 7X-KH5 | Knowledge Hub — AI Layer (Semantic search, AI summaries, Knowledge Assistant) | Planned | — |
```

---

## 15. Implementation Stages

### Stage KH-1 — Basic Repository

**Goal:** Get the foundational upload, organize, and access model working.  
**Effort estimate:** Medium (2–3 weeks)  
**Unlocks:** All subsequent stages

**Scope:**
- Database schema: `knowledge_resources` table with full metadata envelope
- Supabase Storage bucket: `knowledge-hub` (authenticated read, role-based write)
- Upload interface: drag-drop file upload + external URL entry
- Metadata form: title, description, type, department, academic year, tags, visibility
- Basic listing page: institution-wide resource list with type and department filters
- Resource detail page: view metadata, download/view file, version list
- Admin moderation: approve/reject pending uploads
- RLS policies: three-tier visibility model
- Sidebar integration: "Knowledge Hub" NavGroup in institution sidebar

**Deliverables:**
- Faculty can upload any resource
- Any authenticated user can browse and download Tier-1 content
- Department content restricted to department members
- Admin can manage and moderate the repository

---

### Stage KH-2 — Search & Discovery

**Goal:** Make the repository genuinely useful through powerful search and smart discovery.  
**Effort estimate:** Medium (1–2 weeks)  
**Depends on:** KH-1

**Scope:**
- PostgreSQL full-text search (`tsvector` on title + description + tags)
- Faceted filter panel: department, content type, academic year, NAAC criterion, tags
- Smart discovery widgets: Recently Added, Most Downloaded, Trending, From Your Department
- Browse mode: by department, content type, academic year, NAAC criterion
- Tag cloud interface for tag-based browsing
- Search result ranking (relevance + recency)
- Zero-results state: suggests related resources or filters to broaden search

**Deliverables:**
- Global search bar available site-wide
- Filter-based narrowing of any result set
- Discovery widgets on the Knowledge Hub homepage

---

### Stage KH-3 — Collaboration & Engagement

**Goal:** Transform the repository from passive storage to active knowledge-sharing.  
**Effort estimate:** Medium (1–2 weeks)  
**Depends on:** KH-2

**Scope:**
- Star ratings (1–5) per resource per user (anonymous average shown)
- Bookmarks: users can bookmark resources to a personal collection
- Collections: faculty/librarians can create named curated collections (e.g., "Machine Learning Reading List")
- Download notifications: uploader notified when their resource reaches milestones (10, 50, 100 downloads)
- Comments (optional, configurable): threaded comments on resources (admin can disable per institution)
- "Related Resources" section on each resource detail page
- Share link: generate a shareable link to any resource (authenticated access maintained)

**Deliverables:**
- Rating and bookmarking infrastructure
- Curated collections visible to institution users
- Engagement notifications for resource creators

---

### Stage KH-4 — Analytics & Intelligence

**Goal:** Give administrators and department heads actionable insight into knowledge health.  
**Effort estimate:** Medium (1–2 weeks)  
**Depends on:** KH-2 + KH-3

**Scope:**
- Knowledge Hub analytics dashboard: institution-level and department-level views
- Upload volume charts: monthly trend, by department, by content type
- Top contributors: faculty ranked by uploads and downloads
- Most downloaded resources: ranked list with download counts
- NAAC evidence coverage: criterion-wise document counts and gap analysis
- Department participation rate: % of faculty who have uploaded in current AY
- Knowledge Health Score: composite metric (volume + diversity + currency)
- Export: analytics summary as CSV/PDF for institutional reporting

**Deliverables:**
- Analytics dashboard accessible to Admin, Principal, IQAC, HODs
- NAAC gap alert visible to IQAC coordinator
- Department knowledge health visible to HODs

---

### Stage KH-5 — AI Knowledge Hub

**Goal:** Evolve the repository into an intelligent knowledge platform.  
**Effort estimate:** High (3–4 weeks + AI infrastructure setup)  
**Depends on:** KH-3 + KH-4 + substantial content accumulation (500+ resources recommended)  
**External dependency:** pgvector enabled on Supabase project + Claude API key

**Scope:**
- **Semantic search:** pgvector embeddings for all resources; cosine similarity ranking; hybrid keyword + semantic scoring
- **AI Summaries:** Claude API generates auto-summary for uploaded documents on upload (server-side, async); displayed as "AI Summary" card on resource detail page
- **Knowledge Assistant:** RAG-based Q&A using institutional knowledge base as context; cited answers with source document links; usage-gated behind admin approval
- **Smart recommendations:** "Users who accessed this also accessed..." collaborative filtering
- **Content quality scoring:** AI-assisted detection of low-quality uploads (very short descriptions, no tags, etc.) with improvement suggestions shown to uploader
- **NAAC Gap Suggestions:** "Criterion 3 has limited evidence — these 5 uploaded documents could be tagged as Criterion 3 evidence" — AI suggests criterion tags for untagged content

**Deliverables:**
- Semantic search as default (with keyword fallback)
- AI summaries visible on all resource detail pages
- Knowledge Assistant accessible via floating chat button (admin-enabled)
- Intelligent NAAC gap bridging suggestions

---

## 16. DEV_TRACKER Entry

```markdown
## Phase 7X — Aura Knowledge Hub

| Field | Value |
|---|---|
| **ID** | KH |
| **Working Name** | Aura Knowledge Hub |
| **Tagline** | One Institution. One Knowledge Repository. |
| **Status** | 🗓️ Strategic Deferred — Future Initiative |
| **Priority** | Low (Current Release) · High (Future Strategic Value) |
| **Target Phase** | 7X — begins only after Phase 5K, 5L, 6, 7, and 8 are substantially complete |
| **Estimated Effort** | 8–10 weeks (KH-1 through KH-4) + 3–4 weeks (KH-5 AI) |

### Dependencies (all must reach maturity before KH-1 begins)

| Dependency | Status | Notes |
|---|---|---|
| Library Module (4A) | ✅ Complete | Librarian persona; digital collections concept |
| Research & Publications (5I) | ✅ Complete | Research content feeds Knowledge Hub |
| User Roles (institution_members) | ✅ Complete | Permission model inherited |
| Supabase Storage patterns | ✅ Complete | Multiple prior phases established patterns |
| Staff Career Lifecycle (5K) | 🔲 Pending | Faculty profile maturity; contributor identity |
| Dept Budget Management (5L) | 🔲 Pending | NAAC 6.4 financial evidence layer |
| Parent Portal & Extended Portals (Phase 6) | 🔲 Pending | Platform breadth; broader authenticated user base |
| LMS / Study Materials (6G) | 🔲 Pending | Must complete before KH to clarify LMS vs KH content boundary |
| Super Admin / SaaS Platform (Phase 7) | 🔲 Pending | Multi-tenancy maturity; per-institution feature gating |
| IQAC / NAAC Compliance (7F) | 🔲 Pending | NAAC criterion taxonomy needed before organizing accreditation content |
| Mobile Ecosystem (Phase 8) | 🔲 Pending | Mobile-accessible knowledge access patterns |
| pgvector on Supabase | 🔲 Pending | Required for KH-5 semantic search only |
| Claude API key | 🔲 Pending | Required for KH-5 AI summaries and Knowledge Assistant |

### Implementation Stages

| Stage | Description | Status |
|---|---|---|
| KH-1 | Basic Repository (Upload, Categorize, Permissions) | ✅ Complete — `20260705000000` (`knowledge_resources` + 3-tier RLS + `knowledge-hub` bucket; lib+12 tests; upload drawer + filtered list + download/publish/archive/delete; admin/HOD surface) |
| KH-2 | Search & Discovery (Full-text, Filters, Browse) | ✅ Complete — `20260706000000` (trigger-maintained `tsvector` + GIN; server-side `searchResources`; facets type/dept/year/NAAC/tag; tag cloud; discovery widgets Most-Downloaded + From-Your-Department; zero-results) |
| KH-3 | Collaboration (Ratings, Bookmarks, Collections) | 🔲 Planned |
| KH-4 | Analytics (Usage metrics, Dept insights, KH score) | 🔲 Planned |
| KH-5 | AI Layer (Semantic search, AI summaries, Knowledge Assistant) | 🔲 Planned |

### Strategic Notes

- Knowledge Hub is the **institutional memory layer** — it survives faculty turnover, department restructuring, and accreditation cycles
- Highest-value personas: IQAC Coordinator (NAAC evidence) + HODs (departmental continuity) + Faculty (teaching material sharing)
- Long-term: Architecture designed for abstraction into **Aura Core Knowledge Service** serving Aura Build and Aura Field
- AI layer (KH-5) requires 500+ resources to deliver meaningful recommendation and assistant quality; implement after content flywheel is established
- Do NOT conflate with Phase 6G (LMS) — LMS is course-bound; Knowledge Hub is institution-wide
```

---

## 17. NAAC Criterion Alignment

The Knowledge Hub directly contributes evidence to five of the seven NAAC criteria:

| NAAC Criterion | Knowledge Hub Contribution |
|---|---|
| **Criterion 1** — Curricular Aspects | Syllabus documents, curriculum materials, course design references |
| **Criterion 2** — Teaching-Learning | Lecture notes, PPTs, question banks, FDP materials, lesson plans |
| **Criterion 3** — Research & Innovation | Research papers, publications, patents, project reports, conference papers |
| **Criterion 4** — Infrastructure | Library digital collections, lab manuals, asset documentation |
| **Criterion 5** — Student Support | Study materials accessible to students, placement guidance documents |
| **Criterion 6** — Governance | Policies, circulars, meeting minutes, SOPs, grievance procedures |
| **Criterion 7** — Institutional Values | Best practices documentation, MOU records, community engagement reports |

**NAAC Advantage:** When a NAAC peer team visits, the IQAC coordinator can open the Knowledge Hub's Accreditation section and demonstrate that all seven criteria have documented, timestamped, version-controlled evidence — uploaded and organized throughout the year, not assembled in a last-minute scramble.

---

## 18. Success Metrics

### Short-Term (End of KH-2, 3 months post-launch)

| Metric | Target |
|---|---|
| Resources uploaded | 200+ across the institution |
| Faculty participation rate | 50%+ of faculty have uploaded at least one resource |
| Active users per week | 30%+ of authenticated institution users |
| Departments with content | 100% of departments have at least one upload |
| Search queries per day | 20+ searches/day (indicates discovery is working) |

### Medium-Term (End of KH-4, 6 months post-launch)

| Metric | Target |
|---|---|
| Resources uploaded | 1,000+ |
| Faculty participation rate | 80%+ |
| Cross-department downloads | 30%+ of downloads are from non-owning departments |
| NAAC evidence documents | All 7 criteria have documented evidence |
| Knowledge Health Score | 70+ (out of 100) |

### Long-Term (Post KH-5, 12 months)

| Metric | Target |
|---|---|
| Resources uploaded | 3,000+ |
| Faculty participation rate | 95%+ |
| AI Summary usage | 500+ AI summaries generated |
| Knowledge Assistant queries | 50+ per month |
| NAAC preparation time | Reduced from months to weeks |
| Faculty reported value | 80%+ rate Knowledge Hub as "very useful" in feedback |

---

*Document maintained by: Aura Product Architecture Team*  
*Next review: Before Phase 7X implementation kickoff*  
*Related documents: [AURA_ROADMAP.md](AURA_ROADMAP.md) · [07-phase5-admissions-lifecycle.md](roadmap/07-phase5-admissions-lifecycle.md) · [08-phase6-portals-tools.md](roadmap/08-phase6-portals-tools.md) · [09-phase7-super-admin.md](roadmap/09-phase7-super-admin.md)*
