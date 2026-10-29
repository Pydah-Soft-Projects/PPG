# Pydah_Payment_Gateway


# Pydah Payment Gateway

A centralized payment orchestration service for PydahSoft applications. It lets approved application backends create payments, tracks payment outcomes in one place, and provides a protected admin dashboard for provider configuration and reporting.

The gateway is **not itself a payment processor**. Razorpay processes the payment; this service securely integrates with Razorpay and normalizes payment events for PydahSoft applications.

## 1. Fixed project decisions

- **Language:** JavaScript (not TypeScript).
- **Backend:** Node.js LTS + Express.js.
- **Database:** MongoDB, dedicated database `pydah_payment_gateway`.
- **First provider:** Razorpay, starting in Test Mode.
- **Provider design:** provider adapter pattern so other approved providers can be added later.
- **Frontend:** React dashboard using JavaScript if a dashboard frontend is part of this repository.
- **Money:** integer minor units. For INR, ₹13,000 is `1300000` paise.
- **Initial rollout:** local development and Razorpay Test Mode only. Live transactions require explicit approval and a production-readiness review.

## 2. Goals

- Give PydahSoft applications one consistent server-to-server payment API.
- Keep Razorpay secrets out of browser code and individual application repositories.
- Let authorized administrators configure provider accounts and credentials in the dashboard.
- Support multiple provider configurations/accounts where approved, with explicit application-to-account assignment.
- Track payment lifecycle, webhook events, refunds, audit logs, and application notifications.
- Provide reliable idempotency, reconciliation support, and reports.
- Keep provider-specific code isolated so future providers do not require rewriting the payment core.

## 3. High-level architecture

```text
PydahSoft React app
        |
        v
PydahSoft application backend
        | authenticated server-to-server request
        v
Pydah Payment Gateway API (Node.js + Express, JavaScript)
        |                  |
        v                  v
MongoDB             Razorpay adapter
        ^                  |
        |                  v
        +---------- Razorpay APIs / Checkout
                           |
                    Signed webhook
                           |
                           v
             Verify -> persist -> notify app

Admin browser -> protected dashboard -> gateway admin APIs
```

All privileged calls, credential access, payment verification, and webhook processing happen on the server. The browser must never receive the Razorpay Key Secret or Webhook Secret.

## 4. Suggested project structure

Adapt this to the existing repository after inspecting it. Do not overwrite existing work blindly.

```text
src/
  app.js
  server.js
  config/
  database/
  common/                 # errors, validation, logging, IDs
  middleware/             # auth, rate limits, request IDs, RBAC
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
README.md
```

Use JavaScript consistently. Use JSDoc where useful, request/schema validation (for example, Zod or Joi), ESLint, and automated tests. Do not introduce TypeScript files or a TypeScript build step.

## 5. Payment provider settings in the admin dashboard

Build a **Settings → Payment Providers** area. Razorpay is the first provider type, but the settings model should support more providers later.

### Add/edit provider configuration

An authorized administrator should be able to create a provider configuration with fields such as:

- Display name (for example, `Razorpay - Main Account`)
- Provider type (`RAZORPAY`)
- Environment (`TEST` or `LIVE`)
- Razorpay Key ID
- Razorpay Key Secret
- Razorpay Webhook Secret
- Enabled/disabled status
- Applications permitted to use this account
- Optional account label/reference and operational notes

Secrets are entered into a **protected admin form** and sent only to the backend over HTTPS. Store secrets encrypted at rest using a key supplied through the deployment environment or a secrets manager; never store plaintext secrets in ordinary MongoDB documents. Never return a stored secret to the browser again. Show masked values/status instead, and allow authorized rotation by entering a replacement secret.

The dashboard should also support:

- Add, edit non-secret metadata, enable/disable, and rotate credentials.
- Show the environment and masked Key ID.
- Validate required fields and prevent TEST/LIVE configuration mix-ups.
- Show the configured webhook endpoint and setup instructions for Razorpay Dashboard.
- Record who changed provider settings and when.
- Test connectivity in a safe way, where supported, without initiating a real charge.
- Assign a provider configuration to one or more approved applications.
- Clearly show which configuration is selected for each application.

**Never** store provider keys in React environment variables, local storage, frontend bundles, source control, or API responses. The Razorpay Key ID may be needed by a checkout client in the documented checkout flow, but the Key Secret and Webhook Secret must remain server-only. Return only the minimum checkout data required.

### Provider configuration data model

A `paymentProviders` (or `providerConfigurations`) collection may contain:

- `_id`, `name`, `provider` (`RAZORPAY`), `environment` (`TEST`/`LIVE`)
- `keyId` (public identifier), `encryptedKeySecret`, `encryptedWebhookSecret`
- `status`, `allowedApplicationIds`, `createdAt`, `updatedAt`
- `createdBy`, `updatedBy`, `lastCredentialRotationAt`
- Secret encryption key version/reference, not the encryption key itself

Do not put secrets in `applications` or `paymentTransactions` documents. If multiple provider accounts are supported, every transaction and webhook must be associated with the exact provider configuration/account used to create it. Do not silently switch a pending payment to a different account.

## 6. Razorpay-first implementation

Use the official Razorpay Node.js SDK where appropriate and follow current Razorpay documentation for order creation, checkout, payment verification, refunds, and webhook signatures.

1. Create a Razorpay configuration in **Test Mode** using test credentials.
2. Implement a `RazorpayProvider` adapter behind the provider interface.
3. Create an internal payment record and idempotency record.
4. Create a Razorpay order using the server-side Key ID/Key Secret.
5. Return only the order and checkout details required by the calling application.
6. Verify checkout results on the server according to Razorpay's documented signature-verification procedure.
7. Verify webhooks using the configured Webhook Secret and the exact raw request body as required by Razorpay.
8. Persist and deduplicate webhook events; check order, payment reference, amount, currency, and provider account before changing payment status.
9. Query Razorpay server-to-server to recover ambiguous outcomes when appropriate.
10. Notify the originating PydahSoft backend with a signed, retryable notification.

A browser redirect, client-side success message, or screenshot is **never** sufficient proof of payment. Use Test Mode until the complete flow and security checks pass.

## 7. Payment lifecycle

1. A calling application backend sends a payment request with its business reference and idempotency key.
2. Gateway authentication identifies the calling application; do not trust an `applicationId` supplied in the request body.
3. Validate the amount against a trusted application-side source or agreed validation contract.
4. Create or retrieve the logical payment idempotently.
5. Resolve the provider configuration assigned to the application and environment.
6. Create the Razorpay order and persist provider references.
7. User completes or abandons checkout.
8. Verify the result through server-side signature verification and/or authoritative Razorpay status checks.
9. Process signed webhooks idempotently and safely handle duplicate or out-of-order events.
10. Persist the normalized state and notify the originating application.
11. Retry failed notifications and reconcile pending or mismatched transactions.

## 8. Suggested MongoDB collections

Database: `pydah_payment_gateway`.

- `applications` — registered PydahSoft applications, notification configuration, status.
- `applicationCredentials` — key IDs and strong one-way secret verifiers/hashes; never raw app secrets.
- `providerConfigurations` — provider type, environment, encrypted credentials, enabled state, application assignments.
- `paymentTransactions` — internal payment, amount in paise, currency, status, app and provider references.
- `paymentAttempts` — provider order/payment IDs and individual attempts.
- `webhookEvents` — event identity, signature verification outcome, processing status, timestamps.
- `refunds` — refund requests and provider outcomes.
- `paymentNotifications` — signed outbound notifications, retries, delivery attempts.
- `auditLogs` — security-sensitive and administrative actions.
- Admin user/session collections as required by the selected authentication approach.

Use schema validation and indexes. Create unique idempotency indexes scoped to the calling application. Deduplicate webhooks by provider configuration/account and provider event identity. Store timestamps as UTC BSON dates.

## 9. Normalized statuses

Suggested internal statuses: `CREATED`, `PENDING`, `AUTHORIZED`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.

Define and test allowed transitions. Preserve provider-specific statuses for support/debugging, but do not allow stale events to move a terminal state backwards. Payment success, refund completion, provider settlement, and bank deposit are different facts and must be reported separately.

## 10. API outline

Use a versioned prefix such as `/api/v1`.

### Application-facing API

- `POST /payments` — create/retrieve an idempotent payment.
- `GET /payments/:paymentId` — retrieve status for the authenticated application's own payment.
- `POST /payments/:paymentId/verify` — server-side verification/recovery endpoint as designed.
- `POST /webhooks/razorpay/:providerConfigurationId` — receive Razorpay webhooks.

### Admin API

- `GET /admin/providers`
- `POST /admin/providers`
- `PATCH /admin/providers/:id`
- `POST /admin/providers/:id/rotate-credentials`
- `POST /admin/providers/:id/test-connection`
- `POST /admin/providers/:id/assign-applications`
- Transaction, refund, application, audit, reporting, and reconciliation endpoints protected by role-based access control.

Validate inputs, authenticate every route, and never expose stored secrets through list/detail endpoints.

## 11. Security requirements

- HTTPS outside local development.
- Keep Razorpay Key Secret and Webhook Secret server-side only.
- Encrypt provider secrets at rest with a separately managed encryption key or secrets manager; support rotation.
- Never log secrets, full authorization headers, or unnecessary personal/payment data.
- Validate all request bodies and enforce size limits, rate limits, and secure headers.
- Authenticate calling backends separately from dashboard administrators.
- Enforce application-level data isolation and admin RBAC.
- Verify webhook signatures over the exact raw body where required.
- Validate order, amount, currency, account, and provider references before success.
- Use idempotency for payment creation, webhook processing, notifications, and refund requests.
- Validate and allowlist return URLs and notification URLs to reduce SSRF/open-redirect risk.
- Do not store card numbers, CVV, UPI PINs, or other sensitive payment authentication data.
- Audit provider configuration changes, credential rotations, assignments, refunds, and exports.
- Use least-privilege MongoDB credentials and do not expose MongoDB publicly.

## 12. Environment configuration

`.env.example` should contain placeholders only, for example:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pydah_payment_gateway
APP_CREDENTIAL_PEPPER=
PROVIDER_SECRET_ENCRYPTION_KEY=
ADMIN_SESSION_SECRET=
DASHBOARD_ORIGIN=http://localhost:3000
```

Provider credentials should normally be managed in the protected provider-settings UI and encrypted in storage. Environment variables or a secrets manager may be used for bootstrap credentials/encryption keys. Never commit real keys. Keep Test and Live credentials separate, and do not enable Live Mode by default.

## 13. Dashboard

Initial sections:

- Overview: successful payments, pending/failed payments, refunds, and date filters.
- Transactions: search by application, business reference, status, provider configuration, and date.
- Applications: register/disable applications, rotate app credentials, assign provider accounts.
- **Settings → Payment Providers:** configure Razorpay accounts, environment, credentials, status, and app assignments.
- Refunds and reconciliation exceptions.
- Audit/security log.

Clearly distinguish gross successful payments, refunds, net payment activity, provider settlement, and actual bank deposits. Enforce permissions in the API, not only in the UI.

## 14. Implementation phases

1. **Repository discovery:** inspect repository and Git status; preserve existing work.
2. **Foundation:** JavaScript/Express bootstrap, configuration validation, MongoDB connection, logging, error handling, health endpoints, tests.
3. **Identity and admin:** application registry/authentication, admin auth/RBAC, audit logs.
4. **Payment core:** models, amount validation contract, idempotency, statuses, mock provider.
5. **Razorpay Test Mode:** provider adapter, order creation, checkout integration contract, signature verification, webhooks, event deduplication.
6. **Provider settings UI/API:** add/edit/enable/disable provider configurations, secret encryption and rotation, environment selection, application assignments, audit trail.
7. **Notifications and recovery:** signed notifications, retries, status recovery, reconciliation foundations.
8. **Dashboard and reports:** transactions, provider/application filters, refunds and audit.
9. **Hardening:** security tests, OpenAPI, deployment guide, backups, monitoring, production-readiness checklist.

## 15. First-release acceptance checklist

- A registered application can create a payment request through authenticated server-to-server access.
- Amounts are validated against a trusted business source.
- Repeating an idempotency key does not create another logical payment.
- Razorpay Test Mode orders can be created through the provider adapter.
- Only verified server-side evidence can mark payment successful.
- Invalid/duplicate/reordered webhooks are handled safely.
- Admins can configure Razorpay Test credentials in the provider settings UI without exposing secrets.
- Provider credentials are encrypted at rest, masked in the UI, and never returned by read APIs.
- Applications can only use explicitly assigned enabled provider configurations.
- Failed application notifications can be retried safely.
- Admin routes enforce authentication, roles, and audit logging.
- Automated tests cover payment lifecycle and security-critical behavior.
- No live transactions or production deployment occur without explicit approval.

## 16. Official setup reference

Use the current official Razorpay documentation for account setup, Test Mode credentials, Orders API, Checkout, payment signature verification, webhooks, and refunds. Do not copy secrets into this document or source control.
