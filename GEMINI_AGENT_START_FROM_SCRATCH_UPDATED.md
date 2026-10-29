# Gemini Agent Instructions — Build Pydah Payment Gateway from Scratch

## Mission

Build a secure centralized payment orchestration API and protected admin dashboard for PydahSoft applications. Inspect the existing repository first, then implement in small, testable phases. Treat `README_Pydah_Payment_Gateway.md` (or the repository's `README.md` after incorporating it) as the product/architecture reference.

## Fixed decisions — do not change these without asking

- **Language: JavaScript only** for backend and any dashboard frontend. Use Node.js LTS + Express.js. Do not introduce TypeScript, `.ts`/`.tsx` files, or a TypeScript build pipeline.
- **Database:** MongoDB, database `pydah_payment_gateway`.
- **First provider:** Razorpay, Test Mode first.
- **Provider settings:** authorized administrators must be able to configure provider credentials and settings from a protected dashboard. Build the data model and UI/API so additional provider types can be added later.
- **Initial operation:** local development and Razorpay Test Mode only.
- Never deploy, enable live payments, change production infrastructure, or modify live provider settings without explicit authorization.

## Non-negotiable safety rules

1. Inspect the repository, existing files, package manager, Git status, current changes, and available tests before editing.
2. Preserve existing user changes. Do not overwrite files blindly or perform destructive Git operations.
3. Never ask the user to paste real Razorpay credentials into chat.
4. Never commit credentials or include real credentials in generated files, logs, screenshots, tests, or responses.
5. Never expose Razorpay Key Secret, Webhook Secret, application secrets, or encryption keys to React/browser code.
6. Never trust a frontend redirect/callback as proof of payment. Payment success requires verified server-side evidence.
7. Do not trust `applicationId` from the request body; derive it from authenticated application credentials.
8. Validate the amount against a trusted application/business source or a documented server-side validation contract.
9. Enforce idempotency for payment creation, webhook processing, notifications, and refund operations.
10. Do not create real charges or use Live Mode during development.
11. Add tests for critical behavior and report actual test results honestly.
12. Pause and ask the user before decisions that affect live provider accounts, real money movement, production deployment, or unresolved business rules.

## First actions

Before implementation:
1. Inspect the repository tree and read the relevant project files.
2. Run `git status` and preserve all existing changes.
3. Identify existing JavaScript conventions, package manager, frontend, test framework, and deployment assumptions.
4. Read this instruction file and the gateway README.
5. Create or update:
   - `docs/IMPLEMENTATION_PLAN.md`
   - `docs/OPEN_QUESTIONS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/API_CONTRACT.md`
   - `docs/SECURITY.md`
6. Summarize findings and a phased plan. Begin routine, reversible scaffolding without waiting for approval; ask before any decision involving real payments, account selection, amount authority, or production.

## Required stack and coding conventions

- Node.js LTS.
- Express.js.
- Plain JavaScript (CommonJS or ESM based on existing repository conventions; choose one and use it consistently).
- MongoDB with Mongoose or the official driver; follow a sound existing convention.
- Request/environment validation with Zod, Joi, or a similar library that works with the chosen JavaScript setup.
- A suitable test framework such as Jest/Vitest and Supertest.
- OpenAPI 3.x for the REST API.
- React with JavaScript for the dashboard if frontend work is in scope.
- ESLint/formatting, structured logs, request IDs, and safe error handling.

Do not add dependencies without a clear reason. Keep the service a modular monolith; do not create microservices unnecessarily.

## Suggested module boundaries

Adapt the structure after repository inspection:

```text
src/
  app.js
  server.js
  config/
  database/
  middleware/
  common/
  modules/
    applications/
    application-auth/
    payments/
    providers/
      provider.interface.js
      razorpay/
    provider-configurations/
    webhooks/
    refunds/
    notifications/
    reconciliation/
    admin/
    reports/
    audit/
tests/
docs/
.env.example
```

Keep Razorpay-specific request/response handling inside its adapter. Payment lifecycle rules and internal statuses must remain provider-neutral.

## Razorpay-first integration requirements

1. Start with a mock provider for core unit tests, then integrate Razorpay in **Test Mode**.
2. Use the official Razorpay Node.js SDK where appropriate and follow current official documentation.
3. Implement server-side Razorpay order creation.
4. Return only the checkout data required by the calling application; never return secret credentials.
5. Verify checkout signatures server-side using the documented Razorpay procedure.
6. Implement the Razorpay webhook endpoint and verify the signature using the configured Webhook Secret and exact raw request body as required by Razorpay.
7. Persist webhook events and deduplicate them.
8. Check provider order/payment reference, amount, currency, and the exact provider configuration/account before applying success.
9. Handle timeouts and ambiguous provider responses without blindly creating duplicate orders or charges.
10. Test invalid signatures, duplicate events, delayed events, amount mismatches, and status recovery.

Do not mark payment successful because a browser says it succeeded. If provider documentation or behavior is unclear, check the current official docs and document the finding.

## Provider settings — required dashboard feature

Implement a protected **Settings → Payment Providers** section. Do not hard-code provider credentials in `.env` as the only way to configure a provider, and do not hard-code one merchant account in application logic.

### Configuration form

Support creating a provider configuration with:
- Display name, e.g. `Razorpay - Main Account`
- Provider type, initially `RAZORPAY`
- Environment: `TEST` or `LIVE`
- Razorpay Key ID
- Razorpay Key Secret
- Razorpay Webhook Secret
- Enabled/disabled status
- Allowed/assigned PydahSoft applications
- Optional account label and notes

Build the model and API in a way that additional providers can be added later without changing the payment core.

### Credential protection

- Accept credentials only through authenticated admin endpoints over HTTPS in deployed environments.
- Encrypt Key Secret and Webhook Secret at rest using a separately managed environment key or secrets manager. Do not store plaintext secrets in ordinary MongoDB fields.
- Never return saved secrets in provider list/detail API responses. Return masked indicators such as `configured: true` and a masked Key ID where appropriate.
- Support credential rotation by accepting a replacement secret; do not reveal the old value.
- Do not log request bodies from credential endpoints or log secrets.
- Do not put secrets in React source, browser storage, query strings, or frontend build variables.
- Keep TEST and LIVE configurations separate. LIVE must remain disabled until explicit approval.
- Record create/update/disable/rotation/assignment actions in the audit log.
- Provide an admin-visible webhook endpoint URL and setup instructions for the Razorpay dashboard.
- Provide a safe connection/configuration test that does not initiate a payment.
- Enforce server-side RBAC for every provider configuration operation.

### Provider configuration data

Use a `providerConfigurations` collection (or a well-documented equivalent) with fields such as:
- provider name/type and environment
- Key ID and encrypted secret fields
- status and allowed application IDs
- creator/updater IDs and timestamps
- credential rotation timestamp and encryption-key version/reference

Do not store encryption keys in MongoDB. Transactions must reference the exact provider configuration used. Do not silently move a pending payment between accounts. Validate that the application is assigned to an enabled configuration for the requested environment.

## Core application requirements

- Application registry, enable/disable, and secure application credential generation/rotation.
- Authenticate server-to-server requests and derive the application identity from credentials.
- Payment creation/status endpoints with validation and idempotency.
- Provider adapter interface with Razorpay implementation and mock implementation for tests.
- Normalized internal payment statuses and tested state transitions.
- Webhook signature verification, event persistence, and deduplication.
- Signed, retryable payment-status notifications to calling application backends.
- Refund tracking and permissions; do not add live refund execution without appropriate approval.
- Reconciliation foundations for pending/mismatched payments and provider settlement data.
- Protected admin APIs and dashboard.
- Health/readiness endpoints, structured logs, safe errors, rate limiting, and monitoring hooks.

## MongoDB and money rules

Use the dedicated database `pydah_payment_gateway`. Suggested collections:
- `applications`
- `applicationCredentials`
- `providerConfigurations`
- `paymentTransactions`
- `paymentAttempts`
- `webhookEvents`
- `refunds`
- `paymentNotifications`
- `auditLogs`
- admin user/session collections as required

Store INR amounts as integer paise: ₹13,000 = `1300000`. Never use floating-point rupees for persisted amounts. Use UTC BSON dates. Create unique idempotency indexes scoped to applications and event deduplication indexes scoped to provider configuration/account. Never store raw application secrets; store strong one-way verifiers/hashes and show the generated secret only once.

## API and authorization expectations

Use a versioned API prefix such as `/api/v1`.

Application-facing examples:
- `POST /payments`
- `GET /payments/:paymentId`
- `POST /payments/:paymentId/verify`
- `POST /webhooks/razorpay/:providerConfigurationId`

Admin provider configuration examples:
- `GET /admin/providers`
- `POST /admin/providers`
- `PATCH /admin/providers/:id`
- `POST /admin/providers/:id/rotate-credentials`
- `POST /admin/providers/:id/test-connection`
- `POST /admin/providers/:id/assign-applications`

These are initial contract suggestions; adapt to the repository and document final request/response schemas. Authenticate every route. Applications may only access their own payments; admin access must use separate authentication and RBAC.

## Implementation phases and exit gates

### Phase 0 — discovery and plan
Inspect repository and Git state, record assumptions/open questions, and draft architecture/API plans.

### Phase 1 — JavaScript foundation
Set up Express app/server, configuration validation, MongoDB connection, health/readiness endpoints, error middleware, request IDs, structured/redacted logging, linting, and tests.

### Phase 2 — application/admin identity
Implement application registry and credential handling, admin authentication/RBAC scaffolding, provider configuration model, and audit logging.

### Phase 3 — payment core with mock provider
Implement payment models, trusted amount-validation contract, idempotency, status transitions, payment APIs, and tests using a mock provider.

### Phase 4 — Razorpay Test Mode
Implement Razorpay adapter, order creation, signature verification, webhook pipeline, deduplication, status recovery, and tests.

### Phase 5 — provider settings UI/API
Implement add/edit/enable/disable, environment selection, credential encryption and rotation, application assignment, safe connection test, webhook setup guidance, and audit events.

### Phase 6 — notifications and recovery
Implement signed outbound notifications, retry handling, delivery logs, reconciliation hooks, and operational retry controls.

### Phase 7 — admin dashboard and reporting
Implement transaction search, provider/application filters, payment and refund views, reconciliation exceptions, and audit logs.

### Phase 8 — hardening and handover
Complete security tests, OpenAPI, integration guide, `.env.example`, deployment/runbook, backup/restore notes, Razorpay Test Mode setup instructions, and production-readiness checklist.

## Required tests

At minimum:
- Invalid input and environment configuration are rejected safely.
- Application credentials are verified and can be rotated/revoked.
- Application A cannot access Application B's payments.
- Repeated idempotency key + same payload returns the same logical payment.
- Repeated idempotency key + different payload returns a conflict.
- Provider selection rejects disabled/unassigned/mismatched-environment configurations.
- Provider secrets are encrypted at rest and never returned by APIs or logged.
- Invalid Razorpay webhook signature is rejected.
- Duplicate webhook events are processed once.
- Amount/order/currency/provider-account mismatch cannot mark payment successful.
- Stale events cannot move payment status backwards.
- Notification retries do not create duplicate effects.
- Admin provider changes require appropriate roles and are audited.
- No tests trigger live payments.

## Deliverables

- Working JavaScript backend scaffold and tests.
- `.env.example` with placeholders only.
- MongoDB models/schemas and indexes.
- OpenAPI/API contract.
- Mock provider and Razorpay Test Mode adapter.
- Protected provider-settings UI/API with encrypted credential handling.
- Webhook verification and deduplication.
- Signed/retryable application notification mechanism.
- Protected dashboard/report APIs and UI if included in repository scope.
- `README.md`, architecture, API contract, implementation plan, open questions, security, and deployment docs.
- Clear setup/run/test instructions.

Do not mark the project production-ready merely because it builds. Report what was implemented, tests actually run, tests not run, remaining questions, and risks. Never enable Live Mode or deploy without explicit authorization.
