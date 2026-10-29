# Pydah Payment Gateway — Open Questions & Design Decisions

## 1. Multi-Tenant Provider Routing
- **Decision:** Each PydahSoft application is mapped to one active provider configuration per environment (TEST vs LIVE). If an application has multiple allowed configurations, an optional request parameter `providerConfigurationId` may specify an assigned account; otherwise, the primary enabled configuration is used.

## 2. Notification Retry Strategy
- **Decision:** Outbound webhook notifications use an exponential backoff schedule (e.g. 1m, 5m, 15m, 1h, 6h) up to 5 attempts. A dedicated retry worker or admin manual retry endpoint triggers re-delivery.

## 3. Secret Encryption Key Bootstrapping
- **Decision:** In development, if `PROVIDER_SECRET_ENCRYPTION_KEY` is not provided, a deterministic 32-byte fallback key is used with a prominent console warning to allow quick local prototyping without breaking test suites. In production/test mode, a secure 256-bit key is enforced.

## 4. Admin User Bootstrap
- **Decision:** If no admin user exists in MongoDB, the first registration via `/api/v1/admin/auth/register` automatically grants the `SUPER_ADMIN` role to allow initial dashboard access and provider configuration.

