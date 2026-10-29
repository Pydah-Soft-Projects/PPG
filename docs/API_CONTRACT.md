# Pydah Payment Gateway — API Contract Specification

All endpoints are prefixed with `/api/v1`.

## 1. Application-to-Gateway APIs (S2S)
Requires headers:
- `X-App-Key`: Application Key ID
- `X-App-Secret`: Application Secret Key
- `X-Idempotency-Key`: Optional/Recommended unique request identifier
- `Content-Type`: `application/json`

### 1.1 Create Payment
- **Method:** `POST /api/v1/payments`
- **Request Body:**
  ```json
  {
    "businessReference": "INV-2026-001",
    "amount": 150000,
    "currency": "INR",
    "description": "Tuition Fee Semester 1",
    "customer": {
      "name": "Bannu Kumar",
      "email": "student@pydah.edu.in",
      "phone": "+919876543210"
    },
    "college": "PYDAH_ENG",
    "course": "BTECH_CSE",
    "notes": { "studentId": "PY-2026-88" },
    "idempotencyKey": "unique-idemp-key-12345"
  }
  ```
  *(Note: `college` can be a college code e.g. `"PYDAH_ENG"` or ID `1`. `course` can be a course code e.g. `"BTECH_CSE"` or ID `5`. PPG automatically resolves the mapped payment provider configuration!)*
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "pay_trn_abc123",
      "businessReference": "INV-2026-001",
      "status": "CREATED",
      "amount": 150000,
      "currency": "INR",
      "provider": "RAZORPAY",
      "providerOrderId": "order_xyz789",
      "checkout": {
        "keyId": "rzp_test_publickey",
        "orderId": "order_xyz789",
        "amount": 150000,
        "currency": "INR",
        "name": "PydahSoft Application",
        "description": "Tuition Fee Semester 1",
        "prefill": {
          "name": "Bannu Kumar",
          "email": "student@pydah.edu.in",
          "contact": "+919876543210"
        }
      },
      "createdAt": "2026-10-29T10:00:00.000Z"
    }
  }
  ```

### 1.2 Get Payment Details
- **Method:** `GET /api/v1/payments/:paymentId`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "pay_trn_abc123",
      "businessReference": "INV-2026-001",
      "status": "SUCCEEDED",
      "amount": 150000,
      "currency": "INR",
      "providerPaymentId": "pay_rzp_999",
      "paidAt": "2026-10-29T10:05:00.000Z",
      "createdAt": "2026-10-29T10:00:00.000Z"
    }
  }
  ```

### 1.3 Verify Payment (Client checkout verification)
- **Method:** `POST /api/v1/payments/:paymentId/verify`
- **Request Body:**
  ```json
  {
    "razorpayOrderId": "order_xyz789",
    "razorpayPaymentId": "pay_rzp_999",
    "razorpaySignature": "computed_hmac_signature"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Payment verified successfully",
    "data": {
      "paymentId": "pay_trn_abc123",
      "status": "SUCCEEDED",
      "amount": 150000,
      "currency": "INR"
    }
  }
  ```

### 1.4 Request Refund
- **Method:** `POST /api/v1/payments/:paymentId/refund`
- **Request Body:**
  ```json
  {
    "amount": 50000,
    "reason": "Course cancellation by student",
    "idempotencyKey": "refund-idemp-001"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "refundId": "ref_ppg_001",
      "paymentId": "pay_trn_abc123",
      "amount": 50000,
      "status": "REFUNDED"
    }
  }
  ```

---

## 2. Inbound Webhook Endpoints
- **Method:** `POST /api/v1/webhooks/razorpay/:providerConfigurationId`
- **Headers:** `X-Razorpay-Signature: <hmac_hex>`
- **Body:** Raw JSON payload from Razorpay
- **Response:** `200 OK { "received": true }`

---

## 3. Outbound Notification (Gateway to Application Webhook)
- **Headers:**
  - `X-PPG-Signature`: `t=1730190000,v1=<hmac_sha256>`
  - `Content-Type`: `application/json`
- **Body:**
  ```json
  {
    "event": "payment.succeeded",
    "timestamp": "2026-10-29T10:05:00.000Z",
    "data": {
      "paymentId": "pay_trn_abc123",
      "businessReference": "INV-2026-001",
      "amount": 150000,
      "currency": "INR",
      "status": "SUCCEEDED",
      "providerPaymentId": "pay_rzp_999"
    }
  }
  ```

---

## 4. Protected Admin APIs
Requires header: `Authorization: Bearer <jwt_admin_token>`

### 4.1 Admin Auth
- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/register` (Initial bootstrap)
- `GET /api/v1/admin/auth/me`

### 4.2 Provider Configurations
- `GET /api/v1/admin/providers`
- `POST /api/v1/admin/providers`
- `GET /api/v1/admin/providers/:id`
- `PATCH /api/v1/admin/providers/:id`
- `POST /api/v1/admin/providers/:id/rotate-credentials`
- `POST /api/v1/admin/providers/:id/test-connection`
- `POST /api/v1/admin/providers/:id/assign-applications`

### 4.3 Applications Management
- `GET /api/v1/admin/applications`
- `POST /api/v1/admin/applications`
- `GET /api/v1/admin/applications/:id`
- `PATCH /api/v1/admin/applications/:id`
- `POST /api/v1/admin/applications/:id/rotate-credentials`

### 4.4 Colleges & Course Dynamic Routing
- `GET /api/v1/admin/colleges/db-status` (Check AWS RDS MySQL status)
- `GET /api/v1/admin/colleges` (List colleges from MySQL)
- `GET /api/v1/admin/colleges/:collegeId/courses` (List courses for a college from MySQL)
- `GET /api/v1/admin/colleges/rules/all` (List all payment routing rules)
- `POST /api/v1/admin/colleges/rules` (Upsert routing rule: college + optional course -> provider config)
- `DELETE /api/v1/admin/colleges/rules/:id` (Delete routing rule)

### 4.5 Transactions & Refunds
- `GET /api/v1/admin/transactions`
- `GET /api/v1/admin/transactions/:id`
- `POST /api/v1/admin/transactions/:id/sync`
- `GET /api/v1/admin/refunds`

### 4.5 Reports, Audit & Health
- `GET /api/v1/admin/reports/overview`
- `GET /api/v1/admin/reports/volume`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/health`
- `GET /api/v1/health/readiness`

