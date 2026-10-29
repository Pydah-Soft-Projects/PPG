# Complete Guide: Testing Pydah Payment Gateway from an External Application

This guide walks you through:
1. Entering your Razorpay Test Credentials securely.
2. Obtaining Application API credentials (`X-App-Key` & `X-App-Secret`).
3. Calling the Gateway from an external application (Node.js, cURL / Postman, or Browser Checkout).
4. Verifying payment signatures and receiving webhooks.

---

## 1. Entering Your Razorpay Test Credentials Securely

> **Security Rule:** Never paste your Razorpay Key Secret in chat or commit it to Git. Enter it directly into the protected Admin Dashboard.

1. Start the Gateway backend and frontend:
   - **Backend:** `cd backend && npm run dev` (Runs on `http://localhost:5000`)
   - **Frontend:** `cd frontend && npm run dev` (Runs on `http://localhost:5173`)
2. Open `http://localhost:5173` in your browser.
3. Log in with:
   - **Username:** `admin`
   - **Password:** `Admin@Pydah2026!`
4. Navigate to **Payment Providers** in the left sidebar.
5. You will see **Razorpay - Test Mode Account**. Click **Rotate Keys** (or click **+ Add Provider Configuration**):
   - **Key ID:** Paste your Razorpay Test Key ID (starts with `rzp_test_...`)
   - **Key Secret:** Paste your Razorpay Key Secret
   - **Webhook Secret:** (Optional) Enter a webhook secret string of your choice (e.g. `pydah_test_secret_123`)
6. Click **Confirm Rotation** / **Save**.
7. Click the **⚡ Test Connection** button on the card.
   - You should see a green notification: `Connection Test Passed: Successfully connected and verified Razorpay credentials`.

---

## 2. Setting Up Razorpay Webhook (Optional but Recommended)

In your [Razorpay Dashboard](https://dashboard.razorpay.com/app/webhooks) (Test Mode):
1. Go to **Settings → Webhooks → Add New Webhook**.
2. Copy the Webhook URL from your Gateway Dashboard card:
   `http://your-server-or-ngrok/api/v1/webhooks/razorpay/<providerConfigurationId>`
3. Set the Secret to match the **Webhook Secret** you entered in Step 1.
4. Select active events: `payment.captured`, `payment.failed`, `order.paid`.

---

## 3. Registering Your Calling Application

Each calling application needs its own API Key and Secret:
1. In the Gateway Dashboard, navigate to **Applications**.
2. If using the default seeded application **Pydah Learning Management System** (`pydah_lms`):
   - If you need fresh credentials, click **Rotate Secret**.
   - Copy the `X-App-Key` and `X-App-Secret`.
3. Or click **+ Register Application** to create a new application (e.g. `pydah_admissions`).

---

## 4. End-to-End Integration Flow

```
[Student / User]              [Your App Backend]               [Pydah Payment Gateway]             [Razorpay]
       |                              |                                  |                              |
       | 1. Click "Pay ₹1,500"        |                                  |                              |
       |----------------------------->|                                  |                              |
       |                              | 2. POST /api/v1/payments         |                              |
       |                              |    (with X-App-Key & Secret)     |                              |
       |                              |--------------------------------->|                              |
       |                              |                                  | 3. Create Order              |
       |                              |                                  |----------------------------->|
       |                              |                                  |<-----------------------------|
       |                              | 4. Returns checkout options      |                              |
       |                              |<---------------------------------|                              |
       | 5. Launch Razorpay Modal     |                                  |                              |
       |<-----------------------------|                                  |                              |
       |                              |                                  |                              |
       | 6. Complete test payment     |                                  |                              |
       |----------------------------------------------------------------------------------------------->|
       |                              |                                  |                              |
       | 7. Return payment_id & sig   |                                  |                              |
       |----------------------------->|                                  |                              |
       |                              | 8. POST /api/v1/payments/:id/verify                             |
       |                              |--------------------------------->|                              |
       |                              |                                  | 9. Cryptographic HMAC check  |
       |                              |                                  | 10. Marks SUCCEEDED          |
       |                              | 11. 200 OK Succeeded             |                              |
       |                              |<---------------------------------|                              |
       | 12. "Payment Successful!"    |                                  |                              |
       |<-----------------------------|                                  |                              |
```

---

## 5. Ready-to-Run Code Examples for Your External Application

### Option A: Testing via cURL or Postman

#### Step 1: Create a Payment
```bash
curl -X POST http://localhost:5000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "X-App-Key: YOUR_APP_KEY" \
  -H "X-App-Secret: YOUR_APP_SECRET" \
  -H "X-Idempotency-Key: test-tx-001" \
  -d '{
    "businessReference": "INV-2026-TEST-01",
    "amount": 150000,
    "currency": "INR",
    "description": "Semester 1 Tuition Fee",
    "customer": {
      "name": "Bannu Kumar",
      "email": "student@pydah.edu.in",
      "phone": "+919876543210"
    }
  }'
```

**Gateway Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_trn_1a2b3c4d5e6f",
    "businessReference": "INV-2026-TEST-01",
    "status": "CREATED",
    "amount": 150000,
    "currency": "INR",
    "provider": "RAZORPAY",
    "providerOrderId": "order_RzP12345678",
    "checkout": {
      "keyId": "rzp_test_yourkey",
      "orderId": "order_RzP12345678",
      "amount": 150000,
      "currency": "INR",
      "name": "Pydah Learning Management System",
      "description": "Semester 1 Tuition Fee",
      "prefill": {
        "name": "Bannu Kumar",
        "email": "student@pydah.edu.in",
        "contact": "+919876543210"
      }
    }
  }
}
```

---

### Option B: Node.js (Your Application Backend)

Create a sample test script `test-payment-client.js`:

```javascript
const axios = require('axios');

const GATEWAY_URL = 'http://localhost:5000/api/v1';
const APP_KEY = 'YOUR_APP_KEY';       // Copy from Gateway Dashboard -> Applications
const APP_SECRET = 'YOUR_APP_SECRET'; // Copy from Gateway Dashboard -> Applications

async function runTestPayment() {
  try {
    console.log('1. Initiating payment request with Pydah Payment Gateway...');

    const createRes = await axios.post(
      `${GATEWAY_URL}/payments`,
      {
        businessReference: `INV-${Date.now()}`,
        amount: 250000, // ₹2,500.00 (in paise)
        currency: 'INR',
        description: 'Hostel Fee Term 1',
        customer: {
          name: 'Pydah Student',
          email: 'student@pydah.edu.in',
          phone: '+919988776655',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': APP_KEY,
          'X-App-Secret': APP_SECRET,
          'X-Idempotency-Key': `idemp-${Date.now()}`,
        },
      }
    );

    const payment = createRes.data.data;
    console.log('✔ Payment order created successfully:');
    console.log('   Internal Payment ID:', payment.paymentId);
    console.log('   Provider Order ID:', payment.providerOrderId);
    console.log('   Checkout Payload:', JSON.stringify(payment.checkout, null, 2));

    return payment;
  } catch (error) {
    console.error('Payment creation failed:', error.response?.data || error.message);
  }
}

runTestPayment();
```

---

### Option C: Browser Checkout (HTML / React Frontend of Your App)

When your application receives the `checkout` object from its backend, pass it to the standard Razorpay checkout modal:

```html
<!DOCTYPE html>
<html>
<head>
  <title>PydahSoft App Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <h2>Pydah Fee Payment</h2>
  <button id="pay-btn">Pay ₹2,500 with Razorpay</button>

  <script>
    document.getElementById('pay-btn').onclick = async function () {
      // 1. Call your application backend to get checkout config
      const res = await fetch('/api/create-order', { method: 'POST' });
      const { paymentId, checkout } = await res.json();

      // 2. Configure Razorpay modal
      const options = {
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        prefill: checkout.prefill,
        theme: { color: '#4f46e5' },
        handler: async function (response) {
          // 3. Send response back to your backend to verify
          const verifyRes = await fetch(`/api/verify-payment/${paymentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          alert('Payment Successful! Status: ' + verifyData.data.status);
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    };
  </script>
</body>
</html>
```

---

## 6. Verifying the Payment in the PPG Dashboard

After you make a payment with Razorpay Test Mode:
1. Switch to your Gateway Dashboard at `http://localhost:5173`.
2. Go to **Overview**:
   - Notice the **Gross Volume** and **Success Rate** updated in real-time.
3. Go to **Transactions**:
   - The transaction will appear marked as `SUCCEEDED`.
   - Click **Details** to see the authoritative Razorpay Payment ID, Attempt counts, and Timestamps.
4. Go to **Audit Logs**:
   - Every operation is recorded with caller IP and audit metadata.

