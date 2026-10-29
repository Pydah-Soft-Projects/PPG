# Pydah Payment Gateway — Architecture

## 1. Overview
Pydah Payment Gateway (PPG) is an enterprise payment orchestration service tailored for PydahSoft applications. It shields client applications from direct payment gateway nuances, centralizes payment credentials and compliance, enforces idempotency, normalizes payment lifecycle events, and provides an administrative console for credentials, auditing, and reconciliation.

## 2. High-Level Architecture Diagram

```
+-------------------------------------------------------------------+
|                        PydahSoft Ecosystem                        |
+-------------------------------------------------------------------+
  [ Client Browser / Mobile ]        [ Admin Console (React SPA) ]
              |                                    |
              |                                    | HTTPS / JWT
              v                                    v
  [ PydahSoft App Backend ]              [ Admin API Gateway ]
              | (S2S API Key / Secret)             |
              +-------------------+----------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               Pydah Payment Gateway API (Node.js/Express)         |
+-------------------------------------------------------------------+
|  Middleware:                                                      |
|   - Request ID (Correlation)                                      |
|   - Redacted Structured Logger                                    |
|   - App / Admin Auth & RBAC                                       |
|   - Schema Validation                                             |
|   - Raw Body Capture (Webhook verification)                       |
|   - Error Sanitizer                                               |
+-------------------------------------------------------------------+
|  Modules:                                                         |
|   - Applications & Credentials                                    |
|   - Provider Configurations & AES-256 Secret Vault               |
|   - Payment Orchestration & State Machine                         |
|   - Webhook Ingestion & Deduplication                             |
|   - Refunds Management                                            |
|   - Outbound Signed Notifications (Webhooks to App)               |
|   - Reconciliation & Reporting                                    |
|   - Audit Logging                                                 |
+-------------------------------------------------------------------+
|  Provider Adapter Layer:                                          |
|   - BaseProviderInterface                                         |
|   - RazorpayAdapter (Test & Live modes)                           |
|   - MockProviderAdapter (Local testing)                           |
+---------------------------------+---------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  MongoDB (Dedicated)  |                   | External Providers    |
|  pydah_payment_gateway|                   | - Razorpay API/Orders |
+-----------------------+                   | - Razorpay Webhooks   |
                                            +-----------------------+
```

## 3. Core Principles & Conventions
1. **Integer Minor Units:** All monetary values (e.g. INR) are represented as integer paise (e.g. ₹100.00 = `10000`). Floating-point arithmetic is strictly forbidden for currency storage.
2. **Provider Neutrality:** The internal payment lifecycle, data models, and API interfaces are agnostic of Razorpay or any specific provider.
3. **Defense in Depth:**
   - Secrets (Key Secret, Webhook Secret) are encrypted with AES-256-GCM at rest and never exposed in API outputs or logs.
   - Applications authenticate using key pairs (`keyId` + hashed secret verifier).
   - Raw request bodies are preserved byte-for-byte for cryptographic webhook verification.
4. **Idempotency:** All payment creation and webhook operations are strictly idempotent via unique database indexing and payload fingerprinting.
5. **Safe State Transitions:** Monotonic status transitions prevent stale out-of-order webhooks from resetting completed or refunded transactions.

