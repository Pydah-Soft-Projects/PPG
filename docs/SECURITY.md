# Pydah Payment Gateway — Security Architecture & Guidelines

## 1. Secrets Management and Encryption at Rest
- **Encryption Algorithm:** AES-256-GCM authenticated encryption.
- **Master Key:** Sourced from `PROVIDER_SECRET_ENCRYPTION_KEY` (must be 32 bytes hex or 64 hex characters / 256 bits).
- **Format at Rest:**
  ```json
  {
    "ciphertext": "hex_string",
    "iv": "hex_string_12_bytes",
    "authTag": "hex_string_16_bytes",
    "keyVersion": 1
  }
  ```
- **Zero-Exposure Policy:** Encrypted credentials (Key Secret, Webhook Secret) are NEVER serialized into responses, logged to stdout, or committed to version control.
- **Masking:** Only public identifiers (e.g. `keyId`) and partial masks (e.g. `rzp_test_****1234`) with boolean flags `isConfigured: true` are returned to admin users.

## 2. Application Authentication & Credentials
- Applications authenticate via custom headers:
  - `X-App-Key`: Public application key ID (`app_key_xxx`).
  - `X-App-Secret`: Secret presented by client (`sec_xxx`).
- Secret Hashing: The secret is hashed with SHA-256 along with a secure system pepper (`APP_CREDENTIAL_PEPPER`). The raw secret is returned once on generation and never stored or retrievable.
- Application Identification: Never accept `applicationId` from request parameters or request body. The application ID is exclusively resolved from the validated authentication header.

## 3. Webhook Cryptographic Verification
- Raw Request Buffer: Standard Express JSON parsers discard formatting, whitespace, and ordering which invalidates cryptographic signatures.
- Webhook endpoints capture `req.rawBody` (Buffer) during the initial stream processing.
- Signatures (`X-Razorpay-Signature`) are validated with `crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')` using `crypto.timingSafeEqual`.

## 4. State Machine & Monotonic Integrity
Allowed state transitions:
- `CREATED` -> `PENDING` -> `SUCCEEDED` or `FAILED` or `EXPIRED`
- `SUCCEEDED` -> `REFUND_PENDING` -> `PARTIALLY_REFUNDED` -> `REFUNDED`
- Terminal states (`SUCCEEDED`, `FAILED`, `REFUNDED`) cannot be transitioned backwards by delayed or duplicate webhooks.

## 5. Idempotency & Replay Protection
- Client calls provide `idempotencyKey` (or header `X-Idempotency-Key`).
- A composite unique index on `(applicationId, idempotencyKey)` ensures duplicate requests return the existing record or return 409 Conflict if payload attributes differ.
- Webhook events are indexed on `(providerConfigurationId, providerEventId)` to guarantee that identical events are acknowledged without duplicate processing.

