# 🏛️ AURA CORE — Architecture & Shared Services Specification

> **Purpose:** Define the shared, product-agnostic services that make up **Aura Platform**
> (a.k.a. Aura Core), their API surfaces, and the monorepo structure that keeps them
> reusable across Aura Campus, Build, Field, and Vision.
>
> **Companion docs:** `AURA_ECOSYSTEM_VISION.md` (the why) · `AURA_ROADMAP.md` (Campus build).
>
> **Golden rule:** A Core service must contain **zero** product-specific domain language.
> If a function mentions "college", "student", "site", or "technician" — it does not belong
> in Core. Core deals in tenants, users, roles, messages, documents, events, and audit records.

---

## 1. Why This Document Exists

Today, Aura Campus is a single Next.js app. Its `src/actions/` and `src/lib/` folders already
contain natural service seams — `notifications.ts`, `email.ts`, `sms.ts`, `whatsapp.ts`,
`auditLog.ts`, and the Supabase auth utilities. These are **proto-Core services** tangled
into Campus.

The goal is to **graduate** these into standalone, API-first packages so that when Aura Build
and Aura Field begin, they import the same services instead of rebuilding them.

This is a **monorepo + internal packages** strategy. Get it right while Campus is the only
consumer, and Build/Field inherit a hardened platform for free.

---

## 2. The Nine Aura Core Services

| Service | Owns | Current Campus seam | Extraction priority |
|---------|------|--------------------|--------------------|
| **Aura Identity** | Auth, sessions, SSO, RBAC, tenant context, user directory | `utils/supabase/*`, `actions/user.ts`, `actions/staffCredentials.ts` | 🔴 First |
| **Aura Connect** | Email, SMS, WhatsApp, Push, in-app notifications | `lib/email.ts`, `lib/sms.ts`, `lib/whatsapp.ts`, `lib/notifications.ts`, `actions/notifications.ts` | 🔴 First |
| **Aura Audit** | Audit logs, activity tracking, tamper-evident trail | `lib/auditLog.ts`, `actions/auditLogs.ts` | 🟡 Second |
| **Aura Docs** | File storage, document metadata, versioning, receipts | Supabase Storage usage (receipts, etc.) | 🟡 Second |
| **Aura Flow** | Approval engine, workflow state machines | booking/leave approval logic | 🟡 Second |
| **Aura Insights** | Reporting framework, dashboard primitives, CSV/Excel export | `actions/reports.ts`, `lib/excelXml.ts` | 🟢 Third |
| **Aura Mobile** | Shared Expo/React Native shell, auth, role-adaptive nav | `aura-mobile/` | 🟢 Third |
| **Aura AI** | AI assistant, knowledge search, predictive analytics | (none yet) | ⚪ Future |
| **Aura Vision** | CCTV, GPS, drone ingest, AI image analysis | (Campus Phase 8 CCTV/NFC precursor) | ⚪ Future |

---

## 3. Service Contracts (API Surfaces)

> Each service exposes a typed interface. Implementations are swappable (e.g. swap Resend for
> SES) without consumers noticing. All methods return discriminated unions:
> `{ success: true, data } | { success: false, error }`.

### 3.1 Aura Identity
```typescript
interface AuraIdentity {
  // Session & auth
  getCurrentUser(): Promise<Result<AuraUser>>;
  getTenantContext(userId: string): Promise<Result<TenantContext>>;
  requireRole(userId: string, roles: Role[]): Promise<Result<true>>;

  // User directory (product-agnostic — NOT students/staff)
  createUser(payload: CreateUserInput): Promise<Result<AuraUser>>;
  assignRole(userId: string, tenantId: string, role: Role): Promise<Result<true>>;
  listTenantUsers(tenantId: string, filter?: UserFilter): Promise<Result<AuraUser[]>>;

  // SSO (future)
  initiateSSO(provider: SSOProvider, tenantId: string): Promise<Result<SSORedirect>>;
}

type AuraUser = {
  id: string;
  tenantId: string;          // generic — maps to institution_id / project_id / company_id
  email: string;
  displayName: string;
  roles: Role[];
};
type TenantContext = { tenantId: string; tenantType: 'campus'|'build'|'field'; roles: Role[] };
```
> **Campus mapping:** `tenantId` ← `institution_id`. Campus-specific `staff`/`students`
> tables stay in the Campus product; Identity only knows generic `users` + `roles`.

### 3.2 Aura Connect
```typescript
interface AuraConnect {
  sendEmail(msg: EmailMessage): Promise<Result<MessageReceipt>>;
  sendSMS(msg: SMSMessage): Promise<Result<MessageReceipt>>;
  sendWhatsApp(msg: WhatsAppMessage): Promise<Result<MessageReceipt>>;
  sendPush(msg: PushMessage): Promise<Result<MessageReceipt>>;

  // Unified in-app notifications
  notify(n: NotificationInput): Promise<Result<Notification>>;
  listNotifications(userId: string, opts?: PageOpts): Promise<Result<Notification[]>>;
  markRead(notificationId: string): Promise<Result<true>>;

  // Channel-agnostic dispatch — picks channels by user preference + template
  dispatch(event: NotifiableEvent): Promise<Result<DispatchReport>>;
}

type NotifiableEvent = {
  tenantId: string;
  recipientId: string;
  templateKey: string;       // e.g. 'payment.received' — product registers templates
  data: Record<string, unknown>;
  channels?: Channel[];      // defaults from user prefs
};
```
> **Campus mapping:** Campus's fee-due / payment-received / leave-approved triggers become
> `dispatch()` calls with template keys. Build/Field register their own template keys.

### 3.3 Aura Audit
```typescript
interface AuraAudit {
  record(entry: AuditEntry): Promise<Result<true>>;
  query(filter: AuditFilter): Promise<Result<AuditEntry[]>>;
  verifyIntegrity(tenantId: string, range: DateRange): Promise<Result<IntegrityReport>>;
}

type AuditEntry = {
  tenantId: string;
  actorId: string;
  action: string;            // 'create'|'update'|'delete'|'login'|'export'|...
  resourceType: string;      // generic string — product supplies it
  resourceId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;         // server-set, immutable
};
```

### 3.4 Aura Docs
```typescript
interface AuraDocs {
  upload(file: FileInput, meta: DocMeta): Promise<Result<StoredDoc>>;
  getUrl(docId: string, opts?: SignedUrlOpts): Promise<Result<string>>;
  listVersions(docId: string): Promise<Result<DocVersion[]>>;
  delete(docId: string): Promise<Result<true>>;
}
```

### 3.5 Aura Flow
```typescript
interface AuraFlow {
  defineWorkflow(def: WorkflowDefinition): Promise<Result<Workflow>>;
  startInstance(workflowKey: string, ctx: WorkflowContext): Promise<Result<WorkflowInstance>>;
  act(instanceId: string, action: WorkflowAction): Promise<Result<WorkflowInstance>>;
  getPending(approverId: string): Promise<Result<WorkflowInstance[]>>;
}
```
> **Campus mapping:** leave approvals, venue-booking approvals, fee-concession approvals all
> become Flow workflows instead of bespoke status columns.

### 3.6 Aura Insights
```typescript
interface AuraInsights {
  runReport(reportKey: string, params: ReportParams): Promise<Result<ReportResult>>;
  exportCSV(data: unknown[], schema: ExportSchema): Promise<Result<Blob>>;
  exportExcel(data: unknown[], schema: ExportSchema): Promise<Result<Blob>>;
}
```

### 3.7 Aura Vision (future)
```typescript
interface AuraVision {
  registerCamera(cam: CameraInput): Promise<Result<Camera>>;
  getLiveFeed(cameraId: string): Promise<Result<StreamHandle>>;
  listCameras(tenantId: string, siteId?: string): Promise<Result<Camera[]>>;
  trackLocation(entityId: string): Promise<Result<GeoPoint>>;        // GPS for Field
  analyzeFrame(frame: FrameInput, checks: VisionCheck[]): Promise<Result<VisionResult>>; // PPE/progress
}
```

---

## 4. Target Monorepo Structure

> Migrate gradually. The aim: products depend on `@aura/*` packages, never on each other.

```
aura/                                  ← monorepo root (pnpm/turborepo workspace)
├── package.json                       ← workspaces config
├── turbo.json                         ← build pipeline
├── tsconfig.base.json                 ← shared TS config
│
├── packages/                          ← AURA CORE (shared, product-agnostic)
│   ├── @aura/identity/                ← Aura Identity service
│   │   ├── src/index.ts               ← public API (the interface above)
│   │   ├── src/supabase-impl.ts       ← Supabase implementation
│   │   └── package.json
│   ├── @aura/connect/                 ← email/sms/whatsapp/push/in-app
│   │   ├── src/index.ts
│   │   ├── src/channels/email.ts      ← Resend impl
│   │   ├── src/channels/sms.ts        ← MSG91 impl
│   │   ├── src/channels/whatsapp.ts   ← Meta impl
│   │   └── src/channels/push.ts       ← Expo push impl
│   ├── @aura/audit/
│   ├── @aura/docs/
│   ├── @aura/flow/
│   ├── @aura/insights/
│   ├── @aura/vision/                  ← future
│   ├── @aura/ai/                      ← future
│   ├── @aura/ui/                      ← shared design system (glassmorphism tokens)
│   └── @aura/types/                   ← shared TS types (Result<T>, Role, TenantContext…)
│
├── apps/                              ← PRODUCTS (consume Core, never each other)
│   ├── campus/                        ← current Next.js app moves here
│   │   ├── src/app/                   ← Campus-specific routes
│   │   ├── src/domain/                ← students, staff, fees, hostel… (Campus only)
│   │   └── package.json               ← depends on @aura/identity, @aura/connect, …
│   ├── build/                         ← Aura Build (Phase 2)
│   ├── field/                         ← Aura Field (Phase 3)
│   └── mobile/                        ← Aura Mobile (Expo) — current aura-mobile/ moves here
│
└── services/                          ← standalone backend services
    └── scheduler-engine/              ← current aura-scheduler-engine/ (Python FastAPI)
```

### Dependency rules (enforced)
```
apps/*      ->  packages/@aura/*          ✅ allowed
apps/*      ->  apps/*                     ❌ forbidden (no product depends on another)
packages/*  ->  packages/@aura/types      ✅ allowed
packages/*  ->  apps/*                     ❌ forbidden (Core never imports product code)
packages/*  ->  packages/* (domain)        ⚠️  only via published interface, no deep imports
```

---

## 5. Migration Path (Pragmatic, Non-Disruptive)

> Don't stop feature work to do a big-bang refactor. Extract opportunistically.

**Stage 0 — Today (single app):** Campus ships features. Keep service-like code in
`src/lib/` and `src/actions/` with clean function signatures (already the case).

**Stage 1 — Establish workspace:** Introduce pnpm/turborepo. Move the existing Next.js app
to `apps/campus/` and the Expo app to `apps/mobile/`. No logic changes. One commit.

**Stage 2 — Extract `@aura/types`:** Move `Result<T>`, role enums, tenant context types into
a shared package. Everything imports from it. Low risk, high leverage.

**Stage 3 — Extract `@aura/connect` (first real service):** It's the cleanest seam —
`email.ts`, `sms.ts`, `whatsapp.ts`, `notifications.ts` already have no Campus domain logic.
Move them, expose the `AuraConnect` interface, repoint Campus imports. This is the template
for all later extractions.

**Stage 4 — Extract `@aura/identity`:** Wrap the Supabase auth utils + user/role logic.
Map Campus's `institution_id` to generic `tenantId` at this boundary.

**Stage 5 — Extract `@aura/audit`, `@aura/docs`, `@aura/flow`** as time permits, each
following the Stage 3 template.

**Stage 6 — Extract `@aura/ui`:** Pull the glassmorphism design tokens + shared components
so Build and Field look like Aura from day one.

**Stage 7 — New products import Core:** When Aura Build starts, it's `apps/build/` importing
`@aura/identity`, `@aura/connect`, etc. — never re-implementing them.

---

## 6. Decision Guardrails (Apply on Every New Campus Module)

Before writing a new module in Campus, ask:

1. **Is any part of this generic?** (auth, notifications, file upload, approval, audit,
   reporting) → that part should call an Aura Core service, not reimplement it.
2. **Am I about to add a 4th way to send email / mark approval / write an audit row?**
   → Stop. Route through `@aura/connect` / `@aura/flow` / `@aura/audit`.
3. **Does this function name contain a domain noun?** (student, hostel, site) → it's product
   code, lives in `apps/campus/src/domain/`, never in a `@aura/*` package.
4. **Would Build or Field need this exact capability?** → If yes, design its interface to be
   product-agnostic now, even if Campus is the only caller today.

---

## 7. Tech Stack Alignment (Unchanged)

```
Monorepo:    pnpm workspaces + Turborepo
Web:         Next.js 15 (App Router) per product app
Mobile:      Expo / React Native (@aura/mobile shell)
Backend:     Supabase (Postgres + Auth + Storage + RLS) behind @aura/* services
Services:    Python FastAPI (scheduler-engine) and future microservices
Types:       TypeScript strict, Result<T> discriminated unions everywhere
Styling:     Tailwind + @aura/ui glassmorphism design tokens
```

---

## 8. What NOT To Do

- ❌ Don't refactor everything at once. Extract one service at a time, behind its interface.
- ❌ Don't let Core packages import product code. Ever.
- ❌ Don't put `institution_id`, `student`, `hostel`, `site`, `technician` in any `@aura/*` package.
- ❌ Don't make products depend on each other. Shared needs go into Core.
- ❌ Don't block Campus revenue work for architecture purity. Extraction is opportunistic.

---

*Captured June 2026. This is the architectural contract for Aura Platform. As Campus modules
are built or refactored, move their generic parts into `@aura/*` packages following the
migration path in §5. Revisit before starting Aura Build — by then, Identity, Connect, and
Audit should already be extracted and hardened.*
